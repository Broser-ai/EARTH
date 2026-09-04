-- OIDC-ready identities and memberships. DEVELOPMENT seed users remain local-only.

ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_subject text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS normalized_email text;
CREATE UNIQUE INDEX IF NOT EXISTS users_oidc_subject_unique
  ON users (oidc_subject) WHERE oidc_subject IS NOT NULL;

CREATE TABLE IF NOT EXISTS organization_memberships (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER')),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO organization_memberships (id, organization_id, user_id, role, status)
SELECT gen_random_uuid(), organization_id, id, role, 'ACTIVE'
FROM users
ON CONFLICT (organization_id, user_id) DO NOTHING;

ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS auth_mode text;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS correlation_id text;
CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON organization_memberships (user_id, status);