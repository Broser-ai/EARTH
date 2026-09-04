# EARTH

Standalone operations / ESG **prototype**. It is not Cirkel and does not import `cirkel-system`.

**EARTH is currently a development prototype. No external ESG, regulatory, recycler, ERP, tax, blockchain, or AI-provider integration is active.**

What exists today:

- A React / Vite SPA (`src/`) with **mock UI**. Screens that mention CSRD, recyclers, ERP, or assurance are copy, not live integrations. Command-bar badges are **DEVELOPMENT** / **DEMO**.
- A first server-side workflow in `apps/api`: **Material Opportunity Intake v0.1**. It persists a session, bounded tasks, and audit events in PostgreSQL. Task runners are **deterministic stubs**. Local identity is DEVELOPMENT headers (not production auth); OIDC JWT validation is optional when configured. NanoChat is **NOT_CONFIGURED**.
- Foundation routes `GET /health` and `GET /v1/info` stay public. `/v1/info` flags intake as present and LLM/recycler/auth as absent.

Details: [docs/FIRST_PROCESS_MATERIAL_OPPORTUNITY.md](docs/FIRST_PROCESS_MATERIAL_OPPORTUNITY.md)

## Frontend

```bash
npm install
npm run dev          # Vite on port 5180 (proxies /v1 and /health to :3001)
npm run build        # tsc --noEmit && vite build
npm run typecheck    # tsc --noEmit
npm run test         # SPA smoke tests
npm run lint
npm run preview
```

The command bar shows **DEVELOPMENT** and **DEMO** markers. Treat SPA numbers and “connected” vendors as demo chrome.

Open **OPERATIONS → Material intake** to POST `/v1/material-opportunities/start` and run-next against the local API.

## Backend (PRIME Control Plane slice)

```bash
docker compose up -d
npm install
npm run db:migrate
npm run api:dev      # Fastify on 0.0.0.0:$PORT (default 3001)
```

```bash
npm run api:test
npm run api:build
npm run api:typecheck
```

Environment (never `VITE_*` secrets): copy `.env.example`.

```
DATABASE_URL=postgres://earth:earth@localhost:5432/earth
PORT=3001
EARTH_AUTH_MODE=development
```

OIDC (optional, not production-ready): `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, optional `OIDC_JWKS_URI`. Never `VITE_*` client secrets. See [docs/OIDC_AND_TENANT_ISOLATION.md](docs/OIDC_AND_TENANT_ISOLATION.md).

## PostgreSQL

Compose runs **only** `postgres:16-alpine` (database/user/password `earth`, port `5432`, named volume, healthcheck). No Kafka, Redis, Neo4j, or chain node.

```bash
docker compose up -d
docker compose ps
npm run db:migrate
```

## Tests

```bash
npm run api:test     # Vitest: foundation inject tests + intake against Compose Postgres
npm run test         # SPA smoke
npm run build        # frontend typecheck + Vite build
```

## Demo: start a material opportunity

After `npm run api:dev`:

```bash
curl -X POST http://localhost:3001/v1/material-opportunities/start \
  -H "Content-Type: application/json" \
  -H "x-earth-org-id: 11111111-1111-1111-1111-111111111111" \
  -H "x-earth-user-id: 22222222-2222-2222-2222-222222222222" \
  -H "x-earth-user-role: OWNER" \
  -d '{
    "idempotencyKey": "demo-hdpe-2026-001",
    "materialBatch": {
      "externalReference": "BATCH-2026-001",
      "materialClass": "HDPE_OFFCUTS",
      "quantityKg": 15200,
      "facilityName": "Demo Factory Aarhus",
      "availableFrom": "2026-09-03T12:00:00.000Z"
    },
    "baseline": {
      "disposalCostDkk": 38400,
      "co2eKg": 4800
    },
    "evidence": {
      "documentIds": [],
      "extractionRequested": false
    },
    "dataClassification": "CONFIDENTIAL"
  }'
```

Those org/user UUIDs are a **DEVELOPMENT seed**, not production identities. `x-earth-user-role` is ignored; org and role come from Postgres. Development headers remain DEVELOPMENT_ONLY and are not production authentication.
