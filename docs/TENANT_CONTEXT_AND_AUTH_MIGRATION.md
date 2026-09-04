# Tenant context and auth migration

**Status:** superseded for the OIDC path by [OIDC_AND_TENANT_ISOLATION.md](./OIDC_AND_TENANT_ISOLATION.md). This page remains the record of the previous increment (DEVELOPMENT headers behind AuthProvider + Postgres `users.role`).

**v0.1 now:** `x-earth-user-role` is ignored entirely. Role and org still come from Postgres. OIDC JWT validation is a separate provider; it is not production authentication. No RLS.

## What landed

Identity headers (`x-earth-org-id`, `x-earth-user-id`, `x-earth-user-role`) remain for local demo curl. They now sit behind:

| Type | Meaning |
|------|---------|
| `AuthProvider.getActor(request)` | Resolves an `AuthenticatedActor` |
| `AuthenticatedActor` | `actorId`, `organizationId`, `role`, `authMode` |
| `TenantContext` | `{ organizationId, actor }` — the only org id routes and queries may use |

The only provider is `DevelopmentAuthProvider`. `authMode` is always `DEVELOPMENT_ONLY`. HTTP envelopes and `X-Earth-Mode` include `DEVELOPMENT_ONLY` **only because that provider/mode is active**. This is not an IdP.

## Role source of truth

`users.role` in Postgres (CHECK: `OWNER`, `ESG_LEAD`, `OPERATIONS`, `REVIEWER`, `VIEWER`) is the authorization role.

- `x-earth-user-role` is **ignored entirely** (v0.1). Changing it to `OWNER` cannot escalate a `VIEWER` row.
- Org and user headers still select the seeded row in DEVELOPMENT mode.
- Write (start / run-next): `OWNER`, `ESG_LEAD`, `OPERATIONS`.
- Read (session / audit): those plus `REVIEWER`, `VIEWER`.

## Tenant isolation

- Every intake route passes `request.earthTenant` into `PrimeService`.
- Session, task, and audit SQL is bound to `tenant.organizationId`.
- Body `organizationId` and query `organizationId` are ignored. They never override `TenantContext`.

## Migration impact — `003_dev_viewer_seed.sql`

**No schema change to `users.role`.** That column was already the source of truth in `001_init.sql`.

`003` only inserts a DEVELOPMENT `VIEWER`:

| Field | Value |
|-------|--------|
| user id | `55555555-5555-5555-5555-555555555555` |
| org id | `11111111-1111-1111-1111-111111111111` (unchanged seed org) |
| role | `VIEWER` |

Seeded OWNER `22222222-2222-2222-2222-222222222222` is unchanged.

Impact on existing local databases: migrate applies one INSERT. No table rewrite. No production tenant.

## Remaining security limitations

This is **not** authentication.

- Anyone who can reach the process and guess/copy seeded UUIDs is that actor.
- Headers are not signed, not expired, not bound to a session cookie or DPoP.
- CORS is an explicit allow-list (default `http://localhost:5180`); no wildcard with credentials.
- OIDC JWT validation exists when `EARTH_AUTH_MODE=oidc` (see the OIDC doc). No MFA, no org switcher, no row-level Postgres policies (`SET LOCAL` role). RLS is design-only.
- HITL / capability tree in the SPA kernel remains in-tab and forgeable.
- Do not expose this API beyond local DEVELOPMENT.

OIDC swap: [OIDC_AND_TENANT_ISOLATION.md](./OIDC_AND_TENANT_ISOLATION.md). Do not add LLM, NanoChat, RAG, RL, or external ESG integrations as part of auth work.
