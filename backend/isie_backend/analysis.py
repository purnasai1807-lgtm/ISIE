"""Transparent prototype arithmetic; not validated for operational use."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from .validation import InputError, validate_measurement

PROCESSING_VERSION = "isie-prototype-analysis/1.0.0"
LIMITATIONS = [
    "Prototype arithmetic only; not scientifically or operationally validated.",
    "Does not account for accessibility, vulnerability, shelter suitability, travel time, hazard dynamics, or uncertainty in source measurements.",
    "Not an evacuation order or recommendation; human authorities must make and approve all response decisions.",
]


def _unavailable(missing_inputs: list[str], now: datetime) -> dict[str, Any]:
    return {
        "status": "unavailable",
        "reason": "Insufficient verified, fresh inputs for this assessment.",
        "missingInputs": missing_inputs,
        "provenance": [],
        "metadata": {
            "checkedAt": now.isoformat(),
            "processingVersion": PROCESSING_VERSION,
            "confidence": None,
            "limitations": list(LIMITATIONS),
        },
    }


def _validated_inputs(
    inputs: Any,
    required: list[str],
    *,
    now: datetime,
    max_age_seconds: float = 24 * 60 * 60,
    allowed_kinds: tuple[str, ...] = ("verified_real",),
) -> dict[str, Any]:
    if not isinstance(inputs, dict):
        inputs = {}
    missing = [key for key in required if inputs.get(key) is None]
    if missing:
        return {"missingInputs": missing}
    return {
        "values": {
            key: validate_measurement(
                inputs[key],
                name=key,
                now=now,
                max_age_seconds=max_age_seconds,
                allowed_kinds=allowed_kinds,
            )
            for key in required
        }
    }


def assess_capacity(
    inputs: Any,
    *,
    now: datetime | None = None,
    max_age_seconds: float = 24 * 60 * 60,
) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    result = _validated_inputs(
        inputs,
        ["population", "shelterCapacity"],
        now=now,
        max_age_seconds=max_age_seconds,
    )
    if "missingInputs" in result:
        return _unavailable(result["missingInputs"], now)

    population = result["values"]["population"]
    capacity = result["values"]["shelterCapacity"]
    deficit = max(0, population["value"] - capacity["value"])
    percent = 0 if population["value"] == 0 else deficit / population["value"] * 100
    return {
        "status": "prototype_estimate",
        "classification": "derived",
        "capacityDeficit": {
            "value": deficit,
            "unit": "people",
            "formula": "max(0, population - shelterCapacity)",
        },
        "capacityDeficitPercent": {
            "value": round(percent, 2),
            "unit": "%",
            "formula": "max(0, population - shelterCapacity) / population * 100; zero when population is zero",
        },
        "provenance": [population["provenance"], capacity["provenance"]],
        "metadata": {
            "computedAt": now.isoformat(),
            "processingVersion": PROCESSING_VERSION,
            "confidence": min(
                population["provenance"]["confidence"],
                capacity["provenance"]["confidence"],
            ),
            "limitations": list(LIMITATIONS),
        },
    }


def assess_relocation(
    inputs: Any,
    *,
    now: datetime | None = None,
    max_age_seconds: float = 24 * 60 * 60,
) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    result = _validated_inputs(
        inputs,
        ["population", "shelterCapacity", "hazardIndex"],
        now=now,
        max_age_seconds=max_age_seconds,
    )
    if "missingInputs" in result:
        return _unavailable(result["missingInputs"], now)

    population = result["values"]["population"]
    capacity = result["values"]["shelterCapacity"]
    hazard = result["values"]["hazardIndex"]
    if hazard["value"] > 1:
        raise InputError("hazardIndex.value must be between 0 and 1")
    deficit_ratio = (
        0
        if population["value"] == 0
        else max(0, population["value"] - capacity["value"]) / population["value"]
    )
    score = round((deficit_ratio + hazard["value"]) * 50, 2)
    return {
        "status": "prototype_estimate",
        "classification": "derived",
        "prioritizationScore": {
            "value": score,
            "unit": "0-100",
            "formula": "((capacityDeficitRatio + hazardIndex) / 2) * 100",
            "inputs": {
                "capacityDeficitRatio": round(deficit_ratio, 4),
                "hazardIndex": hazard["value"],
            },
        },
        "decision": "No automated relocation or evacuation decision is made.",
        "provenance": [
            population["provenance"],
            capacity["provenance"],
            hazard["provenance"],
        ],
        "metadata": {
            "computedAt": now.isoformat(),
            "processingVersion": PROCESSING_VERSION,
            "confidence": min(
                population["provenance"]["confidence"],
                capacity["provenance"]["confidence"],
                hazard["provenance"]["confidence"],
            ),
            "limitations": [
                "The equal weighting of capacity deficit and hazardIndex is an explicit demonstration assumption, not a validated model.",
                *LIMITATIONS,
            ],
        },
    }


def simulate_capacity(
    inputs: Any,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    result = _validated_inputs(
        inputs,
        ["population", "shelterCapacity"],
        now=now,
        max_age_seconds=float("inf"),
        allowed_kinds=("simulated", "user_provided"),
    )
    if "missingInputs" in result:
        return {
            "status": "unavailable",
            "mode": "simulation",
            "label": "HYPOTHETICAL SIMULATION",
            "reason": "Simulation inputs were not supplied.",
            "missingInputs": result["missingInputs"],
            "provenance": [],
            "metadata": {
                "computedAt": now.isoformat(),
                "processingVersion": PROCESSING_VERSION,
                "confidence": None,
                "limitations": list(LIMITATIONS),
            },
        }

    population = result["values"]["population"]
    capacity = result["values"]["shelterCapacity"]
    return {
        "status": "simulated",
        "mode": "simulation",
        "label": "HYPOTHETICAL SIMULATION — NOT LIVE",
        "capacityDeficit": {
            "value": max(0, population["value"] - capacity["value"]),
            "unit": "people",
            "formula": "max(0, population - shelterCapacity)",
        },
        "provenance": [population["provenance"], capacity["provenance"]],
        "metadata": {
            "computedAt": now.isoformat(),
            "processingVersion": PROCESSING_VERSION,
            "confidence": min(
                population["provenance"]["confidence"],
                capacity["provenance"]["confidence"],
            ),
            "limitations": [
                "Hypothetical inputs are isolated from live assessments and are never written to operational stores.",
                *LIMITATIONS,
            ],
        },
    }


OPERATIONS: dict[str, Callable[..., dict[str, Any]]] = {
    "/v1/assessments/capacity": assess_capacity,
    "/v1/assessments/relocation": assess_relocation,
    "/v1/simulations/capacity": simulate_capacity,
}
