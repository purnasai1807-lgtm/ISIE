"""Small standard-library HTTP server with explicit auth adapter boundary."""

from __future__ import annotations

import importlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlsplit

from .analysis import OPERATIONS
from .providers import read_verified_measurement
from .startup_services import capabilities as startup_capabilities, weather, satellite_layer, configured_proxy, traffic_status, human_confirmed_dispatch, forecast_baseline, risk_model
from .billing import catalog as billing_catalog, create_checkout
from .readiness import readiness
from .model_validation import validation_report
from .launch_readiness import LaunchEvidenceRegistry
from .rate_limit import RateLimiter
from .storage import AuditIntegrityError, IdempotencyConflict
from .validation import InputError, parse_timestamp, validate_coordinates

MAX_BODY_BYTES = 64 * 1024
ROLES_ALLOWED_TO_ANALYZE = {"ADMIN", "OPERATOR", "ANALYST"}
ROLES_ALLOWED_TO_READ_REPORTS = {"ADMIN", "OPERATOR"}
ROLES_ALLOWED_TO_SUBMIT_REPORTS = {"ADMIN", "OPERATOR"}
REPORT_CATEGORIES = {
    "HAZARD_OBSERVATION",
    "NEED_REPORTED",
    "INFRASTRUCTURE_OBSERVATION",
    "OTHER",
}
LOGGER = logging.getLogger("isie.backend")


def load_optional_adapter(variable_name: str) -> Any | None:
    module_name = os.environ.get(variable_name)
    if not module_name:
        return None
    module = importlib.import_module(module_name)
    return getattr(module, "adapter", module)


def create_handler(
    *,
    auth_verifier: Any = None,
    storage: Any = None,
    measurement_provider: Any = None,
    clock: Any = None,
    rate_limiter: Any = None,
) -> type[BaseHTTPRequestHandler]:
    def now():
        if clock:
            return clock()
        return datetime.now(timezone.utc)

    limiter = rate_limiter or RateLimiter()

    class Handler(BaseHTTPRequestHandler):
        server_version = "ISIEBackend/0.2"
        sys_version = ""

        def log_message(self, format: str, *args: Any) -> None:
            LOGGER.info("%s %s", self.command, urlsplit(self.path).path)

        def _send(self, status: int, data: dict[str, Any]) -> None:
            encoded = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self) -> None:
            path = urlsplit(self.path).path
            if path == "/health":
                persistence = None
                if storage:
                    try:
                        persistence = storage.capabilities()
                    except Exception:
                        LOGGER.exception("Unable to inspect persistence journal")
                self._send(
                    200,
                    {
                        "status": "limited",
                        "service": "isie-backend",
                        "authenticationConfigured": bool(auth_verifier),
                        "persistenceConfigured": bool(storage),
                        "persistenceHealthy": bool(
                            persistence and persistence["auditJournal"]["hashChainValid"]
                        ),
                        "auditIntegrity": persistence["auditJournal"]["hashChainValid"] if persistence else None,
                        "providersConfigured": bool(measurement_provider),
                        "productionReady": False,
                        "note": "Prototype only. No verified providers, validated models, emergency dispatch, or production controls are configured.",
                    },
                )
                return
            if path == "/v1/billing/catalog":
                self._send(200, billing_catalog())
                return
            if path == "/v1/startup/capabilities":
                self._send(200, startup_capabilities())
                return
            if path == "/v1/startup/readiness":
                self._send(200, readiness())
                return
            if path == "/v1/startup/launch-readiness":
                self._send(200, LaunchEvidenceRegistry().status())
                return
            if path == "/v1/integrations/status":
                self._send(200, startup_capabilities())
                return
            if path == "/v1/capabilities":
                self._send(
                    200,
                    {
                        "classification": "PROTOTYPE_NOT_FOR_OPERATIONAL_USE",
                        "authenticationConfigured": bool(auth_verifier),
                        "analyses": sorted(OPERATIONS),
                        "fieldReports": {
                            "enabled": bool(storage) and bool(auth_verifier),
                            "storageAvailable": bool(storage),
                            "purpose": "User-provided, unverified reports only",
                            "createsAlerts": False,
                            "feedsAssessments": False,
                        },
                        "providersConfigured": bool(measurement_provider),
                        "automatedAlerts": False,
                        "automatedDispatch": False,
                        "evacuationOrders": False,
                    },
                )
                return
            report_match = re.fullmatch(r"/v1/field-reports/([0-9a-fA-F-]{36})", path)
            if report_match:
                if not self._rate_limit(f"ip:{self.client_address[0]}"):
                    return
                principal = self._authenticate()
                if principal is None:
                    return
                if not self._rate_limit(f"uid:{principal['uid']}"):
                    return
                if principal["role"] not in ROLES_ALLOWED_TO_READ_REPORTS:
                    self._send(403, {"error": "insufficient_role"})
                    return
                if not storage:
                    self._send(503, {"error": "report_storage_not_configured"})
                    return
                try:
                    report = storage.get_field_report(report_match.group(1))
                except AuditIntegrityError:
                    self._send(503, {"error": "audit_integrity_check_failed"})
                    return
                except Exception:
                    LOGGER.exception("Unable to verify or read the report journal")
                    self._send(503, {"error": "report_storage_unavailable"})
                    return
                if report is None:
                    self._send(404, {"error": "not_found"})
                    return
                self._send(200, {"report": report})
                return
            self._send(404, {"error": "not_found"})

        def do_POST(self) -> None:
            path = urlsplit(self.path).path
            if path == "/v1/startup/launch-evidence":
                principal = self._authenticate()
                if principal is None: return
                if principal["role"] != "ADMIN":
                    self._send(403, {"error":"insufficient_role"}); return
                try:
                    body = self._read_json_body()
                    result = LaunchEvidenceRegistry().record(body["gate"], body["evidenceId"], body["source"], bool(body.get("verified", False)))
                    self._send(201, {"evidence": result, "status": LaunchEvidenceRegistry().status()})
                except (KeyError, TypeError, ValueError) as error:
                    self._send(400, {"error":"invalid_input", "message":str(error)})
                return
            if path == "/v1/billing/checkout":
                principal = self._authenticate()
                if principal is None: return
                if principal["role"] != "ADMIN":
                    self._send(403, {"error":"insufficient_role"}); return
                try:
                    body=self._read_json_body(); result=create_checkout(body["plan"],body["successUrl"],body["cancelUrl"]); self._send(200,result)
                except (KeyError,TypeError,ValueError) as error: self._send(400,{"error":"invalid_input","message":str(error)})
                return
            if path in {"/v1/integrations/weather", "/v1/integrations/satellite", "/v1/integrations/hydrology", "/v1/integrations/population", "/v1/integrations/traffic", "/v1/startup/forecast", "/v1/startup/risk", "/v1/startup/dispatch", "/v1/startup/model-validation"}:
                principal = self._authenticate()
                if principal is None: return
                if principal["role"] not in {"ADMIN", "OPERATOR", "ANALYST"}:
                    self._send(403, {"error":"insufficient_role"}); return
                try:
                    body=self._read_json_body()
                    if path.endswith("/weather"): result=weather(float(body["latitude"]),float(body["longitude"]))
                    elif path.endswith("/satellite"): result=satellite_layer(body.get("date"))
                    elif path.endswith("/hydrology"): result=configured_proxy("hydrology",body)
                    elif path.endswith("/population"): result=configured_proxy("population",body)
                    elif path.endswith("/traffic"): result=traffic_status(body["origin"],body["destination"])
                    elif path.endswith("/forecast"): result=forecast_baseline(body["series"],int(body.get("horizon",6)))
                    elif path.endswith("/risk"): result=risk_model(body["inputs"])
                    elif path.endswith("/model-validation"): result=validation_report(body["actual"],body["predicted"],model_version=body["modelVersion"],dataset_id=body["datasetId"])
                    else: result=human_confirmed_dispatch(body)
                    self._send(200,result)
                except (KeyError,TypeError,ValueError) as error: self._send(400,{"error":"invalid_input","message":str(error)})
                except Exception:
                    LOGGER.exception("Startup integration failed"); self._send(502,{"error":"integration_unavailable"})
                return
            operation = OPERATIONS.get(path)
            is_report = path == "/v1/field-reports"
            if operation is None and not is_report:
                self._send(404, {"error": "not_found"})
                return
            ip_key = f"ip:{self.client_address[0]}"
            allowed, retry_after = limiter.allow(ip_key)
            if not allowed:
                self._send_rate_limited(retry_after)
                return
            principal = self._authenticate()
            if principal is None:
                return

            identity_key = f"uid:{principal['uid']}"
            allowed, retry_after = limiter.allow(identity_key)
            if not allowed:
                self._send_rate_limited(retry_after)
                return

            try:
                body = self._read_json_body()
                if is_report:
                    if principal["role"] not in ROLES_ALLOWED_TO_SUBMIT_REPORTS:
                        self._send(403, {"error": "insufficient_role"})
                        return
                    if not storage:
                        self._send(503, {"error": "report_storage_not_configured"})
                        return
                    idempotency_key = self.headers.get("Idempotency-Key", "")
                    if not re.fullmatch(r"[A-Za-z0-9._~-]{1,128}", idempotency_key):
                        raise InputError("Idempotency-Key header is required (1-128 safe characters)")
                    report = self._validate_field_report(body, now())
                    try:
                        result, replayed = storage.create_field_report(
                            actor_uid=principal["uid"],
                            actor_role=principal["role"],
                            idempotency_key=idempotency_key,
                            report=report,
                            idempotency_payload=body,
                            recorded_at=now(),
                        )
                    except IdempotencyConflict as error:
                        self._send(409, {"error": "idempotency_conflict", "message": str(error)})
                        return
                    except AuditIntegrityError:
                        self._send(503, {"error": "audit_integrity_check_failed"})
                        return
                    self._send(200 if replayed else 201, {"report": result, "replayed": replayed})
                    return
                if principal["role"] not in ROLES_ALLOWED_TO_ANALYZE:
                    self._send(403, {"error": "insufficient_role"})
                    return
                if path in {"/v1/assessments/capacity", "/v1/assessments/relocation"}:
                    if set(body) != {"coordinates"}:
                        raise InputError(
                            "live assessments accept coordinates only; measurements must come from a configured trusted provider"
                        )
                    coordinates = validate_coordinates(body.get("coordinates"))
                    if measurement_provider is None:
                        required = (
                            ["population", "shelterCapacity", "hazardIndex"]
                            if path.endswith("/relocation")
                            else ["population", "shelterCapacity"]
                        )
                        self._send(
                            200,
                            {
                                "status": "unavailable",
                                "reason": "No trusted measurement provider is configured; caller-supplied verified provenance is not accepted.",
                                "missingInputs": required,
                                "provenance": [],
                                "metadata": {
                                    "checkedAt": now().isoformat(),
                                    "processingVersion": "isie-prototype-analysis/1.0.0",
                                    "confidence": None,
                                    "limitations": [
                                        "No source adapter is configured to independently verify measurements.",
                                        "No assessment is an evacuation order or operational recommendation.",
                                    ],
                                },
                            },
                        )
                        return
                    required = (
                        ["population", "shelterCapacity", "hazardIndex"]
                        if path.endswith("/relocation")
                        else ["population", "shelterCapacity"]
                    )
                    provided = {}
                    try:
                        for metric in required:
                            measurement = read_verified_measurement(
                                measurement_provider,
                                metric,
                                coordinates,
                                now=now(),
                            )
                            if measurement is not None:
                                provided[metric] = measurement
                    except Exception:
                        LOGGER.exception("Configured measurement provider returned rejected or unavailable data")
                        self._send(502, {"error": "provider_data_unavailable_or_rejected"})
                        return
                    try:
                        result = operation(provided, now=now())
                    except InputError:
                        LOGGER.warning("Configured provider measurements failed analysis constraints")
                        self._send(502, {"error": "provider_measurements_outside_analysis_constraints"})
                        return
                    self._send(200, result)
                    return
                if path == "/v1/simulations/capacity":
                    if set(body) != {"inputs"} or not isinstance(body.get("inputs"), dict):
                        raise InputError("simulations accept only an inputs object")
                    self._send(200, operation(body["inputs"], now=now()))
                    return
                self._send(200, operation(body, now=now()))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._send(400, {"error": "invalid_input", "message": "request body must be valid JSON"})
            except InputError as error:
                self._send(
                    error.status,
                    {"error": "invalid_input", "message": str(error)},
                )
            except Exception:
                LOGGER.exception("ISIE backend request failed")
                self._send(500, {"error": "internal_error"})

        def _authenticate(self) -> dict[str, Any] | None:
            if auth_verifier is None or not callable(
                getattr(auth_verifier, "verify_bearer_token", None)
            ):
                self._send(503, {"error": "authentication_provider_not_configured"})
                return None
            authorization = self.headers.get("Authorization", "")
            parts = authorization.split()
            if len(parts) != 2 or parts[0].lower() != "bearer":
                self._send(401, {"error": "authentication_required"})
                return None
            try:
                principal = auth_verifier.verify_bearer_token(parts[1])
            except Exception:
                self._send(401, {"error": "invalid_authentication"})
                return None
            if (
                not isinstance(principal, dict)
                or not isinstance(principal.get("uid"), str)
                or not principal["uid"]
                or principal.get("role") not in {"ADMIN", "OPERATOR", "ANALYST", "VIEWER"}
            ):
                self._send(403, {"error": "insufficient_role"})
                return None
            return principal

        def _rate_limit(self, key: str) -> bool:
            allowed, retry_after = limiter.allow(key)
            if not allowed:
                self._send_rate_limited(retry_after)
            return allowed

        def _send_rate_limited(self, retry_after: int) -> None:
            self.send_response(429)
            self.send_header("Retry-After", str(retry_after))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def _read_json_body(self) -> dict[str, Any]:
            if self.headers.get("Transfer-Encoding"):
                raise InputError("Transfer-Encoding is not supported")
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            if content_type != "application/json":
                raise InputError("Content-Type must be application/json", 415)
            try:
                content_length = int(self.headers.get("Content-Length", ""))
            except ValueError as error:
                raise InputError("Content-Length must be an integer") from error
            if content_length <= 0:
                raise InputError("request body is required")
            if content_length > MAX_BODY_BYTES:
                raise InputError("request body exceeds 64 KiB", 413)
            raw_body = self.rfile.read(content_length)
            body = json.loads(raw_body.decode("utf-8"))
            if not isinstance(body, dict):
                raise InputError("request body must be a valid JSON object")
            return body

        @staticmethod
        def _validate_field_report(body: dict[str, Any], submitted_at: datetime) -> dict[str, Any]:
            allowed = {"title", "details", "category", "locationName", "coordinates", "observedAt"}
            unknown = set(body) - allowed
            if unknown:
                raise InputError(f"unsupported fields: {', '.join(sorted(unknown))}")

            def required_text(field: str, maximum: int) -> str:
                value = body.get(field)
                if not isinstance(value, str) or not value.strip() or len(value.strip()) > maximum:
                    raise InputError(f"{field} must be non-empty and at most {maximum} characters")
                return value.strip()

            category = body.get("category")
            if not isinstance(category, str) or category not in REPORT_CATEGORIES:
                raise InputError(f"category must be one of: {', '.join(sorted(REPORT_CATEGORIES))}")
            title = required_text("title", 120)
            details = required_text("details", 4000)
            location_name = body.get("locationName")
            if location_name is not None and (
                not isinstance(location_name, str) or len(location_name.strip()) > 160
            ):
                raise InputError("locationName must be at most 160 characters")
            coordinates = body.get("coordinates")
            if coordinates is not None:
                coordinates = validate_coordinates(coordinates)
            observed_at = body.get("observedAt")
            if observed_at is not None:
                parsed_observed_at = parse_timestamp(observed_at, "observedAt")
                if parsed_observed_at > submitted_at:
                    raise InputError("observedAt cannot be in the future")
                observed_at = parsed_observed_at.isoformat()
            return {
                "title": title,
                "details": details,
                "category": category,
                "locationName": location_name.strip() if location_name else None,
                "coordinates": coordinates,
                "observedAt": observed_at or submitted_at.isoformat(),
                "provenance": {
                    "kind": "user_provided",
                    "sourceName": "Authenticated user submission",
                    "observedAt": observed_at or submitted_at.isoformat(),
                    "recordedAt": submitted_at.isoformat(),
                    "processingVersion": "field-report-intake/1.0.0",
                    "confidence": None,
                },
            }

    return Handler


def main() -> None:
    from .firebase_auth import FirebaseAdminAuthVerifier
    from .storage import SQLiteJournal

    port_text = os.environ.get("PORT", "3100")
    try:
        port = int(port_text)
    except ValueError as error:
        raise SystemExit("PORT must be an integer between 1 and 65535") from error
    if not 1 <= port <= 65535:
        raise SystemExit("PORT must be an integer between 1 and 65535")

    try:
        auth_verifier = FirebaseAdminAuthVerifier.from_environment()
    except Exception:
        LOGGER.exception("Firebase authentication is not configured; protected routes will fail closed")
        auth_verifier = None
    database_path = os.environ.get("ISIE_DATABASE_PATH", "./data/isie.sqlite3")
    storage = SQLiteJournal(database_path)
    try:
        measurement_provider = load_optional_adapter("ISIE_MEASUREMENT_PROVIDER_MODULE")
    except Exception:
        LOGGER.exception("Configured measurement provider failed to load")
        measurement_provider = None
    host = os.environ.get("HOST", "127.0.0.1")
    if host not in {"127.0.0.1", "::1", "localhost"}:
        LOGGER.warning(
            "Binding to %s exposes this prototype; use only behind authenticated TLS termination and network controls.",
            host,
        )
    server = ThreadingHTTPServer(
        (host, port),
        create_handler(
            auth_verifier=auth_verifier,
            storage=storage,
            measurement_provider=measurement_provider,
        ),
    )
    LOGGER.info("ISIE backend listening on %s:%d", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    main()
