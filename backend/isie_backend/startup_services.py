"""Safe, explicit startup integration boundaries for ISIE."""
from __future__ import annotations
import json, os, urllib.parse, urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

@dataclass(frozen=True)
class ServiceStatus:
    key: str; name: str; category: str; configured: bool; operational: bool; mode: str; note: str
    def as_dict(self): return self.__dict__.copy()

def _configured(*names): return all(bool(os.environ.get(n)) for n in names)

def service_statuses():
    return [
      ServiceStatus("weather","Weather observations","data",True,True,"public-api","Open-Meteo adapter; source/timestamp retained."),
      ServiceStatus("satellite","Satellite / remote sensing","data",True,True,"public-imagery","NASA GIBS imagery endpoint; contextual evidence only."),
      ServiceStatus("hydrology","Hydrology / water levels","data",_configured("ISIE_HYDROLOGY_URL"),_configured("ISIE_HYDROLOGY_URL"),"adapter","Configure an authoritative hydrology endpoint and parser."),
      ServiceStatus("traffic","Road / traffic","data",_configured("GOOGLE_MAPS_API_KEY"),_configured("GOOGLE_MAPS_API_KEY"),"google-routes","Requires authorized Google Maps Routes API."),
      ServiceStatus("population","Population / vulnerability","data",_configured("ISIE_POPULATION_URL"),_configured("ISIE_POPULATION_URL"),"adapter","Configure an authoritative dataset and provenance metadata."),
      ServiceStatus("dispatch","Emergency dispatch","action",_configured("ISIE_DISPATCH_WEBHOOK_URL"),False,"human-confirmed","Never automatic; authorized operator confirmation required."),
      ServiceStatus("evacuation","Evacuation workflow","action",True,False,"human-approved","Approval record supported; no autonomous evacuation order."),
      ServiceStatus("shelter","Shelter / resource reservation","operations",True,True,"application","Reservation workflow supported; external sync is provider-specific."),
      ServiceStatus("forecasting","Forecasting engine","analytics",True,False,"model-interface","Versioned model interface; production validation requires independent validation."),
      ServiceStatus("risk","Risk model","analytics",True,False,"model-interface","Versioned provenance-aware score; scientific validation remains required."),
      ServiceStatus("audit","Production audit trail","security",True,True,"append-only-journal","Hash-chained journal available; use durable managed storage in production."),
      ServiceStatus("cloud","Cloud deployment","platform",_configured("ISIE_CLOUD_PROVIDER"),_configured("ISIE_CLOUD_PROVIDER"),"container-ready","Docker deployment included; configure managed runtime/secrets."),
      ServiceStatus("observability","Monitoring / observability","platform",True,True,"structured-logs-health","Health endpoint, logging and rate limits included."),
      ServiceStatus("billing","Commercial billing","commerce",_configured("STRIPE_SECRET_KEY"),_configured("STRIPE_SECRET_KEY"),"stripe","Stripe integration boundary enabled when credentials are configured."),
    ]

def capabilities():
    return {"product":"ISIE","classification":"STARTUP_MVP_WITH_SAFE_INTEGRATION_BOUNDARIES","services":[s.as_dict() for s in service_statuses()],"liveDataRule":"No live value is invented; unconfigured providers return unavailable.","highImpactActionRule":"Emergency dispatch and evacuation require authorized human confirmation.","validationRule":"A model is not labelled scientifically validated until independent domain validation is supplied.","checkedAt":datetime.now(timezone.utc).isoformat()}

def _json_get(url, timeout=8):
    req=urllib.request.Request(url,headers={"User-Agent":"ISIE/1.0"})
    with urllib.request.urlopen(req,timeout=timeout) as r: return json.loads(r.read().decode())

def weather(latitude,longitude):
    q=urllib.parse.urlencode({"latitude":latitude,"longitude":longitude,"current":"temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation","timezone":"UTC"})
    return {"status":"verified_external_observation","sourceId":"open-meteo","data":_json_get("https://api.open-meteo.com/v1/forecast?"+q)}

def satellite_layer(date_utc=None):
    date_utc=date_utc or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return {"status":"verified_external_imagery_endpoint","sourceId":"nasa-gibs","date":date_utc,"tileTemplate":"https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg","note":"Contextual imagery only; not an automated emergency verdict."}

def configured_proxy(name,payload):
    env={"hydrology":"ISIE_HYDROLOGY_URL","population":"ISIE_POPULATION_URL"}[name]; url=os.environ.get(env)
    if not url:return {"status":"unavailable","reason":f"{env} is not configured","sourceId":None}
    q=urllib.parse.urlencode(payload); return {"status":"provider_configured","sourceId":name,"endpoint":url,"request":url+("&" if "?" in url else "?")+q}

def traffic_status(origin,destination):
    if not os.environ.get("GOOGLE_MAPS_API_KEY"): return {"status":"unavailable","reason":"GOOGLE_MAPS_API_KEY is not configured"}
    return {"status":"provider_configured","sourceId":"google-routes","origin":origin,"destination":destination,"note":"Use the server/frontend Google Routes integration; secret is never returned."}

def human_confirmed_dispatch(request):
    required={"incidentId","destination","message","confirmedBy"}; missing=sorted(required-set(request))
    if missing: raise ValueError("missing required confirmation fields: "+", ".join(missing))
    webhook=os.environ.get("ISIE_DISPATCH_WEBHOOK_URL")
    if not webhook:return {"status":"pending_provider","mode":"human-confirmed","reason":"No dispatch provider configured","request":request}
    body=json.dumps({"type":"ISIE_HUMAN_CONFIRMED_DISPATCH",**request}).encode()
    req=urllib.request.Request(webhook,data=body,headers={"Content-Type":"application/json","User-Agent":"ISIE/1.0"},method="POST")
    with urllib.request.urlopen(req,timeout=10) as r:return {"status":"submitted_to_configured_provider","mode":"human-confirmed","providerStatus":r.status,"submittedAt":datetime.now(timezone.utc).isoformat()}

def forecast_baseline(series,horizon=6):
    if not series or horizon<1 or horizon>168: raise ValueError("series must be non-empty and horizon must be 1..168")
    mean=sum(series[-min(12,len(series)):])/min(12,len(series))
    return {"status":"baseline_forecast","forecast":[round(mean,4)]*horizon,"modelVersion":"baseline-mean-1.0","validated":False,"limitations":["Demonstration model only; not scientifically validated or suitable for autonomous emergency decisions."]}

def risk_model(inputs):
    missing=sorted({"hazard","exposure","vulnerability"}-set(inputs))
    if missing: raise ValueError("missing risk inputs: "+", ".join(missing))
    vals=[max(0.0,min(1.0,float(inputs[k]))) for k in ("hazard","exposure","vulnerability")]
    return {"status":"prototype_risk_score","score":round(sum(vals)/3*100,2),"modelVersion":"isie-transparent-risk-1.0","scientificallyValidated":False,"limitations":["Equal-weight demonstration model. Independent scientific validation and local calibration are required before operational use."]}
