/**
 * Asymmetric algorithms accepted for OIDC access/ID tokens.
 * `none` and HMAC (HS*) are rejected — those would allow unsigned or
 * shared-secret tokens.
 */
export const OIDC_ALLOWED_ALGORITHMS = [
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
  'PS256',
  'PS384',
  'PS512',
] as const;

export type OidcAllowedAlgorithm = (typeof OIDC_ALLOWED_ALGORITHMS)[number];
