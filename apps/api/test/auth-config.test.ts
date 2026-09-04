import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import {
  canReadAuditEvents,
  canReadSession,
  canRunDevelopmentTask,
  canStartMaterialOpportunity,
  requireRole,
} from '../src/auth/roles.js';
import { RoleForbiddenError } from '../src/auth/errors.js';
import type { UserRole } from '../src/contracts.js';

describe('auth env validation', () => {
  it('refuses development auth when NODE_ENV is production', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'production', EARTH_AUTH_MODE: 'development' }),
    ).toThrow(/DEVELOPMENT_ONLY/);
  });

  it('requires EARTH_AUTH_MODE=oidc in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/EARTH_AUTH_MODE is required/);
  });

  it('refuses OIDC mode when issuer is missing', () => {
    expect(() =>
      loadConfig({
        EARTH_AUTH_MODE: 'oidc',
        OIDC_AUDIENCE: 'earth-api',
      }),
    ).toThrow(/OIDC_ISSUER_URL/);
  });

  it('refuses OIDC mode when audience is missing', () => {
    expect(() =>
      loadConfig({
        EARTH_AUTH_MODE: 'oidc',
        OIDC_ISSUER_URL: 'https://idp.example.test/',
      }),
    ).toThrow(/OIDC_AUDIENCE/);
  });

  it('accepts OIDC mode when issuer and audience are set', () => {
    const config = loadConfig({
      EARTH_AUTH_MODE: 'oidc',
      OIDC_ISSUER_URL: 'https://idp.example.test/',
      OIDC_AUDIENCE: 'earth-api',
      OIDC_JWKS_URI: 'https://idp.example.test/jwks',
      NODE_ENV: 'test',
    });
    expect(config.authModeSetting).toBe('oidc');
    expect(config.oidc).toEqual({
      issuerUrl: 'https://idp.example.test/',
      audience: 'earth-api',
      jwksUri: 'https://idp.example.test/jwks',
    });
  });
});

describe('role capabilities', () => {
  const roles: UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER'];

  it('lets OWNER ESG_LEAD OPERATIONS start and run; REVIEWER and VIEWER cannot', () => {
    for (const role of roles) {
      const write = role === 'OWNER' || role === 'ESG_LEAD' || role === 'OPERATIONS';
      expect(canStartMaterialOpportunity(role)).toBe(write);
      expect(canRunDevelopmentTask(role)).toBe(write);
    }
  });

  it('lets every provisioned role read sessions and audit events, including VIEWER', () => {
    for (const role of roles) {
      expect(canReadSession(role)).toBe(true);
      expect(canReadAuditEvents(role)).toBe(true);
    }
  });

  it('requireRole rejects a role that is not in the allow-list', () => {
    expect(() => requireRole('VIEWER', ['OWNER', 'ESG_LEAD', 'OPERATIONS'])).toThrow(
      RoleForbiddenError,
    );
  });
});
