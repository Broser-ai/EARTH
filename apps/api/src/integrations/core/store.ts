import type { Pool, PoolClient } from 'pg';
import {
  assertIntegrationProviderKey,
  isIntegrationPurpose,
  type IntegrationDataClassification,
  type IntegrationOperation,
  type IntegrationOperationState,
  type IntegrationProviderKey,
  type IntegrationPurpose,
  type TenantIntegrationPolicy,
} from '../types.js';

export interface ProviderCatalogRow {
  providerKey: IntegrationProviderKey;
  displayName: string;
  defaultStatus: string;
  externalDataTransfer: boolean;
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
  started_at: Date | string | null;
  completed_at: Date | string | null;
  expires_at: Date | string | null;
  error_code: string | null;
  correlation_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PolicyRow {
  id: string;
  organization_id: string;
  provider_key: string;
  enabled: boolean;
  allowed_data_classifications: string[] | null;
  allowed_purposes: string[] | null;
  require_human_approval: boolean;
  monthly_request_limit: number | null;
  monthly_cost_limit_dkk: string | number | null;
}

export class IntegrationStore {
  constructor(private readonly pool: Pool) {}

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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

  async listProviders(client: PoolClient): Promise<ProviderCatalogRow[]> {
    const result = await client.query<{
      provider_key: string;
      display_name: string;
      default_status: string;
      external_data_transfer: boolean;
    }>(
      `SELECT provider_key, display_name, default_status, external_data_transfer
       FROM integration_providers
       ORDER BY provider_key`,
    );
    return result.rows.map((row) => ({
      providerKey: assertIntegrationProviderKey(row.provider_key),
      displayName: row.display_name,
      defaultStatus: row.default_status,
      externalDataTransfer: row.external_data_transfer,
    }));
  }

  async getTenantPolicy(
    client: PoolClient,
    organizationId: string,
    providerKey: IntegrationProviderKey,
  ): Promise<TenantIntegrationPolicy | null> {
    const result = await client.query<PolicyRow>(
      `SELECT * FROM tenant_integration_policies
       WHERE organization_id = $1 AND provider_key = $2`,
      [organizationId, providerKey],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      organizationId: row.organization_id,
      providerKey: assertIntegrationProviderKey(row.provider_key),
      enabled: row.enabled,
      allowedDataClassifications: (row.allowed_data_classifications ?? []).filter(
        (value): value is IntegrationDataClassification =>
          value === 'PUBLIC' || value === 'INTERNAL' || value === 'CONFIDENTIAL' || value === 'RESTRICTED',
      ),
      allowedPurposes: row.allowed_purposes ?? [],
      requireHumanApproval: row.require_human_approval,
      monthlyRequestLimit: row.monthly_request_limit,
      monthlyCostLimitDkk:
        row.monthly_cost_limit_dkk === null ? null : Number(row.monthly_cost_limit_dkk),
    };
  }

  async countMonthlyRequests(
    client: PoolClient,
    organizationId: string,
    providerKey: IntegrationProviderKey,
  ): Promise<number> {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM integration_operations
       WHERE organization_id = $1
         AND provider_key = $2
         AND created_at >= date_trunc('month', now())
         AND state IN ('REQUESTED', 'QUEUED', 'RUNNING', 'SUCCEEDED')`,
      [organizationId, providerKey],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async findOperationByIdempotency(
    client: PoolClient,
    organizationId: string,
    providerKey: IntegrationProviderKey,
    idempotencyKey: string,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `SELECT * FROM integration_operations
       WHERE organization_id = $1 AND provider_key = $2 AND idempotency_key = $3
       FOR UPDATE`,
      [organizationId, providerKey, idempotencyKey],
    );
    return result.rows[0] ? toOperation(result.rows[0]) : null;
  }

  async insertOperation(
    client: PoolClient,
    operation: {
      id: string;
      organizationId: string;
      providerKey: IntegrationProviderKey;
      operationType: string;
      state: IntegrationOperationState;
      idempotencyKey: string;
      purpose: IntegrationPurpose;
      dataClassification: IntegrationDataClassification;
      requestDigestSha256: string | null;
      safeSummary: string | null;
      requestedBy: string;
      errorCode: string | null;
      correlationId: string;
      expiresAt: string;
    },
  ): Promise<IntegrationOperation> {
    const result = await client.query<OperationRow>(
      `INSERT INTO integration_operations (
        id, organization_id, provider_key, operation_type, state, idempotency_key,
        purpose, data_classification, request_digest_sha256, safe_summary,
        requested_by, error_code, correlation_id, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14
      ) RETURNING *`,
      [
        operation.id,
        operation.organizationId,
        operation.providerKey,
        operation.operationType,
        operation.state,
        operation.idempotencyKey,
        operation.purpose,
        operation.dataClassification,
        operation.requestDigestSha256,
        operation.safeSummary,
        operation.requestedBy,
        operation.errorCode,
        operation.correlationId,
        operation.expiresAt,
      ],
    );
    return toOperation(result.rows[0]);
  }

  async expireOverdue(
    client: PoolClient,
    organizationId: string,
    operationId: string,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `UPDATE integration_operations
       SET state = 'EXPIRED',
           error_code = 'OPERATION_EXPIRED',
           safe_summary = 'Operation exceeded its timeout boundary. No provider execution occurred.',
           completed_at = now(),
           updated_at = now()
       WHERE id = $1
         AND organization_id = $2
         AND expires_at IS NOT NULL
         AND expires_at < now()
         AND state NOT IN ('SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED')
       RETURNING *`,
      [operationId, organizationId],
    );
    return result.rows[0] ? toOperation(result.rows[0]) : null;
  }

  async getOperation(
    client: PoolClient,
    organizationId: string,
    operationId: string,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `SELECT * FROM integration_operations
       WHERE id = $1 AND organization_id = $2`,
      [operationId, organizationId],
    );
    return result.rows[0] ? toOperation(result.rows[0]) : null;
  }

  async updateOperationState(
    client: PoolClient,
    organizationId: string,
    operationId: string,
    state: IntegrationOperationState,
    errorCode: string | null,
    safeSummary: string | null,
  ): Promise<IntegrationOperation | null> {
    const result = await client.query<OperationRow>(
      `UPDATE integration_operations
       SET state = $3,
           error_code = $4,
           safe_summary = $5,
           completed_at = CASE WHEN $3 IN ('CANCELLED', 'SUCCEEDED', 'FAILED', 'EXPIRED') THEN now() ELSE completed_at END,
           updated_at = now()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [operationId, organizationId, state, errorCode, safeSummary],
    );
    return result.rows[0] ? toOperation(result.rows[0]) : null;
  }
}

function toOperation(row: OperationRow): IntegrationOperation {
  const purpose = isIntegrationPurpose(row.purpose) ? row.purpose : 'MATERIAL_IMAGE_INFERENCE';
  return {
    id: row.id,
    organizationId: row.organization_id,
    providerKey: assertIntegrationProviderKey(row.provider_key),
    operationType: row.operation_type,
    state: row.state as IntegrationOperationState,
    idempotencyKey: row.idempotency_key,
    purpose,
    dataClassification: row.data_classification as IntegrationDataClassification,
    requestDigestSha256: row.request_digest_sha256,
    responseDigestSha256: row.response_digest_sha256,
    safeSummary: row.safe_summary,
    providerJobReference: row.provider_job_reference,
    requestedBy: row.requested_by,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    expiresAt: toIso(row.expires_at),
    errorCode: row.error_code,
    correlationId: row.correlation_id,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

function toIso(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}
