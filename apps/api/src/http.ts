import { AUTH_MODE_DEVELOPMENT, type AuthMode } from './auth/types.js';
import { DEVELOPMENT_MODE, type DevelopmentMode } from './contracts.js';

export { DEVELOPMENT_MODE, type DevelopmentMode };
export { AUTH_MODE_DEVELOPMENT, AUTH_MODE_OIDC, type AuthMode } from './auth/types.js';

export function modeEnvelope<T extends object>(
  authMode: AuthMode | undefined,
  body: T,
): T | (T & { mode: DevelopmentMode }) {
  if (authMode === AUTH_MODE_DEVELOPMENT) {
    return { mode: DEVELOPMENT_MODE, ...body };
  }
  return body;
}

export function modeError(
  authMode: AuthMode | undefined,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
):
  | { error: { code: string; message: string } & Record<string, unknown> }
  | {
      mode: DevelopmentMode;
      error: { code: string; message: string } & Record<string, unknown>;
    } {
  const error = { code, message, ...extra };
  if (authMode === AUTH_MODE_DEVELOPMENT) {
    return { mode: DEVELOPMENT_MODE, error };
  }
  return { error };
}

/** @deprecated Prefer modeEnvelope(authMode, body) so DEVELOPMENT_ONLY is provider-gated. */
export function developmentEnvelope<T extends object>(body: T): T & { mode: DevelopmentMode } {
  return modeEnvelope(AUTH_MODE_DEVELOPMENT, body) as T & { mode: DevelopmentMode };
}

/** @deprecated Prefer modeError(authMode, code, message). */
export function developmentError(
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): {
  mode: DevelopmentMode;
  error: { code: string; message: string } & Record<string, unknown>;
} {
  return modeError(AUTH_MODE_DEVELOPMENT, code, message, extra) as {
    mode: DevelopmentMode;
    error: { code: string; message: string } & Record<string, unknown>;
  };
}

export function clientSafeErrorMessage(status: number, message: string): string {
  if (status >= 500) {
    return 'unexpected server error';
  }
  return message;
}
