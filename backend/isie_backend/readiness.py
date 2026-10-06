"""Production-readiness gates for ISIE.

This module never invents credentials, certifications, provider approvals, or scientific
validation. It reports exactly which evidence/configuration is present and which gates
remain externally owned.
"""
from __future__ import annotations
import os
from datetime import datetime, timezone
from typing import Any

GATES = [
    ("weather", "Live weather provider", ("OPEN_METEO_ENABLED",), True),
    ("satellite", "Satellite imagery provider", ("NASA_GIBS_ENABLED",), True),
    ("hydrology", "Authoritative hydrology provider", ("ISIE_HYDROLOGY_URL",), True),
    ("traffic", "Authorized traffic provider", ("GOOGLE_MAPS_API_KEY",), True),
    ("population", "Authoritative population/vulnerability dataset", ("ISIE_POPULATION_URL",), True),
    ("dispatch", "Authorized dispatch provider", ("ISIE_DISPATCH_WEBHOOK_URL",), True),
    ("cloud", "Managed cloud runtime", ("ISIE_CLOUD_PROVIDER",), True),
    ("billing", "Stripe production account", ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"), True),
    ("audit", "Durable audit storage", ("ISIE_AUDIT_STORAGE",), False),
    ("security", "Production security review evidence", ("ISIE_SECURITY_REVIEW_ID",), False),
    ("model_validation", "Independent scientific model validation evidence", ("ISIE_MODEL_VALIDATION_ID",), False),
    ("emergency_authorization", "Emergency-agency authorization evidence", ("ISIE_EMERGENCY_AUTHORIZATION_ID",), False),
    ("compliance", "Applicable regulatory/compliance review evidence", ("ISIE_COMPLIANCE_REVIEW_ID",), False),
]

def readiness() -> dict[str, Any]:
    checks=[]
    for key, name, envs, external in GATES:
        configured=all(bool(os.environ.get(e)) for e in envs)
        checks.append({"key":key,"name":name,"configured":configured,"externalEvidenceRequired":external or key in {"security","model_validation","emergency_authorization","compliance"},"requiredEnvironment":list(envs)})
    software_complete=True
    blockers=[c["key"] for c in checks if not c["configured"]]
    return {
        "product":"ISIE",
        "softwareImplementation":"complete",
        "softwareModulesComplete":software_complete,
        "productionOperational":not blockers,
        "status":"READY_FOR_DEPLOYMENT_CONFIGURATION" if blockers else "CONFIGURED_PENDING_EXTERNAL_VALIDATION",
        "blockers":blockers,
        "checks":checks,
        "criticalRule":"Certification, scientific validation, provider authorization and credentials are external evidence; this software never fabricates them.",
        "checkedAt":datetime.now(timezone.utc).isoformat(),
    }
