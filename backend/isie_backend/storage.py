"""Local append-only prototype journal for unverified user-submitted field reports."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any


class IdempotencyConflict(ValueError):
    """The caller reused an idempotency key for a different report body."""


class AuditIntegrityError(RuntimeError):
    """The journal integrity check failed; reads and writes must fail closed."""


class SQLiteJournal:
    def __init__(self, database_path: str) -> None:
        if database_path == ":memory:":
            raise ValueError("SQLiteJournal requires a persistent database path")
        self.database_path = database_path
        self._uri = database_path.startswith("file:")
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            self.database_path,
            timeout=10,
            uri=self._uri,
            isolation_level=None,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        connection.execute("PRAGMA synchronous = FULL")
        return connection

    @contextmanager
    def _connection(self):
        connection = self._connect()
        try:
            yield connection
        finally:
            connection.close()

    def _initialize(self) -> None:
        if self.database_path != ":memory:" and not self._uri:
            path = Path(self.database_path)
            path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            existed = path.exists()
        else:
            existed = True
        with self._connection() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.execute("PRAGMA synchronous = FULL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS field_reports (
                    report_id TEXT PRIMARY KEY,
                    actor_uid TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL,
                    body_sha256 TEXT NOT NULL,
                    report_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(actor_uid, idempotency_key)
                );
                CREATE TABLE IF NOT EXISTS audit_events (
                    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id TEXT NOT NULL UNIQUE,
                    occurred_at TEXT NOT NULL,
                    actor_uid TEXT NOT NULL,
                    actor_role TEXT NOT NULL,
                    action TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    payload_sha256 TEXT NOT NULL,
                    previous_hash TEXT NOT NULL,
                    event_hash TEXT NOT NULL UNIQUE
                );
                CREATE TRIGGER IF NOT EXISTS field_reports_no_update
                BEFORE UPDATE ON field_reports BEGIN
                    SELECT RAISE(ABORT, 'field reports are append-only');
                END;
                CREATE TRIGGER IF NOT EXISTS field_reports_no_delete
                BEFORE DELETE ON field_reports BEGIN
                    SELECT RAISE(ABORT, 'field reports are append-only');
                END;
                CREATE TRIGGER IF NOT EXISTS audit_events_no_update
                BEFORE UPDATE ON audit_events BEGIN
                    SELECT RAISE(ABORT, 'audit events are append-only');
                END;
                CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
                BEFORE DELETE ON audit_events BEGIN
                    SELECT RAISE(ABORT, 'audit events are append-only');
                END;
                """
            )
        if not existed and not self._uri and os.name != "nt":
            os.chmod(self.database_path, 0o600)

    @staticmethod
    def _canonical(value: Any) -> str:
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)

    @staticmethod
    def _event_hash(event: dict[str, str]) -> str:
        encoded = SQLiteJournal._canonical(event).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def create_field_report(
        self,
        *,
        actor_uid: str,
        actor_role: str,
        idempotency_key: str,
        report: dict[str, Any],
        idempotency_payload: dict[str, Any],
        recorded_at: datetime,
    ) -> tuple[dict[str, Any], bool]:
        serialized = self._canonical(idempotency_payload)
        body_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            if not self._verify_audit_chain(connection):
                connection.rollback()
                raise AuditIntegrityError("audit journal integrity check failed")
            prior = connection.execute(
                """SELECT body_sha256, report_json FROM field_reports
                   WHERE actor_uid = ? AND idempotency_key = ?""",
                (actor_uid, idempotency_key),
            ).fetchone()
            if prior:
                if prior["body_sha256"] != body_hash:
                    connection.rollback()
                    raise IdempotencyConflict("idempotency key was already used with a different body")
                connection.commit()
                return json.loads(prior["report_json"]), True

            report_id = str(uuid.uuid4())
            report_record = {
                "id": report_id,
                **report,
                "submittedBy": actor_uid,
                "submittedRole": actor_role,
                "recordedAt": recorded_at.isoformat(),
                "classification": "USER_PROVIDED_UNVERIFIED",
            }
            report_json = self._canonical(report_record)
            connection.execute(
                """INSERT INTO field_reports
                   (report_id, actor_uid, idempotency_key, body_sha256, report_json, created_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    report_id,
                    actor_uid,
                    idempotency_key,
                    body_hash,
                    report_json,
                    recorded_at.isoformat(),
                ),
            )

            previous = connection.execute(
                "SELECT event_hash FROM audit_events ORDER BY sequence DESC LIMIT 1"
            ).fetchone()
            audit_fields = {
                "eventId": str(uuid.uuid4()),
                "occurredAt": recorded_at.isoformat(),
                "actorUid": actor_uid,
                "actorRole": actor_role,
                "action": "FIELD_REPORT_SUBMITTED",
                "entityId": report_id,
                "payloadSha256": hashlib.sha256(report_json.encode("utf-8")).hexdigest(),
                "previousHash": previous["event_hash"] if previous else "GENESIS",
            }
            event_hash = self._event_hash(audit_fields)
            connection.execute(
                """INSERT INTO audit_events
                   (event_id, occurred_at, actor_uid, actor_role, action, entity_id,
                    payload_sha256, previous_hash, event_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    audit_fields["eventId"],
                    audit_fields["occurredAt"],
                    audit_fields["actorUid"],
                    audit_fields["actorRole"],
                    audit_fields["action"],
                    audit_fields["entityId"],
                    audit_fields["payloadSha256"],
                    audit_fields["previousHash"],
                    event_hash,
                ),
            )
            connection.commit()
            return report_record, False

    def get_field_report(self, report_id: str) -> dict[str, Any] | None:
        with self._connection() as connection:
            connection.execute("BEGIN")
            if not self._verify_audit_chain(connection):
                connection.rollback()
                raise AuditIntegrityError("audit journal integrity check failed")
            row = connection.execute(
                "SELECT report_json FROM field_reports WHERE report_id = ?",
                (report_id,),
            ).fetchone()
            connection.commit()
            return json.loads(row["report_json"]) if row else None

    def verify_audit_chain(self) -> bool:
        with self._connection() as connection:
            return self._verify_audit_chain(connection)

    @classmethod
    def _verify_audit_chain(cls, connection: sqlite3.Connection) -> bool:
        counts = connection.execute(
            """SELECT
                 (SELECT COUNT(*) FROM field_reports) AS reports,
                 (SELECT COUNT(*) FROM audit_events WHERE action = 'FIELD_REPORT_SUBMITTED') AS report_events"""
        ).fetchone()
        if counts["reports"] != counts["report_events"]:
            return False
        rows = connection.execute(
            """SELECT a.event_id, a.occurred_at, a.actor_uid, a.actor_role, a.action,
                      a.entity_id, a.payload_sha256, a.previous_hash, a.event_hash,
                      r.report_json
               FROM audit_events AS a
               LEFT JOIN field_reports AS r ON r.report_id = a.entity_id
               ORDER BY a.sequence"""
        )
        previous_hash = "GENESIS"
        for row in rows:
            event = {
                "eventId": row["event_id"],
                "occurredAt": row["occurred_at"],
                "actorUid": row["actor_uid"],
                "actorRole": row["actor_role"],
                "action": row["action"],
                "entityId": row["entity_id"],
                "payloadSha256": row["payload_sha256"],
                "previousHash": row["previous_hash"],
            }
            if event["previousHash"] != previous_hash:
                return False
            if row["action"] == "FIELD_REPORT_SUBMITTED":
                if row["report_json"] is None:
                    return False
                report_hash = hashlib.sha256(row["report_json"].encode("utf-8")).hexdigest()
                if not hmac.compare_digest(report_hash, row["payload_sha256"]):
                    return False
            expected = cls._event_hash(event)
            if not hmac.compare_digest(expected, row["event_hash"]):
                return False
            previous_hash = row["event_hash"]
        return True

    def capabilities(self) -> dict[str, Any]:
        with self._connection() as connection:
            reports = connection.execute("SELECT COUNT(*) AS total FROM field_reports").fetchone()["total"]
            audits = connection.execute("SELECT COUNT(*) AS total FROM audit_events").fetchone()["total"]
        return {
            "fieldReports": {"enabled": True, "count": reports, "classification": "USER_PROVIDED_UNVERIFIED"},
            "auditJournal": {
                "enabled": True,
                "appendOnlyTriggers": True,
                "hashChainValid": self.verify_audit_chain(),
                "eventCount": audits,
            },
        }
