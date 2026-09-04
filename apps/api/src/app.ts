import Fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import type { Pool } from 'pg';
import { AuthError } from './auth/errors.js';
import { createAuthProvider } from './auth/factory.js';
import { registerAuthProvider } from './auth/register.js';
import { AUTH_MODE_DEVELOPMENT, type AuthMode, type AuthProvider } from './auth/types.js';
import { loadConfig, type EarthConfig } from './config.js';
import { DEVELOPMENT_MODE, clientSafeErrorMessage, modeEnvelope, modeError } from './http.js';
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
    earthAuthMode: AuthMode;
    earthAuthProvider: AuthProvider | null;
    earthOidcConfigured: boolean;
    earthConfig: EarthConfig;
  }
}

const CORS_ALLOW_HEADERS =
  'Content-Type, Authorization, x-earth-org-id, x-earth-user-id, x-earth-user-role, x-request-id, x-correlation-id';

export interface BuildAppOptions {
  config?: EarthConfig;
  authProvider?: AuthProvider;
  oidcConfigured?: boolean;
}

export async function buildApp(pool?: Pool, options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    logger: loggerOption(config),
  });

  app.decorate('earthAuthMode', AUTH_MODE_DEVELOPMENT);
  app.decorate('earthAuthProvider', null);
  app.decorate('earthOidcConfigured', false);
  app.decorate('earthConfig', config);

  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    allowList: (request) => requestPath(request) === '/health',
  });

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
    applyCors(request, reply, config.corsOrigins);
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
    if (error instanceof AuthError) {
      return reply
        .status(error.status)
        .send(modeError(request.server.earthAuthMode, error.code, error.message));
    }
    const status =
      typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
    const code = status === 400 ? 'VALIDATION_ERROR' : status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR';
    reply
      .status(status)
      .send(
        modeError(request.server.earthAuthMode, code, clientSafeErrorMessage(status, error.message)),
      );
  });

  registerFoundationRoutes(app);

  if (pool) {
    const resolved = options.authProvider
      ? {
          provider: options.authProvider,
          oidcConfigured: options.oidcConfigured ?? false,
        }
      : await createAuthProvider(pool, config);
    registerAuthProvider(app, resolved.provider);
    app.earthOidcConfigured = resolved.oidcConfigured;
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
      environment: request.server.earthConfig.nodeEnv === 'production' ? 'production' : 'development',
      listen: '0.0.0.0',
      defaultPort: 3001,
      productionReady: false,
      integrations: {
        ...INTEGRATION_FLAGS,
        authentication: false,
        oidcConfigured: request.server.earthOidcConfigured,
      },
      integrationNotes: Object.fromEntries(
        (Object.keys(INTEGRATION_FLAGS) as Array<keyof typeof INTEGRATION_FLAGS>).map((name) => [
          name,
          describeIntegration(name),
        ]),
      ),
      routes: PRODUCT_ROUTES.map((route) => ({ ...route })),
      note: infoNote(request.server.earthAuthMode, request.server.earthOidcConfigured),
    }),
  );
}

function infoNote(authMode: AuthMode, oidcConfigured: boolean): string {
  if (authMode === AUTH_MODE_DEVELOPMENT) {
    return 'DEVELOPMENT ONLY. Material Opportunity Intake v0.1 is local Postgres + deterministic stubs. No live LLM, recycler, ERP, SKAT, or SAP. Development headers are not production authentication.';
  }
  if (oidcConfigured) {
    return 'OIDC JWT validation is initialized. Role and organization come from Postgres, not from token claims. Not production-ready. No live LLM, recycler, ERP, SKAT, or SAP.';
  }
  return 'Material Opportunity Intake v0.1. Not production-ready. No live LLM, recycler, ERP, SKAT, or SAP.';
}

function applyCors(
  request: FastifyRequest,
  reply: { header: (name: string, value: string) => unknown },
  allowedOrigins: string[],
): void {
  reply.header('Vary', 'Origin');
  reply.header('Access-Control-Allow-Headers', CORS_ALLOW_HEADERS);
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  const origin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;
  if (!origin) {
    return;
  }
  if (allowedOrigins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Access-Control-Allow-Credentials', 'true');
  }
}

function loggerOption(config: EarthConfig): boolean | { level: string; redact: string[] } {
  if (config.nodeEnv === 'test') {
    return false;
  }
  return {
    level: 'info',
    redact: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-earth-user-id"]',
      'req.body.password',
      'req.body.client_secret',
      'req.body.refresh_token',
      'req.body.access_token',
      'req.body.id_token',
      'req.body.token',
    ],
  };
}

function requestPath(request: FastifyRequest): string {
  return request.url.split('?')[0] ?? request.url;
}
