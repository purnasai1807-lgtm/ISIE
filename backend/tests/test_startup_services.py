from isie_backend.startup_services import capabilities, forecast_baseline, risk_model

def test_capabilities_cover_startup_modules():
    keys={x["key"] for x in capabilities()["services"]}
    expected={"weather","satellite","hydrology","traffic","population","dispatch","evacuation","shelter","forecasting","risk","audit","cloud","observability","billing"}
    assert expected <= keys

def test_forecast_is_explicitly_unvalidated():
    r=forecast_baseline([1,2,3],2); assert r["validated"] is False and len(r["forecast"])==2

def test_risk_is_explicitly_unvalidated():
    r=risk_model({"hazard":.5,"exposure":.5,"vulnerability":.5}); assert r["scientificallyValidated"] is False and r["score"]==50
from isie_backend.billing import catalog

def test_billing_catalog_has_startup_plans():
    assert {"pilot", "organization", "enterprise"} <= set(catalog()["plans"])
