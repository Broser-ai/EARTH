import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import { DEVELOPMENT_MODE, developmentEnvelope, developmentError } from './http.js';
import { describeIntegration, INTEGRATION_FLAGS, SERVICE_NAME, SERVICE_VERSION } from './info.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
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

  registerFoundationRoutes(app);

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(
      developmentError('NOT_FOUND', `no route for ${request.method} ${request.url}`),
    );
  });

  return app;
}

function registerFoundationRoutes(app: FastifyInstance): void {
  app.get('/health', async () =>
    developmentEnvelope({
      status: 'ok',
      service: SERVICE_NAME,
      check: 'process_liveness',
    }),
  );

  app.get('/v1/info', async () =>
    developmentEnvelope({
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
      routes: [
        { method: 'GET', path: '/health', purpose: 'process liveness (no datastore)' },
        { method: 'GET', path: '/v1/info', purpose: 'service identity and integration flags' },
      ],
      note: 'DEVELOPMENT ONLY foundation scaffold. No live integrations.',
    }),
  );
}
