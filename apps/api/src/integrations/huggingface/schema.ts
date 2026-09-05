import { z } from 'zod';
import { isSafeHuggingFaceModelId } from './allowlist.js';

export const HUGGINGFACE_OPERATION_TYPES = ['MODEL_CATALOG_LOOKUP', 'APPROVED_INFERENCE_REQUEST'] as const;
export type HuggingFaceOperationType = (typeof HUGGINGFACE_OPERATION_TYPES)[number];

const modelIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => isSafeHuggingFaceModelId(value), { message: 'modelId is not a safe Hugging Face id' });

export const catalogPayloadSchema = z
  .object({
    modelId: modelIdSchema,
  })
  .strict();

export const inferencePayloadSchema = z
  .object({
    modelId: modelIdSchema,
    inputDigestSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, 'inputDigestSha256 must be a SHA-256 hex digest'),
  })
  .strict();

export function isHuggingFaceOperationType(value: string): value is HuggingFaceOperationType {
  return (HUGGINGFACE_OPERATION_TYPES as readonly string[]).includes(value);
}

export type CatalogPayload = z.infer<typeof catalogPayloadSchema>;
export type InferencePayload = z.infer<typeof inferencePayloadSchema>;
