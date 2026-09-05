import type { Pool } from 'pg';
import {
  createPool as createSharedPool,
  createTestApp,
  DEV_ORG,
  DEV_USER,
  DEV_VIEWER,
  OTHER_ORG,
  OTHER_USER,
  otherHeaders,
  resetWorkflowTables,
} from '../../helpers.js';
import type { UserRole } from '../../../src/contracts.js';
import type {
  IntegrationDataClassification,
  IntegrationProviderKey,
} from '../../../src/integrations/types.js';

export {
  createTestApp,
  DEV_ORG,
  DEV_USER,
  DEV_VIEWER,
  OTHER_ORG,
  OTHER_USER,
  otherHeaders,
};

/** Distinct from evidence-approvals REVIEWER fixture `66666666-...`. */
export const DEV_ESG_LEAD = '77777777-7777-7777-7777-777777777777';
export const DEV_OPERATIONS = '88888888-8888-8888-8888-888888888888';
export const DEV_REVIEWER = '99999999-9999-9999-9999-999999999999';

export const PROVIDERS: IntegrationProviderKey[] = [
  'ROBOFLOW',
  'HUGGINGFACE',
  'TINKER',
  'INKLING',
  'HEYGEN',
  'LANGGRAPH',
];

export async function createPool(): Promise<Pool> {
  const pool = await createSharedPool();
  await upsertCanonicalUser(pool, {
    id: DEV_ESG_LEAD,
    organizationId: DEV_ORG,
    email: 'dev-esg-lead@earth.local',
    role: 'ESG_LEAD',
  });
  await upsertCanonicalUser(pool, {
    id: DEV_OPERATIONS,
    organizationId: DEV_ORG,
    email: 'dev-operations@earth.local',
    role: 'OPERATIONS',
  });
  await upsertCanonicalUser(pool, {
    id: DEV_REVIEWER,
    organizationId: DEV_ORG,
    email: 'dev-icp-reviewer@earth.local',
    role: 'REVIEWER',
  });
  return pool;
}

export async function upsertCanonicalUser(
  pool: Pool,
  args: { id: string; organizationId: string; email: string; role: UserRole },
): Promise<void> {
  await pool.query(
    `INSERT INTO users (id, organization_id, email, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role`,
    [args.id, args.organizationId, args.email, args.role],
  );
  await pool.query(
    `INSERT INTO organization_memberships (id, organization_id, user_id, role, status)
     VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE')
     ON CONFLICT (organization_id, user_id) DO UPDATE SET
       role = EXCLUDED.role,
       status = 'ACTIVE'`,
    [args.organizationId, args.id, args.role],
  );
}

export async function resetIntegrationTables(pool: Pool): Promise<void> {
  await resetWorkflowTables(pool);
  await pool.query(`TRUNCATE integration_operations, tenant_integration_policies`);
}

export async function upsertTenantPolicy(
  pool: Pool,
  args: {
    organizationId: string;
    providerKey: IntegrationProviderKey;
    enabled: boolean;
    allowedDataClassifications?: IntegrationDataClassification[];
    allowedPurposes?: string[];
    requireHumanApproval?: boolean;
    monthlyRequestLimit?: number | null;
    monthlyCostLimitDkk?: string | null;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO tenant_integration_policies (
       id, organization_id, provider_key, enabled,
       allowed_data_classifications, allowed_purposes,
       require_human_approval, monthly_request_limit, monthly_cost_limit_dkk,
       created_at, updated_at
     ) VALUES (
       gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, now(), now()
     )
     ON CONFLICT (organization_id, provider_key) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       allowed_data_classifications = EXCLUDED.allowed_data_classifications,
       allowed_purposes = EXCLUDED.allowed_purposes,
       require_human_approval = EXCLUDED.require_human_approval,
       monthly_request_limit = EXCLUDED.monthly_request_limit,
       monthly_cost_limit_dkk = EXCLUDED.monthly_cost_limit_dkk,
       updated_at = now()`,
    [
      args.organizationId,
      args.providerKey,
      args.enabled,
      args.allowedDataClassifications ?? ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
      args.allowedPurposes ?? ['VISION_INSPECT', 'MODEL_CARD_LOOKUP'],
      args.requireHumanApproval ?? true,
      args.monthlyRequestLimit ?? null,
      args.monthlyCostLimitDkk ?? null,
    ],
  );
}

export function operationPayload(
  overrides: {
    providerKey?: IntegrationProviderKey;
    operationType?: string;
    purpose?: string;
    dataClassification?: IntegrationDataClassification;
    idempotencyKey?: string;
    payloadReference?: Record<string, unknown>;
  } = {},
) {
  return {
    operationType: overrides.operationType ?? 'VISION_INSPECT',
    purpose: overrides.purpose ?? 'VISION_INSPECT',
    dataClassification: overrides.dataClassification ?? 'INTERNAL',
    idempotencyKey: overrides.idempotencyKey ?? `idem-${Date.now()}-${Math.random()}`,
    ...(overrides.providerKey ? { providerKey: overrides.providerKey } : {}),
    ...(overrides.payloadReference ? { payloadReference: overrides.payloadReference } : {}),
  };
}

export function roleHeaders(userId: string, roleHeader?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-earth-org-id': DEV_ORG,
    'x-earth-user-id': userId,
  };
  if (roleHeader) {
    headers['x-earth-user-role'] = roleHeader;
  }
  return headers;
}

export function jsonHasSecretLike(value: unknown): boolean {
  const text = JSON.stringify(value);
  return (
    /"(apiKey|api_key|client_secret|access_token|refresh_token|id_token|authorization|password|jwt|bearer)"\s*:/i.test(
      text,
    ) ||
    /bearer\s+[a-z0-9_-]{8,}/i.test(text) ||
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./.test(text) ||
    /VITE_(ROBOFLOW|TINKER|INKLING|HEYGEN|HUGGINGFACE|LANGGRAPH)_/i.test(text) ||
    /present-but-not-a-connection/.test(text)
  );
}
