# Postgres RLS rollout (design only)

**Status:** design. **Do not enable RLS in this increment.**  
Tenant isolation v0.1 is application-level: every org-scoped query binds `organization_id` to `TenantContext.organizationId`. That is necessary and not sufficient for defence in depth.

This document is the intended follow-up after OIDC mapping and TenantContext have been in use. It must not ship as a silent schema change on `main` without Michael's accept, a dual-control migration window, and tests that fail closed.

---

## Goal

When a request is authenticated, the database session should be unable to read or write another organization's rows even if application SQL omits a filter.

## Proposed session contract

After AuthProvider resolves `TenantContext`, and **inside the same transaction** as org-scoped work:

```sql
SET LOCAL earth.organization_id = '<uuid>';
SET LOCAL earth.actor_id = '<uuid>';
```

Use `SET LOCAL` (transaction-scoped), never `SET` that leaks across pooled clients.

A small wrapper around `pool.connect()` / `BEGIN` should:

1. `BEGIN`
2. `SET LOCAL earth.organization_id = $1` with the tenant UUID (no string concat)
3. run the existing PrimeService queries
4. `COMMIT` / `ROLLBACK` then release

If `SET LOCAL` is skipped, policies must deny (fail closed), not allow.

## Proposed policies (not applied)

On every tenant table (`users` is special — see below):

- `material_batches`
- `execution_sessions`
- `execution_tasks`
- `audit_events`
- `organization_memberships`

```sql
ALTER TABLE execution_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY execution_sessions_tenant_isolation
  ON execution_sessions
  USING (organization_id = current_setting('earth.organization_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('earth.organization_id', true)::uuid);
```

`FORCE ROW LEVEL SECURITY` is required so table owners (the `earth` migration role) cannot accidentally bypass policies.

`current_setting(..., true)` returns NULL when unset; `NULL::uuid` comparisons fail closed.

### Users and organizations

- `organizations`: restrict to the current org for product reads. Migrations/seed stay on a BYPASSRLS role.
- `users`: a login must be able to resolve `oidc_subject` **before** tenant is known. Options:
  1. Lookup `oidc_subject` with a `SECURITY DEFINER` function owned by a bypass role, returning only `id, organization_id, role, email` for that subject; then `SET LOCAL` and continue under RLS.
  2. Keep the subject lookup on a non-RLS connection used only by `OidcJwtAuthProvider.getActor`, then switch to an RLS-bound client for PrimeService.

Prefer (1) so there is a single pool. The definer function must not accept an organization id from the caller.

Development headers would use the same function keyed by `(user_id, organization_id)` after UUID validation.

## Roles

| Role | Purpose |
|------|---------|
| `earth_migrator` | BYPASSRLS, used only by `npm run db:migrate` |
| `earth_app` | NOBYPASSRLS, the API pool user; RLS FORCE applies |
| `earth_readonly` | optional HITL/break-glass, still RLS-bound, no writes |

Do not connect the API as a superuser.

## Rollout steps (when Michael accepts)

1. Keep application `WHERE organization_id = $tenant` filters. RLS is additive, not a replacement.
2. Add policies in a **non-FORCE** preview on a staging database; compare row counts with and without `earth.organization_id`.
3. Add `SET LOCAL` in PrimeService transaction helpers; fail the request if setting is missing.
4. `FORCE ROW LEVEL SECURITY` in a separate migration.
5. Tests: same cross-tenant 404/403 suite plus a raw SQL attempt that omits the filter and returns zero rows.
6. Rollback: `DROP POLICY` then `DISABLE ROW LEVEL SECURITY` in a forward migration (do not rewrite history). Application filters stay.

## Risks

- Connection pooling without `SET LOCAL` leaks tenant onto the next borrower.
- Enabling RLS without FORCE lets the table owner see everything.
- Subject lookup under RLS without a definer function deadlocks login (no org yet).
- `organization_memberships` multi-org: v0.1 has a single active org on `users.organization_id`. RLS should not invent an org switcher.
- Performance: `(organization_id, id)` indexes already exist; policies must use those columns as written.

## Explicitly out of scope until accepted

- Enabling RLS on `main`
- Default privileges that weaken audit, idempotency, or session checks
- Trusting JWT org/role claims as `SET LOCAL` input
- Sharing a BYPASSRLS user with the API process

Application TenantContext remains mandatory even after RLS ships.
