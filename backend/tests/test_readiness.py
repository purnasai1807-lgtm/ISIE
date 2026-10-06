import os
from isie_backend.readiness import readiness

def test_readiness_never_fabricates_external_evidence(monkeypatch):
    for k in [
        'ISIE_HYDROLOGY_URL','GOOGLE_MAPS_API_KEY','ISIE_POPULATION_URL',
        'ISIE_DISPATCH_WEBHOOK_URL','ISIE_CLOUD_PROVIDER','STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET','ISIE_SECURITY_REVIEW_ID','ISIE_MODEL_VALIDATION_ID',
        'ISIE_EMERGENCY_AUTHORIZATION_ID','ISIE_COMPLIANCE_REVIEW_ID','ISIE_AUDIT_STORAGE'
    ]: monkeypatch.delenv(k, raising=False)
    r=readiness()
    assert r['softwareModulesComplete'] is True
    assert r['productionOperational'] is False
    assert 'model_validation' in r['blockers']
    assert 'emergency_authorization' in r['blockers']
    assert r['criticalRule']

def test_readiness_accepts_explicit_evidence(monkeypatch):
    vals={
      'ISIE_HYDROLOGY_URL':'https://provider.invalid/hydro', 'GOOGLE_MAPS_API_KEY':'configured',
      'ISIE_POPULATION_URL':'https://provider.invalid/pop', 'ISIE_DISPATCH_WEBHOOK_URL':'https://provider.invalid/dispatch',
      'ISIE_CLOUD_PROVIDER':'managed', 'STRIPE_SECRET_KEY':'sk_live_configured','STRIPE_WEBHOOK_SECRET':'whsec_configured',
      'ISIE_AUDIT_STORAGE':'managed','ISIE_SECURITY_REVIEW_ID':'SEC-1','ISIE_MODEL_VALIDATION_ID':'VAL-1',
      'ISIE_EMERGENCY_AUTHORIZATION_ID':'AUTH-1','ISIE_COMPLIANCE_REVIEW_ID':'COMP-1'
    }
    for k,v in vals.items(): monkeypatch.setenv(k,v)
    monkeypatch.setenv('OPEN_METEO_ENABLED','1'); monkeypatch.setenv('NASA_GIBS_ENABLED','1')
    r=readiness()
    assert r['productionOperational'] is True
    assert r['blockers']==[]
