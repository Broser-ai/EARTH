import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { DEVELOPMENT_MODE, developmentError } from './http.js';
import { registerDevelopmentIdentity } from './identity.js';
import { registerPrimeRoutes } from './prime/routes.js';

export async function buildApp(pool: Pool): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Earth-Mode', DEVELOPMENT_MODE);
    return payload;
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
