"""Launch-readiness evidence registry.

This implements the software workflow for production launch evidence without fabricating
credentials, customers, authorizations, certifications, or legal approvals.
"""
from __future__ import annotations
import hashlib, json, os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REQUIRED = {
    "provider_credentials": "Real provider credentials",
    "production_deployment": "Production deployment",
    "customer_onboarding": "Real customer onboarding",
    "model_validation": "Independent model validation",
    "security_assessment": "Security penetration assessment",
    "emergency_authorization": "Emergency-agency authorization",
    "legal_compliance": "Regulatory/legal compliance",
    "paying_customers": "Actual paying customers",
    "emergency_certification": "Emergency certification",
}

class LaunchEvidenceRegistry:
    def __init__(self, path: str | None = None):
        self.path = Path(path or os.environ.get("ISIE_LAUNCH_EVIDENCE_FILE", "launch_evidence.json"))
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> dict[str, Any]:
        if not self.path.exists():
            return {"version": 1, "evidence": {}, "events": []}
        return json.loads(self.path.read_text(encoding="utf-8"))

    def _save(self, data: dict[str, Any]) -> None:
        self.path.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")

    def status(self) -> dict[str, Any]:
        data = self._load()
        checks = []
        for key, label in REQUIRED.items():
            item = data["evidence"].get(key, {})
            checks.append({
                "key": key, "name": label,
                "verified": bool(item.get("verified")),
                "evidenceId": item.get("evidenceId"),
                "source": item.get("source"),
                "verifiedAt": item.get("verifiedAt"),
                "external": True,
            })
        return {
            "product": "ISIE",
            "softwareWorkflow": "complete",
            "checks": checks,
            "verifiedCount": sum(1 for x in checks if x["verified"]),
            "total": len(checks),
            "launchReady": all(x["verified"] for x in checks),
            "rule": "Only real, reviewable evidence may mark a gate verified. The application never generates approval, certification, customer, or security evidence itself.",
        }

    def record(self, key: str, evidence_id: str, source: str, verified: bool = False) -> dict[str, Any]:
        if key not in REQUIRED:
            raise ValueError("unknown evidence gate")
        if not evidence_id or not source:
            raise ValueError("evidence_id and source are required")
        # The system stores the supplied evidence reference; it does not invent verification.
        now = datetime.now(timezone.utc).isoformat()
        data = self._load()
        entry = {"evidenceId": evidence_id, "source": source, "verified": bool(verified), "verifiedAt": now if verified else None}
        data["evidence"][key] = entry
        digest = hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
        data["events"].append({"action": "evidence_recorded", "gate": key, "digest": digest, "at": now})
        self._save(data)
        return entry
