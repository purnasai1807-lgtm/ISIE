import json
import os
import sqlite3
import sys
import tempfile
import threading
import unittest
from contextlib import closing
from unittest.mock import patch
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from isie_backend.analysis import (
    assess_capacity,
    assess_relocation,
    simulate_capacity,
)
from isie_backend.firebase_auth import FirebaseAdminAuthVerifier
from isie_backend.providers import read_verified_measurement
from isie_backend.rate_limit import RateLimiter
from isie_backend.server import create_handler
from isie_backend.storage import AuditIntegrityError, IdempotencyConflict, SQLiteJournal
from isie_backend.validation import (
    InputError,
    validate_coordinates,
    validate_measurement,
    validate_provenance,
)

NOW = datetime(2026, 10, 6, 8, 0, tzinfo=timezone.utc)


def measurement(value, name, *, kind="verified_real", observed_at=None, confidence=0.8):
    provenance = {
        "kind": kind,
        "sourceId": f"source-{name}",
        "sourceName": f"Input supplied for {name}",
        "observedAt": observed_at or NOW.isoformat(),
        "recordedAt": NOW.isoformat(),
        "processingVersion": "source-revision-1",
        "confidence": confidence,
    }
    if kind == "verified_real":
        provenance["verification"] = {
            "verifiedBy": "authorized-reviewer",
            "verifiedAt": NOW.isoformat(),
        }
    return {"value": value, "unit": "people", "provenance": provenance}


class BackendTests(unittest.TestCase):
    def test_firebase_verifier_checks_revocation_and_trusted_role_claim(self):
        class Auth:
            def verify_id_token(self, token, *, check_revoked, app):
                self.options = (token, check_revoked, app)
                return {"uid": "verified-user", "role": "ANALYST"}

        auth = Auth()
        app = object()
        verifier = FirebaseAdminAuthVerifier(auth, app)
        self.assertEqual(
            verifier.verify_bearer_token("signed-token"),
            {"uid": "verified-user", "role": "ANALYST"},
        )
        self.assertEqual(auth.options, ("signed-token", True, app))

        class InvalidRoleAuth:
            def verify_id_token(self, token, *, check_revoked, app):
                return {"uid": "user", "role": "SUPERUSER"}

        with self.assertRaisesRegex(ValueError, "recognized trusted role"):
            FirebaseAdminAuthVerifier(InvalidRoleAuth(), app).verify_bearer_token("signed-token")
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "FIREBASE_PROJECT_ID"):
                FirebaseAdminAuthVerifier.from_environment()

    def test_sqlite_journal_is_append_only_idempotent_and_tamper_evident(self):
        with tempfile.TemporaryDirectory() as directory:
            journal = SQLiteJournal(str(Path(directory) / "isie.sqlite3"))
            report = {
                "title": "User report",
                "details": "Unverified report",
                "provenance": {"kind": "user_provided"},
            }
            payload = {"title": "User report", "details": "Unverified report"}
            stored, replayed = journal.create_field_report(
                actor_uid="operator-1",
                actor_role="OPERATOR",
                idempotency_key="report-1",
                report=report,
                idempotency_payload=payload,
                recorded_at=NOW,
            )
            self.assertFalse(replayed)
            self.assertEqual(stored["classification"], "USER_PROVIDED_UNVERIFIED")
            self.assertTrue(journal.verify_audit_chain())
            duplicate, replayed = journal.create_field_report(
                actor_uid="operator-1",
                actor_role="OPERATOR",
                idempotency_key="report-1",
                report={**report, "recordedAt": "different retry timestamp"},
                idempotency_payload=payload,
                recorded_at=NOW,
            )
            self.assertTrue(replayed)
            self.assertEqual(duplicate, stored)
            with self.assertRaises(IdempotencyConflict):
                journal.create_field_report(
                    actor_uid="operator-1",
                    actor_role="OPERATOR",
                    idempotency_key="report-1",
                    report=report,
                    idempotency_payload={"title": "Different"},
                    recorded_at=NOW,
                )
            with closing(sqlite3.connect(journal.database_path)) as connection:
                connection.execute("BEGIN")
                with self.assertRaisesRegex(sqlite3.IntegrityError, "append-only"):
                    connection.execute("UPDATE audit_events SET actor_role = 'ADMIN'")
                with self.assertRaisesRegex(sqlite3.IntegrityError, "append-only"):
                    connection.execute("DELETE FROM field_reports")
                connection.execute("DROP TRIGGER audit_events_no_update")
                connection.execute("UPDATE audit_events SET actor_role = 'ADMIN'")
                connection.commit()
            self.assertFalse(journal.verify_audit_chain())

            second = SQLiteJournal(str(Path(directory) / "report-tamper.sqlite3"))
            second.create_field_report(
                actor_uid="operator-2",
                actor_role="OPERATOR",
                idempotency_key="report-2",
                report=report,
                idempotency_payload=payload,
                recorded_at=NOW,
            )
            with closing(sqlite3.connect(second.database_path)) as connection:
                connection.execute("BEGIN")
                connection.execute("DROP TRIGGER field_reports_no_update")
                connection.execute(
                    "UPDATE field_reports SET report_json = replace(report_json, 'User report', 'Changed report')"
                )
                connection.commit()
            self.assertFalse(second.verify_audit_chain())
            with self.assertRaises(AuditIntegrityError):
                second.create_field_report(
                    actor_uid="operator-2",
                    actor_role="OPERATOR",
                    idempotency_key="after-tamper",
                    report=report,
                    idempotency_payload={"title": "After tamper"},
                    recorded_at=NOW,
                )

            atomic = SQLiteJournal(str(Path(directory) / "atomic.sqlite3"))
            with closing(sqlite3.connect(atomic.database_path)) as connection:
                connection.execute(
                    """CREATE TRIGGER reject_audit_insert BEFORE INSERT ON audit_events
                       BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END"""
                )
                connection.commit()
            with self.assertRaisesRegex(sqlite3.IntegrityError, "audit unavailable"):
                atomic.create_field_report(
                    actor_uid="operator-3",
                    actor_role="OPERATOR",
                    idempotency_key="atomic-1",
                    report=report,
                    idempotency_payload=payload,
                    recorded_at=NOW,
                )
            with closing(sqlite3.connect(atomic.database_path)) as connection:
                self.assertEqual(connection.execute("SELECT COUNT(*) FROM field_reports").fetchone()[0], 0)

    def test_coordinates_and_provenance_validation(self):
        self.assertEqual(
            validate_coordinates({"latitude": 0, "longitude": 0}),
            {"latitude": 0.0, "longitude": 0.0},
        )
        with self.assertRaisesRegex(InputError, "latitude"):
            validate_coordinates({"latitude": 91, "longitude": 0})
        with self.assertRaisesRegex(InputError, "sourceId"):
            validate_provenance({"kind": "verified_real"})
        with self.assertRaisesRegex(InputError, "non-negative"):
            validate_measurement(measurement(-1, "population"), name="population", now=NOW)
        with self.assertRaisesRegex(InputError, "non-negative"):
            validate_measurement(
                measurement(float("inf"), "population"), name="population", now=NOW
            )

    def test_provider_boundary_validates_coordinates_provenance_and_source(self):
        class TestProvider:
            source_id = "source-population"

            def read_measurement(self, metric, coordinates):
                self.asserted_coordinates = coordinates
                return measurement(25, metric)

        provider = TestProvider()
        result = read_verified_measurement(
            provider,
            "population",
            {"latitude": 0, "longitude": 0},
            now=NOW,
        )
        self.assertEqual(result["value"], 25)
        self.assertEqual(provider.asserted_coordinates, {"latitude": 0.0, "longitude": 0.0})
        with self.assertRaisesRegex(InputError, "longitude"):
            read_verified_measurement(
                provider,
                "population",
                {"latitude": 0, "longitude": 181},
                now=NOW,
            )
        provider.source_id = "unexpected-source"
        with self.assertRaisesRegex(ValueError, "does not match"):
            read_verified_measurement(
                provider,
                "population",
                {"latitude": 0, "longitude": 0},
                now=NOW,
            )

    def test_bad_stale_future_and_unverified_timestamps_rejected(self):
        invalid = measurement(1, "population")["provenance"]
        invalid["observedAt"] = "yesterday"
        with self.assertRaisesRegex(InputError, "timestamp"):
            validate_provenance(invalid)
        with self.assertRaisesRegex(InputError, "must be one of"):
            validate_measurement(
                measurement(10, "population", kind="user_provided"),
                name="population",
                now=NOW,
            )
        with self.assertRaisesRegex(InputError, "stale"):
            validate_measurement(
                measurement(10, "population", observed_at="2026-10-04T00:00:00+00:00"),
                name="population",
                now=NOW,
                max_age_seconds=60,
            )
        with self.assertRaisesRegex(InputError, "future"):
            validate_measurement(
                measurement(10, "population", observed_at="2026-10-07T00:00:00+00:00"),
                name="population",
                now=NOW,
            )

    def test_capacity_missing_inputs_explicitly_unavailable(self):
        result = assess_capacity({"population": measurement(100, "population")}, now=NOW)
        self.assertEqual(result["status"], "unavailable")
        self.assertEqual(result["missingInputs"], ["shelterCapacity"])
        self.assertIsNone(result["metadata"]["confidence"])

    def test_capacity_derivation_preserves_provenance_and_limitations(self):
        result = assess_capacity(
            {
                "population": measurement(100, "population"),
                "shelterCapacity": measurement(65, "capacity"),
            },
            now=NOW,
        )
        self.assertEqual(result["status"], "prototype_estimate")
        self.assertEqual(result["capacityDeficit"]["value"], 35)
        self.assertEqual(
            [item["sourceId"] for item in result["provenance"]],
            ["source-population", "source-capacity"],
        )
        self.assertEqual(result["metadata"]["processingVersion"], "isie-prototype-analysis/1.0.0")
        self.assertTrue(result["metadata"]["limitations"])

    def test_relocation_score_is_explainable_and_non_prescriptive(self):
        inputs = {
            "population": measurement(100, "population"),
            "shelterCapacity": measurement(50, "capacity"),
            "hazardIndex": measurement(0.4, "hazard"),
        }
        result = assess_relocation(inputs, now=NOW)
        self.assertEqual(result["prioritizationScore"]["value"], 45)
        self.assertIn("No automated", result["decision"])
        inputs["hazardIndex"]["value"] = 1.2
        with self.assertRaisesRegex(InputError, "between 0 and 1"):
            assess_relocation(inputs, now=NOW)

    def test_simulation_is_explicit_and_requires_inputs(self):
        missing = simulate_capacity({}, now=NOW)
        self.assertEqual(missing["status"], "unavailable")
        self.assertEqual(missing["label"], "HYPOTHETICAL SIMULATION")
        result = simulate_capacity(
            {
                "population": measurement(100, "population", kind="user_provided"),
                "shelterCapacity": measurement(60, "capacity", kind="simulated"),
            },
            now=NOW,
        )
        self.assertEqual(result["status"], "simulated")
        self.assertIn("NOT LIVE", result["label"])
        self.assertEqual(result["capacityDeficit"]["value"], 40)
        self.assertIn("never written", result["metadata"]["limitations"][0])

    def test_http_fail_closed_auth_roles_invalid_input_and_unavailable_data(self):
        self._with_http_server(None, lambda base: self.assert_http_error(
            base + "/v1/assessments/capacity", 503
        ))
        self._with_http_server(None, lambda base: self.assert_http_error(
            base + "/v1/field-reports", 503
        ))

        class InvalidTokenVerifier:
            def verify_bearer_token(self, token):
                raise ValueError("token invalid or revoked")

        self._with_http_server(
            InvalidTokenVerifier(),
            lambda base: self.assert_http_error(
                base + "/v1/assessments/capacity", 401, token="revoked"
            ),
        )

        class Verifier:
            def verify_bearer_token(self, token):
                return {"uid": token, "role": "ANALYST" if token == "analyst" else "VIEWER"}

        def checks(base):
            self.assert_http_error(base + "/v1/assessments/capacity", 401)
            self.assert_http_error(base + "/v1/assessments/capacity", 403, token="viewer")
            status, body = self.http_post(
                base + "/v1/assessments/capacity", "analyst", b"{"
            )
            self.assertEqual(status, 400)
            status, body = self.http_post(
                base + "/v1/assessments/capacity",
                "analyst",
                json.dumps({"coordinates": {"latitude": 0, "longitude": 0}}).encode(),
            )
            self.assertEqual(status, 200)
            self.assertEqual(body["status"], "unavailable")
            self.assertEqual(body["missingInputs"], ["population", "shelterCapacity"])
            self.assert_http_error(base + "/v1/incidents", 404, token="analyst")
            status, _ = self.http_post(
                base + "/v1/assessments/capacity", "analyst", b"x" * (64 * 1024 + 1)
            )
            self.assertEqual(status, 413)

        self._with_http_server(Verifier(), checks)

    def test_http_field_report_roles_validation_deduplication_and_audit(self):
        class Verifier:
            def verify_bearer_token(self, token):
                users = {
                    "operator": ("operator-1", "OPERATOR"),
                    "analyst": ("analyst-1", "ANALYST"),
                    "viewer": ("viewer-1", "VIEWER"),
                }
                uid, role = users[token]
                return {"uid": uid, "role": role}

        with tempfile.TemporaryDirectory() as directory:
            journal = SQLiteJournal(str(Path(directory) / "reports.sqlite3"))

            def checks(base):
                payload = {
                    "title": "Field observation",
                    "details": "Reporter-provided details; not independently verified.",
                    "category": "HAZARD_OBSERVATION",
                    "coordinates": {"latitude": 17.5, "longitude": 78.4},
                }
                status, body = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(payload).encode(),
                    {"Idempotency-Key": "field-1"},
                )
                self.assertEqual(status, 201)
                self.assertEqual(body["report"]["classification"], "USER_PROVIDED_UNVERIFIED")
                self.assertEqual(body["report"]["provenance"]["kind"], "user_provided")
                report_id = body["report"]["id"]

                status, replay = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(payload).encode(),
                    {"Idempotency-Key": "field-1"},
                )
                self.assertEqual(status, 200)
                self.assertTrue(replay["replayed"])
                self.assertEqual(replay["report"]["id"], report_id)
                self.assertEqual(journal.capabilities()["auditJournal"]["eventCount"], 1)
                self.assertTrue(journal.verify_audit_chain())
                status, health = self.http_get(base + "/health")
                self.assertEqual(status, 200)
                self.assertFalse(health["productionReady"])
                self.assertTrue(health["auditIntegrity"])

                changed = {**payload, "details": "A changed payload."}
                status, _ = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(changed).encode(),
                    {"Idempotency-Key": "field-1"},
                )
                self.assertEqual(status, 409)
                for token in ("viewer", "analyst"):
                    status, _ = self.http_post(
                        base + "/v1/field-reports",
                        token,
                        json.dumps(payload).encode(),
                        {"Idempotency-Key": token + "-key"},
                    )
                    self.assertEqual(status, 403)
                invalid = {**payload, "coordinates": {"latitude": 91, "longitude": 0}}
                status, _ = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(invalid).encode(),
                    {"Idempotency-Key": "invalid-1"},
                )
                self.assertEqual(status, 400)
                forged_provenance = {
                    **payload,
                    "provenance": {"kind": "verified_real", "verifiedBy": "caller"},
                }
                status, _ = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(forged_provenance).encode(),
                    {"Idempotency-Key": "forged-1"},
                )
                self.assertEqual(status, 400)
                status, _ = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(payload).encode(),
                    {
                        "Idempotency-Key": "wrong-type-1",
                        "Content-Type": "text/plain",
                    },
                )
                self.assertEqual(status, 415)

                status, fetched = self.http_get(
                    base + "/v1/field-reports/" + report_id, "operator"
                )
                self.assertEqual(status, 200)
                self.assertEqual(fetched["report"]["id"], report_id)
                status, _ = self.http_get(
                    base + "/v1/field-reports/" + report_id, "viewer"
                )
                self.assertEqual(status, 403)
                status, _ = self.http_get(
                    base + "/v1/field-reports/" + report_id, "analyst"
                )
                self.assertEqual(status, 403)
                status, capabilities = self.http_get(base + "/v1/capabilities")
                self.assertEqual(status, 200)
                self.assertFalse(capabilities["fieldReports"]["createsAlerts"])
                self.assertFalse(capabilities["automatedDispatch"])

                with closing(sqlite3.connect(journal.database_path)) as connection:
                    connection.execute("DROP TRIGGER audit_events_no_update")
                    connection.execute(
                        "UPDATE audit_events SET actor_role = 'ADMIN' WHERE entity_id = ?",
                        (report_id,),
                    )
                    connection.commit()
                status, _ = self.http_get(
                    base + "/v1/field-reports/" + report_id, "operator"
                )
                self.assertEqual(status, 503)
                status, health = self.http_get(base + "/health")
                self.assertEqual(status, 200)
                self.assertFalse(health["persistenceHealthy"])
                self.assertFalse(health["auditIntegrity"])
                status, _ = self.http_post(
                    base + "/v1/field-reports",
                    "operator",
                    json.dumps(payload).encode(),
                    {"Idempotency-Key": "after-tamper"},
                )
                self.assertEqual(status, 503)

            self._with_http_server(Verifier(), checks, storage=journal)

    def test_http_live_assessments_reject_client_verification_claims_and_use_adapter(self):
        class Verifier:
            def verify_bearer_token(self, token):
                return {"uid": "analyst-1", "role": "ANALYST"}

        class Provider:
            source_id = "trusted-test-adapter"

            def read_measurement(self, metric, coordinates):
                values = {"population": 100, "shelterCapacity": 65, "hazardIndex": 1.4}
                item = measurement(values[metric], metric)
                item["provenance"]["sourceId"] = self.source_id
                item["provenance"]["sourceName"] = "Test adapter"
                return item

        def checks(base):
            forged = {
                "population": measurement(100, "population"),
                "shelterCapacity": measurement(65, "capacity"),
            }
            status, _ = self.http_post(
                base + "/v1/assessments/capacity", "analyst", json.dumps(forged).encode()
            )
            self.assertEqual(status, 400)

        self._with_http_server(Verifier(), checks)

        def provider_checks(base):
            status, result = self.http_post(
                base + "/v1/assessments/capacity",
                "analyst",
                json.dumps({"coordinates": {"latitude": 1, "longitude": 2}}).encode(),
            )
            self.assertEqual(status, 200)
            self.assertEqual(result["status"], "prototype_estimate")
            self.assertEqual(result["capacityDeficit"]["value"], 35)
            status, _ = self.http_post(
                base + "/v1/assessments/relocation",
                "analyst",
                json.dumps({"coordinates": {"latitude": 1, "longitude": 2}}).encode(),
            )
            self.assertEqual(status, 502)

        self._with_http_server(
            Verifier(), provider_checks, measurement_provider=Provider()
        )

    def test_http_rate_limit_returns_429(self):
        class Verifier:
            def verify_bearer_token(self, token):
                return {"uid": "analyst", "role": "ANALYST"}

        limiter = RateLimiter(max_requests=1, window_seconds=60, clock=lambda: 120.0)

        def checks(base):
            self.http_post(base + "/v1/assessments/capacity", "analyst")
            status, _ = self.http_post(base + "/v1/assessments/capacity", "analyst")
            self.assertEqual(status, 429)

        self._with_http_server(Verifier(), checks, rate_limiter=limiter)

    def test_rate_limiter_bounds_keys_and_resets_windows(self):
        clock = [120.0]
        limiter = RateLimiter(max_requests=1, window_seconds=60, max_keys=1, clock=lambda: clock[0])
        self.assertEqual(limiter.allow("first"), (True, 60))
        self.assertEqual(limiter.allow("first"), (False, 60))
        self.assertEqual(limiter.allow("second"), (False, 60))
        clock[0] = 180.0
        self.assertEqual(limiter.allow("second"), (True, 60))

    def _with_http_server(
        self, verifier, callback, storage=None, rate_limiter=None, measurement_provider=None
    ):
        server = ThreadingHTTPServer(
            ("127.0.0.1", 0),
            create_handler(
                auth_verifier=verifier,
                storage=storage,
                measurement_provider=measurement_provider,
                clock=lambda: NOW,
                rate_limiter=rate_limiter,
            ),
        )
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            callback(f"http://127.0.0.1:{server.server_port}")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def http_post(self, url, token, body=b"{}", extra_headers=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        headers.update(extra_headers or {})
        try:
            with urlopen(Request(url, data=body, headers=headers, method="POST")) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            raw = error.read()
            return error.code, json.loads(raw) if raw else {}

    def http_get(self, url, token=None):
        request = Request(url, method="GET")
        if token:
            request.add_header("Authorization", "Bearer " + token)
        try:
            with urlopen(request) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            raw = error.read()
            return error.code, json.loads(raw) if raw else {}

    def assert_http_error(self, url, expected, token=None):
        status, _ = self.http_post(url, token)
        self.assertEqual(status, expected)


if __name__ == "__main__":
    unittest.main()
