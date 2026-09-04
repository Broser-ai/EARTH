import type { FastifyRequest } from 'fastify';
import type { UserRole } from '../contracts.js';

export const AUTH_MODE_DEVELOPMENT = 'DEVELOPMENT_ONLY' as const;
export const AUTH_MODE_OIDC = 'OIDC' as const;

export type AuthMode = typeof AUTH_MODE_DEVELOPMENT | typeof AUTH_MODE_OIDC;

export interface AuthenticatedActor {
  actorId: string;
  organizationId: string;
  role: UserRole;
  authMode: AuthMode;
  email?: string;
  subject?: string;
}

/**
 * Server-derived tenant scope. Routes and org-scoped queries must use this
 * object — never org/role/user id from the body, query, or untrusted headers.
 */
export interface TenantContext {
  readonly organizationId: string;
  readonly actorId: string;
  readonly role: UserRole;
  readonly authMode: AuthMode;
  readonly correlationId: string;
}

export interface AuthProvider {
  readonly authMode: AuthMode;
  getActor(request: FastifyRequest): Promise<AuthenticatedActor>;
}

export function createTenantContext(
  actor: AuthenticatedActor,
  correlationId: string,
): TenantContext {
  return Object.freeze({
    organizationId: actor.organizationId,
    actorId: actor.actorId,
    role: actor.role,
    authMode: actor.authMode,
    correlationId,
  });
}
