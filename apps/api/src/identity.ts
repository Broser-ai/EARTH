/**
 * @deprecated Import from `./auth/` directly.
 * DEVELOPMENT headers are not authentication. OIDC JWT validation does not
 * grant org or role from token claims.
 */
export { DevelopmentHeaderAuthProvider, DevelopmentAuthProvider } from './auth/development-provider.js';
export { OidcJwtAuthProvider } from './auth/oidc-provider.js';
export { registerAuthProvider as registerDevelopmentIdentity } from './auth/register.js';
export { createAuthProvider } from './auth/factory.js';
