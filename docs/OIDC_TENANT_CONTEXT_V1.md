# OIDC TenantContext v1

This branch implements OIDC provider support for the local API. OIDC provider support is implemented but not configured for a deployment.

## Architecture

Fastify creates a request correlation ID, invokes the configured server-side `AuthProvider`, and attaches an immutable `TenantContext` containing organization ID, actor ID, database role, auth mode, and correlation ID. Routes pass that context to `PrimeService`; organization-scoped queries filter with `context.organizationId`. Roles never come from request headers, request payloads, URL/query parameters, or JWT role claims.

## Local DEVELOPMENT_ONLY

The only local development mode is:

```sh
NODE_ENV=development EARTH_AUTH_MODE=development npm run api:dev
```

It accepts only `x-earth-user-id`. Organization and role headers are ignored; the active membership and role come from PostgreSQL. A development user without an active membership is denied. DEVELOPMENT mode refuses to start outside `NODE_ENV=development`.

**DEVELOPMENT headers are not production authentication.**

## Production OIDC Configuration

Production OIDC uses the server-only environment variables below. Never use `VITE_*` variables for them and never place tokens or client secrets in the SPA.

```sh
EARTH_AUTH_MODE=oidc
OIDC_ISSUER_URL=https://issuer.example.com/
OIDC_AUDIENCE=earth-api
OIDC_JWKS_URI=https://issuer.example.com/.well-known/jwks.json
OIDC_ALLOWED_ALGORITHMS=RS256,ES256
```

Startup validates the required values. The provider verifies JWT signatures against the configured JWKS, issuer, audience, expiry, not-before, and an explicit `RS256`/`ES256` allow-list. It requires a non-empty `sub` and maps that subject to `users.oidc_subject`; email is not an authorization key.

## Provisioning And Membership

An administrator must provision a local user and an `ACTIVE` `organization_memberships` row before an external subject can access EARTH. There is no first-login organization provisioning or default role. A verified token without active membership receives `403 AUTHORIZED_ACCOUNT_NOT_PROVISIONED`.

Membership role is the server-side authorization source:

| Role       | Start intake | Read session | Read audit | Run development task |
| ---------- | ------------ | ------------ | ---------- | -------------------- |
| OWNER      | Yes          | Yes          | Yes        | Yes                  |
| ESG_LEAD   | Yes          | Yes          | Yes        | Yes                  |
| OPERATIONS | Yes          | Yes          | Yes        | Yes                  |
| REVIEWER   | No           | Yes          | Yes        | No                   |
| VIEWER     | No           | Yes          | No         | No                   |

## Testing

```sh
npm run api:typecheck
npm --prefix apps/api run test -- --run test/auth-config.test.ts test/oidc-provider.test.ts test/foundation.test.ts
docker compose up -d
npm run db:migrate
npm run api:test
```

The OIDC unit suite generates test keys and mocks JWKS locally; it does not contact a real issuer. Docker is required for membership, tenant-isolation, idempotency, and audit-persistence integration tests.
