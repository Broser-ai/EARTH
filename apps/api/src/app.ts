import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DEVELOPMENT_MODE, developmentError } from './http.js';
import { registerDevelopmentIdentity } from './identity.js';
import { registerPrimeRoutes } from './prime/routes.js';

export async function buildApp(pool: Pool): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
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

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Earth-Mode', DEVELOPMENT_MODE);
    return payload;
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const status = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
    const code = status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
    reply.status(status).send(developmentError(code, error.message));
  });

  registerDevelopmentIdentity(app, pool);
  registerPrimeRoutes(app, pool);

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      developmentError('NOT_FOUND', `no route for ${request.method} ${request.url}`),
    );
  });

  return app;
}
