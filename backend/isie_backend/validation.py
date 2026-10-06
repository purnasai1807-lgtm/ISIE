"""Input validation for provenance-aware ISIE measurements."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from math import isfinite
from typing import Any, Iterable

PROVENANCE_KINDS = {
    "verified_real",
    "simulated",
    "user_provided",
    "historical",
    "derived",
    "ai_generated",
}


class InputError(ValueError):
    """Invalid request data, suitable for returning as a client error."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


def parse_timestamp(value: Any, field: str) -> datetime:
    if not isinstance(value, str):
        raise InputError(f"{field} must be a valid ISO-compatible timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise InputError(f"{field} must be a valid ISO-compatible timestamp") from exc
    if parsed.tzinfo is None:
        raise InputError(f"{field} must include a timezone")
    return parsed.astimezone(timezone.utc)


def validate_coordinates(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        raise InputError("coordinates are required")
    latitude = value.get("latitude")
    longitude = value.get("longitude")
    if (
        isinstance(latitude, bool)
        or not isinstance(latitude, (int, float))
        or not -90 <= latitude <= 90
    ):
        raise InputError("coordinates.latitude must be between -90 and 90")
    if (
        isinstance(longitude, bool)
        or not isinstance(longitude, (int, float))
        or not -180 <= longitude <= 180
    ):
        raise InputError("coordinates.longitude must be between -180 and 180")
    return {"latitude": float(latitude), "longitude": float(longitude)}


def validate_provenance(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InputError("provenance is required")
    kind = value.get("kind")
    if not isinstance(kind, str) or kind not in PROVENANCE_KINDS:
        raise InputError("provenance.kind is not supported")
    for field in ("sourceId", "sourceName", "processingVersion"):
        if not isinstance(value.get(field), str) or not value[field].strip():
            raise InputError(f"provenance.{field} is required")
    parse_timestamp(value.get("observedAt"), "provenance.observedAt")
    parse_timestamp(value.get("recordedAt"), "provenance.recordedAt")
    confidence = value.get("confidence")
    if (
        isinstance(confidence, bool)
        or not isinstance(confidence, (int, float))
        or not 0 <= confidence <= 1
    ):
        raise InputError("provenance.confidence must be between 0 and 1")
    if kind == "verified_real":
        verification = value.get("verification")
        if (
            not isinstance(verification, dict)
            or not isinstance(verification.get("verifiedBy"), str)
            or not verification["verifiedBy"].strip()
        ):
            raise InputError(
                "verified_real provenance requires verifier and verification timestamp"
            )
        parse_timestamp(
            verification.get("verifiedAt"), "provenance.verification.verifiedAt"
        )
    return deepcopy(value)


def validate_measurement(
    measurement: Any,
    *,
    name: str,
    now: datetime,
    max_age_seconds: float = 24 * 60 * 60,
    allowed_kinds: Iterable[str] = ("verified_real",),
) -> dict[str, Any]:
    if not isinstance(measurement, dict):
        raise InputError(f"{name} measurement is required")
    value = measurement.get("value")
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not isfinite(value)
        or value < 0
    ):
        raise InputError(f"{name}.value must be a finite non-negative number")
    if not isinstance(measurement.get("unit"), str) or not measurement["unit"].strip():
        raise InputError(f"{name}.unit is required")

    provenance = validate_provenance(measurement.get("provenance"))
    observed_at = parse_timestamp(provenance["observedAt"], f"{name}.observedAt")
    now_utc = now.astimezone(timezone.utc)
    age_seconds = (now_utc - observed_at).total_seconds()
    if age_seconds < 0:
        raise InputError(f"{name} observation timestamp is in the future")
    if age_seconds > max_age_seconds:
        raise InputError(f"{name} measurement is stale")
    if provenance["kind"] not in allowed_kinds:
        raise InputError(
            f"{name} provenance must be one of: {', '.join(allowed_kinds)}"
        )
    return {
        "value": value,
        "unit": measurement["unit"].strip(),
        "provenance": provenance,
    }
