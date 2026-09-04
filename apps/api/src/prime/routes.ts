import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { developmentEnvelope, developmentError } from '../http.js';
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
});

export function registerPrimeRoutes(app: FastifyInstance, pool: Pool): void {
  const service = new PrimeService(pool);

  app.post('/v1/material-opportunities/start', async (request, reply) => {
    const parsed = startBodySchema.safeParse(request.body);
    if (!parsed.success) {
      const mapped = mapZodError(parsed.error);
      return reply.status(400).send(developmentError(mapped.code, mapped.message));
    }

    const input = toStartInput(parsed.data);
    try {
      const envelope = await service.startOpportunity(request.earthIdentity, input);
      return reply.status(201).send(developmentEnvelope(envelope));
    } catch (error) {
      return sendPrimeError(reply, error);
    }
  });

  app.get('/v1/sessions/:sessionId', async (request, reply) => {
    const sessionId = (request.params as { sessionId: string }).sessionId;
    const envelope = await service.getSession(request.earthIdentity.organizationId, sessionId);
    if (!envelope) {
      return reply
        .status(404)
        .send(developmentError('SESSION_NOT_FOUND', 'session not found for this organization'));
    }
    return reply.send(developmentEnvelope(envelope));
  });

  app.get('/v1/sessions/:sessionId/audit-events', async (request, reply) => {
    const sessionId = (request.params as { sessionId: string }).sessionId;
    const events = await service.listAuditEvents(request.earthIdentity.organizationId, sessionId);
    if (!events) {
      return reply
        .status(404)
        .send(developmentError('SESSION_NOT_FOUND', 'session not found for this organization'));
    }
    return reply.send(developmentEnvelope({ events }));
  });

  app.post('/v1/sessions/:sessionId/run-next', async (request, reply) => {
    const sessionId = (request.params as { sessionId: string }).sessionId;
    try {
      const result = await service.runNext(request.earthIdentity, sessionId);
      if (!result) {
        return reply
          .status(404)
          .send(developmentError('SESSION_NOT_FOUND', 'session not found for this organization'));
      }
      return reply.send(developmentEnvelope(result));
    } catch (error) {
      return sendPrimeError(reply, error);
    }
  });
}

function toStartInput(data: z.infer<typeof startBodySchema>): StartOpportunityInput {
  return {
    idempotencyKey: data.idempotencyKey,
    materialBatch: {
      externalReference: data.materialBatch.externalReference,
      materialClass: data.materialBatch.materialClass ?? '',
      quantityKg: data.materialBatch.quantityKg ?? Number.NaN,
      facilityName: data.materialBatch.facilityName,
      availableFrom: data.materialBatch.availableFrom,
    },
    baseline: data.baseline,
    evidence: data.evidence,
    dataClassification: data.dataClassification as DataClassification,
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

function sendPrimeError(reply: { status: (code: number) => { send: (body: unknown) => unknown } }, error: unknown) {
  if (error instanceof PolicyError) {
    const status = error.code === 'INVALID_STATE_TRANSITION' ? 409 : 400;
    return reply.status(status).send(developmentError(error.code, error.message));
  }
  requestLog(error);
  return reply.status(500).send(
    developmentError('INTERNAL_ERROR', 'unexpected server error'),
  );
}

function requestLog(error: unknown): void {
  if (process.env.NODE_ENV !== 'test') {
    console.error(error);
  }
}
