-- OIDC subject mapping + email normalization + future multi-org memberships.
-- Does not enable Postgres RLS. Does not auto-create organizations or users.
-- Token `sub` maps to users.oidc_subject; role and org stay in Postgres.

ALTER TABLE users
  ADD COLUMN oidc_subject text;

ALTER TABLE users
  ADD CONSTRAINT users_oidc_subject_unique UNIQUE (oidc_subject);

UPDATE users
SET email = lower(trim(email))
WHERE email IS DISTINCT FROM lower(trim(email));

ALTER TABLE users
  ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE organization_memberships (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id),
  CONSTRAINT organization_memberships_role_check CHECK (
    role IN ('OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER')
  )
);

INSERT INTO organization_memberships (user_id, organization_id, role)
SELECT id, organization_id, role FROM users;

CREATE INDEX idx_organization_memberships_organization_id
  ON organization_memberships (organization_id);

-- Audit attribution: actor_id already exists; persist the request auth mode.
ALTER TABLE audit_events
  ADD COLUMN auth_mode text;

ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_auth_mode_check CHECK (
    auth_mode IS NULL OR auth_mode IN ('DEVELOPMENT_ONLY', 'OIDC')
  );

CREATE INDEX idx_audit_events_actor_id ON audit_events (actor_id);
