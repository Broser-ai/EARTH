import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { USER_ROLES, type UserRole } from '../contracts.js';
import { AuthError } from './errors.js';
import {
  AUTH_MODE_DEVELOPMENT,
  type AuthenticatedActor,
  type AuthProvider,
} from './types.js';
import { findActiveMembershipByUserId, userExists } from './membership.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DEVELOPMENT ONLY identity.
 * Only x-earth-user-id identifies which seeded row to load; it is not authentication.
 * Organization and role headers are deliberately ignored and come from active membership records.
 */
export class DevelopmentAuthProvider implements AuthProvider {
  readonly authMode = AUTH_MODE_DEVELOPMENT;

  constructor(private readonly pool: Pool) { }

  async getActor(request: FastifyRequest): Promise<AuthenticatedActor> {
    const userId = header(request, 'x-earth-user-id');

    if (!userId) {
      throw new AuthError(
        401,
        'DEVELOPMENT_IDENTITY_REQUIRED',
        'Authentication is required.',
      );
    }

    if (!UUID_RE.test(userId)) {
      throw new AuthError(
        400,
        'DEVELOPMENT_IDENTITY_INVALID',
        'Development user ID must be a UUID.',
      );
    }

    const membership = await findActiveMembershipByUserId(this.pool, userId);
    if (!membership && !(await userExists(this.pool, userId))) {
      throw new AuthError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required.',
      );
    }
    if (!membership) {
      throw new AuthError(
        403,
        'FORBIDDEN',
        'Development user does not have an active EARTH membership.',
      );
    }

    return {
      actorId: membership.actorId,
      organizationId: membership.organizationId,
      role: membership.role,
      email: membership.email,
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

