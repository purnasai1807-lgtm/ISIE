from isie_backend.launch_readiness import LaunchEvidenceRegistry

def test_launch_readiness_starts_unverified(tmp_path):
    r=LaunchEvidenceRegistry(str(tmp_path/'evidence.json'))
    s=r.status()
    assert s['verifiedCount']==0
    assert s['total']==9
    assert s['launchReady'] is False

def test_launch_evidence_is_recorded_without_fabrication(tmp_path):
    r=LaunchEvidenceRegistry(str(tmp_path/'evidence.json'))
    item=r.record('security_assessment','SEC-REAL-1','external-security-firm', verified=False)
    assert item['verified'] is False
    assert r.status()['verifiedCount']==0
    item=r.record('security_assessment','SEC-REAL-1','external-security-firm', verified=True)
    assert item['verified'] is True
    assert r.status()['verifiedCount']==1
