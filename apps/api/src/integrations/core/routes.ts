import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { AuthError } from '../../auth/errors.js';
import { modeEnvelope, modeError } from '../../http.js';
import { loadIntegrationConfig } from '../config.js';
import { createIntegrationRegistry, type IntegrationRegistry } from '../registry.js';
import {
  INTEGRATION_DATA_CLASSIFICATIONS,
  INTEGRATION_PURPOSES,
  isIntegrationProviderKey,
  isIntegrationPurpose,
  type IntegrationPurpose,
  type IntegrationRequest,
} from '../types.js';
import { IntegrationError } from './errors.js';
import { IntegrationService } from './service.js';

const operationBodySchema = z
  .object({
    operationType: z.string().min(1).max(80),
    purpose: z.enum(INTEGRATION_PURPOSES),
    dataClassification: z.enum(INTEGRATION_DATA_CLASSIFICATIONS),
    idempotencyKey: z.string().min(1).max(200),
    payload: z.record(z.unknown()).optional(),
    estimatedCostDkk: z.number().nonnegative().max(1_000_000).optional(),
    timeoutMs: z.number().int().positive().max(30_000).optional(),
    approvalReference: z.string().max(200).nullable().optional(),
    organizationId: z.string().optional(),
    role: z.string().optional(),
    userId: z.string().optional(),
    actorId: z.string().optional(),
    apiKey: z.unknown().optional(),
    token: z.unknown().optional(),
  })
  .strict();

export interface RegisterIntegrationRoutesOptions {
  registry?: IntegrationRegistry;
}

export async function registerIntegrationRoutes(
  app: FastifyInstance,
  pool: Pool,
  options: RegisterIntegrationRoutesOptions = {},
): Promise<void> {
  const registry = options.registry ?? createIntegrationRegistry();
  if (!options.registry) {
    await registry.loadOptionalAdapters();
  }
  const service = new IntegrationService(pool, registry, loadIntegrationConfig());

  app.get('/v1/integrations', async (request, reply) => {
    try {
      const providers = await service.listProviders(request.earthTenant);
      return reply.send(
        modeEnvelope(request.server.earthAuthMode, {
          providers,
          connected: false,
          note: 'No provider is live. A configured server credential is not CONNECTED. Adapters default to NOT_CONFIGURED.',
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.get('/v1/integrations/:providerKey/status', async (request, reply) => {
    const providerKey = (request.params as { providerKey: string }).providerKey;
    try {
      const status = await service.getProviderStatus(request.earthTenant, providerKey);
      return reply.send(
        modeEnvelope(request.server.earthAuthMode, {
          ...status,
          connected: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.post('/v1/integrations/:providerKey/operations', async (request, reply) => {
    const providerKey = (request.params as { providerKey: string }).providerKey;
    if (!isIntegrationProviderKey(providerKey.toUpperCase())) {
      return reply
        .status(404)
        .send(modeError(request.server.earthAuthMode, 'PROVIDER_NOT_ALLOWLISTED', 'unknown provider'));
    }

    const parsed = operationBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(
          modeError(
            request.server.earthAuthMode,
            mapZodCode(parsed.error),
            parsed.error.issues[0]?.message ?? 'invalid request body',
          ),
        );
    }

    if (parsed.data.apiKey !== undefined || parsed.data.token !== undefined) {
      return reply
        .status(400)
        .send(
          modeError(
            request.server.earthAuthMode,
            'UNSAFE_PAYLOAD_FIELD',
            'provider credentials must never be sent from the browser',
          ),
        );
    }

    const input = toRequest(providerKey.toUpperCase(), parsed.data);
    try {
      const result = await service.createOperation(request.earthTenant, input);
      const status = result.replayed ? 200 : 201;
      return reply.status(status).send(
        modeEnvelope(request.server.earthAuthMode, {
          operation: publicOperation(result.operation),
          replayed: result.replayed,
          connected: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.get('/v1/integration-operations/:operationId', async (request, reply) => {
    const operationId = (request.params as { operationId: string }).operationId;
    try {
      const operation = await service.getOperation(request.earthTenant, operationId);
      return reply.send(
        modeEnvelope(request.server.earthAuthMode, {
          operation: publicOperation(operation),
          connected: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });

  app.post('/v1/integration-operations/:operationId/cancel', async (request, reply) => {
    const operationId = (request.params as { operationId: string }).operationId;
    try {
      const operation = await service.cancelOperation(request.earthTenant, operationId);
      return reply.send(
        modeEnvelope(request.server.earthAuthMode, {
          operation: publicOperation(operation),
          connected: false,
        }),
      );
    } catch (error) {
      return sendIntegrationError(request, reply, error);
    }
  });
}

function toRequest(
  providerKey: string,
  data: z.infer<typeof operationBodySchema>,
): IntegrationRequest {
  const purpose = isIntegrationPurpose(data.purpose) ? data.purpose : (data.purpose as IntegrationPurpose);
  return {
    providerKey: providerKey as IntegrationRequest['providerKey'],
    operationType: data.operationType,
    purpose,
    dataClassification: data.dataClassification,
    idempotencyKey: data.idempotencyKey,
    payload: data.payload ?? {},
    estimatedCostDkk: data.estimatedCostDkk,
    timeoutMs: data.timeoutMs,
    approvalReference: data.approvalReference ?? null,
  };
}

function publicOperation(operation: {
  id: string;
  organizationId: string;
  providerKey: string;
  operationType: string;
  state: string;
  purpose: string;
  dataClassification: string;
  requestDigestSha256: string | null;
  responseDigestSha256: string | null;
  safeSummary: string | null;
  providerJobReference: string | null;
  errorCode: string | null;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}): Record<string, unknown> {
  return {
    id: operation.id,
    organizationId: operation.organizationId,
    providerKey: operation.providerKey,
    operationType: operation.operationType,
    state: operation.state,
    purpose: operation.purpose,
    dataClassification: operation.dataClassification,
    requestDigestSha256: operation.requestDigestSha256,
    responseDigestSha256: operation.responseDigestSha256,
    safeSummary: operation.safeSummary,
    providerJobReference: operation.providerJobReference,
    errorCode: operation.errorCode,
    correlationId: operation.correlationId,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
    startedAt: operation.startedAt,
    completedAt: operation.completedAt,
    expiresAt: operation.expiresAt,
  };
}

function mapZodCode(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join('.') ?? '';
  if (path.includes('idempotencyKey')) {
    return 'IDEMPOTENCY_KEY_REQUIRED';
  }
  return 'SCHEMA_VALIDATION_FAILED';
}

function sendIntegrationError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof AuthError) {
    return reply.status(error.status).send(modeError(request.server.earthAuthMode, error.code, error.message));
  }
  if (error instanceof IntegrationError) {
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
