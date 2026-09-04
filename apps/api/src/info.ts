export const SERVICE_NAME = 'earth-api' as const;
export const SERVICE_VERSION = '0.1.0' as const;

/**
 * Honest capability flags for this tree.
 * DEVELOPMENT ONLY — true means the local prototype implements that slice,
 * not that a production integration, IdP, or vendor is live.
 */
export const INTEGRATION_FLAGS = {
  postgres: true,
  materialOpportunityIntake: true,
  authentication: false,
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
    purpose: 'start MATERIAL_OPPORTUNITY_INTAKE v0.1 (DEVELOPMENT headers)',
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
] as const;

export function describeIntegration(name: IntegrationName): string {
  switch (name) {
    case 'postgres':
      return 'local PostgreSQL schema + Compose service; DATABASE_URL required to start the process';
    case 'materialOpportunityIntake':
      return 'MATERIAL_OPPORTUNITY_INTAKE v0.1 persists sessions, tasks, and audit events';
    case 'authentication':
      return 'no OIDC or production auth — DEVELOPMENT identity headers only';
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
