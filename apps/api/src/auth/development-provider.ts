import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { developmentAuthAllowed, type EarthConfig } from '../config.js';
import type { UserRole } from '../contracts.js';
import { AuthError } from './errors.js';
import { readHeader } from './headers.js';
import {
  AUTH_MODE_DEVELOPMENT,
  type AuthenticatedActor,
  type AuthProvider,
} from './types.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DEVELOPMENT ONLY identity.
 *
 * Active solely when NODE_ENV is development (or the test runner) AND
 * EARTH_AUTH_MODE=development. Headers identify which seeded row to load;
 * they are not authentication.
 *
 * Org and role always come from Postgres. `x-earth-user-role` is ignored
 * entirely — it is not read, not validated, and cannot escalate.
 */
export class DevelopmentHeaderAuthProvider implements AuthProvider {
  readonly authMode = AUTH_MODE_DEVELOPMENT;

  constructor(
    private readonly pool: Pool,
    private readonly config: Pick<EarthConfig, 'nodeEnv' | 'authModeSetting'>,
  ) {}

  async getActor(request: FastifyRequest): Promise<AuthenticatedActor> {
    if (!developmentAuthAllowed(this.config.nodeEnv, this.config.authModeSetting)) {
      throw new AuthError(
        401,
        'DEVELOPMENT_AUTH_DISABLED',
        'DEVELOPMENT identity headers are disabled outside local development. This is not production authentication.',
      );
    }

    const organizationId = readHeader(request, 'x-earth-org-id');
    const userId = readHeader(request, 'x-earth-user-id');

    if (!organizationId || !userId) {
      throw new AuthError(
        401,
        'DEVELOPMENT_IDENTITY_REQUIRED',
        'DEVELOPMENT ONLY: send x-earth-org-id and x-earth-user-id. x-earth-user-role is ignored. This is not authentication.',
      );
    }

    if (!UUID_RE.test(organizationId) || !UUID_RE.test(userId)) {
      throw new AuthError(
        400,
        'DEVELOPMENT_IDENTITY_INVALID',
        'DEVELOPMENT ONLY: org and user headers must be UUIDs. This is not authentication.',
      );
    }

    const result = await this.pool.query<{
      id: string;
      organization_id: string;
      role: UserRole;
      email: string;
    }>(
      `SELECT id, organization_id, role, email FROM users WHERE id = $1 AND organization_id = $2`,
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
      email: user.email,
    };
  }
}

/** @deprecated Use DevelopmentHeaderAuthProvider. */
export const DevelopmentAuthProvider = DevelopmentHeaderAuthProvider;
