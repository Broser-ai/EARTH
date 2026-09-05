import { z } from 'zod';

export const sessionProjectionPayloadSchema = z
  .object({
    sessionId: z.string().uuid(),
  })
  .strict();

export type SessionProjectionPayload = z.infer<typeof sessionProjectionPayloadSchema>;
