CREATE TABLE IF NOT EXISTS evidence_documents (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), material_batch_id uuid REFERENCES material_batches(id),
  original_filename text NOT NULL, media_type text, source_type text NOT NULL CHECK (source_type IN ('USER_UPLOAD','ERP_EXPORT','SUPPLIER_DECLARATION','THIRD_PARTY_CERTIFICATE','SENSOR_MEASUREMENT','MANUAL_ENTRY','SYSTEM_GENERATED')),
  storage_status text NOT NULL CHECK (storage_status IN ('METADATA_ONLY','PENDING_UPLOAD','AVAILABLE','UNAVAILABLE')),
  content_digest_sha256 text, source_uri text, issued_at timestamptz, expires_at timestamptz, received_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evidence_records (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), document_id uuid REFERENCES evidence_documents(id), material_batch_id uuid REFERENCES material_batches(id),
  field_name text NOT NULL, value_json jsonb NOT NULL, unit text, extraction_method text NOT NULL CHECK (extraction_method IN ('MANUAL','SYSTEM_RULE','FUTURE_AI_DRAFT','IMPORT')),
  extraction_version text NOT NULL, confidence numeric CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  verification_status text NOT NULL CHECK (verification_status IN ('INPUT_UNVERIFIED','ESTIMATED','EVIDENCE_SUBMITTED','REVIEWED','REJECTED')),
  source_locator text, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), material_batch_id uuid REFERENCES material_batches(id),
  claim_type text NOT NULL CHECK (claim_type IN ('MATERIAL_COMPOSITION','RECYCLED_CONTENT','MATERIAL_QUANTITY','EMISSION_ACTIVITY','EMISSION_CALCULATION','CIRCULARITY_OUTCOME','RECYCLER_CAPABILITY','SUPPLIER_DECLARATION','OTHER')),
  statement text NOT NULL, value_json jsonb NOT NULL, unit text, calculation_method text, calculation_version text, emission_factor_reference text,
  reporting_period_start timestamptz, reporting_period_end timestamptz, confidence numeric CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1), uncertainty_note text,
  status text NOT NULL CHECK (status IN ('DRAFT','ESTIMATED','EVIDENCE_SUBMITTED','PENDING_REVIEW','VERIFIED','REJECTED','SUPERSEDED')),
  created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), supersedes_claim_id uuid REFERENCES claims(id)
);
CREATE TABLE IF NOT EXISTS claim_evidence (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), claim_id uuid NOT NULL REFERENCES claims(id),
  evidence_record_id uuid REFERENCES evidence_records(id), evidence_document_id uuid REFERENCES evidence_documents(id),
  relation_type text NOT NULL CHECK (relation_type IN ('SUPPORTS','CONTRADICTS','CALCULATION_INPUT','REVIEW_REFERENCE')), required boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((evidence_record_id IS NULL) <> (evidence_document_id IS NULL))
);
CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), claim_id uuid REFERENCES claims(id), session_id uuid REFERENCES execution_sessions(id),
  request_type text NOT NULL CHECK (request_type IN ('CLAIM_VERIFICATION','CLAIM_REJECTION','EVIDENCE_REVIEW','HIGH_IMPACT_WORKFLOW')),
  state text NOT NULL CHECK (state IN ('PENDING','APPROVED','REJECTED','CANCELLED','EXPIRED')), requested_by uuid NOT NULL REFERENCES users(id), requested_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
  required_roles text[] NOT NULL, evidence_snapshot_digest_sha256 text NOT NULL, claim_snapshot_digest_sha256 text, reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((claim_id IS NULL) <> (session_id IS NULL))
);
CREATE TABLE IF NOT EXISTS approval_decisions (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), approval_request_id uuid NOT NULL UNIQUE REFERENCES approval_requests(id),
  decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED')), decided_by uuid NOT NULL REFERENCES users(id), decided_at timestamptz NOT NULL DEFAULT now(), comment text,
  evidence_snapshot_digest_sha256 text NOT NULL, claim_snapshot_digest_sha256 text, auth_mode text NOT NULL, correlation_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_documents_org_batch ON evidence_documents(organization_id, material_batch_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_org_document_batch ON evidence_records(organization_id, document_id, material_batch_id);
CREATE INDEX IF NOT EXISTS idx_claims_org_batch_status ON claims(organization_id, material_batch_id, status);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_org_claim ON claim_evidence(organization_id, claim_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_org_state ON approval_requests(organization_id, state);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_org_request ON approval_decisions(organization_id, approval_request_id);