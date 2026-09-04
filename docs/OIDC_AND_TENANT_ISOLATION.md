# OIDC authentication and tenant isolation v0.1

**Status:** implemented on the API. **Not production authentication.**  
**Owner:** Michael. Development headers remain `DEVELOPMENT_ONLY` and are not production authentication.

This increment adds a real JWT validation path (`OidcJwtAuthProvider`) beside the existing local development provider. It does **not** claim the product is production-ready. `GET /v1/info` keeps `authentication: false` and `productionReady: false`. `oidcConfigured` is true only when OIDC environment variables are present **and** the JWT provider finished initializing.

Do not cite this document as “EARTH has SSO” or “tenancy is done.” Postgres **row-level security is not enabled**. See [POSTGRES_RLS_ROLLOUT.md](./POSTGRES_RLS_ROLLOUT.md) for the design-only follow-up.

Related: [TENANT_CONTEXT_AND_AUTH_MIGRATION.md](./TENANT_CONTEXT_AND_AUTH_MIGRATION.md) (previous increment).

---

## Auth modes

`AuthProvider.getActor(request)` returns an `AuthenticatedActor`:

| Field | Source |
|-------|--------|
| `actorId` | `users.id` in Postgres |
| `organizationId` | `users.organization_id` in Postgres |
| `role` | `users.role` (`OWNER` \| `ESG_LEAD` \| `OPERATIONS` \| `REVIEWER` \| `VIEWER`) |
| `authMode` | `DEVELOPMENT_ONLY` or `OIDC` |
| `email` / `subject` | optional; never taken from the request body |

`EARTH_AUTH_MODE` selects the provider:

| Mode | When | Provider |
|------|------|----------|
| `development` | `NODE_ENV` is `development` or the test runner, **and** `EARTH_AUTH_MODE=development` (default when unset outside production) | `DevelopmentHeaderAuthProvider` |
| `oidc` | `EARTH_AUTH_MODE=oidc` with `OIDC_ISSUER_URL` and `OIDC_AUDIENCE` | `OidcJwtAuthProvider` |

Env validation **refuses**:

- `EARTH_AUTH_MODE=development` when `NODE_ENV=production`
- `EARTH_AUTH_MODE=oidc` without issuer or audience
- missing `EARTH_AUTH_MODE` in production
- `CORS_ORIGINS=*`

### DevelopmentHeaderAuthProvider

Local demo curl / SPA headers:

- `x-earth-org-id` (UUID of a row in `organizations`)
- `x-earth-user-id` (UUID of a row in `users`)

**`x-earth-user-role` is ignored entirely.** It is not read, not validated, and cannot escalate. Org and role come from Postgres. Every JSON envelope and `X-Earth-Mode` in this mode is `DEVELOPMENT_ONLY` **because this provider is active**, not because the process is an IdP.

Anyone who can reach the process and copy seeded UUIDs is that actor. This is not signed, not expired, and not production authentication.

### OidcJwtAuthProvider

Requires:

- `EARTH_AUTH_MODE=oidc`
- `OIDC_ISSUER_URL`
- `OIDC_AUDIENCE`
- optional `OIDC_JWKS_URI` (otherwise `{issuer}/.well-known/openid-configuration` → `jwks_uri`)

The API validates a `Authorization: Bearer` JWT with **remote JWKS** (`jose` `jwtVerify` + `createRemoteJWKSet`, or an injected JWKS getter in tests):

- signature
- issuer
- audience
- `exp` / `nbf`
- `sub` present
- algorithm allow-list: `RS256/384/512`, `ES256/384/512`, `PS256/384/512`

**No unsigned decode.** `alg=none` and HMAC (`HS*`) are rejected.

Token `sub` maps to `users.oidc_subject`. **Role and organization are never taken from token claims.** A valid token with no matching user is `403 AUTHORIZED_ACCOUNT_NOT_PROVISIONED`. The API does not auto-create organizations, users, or a default privileged role.

OIDC client secrets must not appear as `VITE_*`. Access tokens must not be stored in `localStorage`.

---

## TenantContext

After `getActor`, the request carries a frozen `TenantContext` (server-derived only):

| Field | Meaning |
|-------|---------|
| `organizationId` | from the provisioned user row |
| `actorId` | from the provisioned user row |
| `role` | from `users.role` |
| `authMode` | `DEVELOPMENT_ONLY` or `OIDC` |
| `correlationId` | `x-request-id` / `x-correlation-id` if well-formed, else a generated UUID |

All org-scoped SQL (sessions, tasks, audit, material batches) binds `organization_id` to `tenant.organizationId`. Body `organizationId` / `role` / `userId` and query `organizationId` are ignored. Cross-tenant reads and writes return **404** `SESSION_NOT_FOUND` (same as a missing session). Role denials return **403** `ROLE_FORBIDDEN`.

`GET /health` and `GET /v1/info` stay public.

---

## Authorization matrix

Role is never taken from the body or from `x-earth-user-role`.

| Action | OWNER | ESG_LEAD | OPERATIONS | REVIEWER | VIEWER |
|--------|-------|----------|------------|----------|--------|
| `canStartMaterialOpportunity` | yes | yes | yes | no | no |
| `canRunDevelopmentTask` | yes | yes | yes | no | no |
| `canReadSession` | yes | yes | yes | yes | yes |
| `canReadAuditEvents` | yes | yes | yes | yes | yes |

`requireRole` is the shared deny path (`ROLE_FORBIDDEN`). VIEWER is read-only and cannot start or run.

---

## Audit

Every `audit_events` row stores:

- `actor_id` (user UUID, or `prime-v0.1` / `earth-dev-worker` for system/worker)
- `auth_mode` (`DEVELOPMENT_ONLY` or `OIDC`)
- `metadata_json.authMode` (same value)

Idempotency (`organization_id`, `idempotency_key`) and session state checks are unchanged.

---

## `GET /v1/info` honesty

| Flag | Development mode | OIDC mode after successful provider init |
|------|------------------|------------------------------------------|
| `authentication` | `false` | `false` (not production auth) |
| `oidcConfigured` | `false` | `true` |
| `productionReady` | `false` | `false` |
| `nanoChat` / `recyclerNetwork` / `reinforcementLearning` / `blockchain` / `digitalProductPassport` | `false` | `false` |

`oidcConfigured` is **not** set merely because env vars exist; the JWT provider must initialize. Missing issuer/audience refuses process start.

---

## HTTP hardening (v0.1)

- CORS default origin `http://localhost:5180`. Explicit allow-list. **No wildcard with credentials.**
- Fastify `@fastify/rate-limit` (default 100 requests / minute; `/health` excluded).
- Logger redacts `Authorization`, cookies, and credential body fields. Do not log JWTs or PII by default.
- Client error bodies do not include stack traces or token material. 5xx messages are generic.

Bind: `0.0.0.0:$PORT` (default `3001`).

---

## Schema (migration `004_oidc_subject_and_memberships.sql`)

- `users.oidc_subject` — nullable, unique. Token `sub` maps here.
- `users.email` — stored lowercase; unique. Case-insensitive by normalization.
- `organization_memberships` — `(user_id, organization_id, role)` backfilled from `users` for **future** multi-org. v0.1 still uses `users.organization_id` + `users.role` as the single active membership. No org switcher.
- `audit_events.auth_mode`

No RLS policies are created. No default OWNER. No auto-provision.

DEVELOPMENT seed users (unchanged UUIDs):

| id | org | role | `oidc_subject` |
|----|-----|------|----------------|
| `2222…2222` | `1111…1111` | OWNER | null until an operator sets it |
| `5555…5555` | `1111…1111` | VIEWER | null |

---

## Local development

```bash
docker compose up -d
npm install
npm --prefix apps/api install
npm run db:migrate
EARTH_AUTH_MODE=development npm run api:dev
```

In another terminal: `npm run dev` (Vite `:5180`).

Demo curl still works with org/user headers. The role header may be omitted.

## OIDC environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `EARTH_AUTH_MODE` | yes in production | `oidc` |
| `OIDC_ISSUER_URL` | yes in OIDC mode | must match token `iss` |
| `OIDC_AUDIENCE` | yes in OIDC mode | must match token `aud` |
| `OIDC_JWKS_URI` | no | overrides discovery |
| `DATABASE_URL` | yes to start | Postgres |
| `PORT` | no | default `3001` |
| `CORS_ORIGINS` | no | default `http://localhost:5180` |

Never put IdP client secrets in `VITE_*`.

---

## What this increment does **not** do

- Enable Postgres RLS (`SET LOCAL`, `FORCE ROW LEVEL SECURITY`) — design only, see the RLS doc
- Auto-create users or organizations from a token
- Trust `org`, `role`, `user_id`, or `email` claims for authorization
- Store tokens in the SPA `localStorage`
- Claim `authentication: true` or production readiness
- Add LLM, NanoChat, RAG, agents, RL, blockchain, ZK, marketplace, compliance engines, or Cirkel
- Import `cirkel-system`

Development headers remain DEVELOPMENT_ONLY and are not production authentication.
