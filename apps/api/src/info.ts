export const SERVICE_NAME = 'earth-api' as const;
export const SERVICE_VERSION = '0.1.0' as const;

/**
 * Honest capability flags for this tree.
 * DEVELOPMENT ONLY — true means the local prototype implements that slice,
 * not that a production integration, IdP, or vendor is live.
 *
 * `authentication` stays false until production auth is explicitly enabled.
 * `oidcConfigured` is overlaid at runtime when EARTH_AUTH_MODE=oidc and
 * the JWT provider finished initializing. It is never inferred from token
 * claims in the request.
 */
export const INTEGRATION_FLAGS = {
  postgres: true,
  materialOpportunityIntake: true,
  authentication: false,
  oidcConfigured: false,
  primeRuntime: true,
  nanoChat: false,
  metaHarness: false,
  reinforcementLearning: false,
  recyclerNetwork: false,
  externalApis: false,
  blockchain: false,
  digitalProductPassport: false,
} as const;

export type IntegrationName = keyof typeof INTEGRATION_FLAGS;

export const PRODUCT_ROUTES = [
  { method: 'GET', path: '/health', purpose: 'process liveness (no datastore)' },
  { method: 'GET', path: '/v1/info', purpose: 'service identity and integration flags' },
  {
    method: 'POST',
    path: '/v1/material-opportunities/start',
    purpose: 'start MATERIAL_OPPORTUNITY_INTAKE v0.1 (DEVELOPMENT headers or OIDC Bearer)',
  },
  { method: 'GET', path: '/v1/sessions/:sessionId', purpose: 'read a session envelope for this org' },
  {
    method: 'GET',
    path: '/v1/sessions/:sessionId/audit-events',
    purpose: 'list audit events for a session in this org',
  },
  {
    method: 'POST',
    path: '/v1/sessions/:sessionId/run-next',
    purpose: 'claim one QUEUED task and run a deterministic stub',
  },
  {
    method: 'GET',
    path: '/v1/integrations',
    purpose: 'list server-side integration providers (default NOT_CONFIGURED, never CONNECTED)',
  },
  {
    method: 'GET',
    path: '/v1/integrations/:providerKey/status',
    purpose: 'provider status for this tenant (credential presence is not CONNECTED)',
  },
  {
    method: 'POST',
    path: '/v1/integrations/:providerKey/operations',
    purpose: 'create a gated integration operation (no outbound call by default)',
  },
  {
    method: 'GET',
    path: '/v1/integration-operations/:operationId',
    purpose: 'read an integration operation for this organization',
  },
  {
    method: 'POST',
    path: '/v1/integration-operations/:operationId/cancel',
    purpose: 'cancel an integration operation before provider execution',
  },
] as const;

export function describeIntegration(name: IntegrationName): string {
  switch (name) {
    case 'postgres':
      return 'local PostgreSQL schema + Compose service; DATABASE_URL required to start the process';
    case 'materialOpportunityIntake':
      return 'MATERIAL_OPPORTUNITY_INTAKE v0.1 persists sessions, tasks, and audit events';
    case 'authentication':
      return 'not production authentication — false in development; never production-ready in this increment';
    case 'oidcConfigured':
      return 'true only when EARTH_AUTH_MODE=oidc, OIDC issuer/audience are set, and the JWT provider initialized';
    case 'primeRuntime':
      return 'PRIME policy v0.1 for MATERIAL_OPPORTUNITY_INTAKE only; no general agent runtime';
    case 'nanoChat':
      return 'NOT_CONFIGURED — no local adapter and no LLM call';
    case 'metaHarness':
      return 'Meta Harness is not present';
    case 'reinforcementLearning':
      return 'RL is not present';
    case 'recyclerNetwork':
      return 'no recycler, ERP, SKAT, or SAP adapter';
    case 'externalApis':
      return 'no outbound vendor or authority calls';
    case 'blockchain':
      return 'no chain node or wallet';
    case 'digitalProductPassport':
      return 'DPP is not present';
    default: {
      const exhaustive: never = name;
      return exhaustive;
    }
  }
}
