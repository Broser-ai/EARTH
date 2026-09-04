# API foundation (DEVELOPMENT ONLY)

**Status:** local Fastify service. Not a production API.  
**Owner:** Michael. Identity headers are not authentication. Deterministic stubs are not live integrations.

The first `apps/api` wave added `GET /health` and `GET /v1/info`. This tree now also mounts **Material Opportunity Intake v0.1** (Postgres + PRIME policy). Foundation routes stay public and still do not query the datastore.

## What is implemented

- A standalone Node package at `apps/api` (`earth-api` v0.1.0).
- Fastify bound to `0.0.0.0:$PORT` (default `3001`).
- `GET /health` — process liveness. No datastore check. No identity headers.
- `GET /v1/info` — service identity and honest integration flags (intake present; LLM/recycler/auth absent).
- PostgreSQL schema, Compose `postgres:16-alpine`, migrations, DEVELOPMENT seed org/user.
- PRIME policy v0.1 + `MATERIAL_OPPORTUNITY_INTAKE` routes. See [FIRST_PROCESS_MATERIAL_OPPORTUNITY.md](FIRST_PROCESS_MATERIAL_OPPORTUNITY.md).
- Every JSON body includes `"mode": "DEVELOPMENT_ONLY"`.
- Every response sets `X-Earth-Mode: DEVELOPMENT_ONLY`.
- Vitest: foundation inject tests (no database) plus intake tests against Postgres.

## Honest flags

`GET /v1/info` reports:

| Flag | Value | Meaning |
|------|--------|---------|
| `postgres` | true | local schema + Compose |
| `materialOpportunityIntake` | true | first durable workflow |
| `primeRuntime` | true | PRIME v0.1 for this workflow only |
| `authentication` | false | DEVELOPMENT headers and optional OIDC JWT path; not production auth |
| `oidcConfigured` | false unless OIDC env + provider init | never inferred from a request token |
| `nanoChat` | false | NOT_CONFIGURED |
| `recyclerNetwork` | false | no recycler adapter |
| `reinforcementLearning` | false | not present |
| `externalApis` / `blockchain` / `digitalProductPassport` / `metaHarness` | false | not present |

## Run

```bash
docker compose up -d
npm --prefix apps/api install
npm run db:migrate
npm run api:dev      # Fastify on 0.0.0.0:3001 (or $PORT)
```

```bash
curl -s http://localhost:3001/health
curl -s http://localhost:3001/v1/info
```

## Test and typecheck

Foundation inject tests do not require Docker. Intake tests require Postgres at `DATABASE_URL`.

```bash
npm --prefix apps/api install
npm run db:migrate
npm run api:test
npm run api:typecheck
npm run api:build
```

Root `npm run typecheck` still typechecks the Vite SPA only. Use `api:typecheck` for the server.

## Environment

| Variable | Required | Default |
|----------|----------|---------|
| `PORT` | no | `3001` |
| `DATABASE_URL` | yes to start the process | `postgres://earth:earth@localhost:5432/earth` |

Do not add `VITE_*` credentials here. Adapter secrets, if a later process adds them, stay server-side.

## Example envelopes

`GET /health`

```json
{
  "mode": "DEVELOPMENT_ONLY",
  "status": "ok",
  "service": "earth-api",
  "check": "process_liveness"
}
```

Unknown paths return `404` with the same `mode` label. Intake start without DEVELOPMENT headers returns `401 DEVELOPMENT_IDENTITY_REQUIRED`.
