# API foundation (DEVELOPMENT ONLY)

**Status:** local Fastify scaffold. Not a production service.  
**Owner:** Michael. Nothing here is a license to persist data, authenticate users, or call an external network.

This is the first `apps/api` wave. It exists so the TypeScript + Fastify + Vitest toolchain can go green **before** PostgreSQL, identity, PRIME, or any workflow.

## What is implemented

- A standalone Node package at `apps/api` (`earth-api` v0.1.0).
- Fastify bound to `0.0.0.0:$PORT` (default `3001`).
- `GET /health` — process liveness. No datastore check.
- `GET /v1/info` — service identity and explicit `false` integration flags.
- Every JSON body includes `"mode": "DEVELOPMENT_ONLY"`.
- Every response sets `X-Earth-Mode: DEVELOPMENT_ONLY`.
- Vitest inject tests that do **not** require Docker, Postgres, or network I/O.

## What is intentionally absent

This wave does **not** start:

| Area | State |
|------|--------|
| PostgreSQL / migrations | not present |
| docker-compose database | not present |
| authentication / identity headers | not present |
| PRIME runtime | not present |
| Material Opportunity Intake | not present |
| NanoChat | not present |
| Meta Harness | not present |
| RL | not present |
| external APIs | not present |
| blockchain | not present |
| Digital Product Passport | not present |

`GET /v1/info` repeats those flags as `false` so a client cannot mistake the scaffold for a live control plane.

## Run

```bash
npm --prefix apps/api install
npm run api:dev      # Fastify on 0.0.0.0:3001 (or $PORT)
```

```bash
curl -s http://localhost:3001/health
curl -s http://localhost:3001/v1/info
```

## Test and typecheck

No database is required.

```bash
npm --prefix apps/api install
npm run api:test
npm run api:typecheck
npm run api:build
```

Root `npm run typecheck` still typechecks the Vite SPA only. Use `api:typecheck` for the server.

## Environment

| Variable | Required | Default |
|----------|----------|---------|
| `PORT` | no | `3001` |

There is no `DATABASE_URL` and no secret in this package. Do not add `VITE_*` credentials here.

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

`GET /v1/info` (truncated)

```json
{
  "mode": "DEVELOPMENT_ONLY",
  "service": "earth-api",
  "version": "0.1.0",
  "integrations": {
    "postgres": false,
    "authentication": false,
    "primeRuntime": false
  },
  "note": "DEVELOPMENT ONLY foundation scaffold. No live integrations."
}
```

Unknown paths return `404` with the same `mode` label. Workflow routes such as `/v1/material-opportunities/start` are **not** registered.

## Later waves

Postgres, compose, identity, PRIME, and intake belong in later accepted branches. Do not treat this package as a stub of those systems.
