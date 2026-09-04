-- EARTH PRIME Control Plane v0.1
-- Material Opportunity Intake — canonical tables.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (
    role IN ('OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER')
  )
);

CREATE TABLE material_batches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  external_reference text,
  material_class text NOT NULL,
  quantity_kg numeric NOT NULL,
  facility_name text,
  available_from timestamptz,
  status text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_batches_status_check CHECK (
    status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')
  ),
  CONSTRAINT material_batches_quantity_positive CHECK (quantity_kg > 0)
);

CREATE TABLE execution_sessions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  material_batch_id uuid NOT NULL REFERENCES material_batches(id),
  workflow_type text NOT NULL,
  workflow_version text NOT NULL,
  state text NOT NULL,
  state_version integer NOT NULL DEFAULT 1,
  idempotency_key text NOT NULL,
  data_classification text NOT NULL,
  max_tasks integer NOT NULL,
  max_parallel_tasks integer NOT NULL,
  max_llm_calls integer NOT NULL,
  used_llm_calls integer NOT NULL DEFAULT 0,
  max_input_tokens integer NOT NULL,
  used_input_tokens integer NOT NULL DEFAULT 0,
  max_output_tokens integer NOT NULL,
  used_output_tokens integer NOT NULL DEFAULT 0,
  max_estimated_cost_dkk numeric NOT NULL,
  used_estimated_cost_dkk numeric NOT NULL DEFAULT 0,
  max_estimated_gco2e numeric NOT NULL,
  used_estimated_gco2e numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT execution_sessions_state_check CHECK (
    state IN (
      'QUEUED',
      'RUNNING',
      'WAITING_FOR_DEPENDENCY',
      'WAITING_FOR_APPROVAL',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'BUDGET_STOPPED',
      'EXPIRED'
    )
  ),
  CONSTRAINT execution_sessions_classification_check CHECK (
    data_classification IN ('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')
  ),
  CONSTRAINT execution_sessions_org_idempotency UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE execution_tasks (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES execution_sessions(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  task_type text NOT NULL,
  state text NOT NULL,
  required boolean NOT NULL,
  priority integer NOT NULL,
  input_json jsonb NOT NULL,
  output_json jsonb,
  error_code text,
  idempotency_key text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT execution_tasks_type_check CHECK (
    task_type IN (
      'VALIDATE_BATCH',
      'CHECK_EVIDENCE',
      'CALCULATE_BASELINE',
      'FIND_CANDIDATE_ROUTES',
      'NANOCHAT_EXTRACT'
    )
  ),
  CONSTRAINT execution_tasks_state_check CHECK (
    state IN (
      'QUEUED',
      'RUNNING',
      'COMPLETED',
      'PARTIAL',
      'ABSTAINED',
      'FAILED',
      'BLOCKED',
      'NOT_CONFIGURED',
      'CANCELLED'
    )
  ),
  CONSTRAINT execution_tasks_session_idempotency UNIQUE (session_id, idempotency_key)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  session_id uuid REFERENCES execution_sessions(id),
  task_id uuid REFERENCES execution_tasks(id),
  actor_type text NOT NULL,
  actor_id text NOT NULL,
  event_type text NOT NULL,
  previous_state text,
  next_state text,
  policy_version text NOT NULL,
  input_digest text,
  output_digest text,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_actor_type_check CHECK (
    actor_type IN ('USER', 'SYSTEM', 'WORKER')
  )
);

-- Tenant / org filtering
CREATE INDEX idx_users_organization_id ON users (organization_id);
CREATE INDEX idx_material_batches_organization_id ON material_batches (organization_id);
CREATE INDEX idx_execution_sessions_organization_id ON execution_sessions (organization_id);
CREATE INDEX idx_execution_tasks_organization_id ON execution_tasks (organization_id);
CREATE INDEX idx_audit_events_organization_id ON audit_events (organization_id);

-- Session state
CREATE INDEX idx_execution_sessions_state ON execution_sessions (state);
CREATE INDEX idx_execution_sessions_org_state ON execution_sessions (organization_id, state);

-- Task state and priority
CREATE INDEX idx_execution_tasks_state_priority ON execution_tasks (state, priority);
CREATE INDEX idx_execution_tasks_session_id ON execution_tasks (session_id);

-- Audit lookup by organization / session
CREATE INDEX idx_audit_events_session_id ON audit_events (session_id);
CREATE INDEX idx_audit_events_org_session ON audit_events (organization_id, session_id);
