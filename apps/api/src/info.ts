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
    purpose: 'start MATERIAL_OPPORTUNITY_INTAKE v0.1 (DEVELOPMENT headers or OIDC)',
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
    purpose: 'claim unblocked QUEUED tasks and run deterministic stubs (no external I/O)',
  },
  {
    method: 'POST',
    path: '/v1/sessions/:sessionId/cancel',
    purpose: 'cancel a non-terminal session in this org',
  },
  {
    method: 'POST',
    path: '/v1/evidence-documents',
    purpose: 'create metadata-only evidence document (INPUT_UNVERIFIED)',
  },
  {
    method: 'POST',
    path: '/v1/evidence-records',
    purpose: 'create structured evidence record (INPUT_UNVERIFIED)',
  },
  { method: 'POST', path: '/v1/claims', purpose: 'create a DRAFT claim' },
  { method: 'GET', path: '/v1/claims/:claimId', purpose: 'read a claim for this org' },
  {
    method: 'POST',
    path: '/v1/claims/:claimId/evidence',
    purpose: 'link evidence to a claim in this org',
  },
  { method: 'POST', path: '/v1/approval-requests', purpose: 'create a durable human approval request' },
  {
    method: 'POST',
    path: '/v1/approval-requests/:requestId/decision',
    purpose: 'record a human approval or rejection',
  },
  { method: 'GET', path: '/v1/integrations', purpose: 'list gated provider catalog (NOT_CONFIGURED)' },
  {
    method: 'GET',
    path: '/v1/integrations/:providerKey/status',
    purpose: 'read one provider status (never CONNECTED)',
  },
  {
    method: 'POST',
    path: '/v1/integrations/:providerKey/operations',
    purpose: 'record a tenant-scoped provider intent (no outbound call)',
  },
  {
    method: 'GET',
    path: '/v1/integration-operations/:operationId',
    purpose: 'read a durable integration operation for this org',
  },
  {
    method: 'POST',
    path: '/v1/integration-operations/:operationId/cancel',
    purpose: 'cancel a non-terminal integration operation in this org',
  },
] as const;

export function describeIntegration(name: IntegrationName): string {
  switch (name) {
    case 'postgres':
      return 'local PostgreSQL schema + Compose service; DATABASE_URL required to start the process';
    case 'materialOpportunityIntake':
      return 'MATERIAL_OPPORTUNITY_INTAKE v0.1 persists sessions, tasks, and audit events';
    case 'authentication':
      return 'OIDC JWT provider is implemented but not a live IdP. Local default is DEVELOPMENT headers behind TenantContext; roles come from organization_memberships, never from headers or JWT claims';
    case 'primeRuntime':
      return 'PRIME policy v0.1 for MATERIAL_OPPORTUNITY_INTAKE with durable run-next, leases, and cancel; not a general agent runtime';
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
