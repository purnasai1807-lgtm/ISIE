"""Deterministic model-evaluation tooling.

Metrics are calculations only. Passing a metric threshold does NOT constitute scientific
validation or regulatory approval; independent validation evidence is still required.
"""
from __future__ import annotations
from math import sqrt
from typing import Sequence

def regression_metrics(actual: Sequence[float], predicted: Sequence[float]) -> dict:
    if not actual or len(actual) != len(predicted):
        raise ValueError("actual and predicted must be non-empty and equal length")
    errors=[float(p)-float(a) for a,p in zip(actual,predicted)]
    mae=sum(abs(e) for e in errors)/len(errors)
    rmse=sqrt(sum(e*e for e in errors)/len(errors))
    return {"count":len(errors),"mae":round(mae,6),"rmse":round(rmse,6)}

def classification_metrics(actual: Sequence[int], predicted: Sequence[int]) -> dict:
    if not actual or len(actual) != len(predicted): raise ValueError("actual and predicted must be non-empty and equal length")
    tp=sum(a==1 and p==1 for a,p in zip(actual,predicted)); tn=sum(a==0 and p==0 for a,p in zip(actual,predicted))
    fp=sum(a==0 and p==1 for a,p in zip(actual,predicted)); fn=sum(a==1 and p==0 for a,p in zip(actual,predicted))
    precision=tp/(tp+fp) if tp+fp else 0.0; recall=tp/(tp+fn) if tp+fn else 0.0
    return {"count":len(actual),"accuracy":round((tp+tn)/len(actual),6),"precision":round(precision,6),"recall":round(recall,6),"confusion":{"tp":tp,"tn":tn,"fp":fp,"fn":fn}}

def validation_report(actual: Sequence[float], predicted: Sequence[float], *, model_version: str, dataset_id: str) -> dict:
    metrics=regression_metrics(actual,predicted)
    return {"status":"evaluation_complete","modelVersion":model_version,"datasetId":dataset_id,"metrics":metrics,"scientificValidation":False,"reviewRequired":"Independent domain review and pre-registered acceptance criteria are required before operational claims."}
