import type { FastifyRequest } from 'fastify';
import type { UserRole } from '../contracts.js';

export const AUTH_MODE_DEVELOPMENT = 'DEVELOPMENT_ONLY' as const;
export const AUTH_MODE_OIDC = 'OIDC' as const;
export type EarthRole = UserRole;
export type AuthMode = typeof AUTH_MODE_DEVELOPMENT | typeof AUTH_MODE_OIDC;

export interface AuthenticatedActor {
  actorId: string;
  organizationId: string;
  role: EarthRole;
  email?: string;
  subject?: string;
  authMode: AuthMode;
}

export interface TenantContext {
  readonly organizationId: string;
  readonly actorId: string;
  readonly role: EarthRole;
  readonly authMode: AuthMode;
  readonly correlationId: string;
}

export interface AuthProvider {
  readonly authMode: AuthMode;
  getActor(request: FastifyRequest): Promise<AuthenticatedActor>;
}

export function createTenantContext(actor: AuthenticatedActor, correlationId: string): TenantContext {
  return Object.freeze({
    organizationId: actor.organizationId,
    actorId: actor.actorId,
    role: actor.role,
    authMode: actor.authMode,
    correlationId,
  });
}
