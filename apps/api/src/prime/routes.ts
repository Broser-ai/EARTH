import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { AuthError } from '../auth/errors.js';
import {
  canReadAuditEvents,
  canReadSession,
  canRunDevelopmentTask,
  canStartMaterialOpportunity,
} from '../auth/roles.js';
import { modeEnvelope, modeError } from '../http.js';
import { PrimeService } from './service.js';
import { PolicyError, type DataClassification, type StartOpportunityInput } from './types.js';

const startBodySchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  materialBatch: z.object({
    externalReference: z.string().max(200).nullable().optional(),
    materialClass: z.string().optional(),
    quantityKg: z.number().optional(),
    facilityName: z.string().max(200).nullable().optional(),
    availableFrom: z.string().datetime().nullable().optional(),
  }),
  baseline: z.object({
    disposalCostDkk: z.number(),
    co2eKg: z.number(),
  }),
  evidence: z.object({
    documentIds: z.array(z.string()),
    extractionRequested: z.boolean(),
  }),
  dataClassification: z.enum(['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
  organizationId: z.string().optional(),
});

export function registerPrimeRoutes(app: FastifyInstance, pool: Pool): void {
  const service = new PrimeService(pool);

  app.post('/v1/material-opportunities/start', async (request, reply) => {
    try {
      canStartMaterialOpportunity(request.earthTenant);
    } catch (error) {
      return sendAuthError(service, request, reply, error, 'material-opportunity:start');
    }

    const parsed = startBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const mapped = mapZodError(parsed.error);
      return reply.status(400).send(requestError(request, mapped.code, mapped.message));
    }

    const input = toStartInput(parsed.data);
    try {
      const envelope = await service.startOpportunity(request.earthTenant, input);
      return reply.status(201).send(modeEnvelope(request.server.earthAuthMode, envelope));
    } catch (error) {
      return sendPrimeError(request, reply, error);
    }
  });

  app.get('/v1/sessions/:sessionId', async (request, reply) => {
    try {
      canReadSession(request.earthTenant);
    } catch (error) {
      return sendAuthError(service, request, reply, error, 'session:read');
    }

    const sessionId = (request.params as { sessionId: string }).sessionId;
    const envelope = await service.getSession(request.earthTenant, sessionId);
    if (!envelope) {
      return reply
        .status(404)
        .send(requestError(request, 'RESOURCE_NOT_FOUND', 'Resource not found.'));
    }
    return reply.send(modeEnvelope(request.server.earthAuthMode, envelope));
  });

  app.get('/v1/sessions/:sessionId/audit-events', async (request, reply) => {
    try {
      canReadAuditEvents(request.earthTenant);
    } catch (error) {
      return sendAuthError(service, request, reply, error, 'audit-events:read');
    }

    const sessionId = (request.params as { sessionId: string }).sessionId;
    const events = await service.listAuditEvents(request.earthTenant, sessionId);
    if (!events) {
      return reply
        .status(404)
        .send(requestError(request, 'RESOURCE_NOT_FOUND', 'Resource not found.'));
    }
    return reply.send(modeEnvelope(request.server.earthAuthMode, { events }));
  });

  app.post('/v1/sessions/:sessionId/run-next', async (request, reply) => {
    try {
      canRunDevelopmentTask(request.earthTenant);
    } catch (error) {
      return sendAuthError(service, request, reply, error, 'session:run-next');
    }

    const sessionId = (request.params as { sessionId: string }).sessionId;
    try {
      const result = await service.runNext(request.earthTenant, sessionId);
      if (!result) {
        return reply
          .status(404)
          .send(requestError(request, 'RESOURCE_NOT_FOUND', 'Resource not found.'));
      }
      return reply.send(modeEnvelope(request.server.earthAuthMode, result));
    } catch (error) {
      return sendPrimeError(request, reply, error);
    }
  });
}

function toStartInput(data: z.infer<typeof startBodySchema>): StartOpportunityInput {
  const { organizationId: _ignoredBodyOrg, ...fields } = data;
  void _ignoredBodyOrg;
  return {
    idempotencyKey: fields.idempotencyKey,
    materialBatch: {
      externalReference: fields.materialBatch.externalReference,
      materialClass: fields.materialBatch.materialClass ?? '',
      quantityKg: fields.materialBatch.quantityKg ?? Number.NaN,
      facilityName: fields.materialBatch.facilityName,
      availableFrom: fields.materialBatch.availableFrom,
    },
    baseline: fields.baseline,
    evidence: fields.evidence,
    dataClassification: fields.dataClassification as DataClassification,
  };
}

function mapZodError(error: z.ZodError): { code: string; message: string } {
  const issue = error.issues[0];
  const path = issue?.path.join('.') ?? '';
  if (path.includes('quantityKg')) {
    return { code: 'INVALID_QUANTITY', message: 'quantityKg must be a number greater than 0' };
  }
  if (path.includes('materialClass')) {
    return { code: 'MATERIAL_CLASS_REQUIRED', message: 'materialClass is required' };
  }
  return { code: 'VALIDATION_ERROR', message: issue?.message ?? 'invalid request body' };
}

async function sendAuthError(
  service: PrimeService,
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown,
  action: string,
) {
  if (error instanceof AuthError) {
    await service.recordAuthorizationDenial(request.earthTenant, action);
    return reply.status(error.status).send(requestError(request, error.code, error.message));
  }
  return sendPrimeError(request, reply, error);
}

function sendPrimeError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  if (error instanceof PolicyError) {
    const status = error.code === 'INVALID_STATE_TRANSITION' ? 409 : 400;
    return reply.status(status).send(requestError(request, error.code, error.message));
  }
  requestLog(error);
  return reply.status(500).send(
    requestError(request, 'INTERNAL_ERROR', 'unexpected server error'),
  );
}

function requestError(request: FastifyRequest, code: string, message: string) {
  return modeError(request.server.earthAuthMode, code, message, { correlationId: request.id });
}

function requestLog(error: unknown): void {
  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }
}
