# Tenant context and auth migration

**Status:** DEVELOPMENT preparation plus an OIDC-ready provider. Not a live IdP. DEVELOPMENT headers are not production authentication.

## What landed

Identity for local demo curl still uses `x-earth-user-id`. Organization and role headers are ignored.

| Type | Meaning |
|------|---------|
| `AuthProvider.getActor(request)` | Resolves an `AuthenticatedActor` |
| `AuthenticatedActor` | `actorId`, `organizationId`, `role`, `authMode` |
| `TenantContext` | `{ organizationId, actorId, role, authMode, correlationId }` — the only org id routes and queries may use |

Providers:

- `DevelopmentAuthProvider` when `NODE_ENV=development` and `EARTH_AUTH_MODE=development`
- `OidcJwtAuthProvider` when `EARTH_AUTH_MODE=oidc` (issuer, audience, JWKS required)

`DEVELOPMENT_ONLY` envelopes and `X-Earth-Mode` appear **only** because the development provider is active.

See [OIDC_TENANT_CONTEXT_V1.md](./OIDC_TENANT_CONTEXT_V1.md) for JWT verification, provisioning, and role matrix.

## Role source of truth

`organization_memberships.role` (CHECK: `OWNER`, `ESG_LEAD`, `OPERATIONS`, `REVIEWER`, `VIEWER`) is the authorization role. `users.role` is a leftover seed column and is **not** consulted by `AuthProvider`.

- `x-earth-user-role` is accepted on CORS/demo curl so existing scripts keep working.
- It is **not** used as a privilege grant. Changing it to `OWNER` cannot escalate a `VIEWER` membership.
- Updating `users.role` without changing the membership row cannot escalate either.
- Write (start / run-next / evidence write): `OWNER`, `ESG_LEAD`, `OPERATIONS`.
- Read session: those plus `REVIEWER`, `VIEWER`.
- Read audit: those plus `REVIEWER` (not `VIEWER`).

## Tenant isolation

- Every intake and evidence route passes `request.earthTenant` into services or SQL.
- Session, task, evidence, claim, approval, and audit SQL is bound to `tenant.organizationId`.
- Body `organizationId` and query `organizationId` are ignored. They never override `TenantContext`.

## Remaining security limitations

This is **not** production authentication in DEVELOPMENT mode.

- Anyone who can reach the process and guess/copy seeded UUIDs is that actor.
- DEVELOPMENT headers are not signed, not expired, not bound to a session cookie or DPoP.
- CORS reflects `http://localhost:5180` and allows `Authorization` for the OIDC path.
- No MFA, no org switcher, no row-level Postgres policies (`SET LOCAL` role).
- HITL / capability tree in the SPA kernel remains in-tab and forgeable.
- Do not expose DEVELOPMENT mode beyond local use.

Do not add LLM, NanoChat, RAG, RL, or external ESG integrations as part of auth work.
