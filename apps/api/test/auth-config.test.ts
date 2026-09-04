import { describe, expect, it } from 'vitest';
import { loadAuthConfig } from '../src/auth/config.js';
import { AUTH_MODE_DEVELOPMENT, AUTH_MODE_OIDC } from '../src/auth/types.js';

describe('authentication configuration', () => {
  it('permits DEVELOPMENT_ONLY only under explicit development configuration', () => {
    expect(
      loadAuthConfig({ NODE_ENV: 'development', EARTH_AUTH_MODE: 'development' }),
    ).toEqual({ mode: AUTH_MODE_DEVELOPMENT });
    expect(() => loadAuthConfig({ NODE_ENV: 'production', EARTH_AUTH_MODE: 'development' })).toThrow(
      'DEVELOPMENT_AUTH_DISABLED',
    );
  });

  it('requires issuer, audience, and JWKS configuration for OIDC mode', () => {
    expect(() => loadAuthConfig({ EARTH_AUTH_MODE: 'oidc' })).toThrow('OIDC_ISSUER_URL');
    expect(() =>
      loadAuthConfig({
        EARTH_AUTH_MODE: 'oidc',
        OIDC_ISSUER_URL: 'https://issuer.example.test/',
      }),
    ).toThrow('OIDC_AUDIENCE');
  });

  it('accepts only explicit RS256 or ES256 algorithms for OIDC mode', () => {
    const config = loadAuthConfig({
      EARTH_AUTH_MODE: 'oidc',
      OIDC_ISSUER_URL: 'https://issuer.example.test/',
      OIDC_AUDIENCE: 'earth-api',
      OIDC_JWKS_URI: 'https://issuer.example.test/jwks',
      OIDC_ALLOWED_ALGORITHMS: 'RS256,ES256',
    });
    expect(config.mode).toBe(AUTH_MODE_OIDC);
    expect(() =>
      loadAuthConfig({
        EARTH_AUTH_MODE: 'oidc',
        OIDC_ISSUER_URL: 'https://issuer.example.test/',
        OIDC_AUDIENCE: 'earth-api',
        OIDC_JWKS_URI: 'https://issuer.example.test/jwks',
        OIDC_ALLOWED_ALGORITHMS: 'none',
      }),
    ).toThrow('OIDC_ALLOWED_ALGORITHMS');
  });
});