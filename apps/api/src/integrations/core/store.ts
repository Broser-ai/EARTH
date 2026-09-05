import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { TenantContext } from '../../auth/types.js';
import type {
  IntegrationDataClassification,
  IntegrationOperation,
  IntegrationOperationState,
  IntegrationProviderKey,
  IntegrationProviderRecord,
  IntegrationProviderStatus,
  IntegrationReasonCode,
  IntegrationRequest,
  TenantIntegrationPolicy,
} from '../types.js';
import { isIntegrationProviderKey } from '../types.js';

interface ProviderRow {
  id: string;
  provider_key: string;
  display_name: string;
  default_status: string;
  external_data_transfer: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PolicyRow {
  id: string;
  organization_id: string;
  provider_key: string;
  enabled: boolean;
  allowed_data_classifications: string[];
  allowed_purposes: string[];
  require_human_approval: boolean;
  monthly_request_limit: number | null;
  monthly_cost_limit_dkk: string | null;
  created_at: Date;
  updated_at: Date;
}

interface OperationRow {
  id: string;
  organization_id: string;
  provider_key: string;
  operation_type: string;
  state: string;
  idempotency_key: string;
  purpose: string;
  data_classification: string;
  request_digest_sha256: string | null;
  response_digest_sha256: string | null;
  safe_summary: string | null;
  provider_job_reference: string | null;
  requested_by: string;
  started_at: Date | null;
  completed_at: Date | null;
  expires_at: Date | null;
  error_code: string | null;
  correlation_id: string;
  created_at: Date;
  updated_at: Date;
}

export class IntegrationStore {
  constructor(private readonly pool: Pool) {}

  async withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listProviders(client: PoolClient): Promise<IntegrationProviderRecord[]> {
    const result = await client.query<ProviderRow>(
      `SELECT * FROM integration_providers ORDER BY provider_key ASC`,
    );
    return result.rows.map(mapProvider);
  }

  async getProvider(
    client: PoolClient,
    providerKey: IntegrationProviderKey,
  ): Promise<IntegrationProviderRecord | null> {
    const result = await client.query<ProviderRow>(
      `SELECT * FROM integration_providers WHERE provider_key = $1`,
      [providerKey],
    );
    const row = result.rows[0];
    return row ? mapProvider(row) : null;
  }

  async getTenantPolicy(
    client: PoolClient,
    context: TenantContext,
    providerKey: IntegrationProviderKey,
  ): Promise<TenantIntegrationPolicy | null> {
    const result = await client.query<PolicyRow>(
      `SELECT * FROM tenant_integration_policies
       WHERE organization_id = $1 AND provider_key = $2`,
      [context.organizationId, providerKey],
    );
    const row = result.rows[0];
    return row ? mapPolicy(row) : null;
  }

  async countMonthlyRequests(
    client: PoolClient,
    context: TenantContext,
    providerKey: IntegrationProviderKey,
  ): Promise<number> {
    const result = await client.query<{ n: string }>(
      `SELECT count(*)::text AS n
       FROM integration_operations
       WHERE organization_id = $1
         AND provider_key = $2
         AND created_at >= date_trunc('month', now())
         AND state <> 'BLOCKED'`,
      [context.organizationId, providerKey],
    );
    return Number(result.rows[0]?.n ?? 0);
  }

  async findByIdempotency(
    client: PoolClient,
    context: TenantContext,
    providerKey: IntegrationProviderKey,
    idempotencyKey: string,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `SELECT * FROM integration_operations
       WHERE organization_id = $1 AND provider_key = $2 AND idempotency_key = $3`,
      [context.organizationId, providerKey, idempotencyKey],
    );
    const row = result.rows[0];
    return row ? mapOperation(row) : null;
  }

  async insertOperation(
    client: PoolClient,
    context: TenantContext,
    request: IntegrationRequest,
    args: {
      state: IntegrationOperationState;
      errorCode: IntegrationReasonCode | null;
      requestDigest: string;
      safeSummary: string;
      requireHumanApproval: boolean;
    },
  ): Promise<IntegrationOperation> {
    const id = randomUUID();
    const expiresAt =
      typeof request.timeoutMs === 'number' ? new Date(Date.now() + request.timeoutMs) : null;
    const result = await client.query<OperationRow>(
      `INSERT INTO integration_operations (
         id, organization_id, provider_key, operation_type, state, idempotency_key,
         purpose, data_classification, request_digest_sha256, response_digest_sha256,
         safe_summary, provider_job_reference, requested_by, started_at, completed_at,
         expires_at, error_code, correlation_id, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, NULL,
         $10, NULL, $11, NULL, NULL,
         $12, $13, $14, now(), now()
       )
       RETURNING *`,
      [
        id,
        context.organizationId,
        request.providerKey,
        request.operationType,
        args.state,
        request.idempotencyKey,
        request.purpose,
        request.dataClassification,
        args.requestDigest,
        args.safeSummary,
        context.actorId,
        expiresAt,
        args.errorCode,
        context.correlationId,
      ],
    );
    void args.requireHumanApproval;
    return mapOperation(result.rows[0]);
  }

  async getOperation(
    client: PoolClient,
    context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `SELECT * FROM integration_operations
       WHERE id = $1 AND organization_id = $2`,
      [operationId, context.organizationId],
    );
    const row = result.rows[0];
    return row ? mapOperation(row) : null;
  }

  async expireOverdueNotConfigured(
    client: PoolClient,
    context: TenantContext,
    operation: IntegrationOperation,
  ): Promise<IntegrationOperation> {
    if (operation.state !== 'NOT_CONFIGURED' || !operation.expiresAt) {
      return operation;
    }
    const result = await client.query<OperationRow>(
      `UPDATE integration_operations
       SET state = 'EXPIRED',
           completed_at = COALESCE(completed_at, now()),
           updated_at = now(),
           error_code = 'INTEGRATION_OPERATION_EXPIRED',
           safe_summary = 'Operation expired without execution. No external provider call was made.'
       WHERE id = $1
         AND organization_id = $2
         AND state = 'NOT_CONFIGURED'
         AND expires_at IS NOT NULL
         AND expires_at < now()
       RETURNING *`,
      [operation.id, context.organizationId],
    );
    const row = result.rows[0];
    return row ? mapOperation(row) : operation;
  }

  async cancelOperation(
    client: PoolClient,
    context: TenantContext,
    operationId: string,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `UPDATE integration_operations
       SET state = 'CANCELLED',
           completed_at = now(),
           updated_at = now(),
           error_code = COALESCE(error_code, 'INTEGRATION_OPERATION_NOT_IMPLEMENTED'),
           safe_summary = 'Operation cancelled. No external provider call was made.'
       WHERE id = $1 AND organization_id = $2 AND state <> 'CANCELLED'
       RETURNING *`,
      [operationId, context.organizationId],
    );
    const row = result.rows[0];
    if (row) {
      return mapOperation(row);
    }
    return this.getOperation(client, context, operationId);
  }
}

function mapProvider(row: ProviderRow): IntegrationProviderRecord {
  if (!isIntegrationProviderKey(row.provider_key)) {
    throw new Error(`unknown seeded provider_key ${row.provider_key}`);
  }
  return {
    id: row.id,
    providerKey: row.provider_key,
    displayName: row.display_name,
    defaultStatus: row.default_status as IntegrationProviderStatus,
    externalDataTransfer: row.external_data_transfer,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapPolicy(row: PolicyRow): TenantIntegrationPolicy {
  if (!isIntegrationProviderKey(row.provider_key)) {
    throw new Error(`unknown policy provider_key ${row.provider_key}`);
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerKey: row.provider_key,
    enabled: row.enabled,
    allowedDataClassifications: row.allowed_data_classifications as IntegrationDataClassification[],
    allowedPurposes: row.allowed_purposes,
    requireHumanApproval: row.require_human_approval,
    monthlyRequestLimit: row.monthly_request_limit,
    monthlyCostLimitDkk: row.monthly_cost_limit_dkk,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapOperation(row: OperationRow): IntegrationOperation {
  if (!isIntegrationProviderKey(row.provider_key)) {
    throw new Error(`unknown operation provider_key ${row.provider_key}`);
  }
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerKey: row.provider_key,
    operationType: row.operation_type,
    state: row.state as IntegrationOperationState,
    idempotencyKey: row.idempotency_key,
    purpose: row.purpose,
    dataClassification: row.data_classification as IntegrationDataClassification,
    requestDigestSha256: row.request_digest_sha256,
    responseDigestSha256: row.response_digest_sha256,
    safeSummary: row.safe_summary,
    providerJobReference: row.provider_job_reference,
    requestedBy: row.requested_by,
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    errorCode: row.error_code,
    correlationId: row.correlation_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    reasonCode: (row.error_code as IntegrationReasonCode | null) ?? null,
    requireHumanApproval: true,
  };
}
