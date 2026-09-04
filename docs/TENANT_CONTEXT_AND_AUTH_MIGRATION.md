# Tenant context and auth migration

**Status:** DEVELOPMENT preparation. Not production authentication. No OIDC.

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

- `x-earth-user-role` is still **required** so the documented DEVELOPMENT curl keeps working.
- It is **not** used as a privilege grant. Changing it to `OWNER` cannot escalate a `VIEWER` row.
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
- CORS reflects `Origin`.
- No OIDC, no MFA, no org switcher, no row-level Postgres policies (`SET LOCAL` role).
- HITL / capability tree in the SPA kernel remains in-tab and forgeable.
- Do not expose this API beyond local DEVELOPMENT.

Next real auth step (out of scope here): replace `DevelopmentAuthProvider` with an OIDC provider that still returns `AuthenticatedActor` and `TenantContext`. Do not add LLM, NanoChat, RAG, RL, or external ESG integrations as part of that swap.
