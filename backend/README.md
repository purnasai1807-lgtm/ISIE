# ISIE backend foundation (non-operational prototype)

This Python backend is a foundation for integration, not an emergency-response service. It does not issue alerts or dispatch instructions, and it must not be used to make or execute disaster-response decisions. `/health` always reports `productionReady: false`. No weather, satellite, hydrology, population, road, shelter, or hazard provider is bundled or called.

The frontend's demo interactions use only browser-local `isie-prototype-demo-*` storage and are not sent to this backend. Frontend scenario arithmetic is a separate, unvalidated toy simulation; risk, capacity, relocation, and analytics remain unavailable/not assessed where verified measurements are absent. Neither the Python API nor the UI is an operational decision-support path.

## Local setup

Requires Python 3.10 or newer. The Firebase Admin SDK is needed only when configuring ID-token verification:

```powershell
py -m pip install -r backend/requirements.txt
$env:FIREBASE_PROJECT_ID = "your-firebase-project-id"
# Configure Application Default Credentials out-of-band; never check credentials into the repo.
py -m backend.isie_backend.server
```

The server binds to `127.0.0.1:3100` and stores its local SQLite journal at `./data/isie.sqlite3` by default. Configure `HOST`, `PORT`, and `ISIE_DATABASE_PATH` through the environment. Example settings are in `backend/.env.example`; the application does not load `.env` files automatically.

Run checks from the repository root:

```powershell
py -m unittest discover -s backend/tests -v
py -m compileall -q backend/isie_backend backend/tests
```

An optional reference container can be built with `docker build -f backend/Dockerfile -t isie-backend-prototype .`. Its health check confirms only that the HTTP process responds. Mount a persistent volume at `/data` writable by container UID 10001; the container is not production hardened. The frontend status page can query the backend through its same-origin `/api/backend-health` route when the frontend server is given `ISIE_BACKEND_URL`; when unset, the UI reports the backend as unconfigured. The health probe never reports operational readiness.

## Authentication and authorization

`FirebaseAdminAuthVerifier` uses Firebase Admin `verify_id_token(..., check_revoked=True)` and the project ID from `FIREBASE_PROJECT_ID`. Firebase Admin uses Application Default Credentials (for local use, supply `GOOGLE_APPLICATION_CREDENTIALS` pointing to a credential file stored outside the repository; in a cloud environment use the platform identity). A verified token must contain a UID and an exact trusted custom `role` claim in `ADMIN`, `OPERATOR`, `ANALYST`, or `VIEWER`. The verifier does not derive privilege from request JSON, Firestore profile fields, or the browser's cached role. Missing SDK, project ID, or credentials causes protected requests to fail closed with 503.

Analysis endpoints allow ADMIN, OPERATOR, and ANALYST. Report intake and raw report reads allow ADMIN and OPERATOR only because reports can contain precise location and free-text personal information; ANALYST and VIEWER cannot read raw reports. VIEWER has no analysis access. There is deliberately no endpoint to assign roles. An organization's Firebase/IAM administrators must establish and periodically review custom claims out of band, revoke refresh tokens on role demotion, and follow an approved identity lifecycle with separation of duties.

## API

- `GET /health`: limited service/auth/storage status; never a production-readiness assertion.
- `GET /v1/capabilities`: explicit capability flags, including no automated alerts, dispatch, or evacuation orders.
- `POST /v1/assessments/capacity` and `/v1/assessments/relocation`: require an injected, server-configured measurement provider and accept **coordinates only**. Client-supplied values or `verified_real` provenance claims are rejected. With no provider (the default), the API returns `status: unavailable` and the required missing measurements.
- `POST /v1/simulations/capacity`: accepts an `inputs` object containing explicitly `simulated` or `user_provided` measurements. It remains a hypothetical calculation, separate from provider data and the report journal.
- `POST /v1/field-reports`: ADMIN/OPERATOR-only append-only intake for a human's unverified submission (`title`, `details`, `category`, and optionally coordinates, location name, observation timestamp). Requires an `Idempotency-Key`. Stored reports are labeled `USER_PROVIDED_UNVERIFIED`, are not assessment inputs, and do not create alerts.
- `GET /v1/field-reports/{id}`: ADMIN/OPERATOR-only read of one submitted report, because the record may contain sensitive location details. ANALYST and VIEWER do not receive raw field reports.

The measurement provider interface in `isie_backend.providers` validates coordinates, freshness, source identity, and provenance. A deployment may load its own trusted server-side module through `ISIE_MEASUREMENT_PROVIDER_MODULE`; it must export `adapter` with `source_id` and `read_measurement(metric, coordinates)`. Before returning `verified_real`, the adapter must independently authenticate and validate the source response, rights/license, timestamps, and integrity. No implementation, endpoint URL, source credentials, or source license is assumed here. Invalid adapter data yields an error, not a fallback.

The arithmetic in `analysis.py` is prototype-only and scientifically unvalidated. Every estimate carries provenance, processing version, confidence derived from its inputs, and limitations. Even a structurally verified measurement does not establish scientific suitability. No endpoint issues an evacuation order or operational recommendation; human incident-command approval is required for any real-world response.

## Persistence, audit, and security limits

The SQLite journal atomically appends a field report and corresponding audit event, enforces append-only updates/deletes with database triggers, deduplicates idempotency keys per actor, and links audit-event hashes into a chain. Tests verify the chain and detect direct edits to event or report rows. This is **tamper-evident only**, not tamper-proof: a privileged database/file operator can alter the file, remove triggers, or recompute the unkeyed hashes. The journal is local prototype storage, not a compliant records system; it does not encrypt sensitive location/report data at rest, externally anchor audit hashes, replicate, back up, or implement retention/deletion workflows. Restrict access to the database and its directory; do not place it on a shared or public path or submit sensitive operational details. Use a security-reviewed managed persistence/audit service before any real deployment.

The server limits request bodies to 64 KiB, rejects chunked request bodies, requires JSON, applies a fixed-window limit of 60 requests per minute per source IP and authenticated UID, and sets basic response security headers. Limits are per process and reset on restart; they do not replace a gateway/WAF, distributed quotas, TLS, trusted proxy configuration, monitoring, abuse detection, or a threat model. Do not expose the plain HTTP development server to the Internet. Terminating TLS and restricting network access are deployment responsibilities.

## Readiness blockers

This branch does not certify startup, customer, or emergency-response readiness. External and human work remains required: deploy and operate trusted identity/role administration; choose secure managed storage, audit retention, backup/recovery, and privacy controls; integrate independently verified and licensed sources; scientifically validate and govern any models against local conditions; perform security/threat, penetration, load, failover, and incident-response exercises; establish incident-command approval, operator training, legal/regulatory, and organizational certification; and implement monitored production deployment with TLS, network controls, secrets management, dependency/image pinning, and tested recovery. Firebase rules were not validated with an emulator in this workspace. The frontend has a same-origin read-only backend health indicator but is not wired to backend report or assessment APIs; existing operational writes remain denied by Firestore rules.
