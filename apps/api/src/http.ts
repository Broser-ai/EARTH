export const DEVELOPMENT_MODE = 'DEVELOPMENT_ONLY' as const;

export type DevelopmentMode = typeof DEVELOPMENT_MODE;

export function developmentEnvelope<T extends object>(
  body: T,
): T & { mode: DevelopmentMode } {
  return { mode: DEVELOPMENT_MODE, ...body };
}

export function developmentError(
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): {
  mode: DevelopmentMode;
  error: { code: string; message: string } & Record<string, unknown>;
} {
  return {
    mode: DEVELOPMENT_MODE,
    error: { code, message, ...extra },
  };
}
