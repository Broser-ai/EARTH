import type { FastifyRequest } from 'fastify';
import type { UserRole } from '../contracts.js';

export const AUTH_MODE_DEVELOPMENT = 'DEVELOPMENT_ONLY' as const;
export type AuthMode = typeof AUTH_MODE_DEVELOPMENT;

export interface AuthenticatedActor {
  actorId: string;
  organizationId: string;
  role: UserRole;
  authMode: AuthMode;
}

export interface TenantContext {
  readonly organizationId: string;
  readonly actor: AuthenticatedActor;
}

export interface AuthProvider {
  readonly authMode: AuthMode;
  getActor(request: FastifyRequest): Promise<AuthenticatedActor>;
}

export function createTenantContext(actor: AuthenticatedActor): TenantContext {
  return Object.freeze({
    organizationId: actor.organizationId,
    actor,
  });
}
