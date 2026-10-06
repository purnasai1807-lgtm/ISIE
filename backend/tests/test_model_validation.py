from isie_backend.model_validation import regression_metrics, classification_metrics, validation_report

def test_regression_metrics():
    m=regression_metrics([1,2,3],[1,3,2]); assert m['count']==3; assert m['mae']==round(2/3,6)

def test_classification_metrics():
    m=classification_metrics([1,1,0,0],[1,0,1,0]); assert m['confusion']=={'tp':1,'tn':1,'fp':1,'fn':1}

def test_validation_report_does_not_claim_scientific_validation():
    r=validation_report([1,2],[1,2],model_version='v1',dataset_id='dataset-1'); assert r['scientificValidation'] is False
