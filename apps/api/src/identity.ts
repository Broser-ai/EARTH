import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { developmentError } from './http.js';
import { USER_ROLES, type Identity, type UserRole } from './prime/types.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare module 'fastify' {
  interface FastifyRequest {
    earthIdentity: Identity;
  }
}

/**
 * DEVELOPMENT ONLY.
 * Reads x-earth-org-id / x-earth-user-id / x-earth-user-role and looks the
 * pair up in the local database. This is not authentication and must be
 * replaced with OIDC (or equivalent) before any non-local deploy.
 */
export function registerDevelopmentIdentity(app: FastifyInstance, pool: Pool): void {
  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      return;
    }

    const organizationId = header(request, 'x-earth-org-id');
    const userId = header(request, 'x-earth-user-id');
    const roleHeader = header(request, 'x-earth-user-role');

    if (!organizationId || !userId || !roleHeader) {
      return reply.status(401).send(
        developmentError(
          'DEVELOPMENT_IDENTITY_REQUIRED',
          'DEVELOPMENT ONLY: send x-earth-org-id, x-earth-user-id, and x-earth-user-role. This is not authentication.',
        ),
      );
    }

    if (!UUID_RE.test(organizationId) || !UUID_RE.test(userId)) {
      return reply.status(400).send(
        developmentError(
          'DEVELOPMENT_IDENTITY_INVALID',
          'DEVELOPMENT ONLY: org and user headers must be UUIDs. This is not authentication.',
        ),
      );
    }

    if (!isRole(roleHeader)) {
      return reply.status(400).send(
        developmentError(
          'DEVELOPMENT_IDENTITY_INVALID',
          'DEVELOPMENT ONLY: x-earth-user-role is not a known role. This is not authentication.',
        ),
      );
    }

    const result = await pool.query<{ id: string; organization_id: string; role: UserRole }>(
      `SELECT id, organization_id, role FROM users WHERE id = $1 AND organization_id = $2`,
      [userId, organizationId],
    );
    const user = result.rows[0];
    if (!user) {
      return reply.status(403).send(
        developmentError(
          'DEVELOPMENT_IDENTITY_MISMATCH',
          'DEVELOPMENT ONLY: user is not a member of the given organization. This is not authentication.',
        ),
      );
    }

    if (user.role !== roleHeader) {
      return reply.status(403).send(
        developmentError(
          'DEVELOPMENT_IDENTITY_MISMATCH',
          'DEVELOPMENT ONLY: x-earth-user-role does not match the stored user role. This is not authentication.',
        ),
      );
    }

    request.earthIdentity = {
      organizationId: user.organization_id,
      userId: user.id,
      role: user.role,
    };
  });
}

function header(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];
  if (typeof value === 'string') {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim();
  }
  return undefined;
}

function isRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
