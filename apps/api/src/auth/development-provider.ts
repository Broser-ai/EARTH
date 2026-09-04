import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { USER_ROLES, type UserRole } from '../contracts.js';
import { AuthError } from './errors.js';
import {
  AUTH_MODE_DEVELOPMENT,
  type AuthenticatedActor,
  type AuthProvider,
} from './types.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DEVELOPMENT ONLY identity.
 * Headers identify which seeded row to load; they are not authentication.
 * Role always comes from Postgres users.role. x-earth-user-role cannot escalate.
 */
export class DevelopmentAuthProvider implements AuthProvider {
  readonly authMode = AUTH_MODE_DEVELOPMENT;

  constructor(private readonly pool: Pool) {}

  async getActor(request: FastifyRequest): Promise<AuthenticatedActor> {
    const organizationId = header(request, 'x-earth-org-id');
    const userId = header(request, 'x-earth-user-id');
    const roleHeader = header(request, 'x-earth-user-role');

    if (!organizationId || !userId || !roleHeader) {
      throw new AuthError(
        401,
        'DEVELOPMENT_IDENTITY_REQUIRED',
        'DEVELOPMENT ONLY: send x-earth-org-id, x-earth-user-id, and x-earth-user-role. This is not authentication.',
      );
    }

    if (!UUID_RE.test(organizationId) || !UUID_RE.test(userId)) {
      throw new AuthError(
        400,
        'DEVELOPMENT_IDENTITY_INVALID',
        'DEVELOPMENT ONLY: org and user headers must be UUIDs. This is not authentication.',
      );
    }

    if (!isRole(roleHeader)) {
      throw new AuthError(
        400,
        'DEVELOPMENT_IDENTITY_INVALID',
        'DEVELOPMENT ONLY: x-earth-user-role is not a known role. This is not authentication.',
      );
    }

    const result = await this.pool.query<{ id: string; organization_id: string; role: UserRole }>(
      `SELECT id, organization_id, role FROM users WHERE id = $1 AND organization_id = $2`,
      [userId, organizationId],
    );
    const user = result.rows[0];
    if (!user) {
      throw new AuthError(
        403,
        'DEVELOPMENT_IDENTITY_MISMATCH',
        'DEVELOPMENT ONLY: user is not a member of the given organization. This is not authentication.',
      );
    }

    return {
      actorId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      authMode: AUTH_MODE_DEVELOPMENT,
    };
  }
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
