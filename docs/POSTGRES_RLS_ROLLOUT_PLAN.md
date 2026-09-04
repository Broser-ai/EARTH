# PostgreSQL RLS Rollout Plan

RLS is defense in depth. It does not replace JWT verification, server-side membership lookup, RBAC, or application-level tenant predicates.

## Tables In Scope

Apply tenant policies to `users`, `organization_memberships`, `material_batches`, `execution_sessions`, `execution_tasks`, and `audit_events`. Each contains or derives an `organization_id` boundary.

## Roles And Transaction Context

Use a dedicated migration/admin database role for schema changes and a separate restricted application role for runtime access. In each application transaction, set a validated server-derived tenant value with `SET LOCAL app.current_organization_id = '<uuid>'`. Never set it from an HTTP header, body, URL, query string, or JWT role claim.

Policies should allow rows only when `organization_id = current_setting('app.current_organization_id', true)::uuid`. Handle system/worker events through a narrowly scoped application transaction using the originating verified tenant context, not a broad bypass role.

## Rollout Phases

1. Inventory every organization-scoped query and preserve application filters.
2. Create a dedicated migration that enables RLS without removing existing filters.
3. Deploy the restricted application role and set transaction-local tenant context in the repository boundary.
4. Add cross-tenant read/write/audit IDOR tests and migration validation.
5. Observe denied-query telemetry without logging tokens or PII, then enforce policies in production.

## Validation And Rollback

Validate with a tenant A/B fixture that attempts session, task, audit-event, and material-batch reads/writes across organizations. Confirm migration/admin operations retain required access and application role access is limited to its transaction tenant.

Rollback only through a reviewed migration that disables newly introduced policies after restoring application availability. Do not remove application authorization checks or grant the application role unrestricted table access as a rollback shortcut.
