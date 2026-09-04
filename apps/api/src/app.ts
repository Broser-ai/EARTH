import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DevelopmentAuthProvider } from './auth/development-provider.js';
import { registerAuthProvider } from './auth/register.js';
import { AUTH_MODE_DEVELOPMENT } from './auth/types.js';
import { DEVELOPMENT_MODE, modeEnvelope, modeError } from './http.js';
import {
  describeIntegration,
  INTEGRATION_FLAGS,
  PRODUCT_ROUTES,
  SERVICE_NAME,
  SERVICE_VERSION,
} from './info.js';
import { registerPrimeRoutes } from './prime/routes.js';

declare module 'fastify' {
  interface FastifyInstance {
    earthAuthMode: import('./auth/types.js').AuthMode;
    earthAuthProvider: import('./auth/types.js').AuthProvider | null;
  }
}

export async function buildApp(pool?: Pool): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.decorate('earthAuthMode', AUTH_MODE_DEVELOPMENT);
  app.decorate('earthAuthProvider', null);

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    void request;
    const text = typeof body === 'string' ? body : body.toString('utf8');
    if (!text) {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(text) as unknown);
    } catch {
      const parseError = new Error('invalid JSON body') as Error & { statusCode: number };
      parseError.statusCode = 400;
      done(parseError, undefined);
    }
  });

  app.addHook('onRequest', async (request, reply) => {
    const origin = typeof request.headers.origin === 'string' ? request.headers.origin : '*';
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header(
      'Access-Control-Allow-Headers',
      'Content-Type, x-earth-org-id, x-earth-user-id, x-earth-user-role',
    );
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    if (app.earthAuthMode === AUTH_MODE_DEVELOPMENT) {
      reply.header('X-Earth-Mode', DEVELOPMENT_MODE);
    }
    return payload;
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
    const code = status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    reply.status(status).send(modeError(request.server.earthAuthMode, code, error.message));
  });

  registerFoundationRoutes(app);

  if (pool) {
    const provider = new DevelopmentAuthProvider(pool);
    registerAuthProvider(app, provider);
    registerPrimeRoutes(app, pool);
  }

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      modeError(request.server.earthAuthMode, 'NOT_FOUND', `no route for ${request.method} ${request.url}`),
    );
  });

  return app;
}

function registerFoundationRoutes(app: FastifyInstance): void {
  app.get('/health', async (request) =>
    modeEnvelope(request.server.earthAuthMode, {
      status: 'ok',
      service: SERVICE_NAME,
      check: 'process_liveness',
    }),
  );

  app.get('/v1/info', async (request) =>
    modeEnvelope(request.server.earthAuthMode, {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      environment: 'development',
      listen: '0.0.0.0',
      defaultPort: 3001,
      integrations: { ...INTEGRATION_FLAGS },
      integrationNotes: Object.fromEntries(
        (Object.keys(INTEGRATION_FLAGS) as Array<keyof typeof INTEGRATION_FLAGS>).map((name) => [
          name,
          describeIntegration(name),
        ]),
      ),
      routes: PRODUCT_ROUTES.map((route) => ({ ...route })),
      note: 'DEVELOPMENT ONLY. Material Opportunity Intake v0.1 is local Postgres + deterministic stubs. No live LLM, recycler, ERP, SKAT, or SAP.',
    }),
  );
}
