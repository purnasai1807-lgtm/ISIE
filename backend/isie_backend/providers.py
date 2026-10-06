"""Replaceable observation-provider boundary; no concrete providers are bundled."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from .validation import validate_coordinates, validate_measurement


class MeasurementProvider(Protocol):
    """Adapter contract for a configured, independently verified data source."""

    source_id: str

    def read_measurement(
        self, metric: str, coordinates: dict[str, float]
    ) -> dict[str, Any] | None: ...


def read_verified_measurement(
    provider: MeasurementProvider,
    metric: str,
    coordinates: Any,
    *,
    now: datetime,
    max_age_seconds: float = 24 * 60 * 60,
) -> dict[str, Any] | None:
    """Validate and normalize one provider result before it can enter analysis."""
    normalized_coordinates = validate_coordinates(coordinates)
    measurement = provider.read_measurement(metric, normalized_coordinates)
    if measurement is None:
        return None
    normalized = validate_measurement(
        measurement,
        name=metric,
        now=now,
        max_age_seconds=max_age_seconds,
        allowed_kinds=("verified_real",),
    )
    if normalized["provenance"]["sourceId"] != provider.source_id:
        raise ValueError("provider sourceId does not match the configured adapter")
    return normalized
