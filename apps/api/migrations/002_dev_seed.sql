-- DEVELOPMENT SEED ONLY.
-- These rows exist so the documented demo curl works against a local database.
-- They are not a production tenant, IdP identities, or real operators.

INSERT INTO organizations (id, name, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'EARTH Development Org',
  now()
);

INSERT INTO users (id, organization_id, email, role, created_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'dev-owner@earth.local',
  'OWNER',
  now()
);
