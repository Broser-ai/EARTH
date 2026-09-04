import type { Pool } from 'pg';
import { assertNever } from '../contracts.js';
import type { EarthConfig } from '../config.js';
import { DevelopmentHeaderAuthProvider } from './development-provider.js';
import { OidcJwtAuthProvider } from './oidc-provider.js';
import type { AuthProvider } from './types.js';

export interface ResolvedAuthProvider {
  provider: AuthProvider;
  oidcConfigured: boolean;
}

export async function createAuthProvider(
  pool: Pool,
  config: EarthConfig,
): Promise<ResolvedAuthProvider> {
  switch (config.authModeSetting) {
    case 'development':
      return {
        provider: new DevelopmentHeaderAuthProvider(pool, config),
        oidcConfigured: false,
      };
    case 'oidc': {
      if (!config.oidc) {
        throw new Error('EARTH_AUTH_MODE=oidc is missing OIDC issuer/audience after env validation.');
      }
      const provider = await OidcJwtAuthProvider.connect(pool, config.oidc);
      return { provider, oidcConfigured: true };
    }
    default:
      return assertNever(config.authModeSetting);
  }
}
