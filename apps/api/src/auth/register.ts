import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AuthError } from './errors.js';
import { readHeader } from './headers.js';
import { modeError } from '../http.js';
import { createTenantContext, type AuthProvider, type TenantContext } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    earthTenant: TenantContext;
  }
}

function requestPath(request: FastifyRequest): string {
  return request.url.split('?')[0] ?? request.url;
}

function isPublicRoute(request: FastifyRequest): boolean {
  if (request.method === 'OPTIONS') {
    return true;
  }
  const path = requestPath(request);
  return request.method === 'GET' && (path === '/health' || path === '/v1/info');
}

function correlationIdFrom(request: FastifyRequest): string {
  const raw = readHeader(request, 'x-request-id') ?? readHeader(request, 'x-correlation-id');
  if (raw && raw.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(raw)) {
    return raw;
  }
  return randomUUID();
}

/**
 * Resolves TenantContext via AuthProvider.getActor.
 * Organization, actor, and role are server-derived only.
 */
export function registerAuthProvider(app: FastifyInstance, provider: AuthProvider): void {
  app.earthAuthProvider = provider;
  app.earthAuthMode = provider.authMode;

  app.addHook('onRequest', async (request, reply) => {
    if (isPublicRoute(request)) {
      return;
    }

    try {
      const actor = await provider.getActor(request);
      request.earthTenant = createTenantContext(actor, correlationIdFrom(request));
    } catch (error) {
      if (error instanceof AuthError) {
        return reply.status(error.status).send(modeError(provider.authMode, error.code, error.message));
      }
      throw error;
    }
  });
}
