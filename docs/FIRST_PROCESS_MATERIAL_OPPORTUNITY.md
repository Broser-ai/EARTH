# FIRST PROCESS: Material Opportunity Intake v0.1

**Status:** development prototype of a server-side PRIME Control Plane slice.  
**Owner:** Michael. Nothing here is a license to trade, file, or call an external network.

This document describes the first durable workflow in `apps/api`. The Vite SPA remains a client mock **except** for the Material intake page, which calls these local endpoints with DEVELOPMENT headers.

---

## What is implemented

- PostgreSQL schema for organizations, users, material batches, execution sessions, execution tasks, and audit events.
- SQL migrations under `apps/api/migrations`.
- A Fastify API bound to `0.0.0.0:$PORT` (default `3001`).
- Deterministic PRIME policy v0.1 (`prime-v0.1`) that plans at most five tasks.
- Workflow `MATERIAL_OPPORTUNITY_INTAKE` version `0.1`.
- Development identity headers (not authentication).
- Idempotent `POST /v1/material-opportunities/start`.
- `GET /v1/sessions/:sessionId`
- `GET /v1/sessions/:sessionId/audit-events`
- `POST /v1/sessions/:sessionId/run-next` (development worker: one queued task, no external I/O).
- Foundation `GET /health` (process liveness, no datastore) and `GET /v1/info` (honest flags).
- A **DEVELOPMENT seed** org/user that matches the demo curl headers.
- SPA **OPERATIONS → Material intake**: start a session, list tasks, run-next. Vite proxies `/v1` to `:3001`.

## What is intentionally stubbed

| Task | Behaviour |
|------|-----------|
| `VALIDATE_BATCH` | Succeeds when material class is present and quantity > 0. |
| `CHECK_EVIDENCE` | `PARTIAL` + `EVIDENCE_MISSING` if `documentIds` is empty. `COMPLETED` if at least one ID is present. **Does not read document bytes.** |
| `CALCULATE_BASELINE` | Echoes the submitted disposal cost and CO₂e as **user-provided** values labelled `INPUT_UNVERIFIED`. |
| `FIND_CANDIDATE_ROUTES` | Empty `candidates` array, `PARTIAL`, `RECYCLER_NETWORK_NOT_CONNECTED`. Does **not** imply a recycler network exists. |
| `NANOCHAT_EXTRACT` | Created only if extraction was requested **and** data is not `RESTRICTED`. Status is always `NOT_CONFIGURED` in v0.1. **No LLM call.** |

No recycler, ERP, Slack, Teams, SKAT, SAP, email, blockchain, authority, or AI-provider adapter is connected.

## Data flow

```
Client (SPA Material intake or curl)
  │  POST /v1/material-opportunities/start
  │  headers: x-earth-org-id, x-earth-user-id  (DEVELOPMENT ONLY; role header ignored)
  ▼
AuthProvider → TenantContext (Postgres org/role; OIDC Bearer when configured)
  ▼
PRIME policy v0.1 (deterministic plan, ≤ 5 tasks)
  ▼
Transaction:
  material_batches
  execution_sessions          (QUEUED → RUNNING)
  execution_tasks             (QUEUED, or NanoChat NOT_CONFIGURED)
  audit_events                (every create / transition)
  ▼
JSON session envelope (mode: DEVELOPMENT_ONLY)

POST /v1/sessions/:id/run-next
  ▼
Claim one QUEUED task → deterministic stub → audit → recompute session state
```

## State machine

**Session:** `QUEUED` → `RUNNING` on create (server-side). After required tasks settle:

- required task `FAILED` → `FAILED`
- evidence missing (`CHECK_EVIDENCE` / `EVIDENCE_MISSING`) → `WAITING_FOR_DEPENDENCY`
- all required tasks `COMPLETED` or `PARTIAL` → `COMPLETED`

Terminal: `COMPLETED`, `FAILED`, `CANCELLED`, `BUDGET_STOPPED`, `EXPIRED`. `run-next` is rejected on terminal states (`INVALID_STATE_TRANSITION`).

**Task:** `QUEUED` → `RUNNING` → `COMPLETED` | `PARTIAL` | `FAILED` | `BLOCKED` | `NOT_CONFIGURED`.

Every session and task transition writes an `audit_events` row with `policy_version = prime-v0.1`.

## API examples

All success and error JSON bodies include `"mode": "DEVELOPMENT_ONLY"`.

### Start

See the sample curl in the README. Typical success:

- `session.state`: `RUNNING`
- `session.workflowType`: `MATERIAL_OPPORTUNITY_INTAKE`
- `session.workflowVersion`: `0.1`
- `session.reasonCodes`: includes `EVIDENCE_MISSING` when `documentIds` is empty
- `nextRecommendedAction`: `UPLOAD_EVIDENCE` when evidence is missing
- tasks created as `QUEUED` (NanoChat omitted unless extraction was requested)

### Run next

Claims one queued task for that organization. Repeating until `claimedTask` is `null` drains the session.

## Development-only identity limitations

Headers:

- `x-earth-org-id`
- `x-earth-user-id`
- `x-earth-user-role` (ignored entirely; role comes from Postgres)

This is **not authentication**. Anyone who can reach the process and guess/copy the seed UUIDs can act as that user. OIDC JWT validation is available when `EARTH_AUTH_MODE=oidc` — see [OIDC_AND_TENANT_ISOLATION.md](./OIDC_AND_TENANT_ISOLATION.md). Development headers remain DEVELOPMENT_ONLY and are not production authentication.

`GET /health` and `GET /v1/info` do **not** require these headers.

Seed (labelled **DEVELOPMENT** in `002_dev_seed.sql`):

- org `11111111-1111-1111-1111-111111111111`
- user `22222222-2222-2222-2222-222222222222` role `OWNER`

## Explicitly prohibited claims

This process does **not**:

- call an LLM or NanoChat service
- connect to a recycler network
- book, message, or contract a recycler
- submit anything to SKAT or any authority
- produce a verified carbon, CSRD, PPWR, or EU AI Act result
- run RL
- execute autonomous side effects
- treat `INPUT_UNVERIFIED` baselines as measured inventory

**EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.**

## Commands

```bash
docker compose up -d
npm install
npm run db:migrate
npm run api:dev
```

Tests and builds:

```bash
npm run api:test
npm run api:build
npm run typecheck
npm run test
npm run build
```

Postgres (Compose): database/user/password `earth`, port `5432`.  
Connection string: `DATABASE_URL=postgres://earth:earth@localhost:5432/earth` (see `.env.example`).
