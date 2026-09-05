-- EARTH Integration Control Plane v0.1
-- Server-side provider registry, tenant policies, and operation ledger.
-- Providers stay NOT_CONFIGURED by default. This migration does not enable
-- outbound vendor calls, store secrets, or claim CONNECTED/AVAILABLE.

CREATE TABLE integration_providers (
  id uuid PRIMARY KEY,
  provider_key text NOT NULL,
  display_name text NOT NULL,
  default_status text NOT NULL,
  external_data_transfer boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_providers_key_unique UNIQUE (provider_key),
  CONSTRAINT integration_providers_key_check CHECK (
    provider_key IN (
      'ROBOFLOW',
      'HUGGINGFACE',
      'TINKER',
      'INKLING',
      'HEYGEN',
      'LANGGRAPH'
    )
  ),
  CONSTRAINT integration_providers_status_check CHECK (
    default_status IN (
      'NOT_CONFIGURED',
      'DISABLED',
      'AVAILABLE',
      'DEGRADED',
      'ERROR'
    )
  )
);

CREATE TABLE tenant_integration_policies (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  provider_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  allowed_data_classifications text[] NOT NULL DEFAULT '{}',
  allowed_purposes text[] NOT NULL DEFAULT '{}',
  require_human_approval boolean NOT NULL DEFAULT true,
  monthly_request_limit integer,
  monthly_cost_limit_dkk numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_integration_policies_org_provider UNIQUE (organization_id, provider_key),
  CONSTRAINT tenant_integration_policies_provider_check CHECK (
    provider_key IN (
      'ROBOFLOW',
      'HUGGINGFACE',
      'TINKER',
      'INKLING',
      'HEYGEN',
      'LANGGRAPH'
    )
  ),
  CONSTRAINT tenant_integration_policies_limit_check CHECK (
    monthly_request_limit IS NULL OR monthly_request_limit >= 0
  ),
  CONSTRAINT tenant_integration_policies_cost_check CHECK (
    monthly_cost_limit_dkk IS NULL OR monthly_cost_limit_dkk >= 0
  )
);

CREATE TABLE integration_operations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  provider_key text NOT NULL,
  operation_type text NOT NULL,
  state text NOT NULL,
  idempotency_key text NOT NULL,
  purpose text NOT NULL,
  data_classification text NOT NULL,
  request_digest_sha256 text,
  response_digest_sha256 text,
  safe_summary text,
  provider_job_reference text,
  requested_by uuid NOT NULL REFERENCES users(id),
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  error_code text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_operations_org_provider_idempotency
    UNIQUE (organization_id, provider_key, idempotency_key),
  CONSTRAINT integration_operations_provider_check CHECK (
    provider_key IN (
      'ROBOFLOW',
      'HUGGINGFACE',
      'TINKER',
      'INKLING',
      'HEYGEN',
      'LANGGRAPH'
    )
  ),
  CONSTRAINT integration_operations_state_check CHECK (
    state IN (
      'REQUESTED',
      'BLOCKED',
      'NOT_CONFIGURED',
      'QUEUED',
      'RUNNING',
      'SUCCEEDED',
      'FAILED',
      'CANCELLED',
      'EXPIRED'
    )
  ),
  CONSTRAINT integration_operations_classification_check CHECK (
    data_classification IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')
  )
);

CREATE INDEX idx_tenant_integration_policies_organization_id
  ON tenant_integration_policies (organization_id);

CREATE INDEX idx_integration_operations_organization_id
  ON integration_operations (organization_id);

CREATE INDEX idx_integration_operations_org_provider_state
  ON integration_operations (organization_id, provider_key, state);

CREATE INDEX idx_integration_operations_created_at
  ON integration_operations (organization_id, provider_key, created_at);

INSERT INTO integration_providers (
  id, provider_key, display_name, default_status, external_data_transfer
) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'ROBOFLOW', 'Roboflow', 'NOT_CONFIGURED', true),
  ('a1111111-1111-4111-8111-111111111112', 'HUGGINGFACE', 'Hugging Face', 'NOT_CONFIGURED', true),
  ('a1111111-1111-4111-8111-111111111113', 'TINKER', 'Tinker', 'NOT_CONFIGURED', true),
  ('a1111111-1111-4111-8111-111111111114', 'INKLING', 'Inkling', 'NOT_CONFIGURED', false),
  ('a1111111-1111-4111-8111-111111111115', 'HEYGEN', 'HeyGen', 'NOT_CONFIGURED', true),
  ('a1111111-1111-4111-8111-111111111116', 'LANGGRAPH', 'LangGraph', 'NOT_CONFIGURED', false);
