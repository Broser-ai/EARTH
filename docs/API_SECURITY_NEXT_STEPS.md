# API Security Next Steps

This is a static review of the current development prototype, not an authentication or tenancy implementation.

## Verified Current State

`apps/api/src/auth/development-provider.ts` reads `x-earth-org-id`, `x-earth-user-id`, and `x-earth-user-role` as unsigned DEVELOPMENT lookup keys. It loads the role from PostgreSQL `users.role`, so changing the role header does not elevate a role. The user and organization identifiers remain locally impersonable because no credential is verified.

`apps/api/src/auth/register.ts` creates `TenantContext` from the selected actor for non-public routes. `apps/api/src/prime/routes.ts` passes it to `PrimeService`, whose session, task, and audit queries in `apps/api/src/prime/service.ts` include `organization_id` predicates. `apps/api/src/prime/audit.ts` stores the current actor ID supplied by that DEVELOPMENT context.

There is no OIDC, signed session binding, PostgreSQL RLS policy, production tenant boundary, or production deployment claim. Docker is unavailable on this machine, so DB-backed runtime verification cannot be performed here.

## Next Sprint Scope

The OIDC + TenantContext + tenant-isolated repository-access sprint must change these surfaces:

- `apps/api/src/auth/development-provider.ts`: replace header lookup with a verified bearer-token provider.
- `apps/api/src/auth/types.ts` and `apps/api/src/auth/register.ts`: represent verified issuer subject, organization membership, and the authenticated tenant context.
- `apps/api/src/app.ts`: configure the production auth provider and restrict development headers to explicit local development only.
- `apps/api/src/auth/roles.ts`: apply RBAC to authenticated memberships rather than header-selected identities.
- `apps/api/src/prime/routes.ts` and `apps/api/src/prime/service.ts`: preserve tenant context on every repository operation and add authorization boundaries for each route.
- `apps/api/src/prime/audit.ts`: attribute events to a verified actor subject and membership.
- `apps/api/migrations/001_init.sql` plus a later dedicated migration: add identity/membership structures and then PostgreSQL RLS policies without altering this prototype pass.
- `apps/api/test/tenant-context.test.ts` and `apps/api/test/material-opportunity.test.ts`: replace DEVELOPMENT-header authorization scenarios with authenticated IDOR and tenant-isolation coverage.

## Acceptance Checklist

- Verify JWT signatures using an approved issuer key set.
- Enforce issuer, audience, expiry, not-before, and algorithm constraints.
- Map verified subject claims server-side to a local user and organization membership.
- Reject unknown, inactive, or cross-organization memberships.
- Apply RBAC from the server-side membership record.
- Propagate an immutable tenant context to every route, service, repository query, and audit insert.
- Add IDOR tests for reads, writes, task execution, and audit-event access across organizations.
- Store verified actor attribution in audit events; never derive it from a request header.
- Roll out PostgreSQL RLS in a later migration and verify it independently from application-layer filters.
- Keep `/health` and `/v1/info` truthful about development versus production authentication modes.
