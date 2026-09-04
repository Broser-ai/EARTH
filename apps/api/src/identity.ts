/**
 * @deprecated Use registerAuthProvider + DevelopmentAuthProvider.
 * DEVELOPMENT headers are not authentication.
 */
export { DevelopmentAuthProvider } from './auth/development-provider.js';
export { registerAuthProvider as registerDevelopmentIdentity } from './auth/register.js';
