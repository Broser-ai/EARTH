import { z } from 'zod';
import {
  INTEGRATION_DATA_CLASSIFICATIONS,
  INTEGRATION_PROVIDER_KEYS,
} from './types.js';

export const providerKeyParamSchema = z.enum(INTEGRATION_PROVIDER_KEYS);

export const createOperationBodySchema = z.object({
  providerKey: z.enum(INTEGRATION_PROVIDER_KEYS).optional(),
  operationType: z.string().trim().min(1).max(120),
  purpose: z.string().trim().min(1).max(200),
  dataClassification: z.enum(INTEGRATION_DATA_CLASSIFICATIONS),
  idempotencyKey: z.string().trim().min(1).max(200),
  payloadReference: z.record(z.unknown()).optional(),
  timeoutMs: z.number().int().min(1).max(3_600_000).optional(),
});

export const operationIdParamSchema = z.string().uuid();

export type CreateOperationBody = z.infer<typeof createOperationBodySchema>;
