import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { AuthError } from '../auth/errors.js';
import { modeEnvelope, modeError } from '../http.js';
import { IntegrationError } from './core/errors.js';
import { IntegrationControlService } from './core/service.js';
import { findUnsafePayloadField } from './core/capabilities.js';
import { isIntegrationProviderKey, type IntegrationProviderKey } from './types.js';
import { createOperationBodySchema, operationIdParamSchema, providerKeyParamSchema } from './schemas.js';

export function registerIntegrationRoutes(app: FastifyInstance, pool: Pool): void {
  const service = new IntegrationControlService(pool);

  app.get('/v1/integrations', async (request, reply) => {
    try {
      const result = await service.listProviders(request.earthTenant);
      return reply.send(modeEnvelope(request.server.earthAuthMode, result));
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.get('/v1/integrations/:providerKey/status', async (request, reply) => {
    const providerKey = parseProviderKey(request, reply);
    if (!providerKey) {
      return;
    }
    try {
      const result = await service.getProviderStatus(request.earthTenant, providerKey);
      return reply.send(modeEnvelope(request.server.earthAuthMode, result));
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.post('/v1/integrations/:providerKey/operations', async (request, reply) => {
    const providerKey = parseProviderKey(request, reply);
    if (!providerKey) {
      return;
    }

    const unsafeField = findUnsafePayloadField(
      request.body && typeof request.body === 'object' && !Array.isArray(request.body)
        ? (request.body as Record<string, unknown>)
        : undefined,
    );
    if (unsafeField) {
      return reply.status(400).send(
        modeError(
          request.server.earthAuthMode,
          'INTEGRATION_UNSAFE_PAYLOAD_FIELD',
          `payload must not include ${unsafeField}`,
        ),
      );
    }

    const parsed = createOperationBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path.join('.') ?? '';
      if (path.includes('idempotencyKey')) {
        return reply
          .status(400)
          .send(
            modeError(
              request.server.earthAuthMode,
              'INTEGRATION_IDEMPOTENCY_REQUIRED',
              'idempotencyKey is required',
            ),
          );
      }
      return reply
        .status(400)
        .send(
          modeError(
            request.server.earthAuthMode,
            'VALIDATION_ERROR',
            issue?.message ?? 'invalid request body',
          ),
        );
    }

    if (parsed.data.providerKey && parsed.data.providerKey !== providerKey) {
      return reply
        .status(400)
        .send(
          modeError(
            request.server.earthAuthMode,
            'INTEGRATION_PROVIDER_MISMATCH',
            'providerKey in the body must match the route',
          ),
        );
    }

    try {
      const operation = await service.createOperation(request.earthTenant, {
        providerKey,
        operationType: parsed.data.operationType,
        purpose: parsed.data.purpose,
        dataClassification: parsed.data.dataClassification,
        idempotencyKey: parsed.data.idempotencyKey,
        payloadReference: parsed.data.payloadReference,
        timeoutMs: parsed.data.timeoutMs,
      });
      const status = operation.state === 'BLOCKED' ? 403 : 201;
      return reply.status(status).send(
        modeEnvelope(request.server.earthAuthMode, {
          operation,
          executed: false,
          liveProviderCall: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.get('/v1/integration-operations/:operationId', async (request, reply) => {
    const operationId = parseOperationId(request, reply);
    if (!operationId) {
      return;
    }
    try {
      const operation = await service.getOperation(request.earthTenant, operationId);
      return reply.send(
        modeEnvelope(request.server.earthAuthMode, {
          operation,
          executed: false,
          liveProviderCall: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.post('/v1/integration-operations/:operationId/cancel', async (request, reply) => {
    const operationId = parseOperationId(request, reply);
    if (!operationId) {
      return;
    }
    try {
      const operation = await service.cancelOperation(request.earthTenant, operationId);
      return reply.send(
        modeEnvelope(request.server.earthAuthMode, {
          operation,
          executed: false,
          liveProviderCall: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });
}

function parseProviderKey(request: FastifyRequest, reply: FastifyReply): IntegrationProviderKey | null {
  const raw = (request.params as { providerKey?: string }).providerKey ?? '';
  const parsed = providerKeyParamSchema.safeParse(raw);
  if (!parsed.success || !isIntegrationProviderKey(raw)) {
    reply
      .status(404)
      .send(
        modeError(request.server.earthAuthMode, 'INTEGRATION_PROVIDER_UNKNOWN', 'Unknown integration provider.'),
      );
    return null;
  }
  return parsed.data;
}

function parseOperationId(request: FastifyRequest, reply: FastifyReply): string | null {
  const raw = (request.params as { operationId?: string }).operationId ?? '';
  const parsed = operationIdParamSchema.safeParse(raw);
  if (!parsed.success) {
    reply
      .status(404)
      .send(
        modeError(
          request.server.earthAuthMode,
          'INTEGRATION_OPERATION_NOT_FOUND',
          'integration operation not found for this organization',
        ),
      );
    return null;
  }
  return parsed.data;
}

function sendIntegrationError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof IntegrationError) {
    return reply
      .status(error.status)
      .send(modeError(request.server.earthAuthMode, error.code, error.message));
  }
  if (error instanceof AuthError) {
    return reply
      .status(error.status)
      .send(modeError(request.server.earthAuthMode, error.code, error.message));
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }
  return reply
    .status(500)
    .send(modeError(request.server.earthAuthMode, 'INTERNAL_ERROR', 'unexpected server error'));
}
