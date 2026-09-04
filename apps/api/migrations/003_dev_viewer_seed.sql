-- Tenant-context preparation.
-- users.role is already the authorization source of truth (CHECK on
-- OWNER | ESG_LEAD | OPERATIONS | REVIEWER | VIEWER in 001_init.sql).
-- This migration does not alter that column.
--
-- Impact: additive DEVELOPMENT seed only. Existing org/user UUIDs stay.
-- Adds a VIEWER in the seeded org so role checks can be tested without
-- treating x-earth-user-role as a privilege grant.

INSERT INTO users (id, organization_id, email, role, created_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'dev-viewer@earth.local',
  'VIEWER',
  now()
);
