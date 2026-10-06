# ISIE prototype

> **Prototype completeness: 100% for the defined non-operational demo scope.** See `PROTOTYPE_COMPLETENESS_REPORT.md` for the acceptance criteria and verification commands.

> **PROTOTYPE ONLY — NOT FOR PRODUCTION, CUSTOMER OPERATIONS, OR EMERGENCY RESPONSE.**
> `productionReady=false`. This application is not validated, authorized, or suitable for disaster decisions. No automated evacuation orders, alerts, broadcasts, or dispatch occur.

## Local prototype experience

Use the demo sign-in to open the browser-local exercise workspace. A persistent banner marks the experience as **DEMO / SIMULATION**. Included incident records, resource fixtures, evidence, notifications, and timeline steps are fictional; new notes and edits remain in `localStorage` under the `isie-prototype-demo-*` namespace. The reset action removes only that namespace. Demo writes do not reach Firestore, the Python backend, external providers, recipients, or dispatch systems.

The modules demonstrate interface interactions, not operational capabilities:

- **Incidents:** add fictional or user-provided unverified case notes and change local exercise status. Entered population is retained as user-provided input and is not treated as an assessment.
- **Alerts and notifications:** create, acknowledge, dismiss, mark read, and clear local tabletop notes. These are not broadcasts, warnings, recommendations, or dispatch instructions; alert notes use a non-urgent label.
- **Resources:** adjust fictional local exercise allocations. Quantities do not represent real capacity, availability, reservations, or deployments.
- **Evidence / intelligence:** add user-provided notes; verification and external-source evidence remain unavailable.
- **Timeline:** browse/play fictional exercise steps only; there is no observation clock or forecast.
- **Geospatial:** offline prototype canvas with no remote tile, satellite, hazard, road, shelter, population, or route feed. Any displayed case coordinates are fictional exercise coordinates and not for navigation.
- **Risk, capacity, relocation, analytics:** operational measurements and rankings show **NOT ASSESSED** when required verified inputs are absent. No evacuation route, priority, or order is produced.
- **Scenario simulator:** controls run a deterministic local tabletop calculation under explicitly hypothetical assumptions. Outputs are not forecasts, estimates of exposed people, scientifically validated analyses, or decision-grade results.

The product contains no configured provider adapters or live-data credentials. Provider categories are placeholders only. Do not enter sensitive operational or personal data into the local demo workspace.

The Python backend remains a separate, fail-closed prototype; `/health` reports `productionReady: false`. It is not wired to the demo workspace or frontend analysis/alert flows. See [backend/README.md](backend/README.md) for setup, tests, security limits, and outstanding blockers.

## Local development and tests

Install frontend dependencies with `npm install`, then run `npm run dev`. Run `npm run lint` for the TypeScript check and `npm run build` for the production build. For the Python backend and local-workspace behavior tests, see the commands in `backend/README.md`; the Node demo-workspace tests run with `node --test backend/tests/prototype-workspace.test.mjs`.

## Production blockers

Production and emergency-response readiness are explicitly **not established**. Blockers include authenticated and licensed provider integrations, verified provenance/freshness/quality review, domain-scientific model validation, audited managed storage and privacy/retention controls, threat/security review, resilience/load/failover testing, incident-command procedures and human approvals, operator training, and legal/regulatory/organizational authorization. Firebase rules have not been emulator-validated in this workspace. No deployment or production resources have been configured.
