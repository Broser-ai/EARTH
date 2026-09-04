import { assertNever } from './contracts.js';

const DEFAULT_PORT = 3001;
const DEFAULT_DEV_CORS_ORIGIN = 'http://localhost:5180';

export type AuthModeSetting = 'development' | 'oidc';

export interface OidcEnv {
  issuerUrl: string;
  audience: string;
  jwksUri: string | undefined;
}

export interface EarthConfig {
  port: number;
  host: '0.0.0.0';
  databaseUrl: string | undefined;
  nodeEnv: string;
  authModeSetting: AuthModeSetting;
  oidc: OidcEnv | null;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): EarthConfig {
  const rawPort = env.PORT ?? String(DEFAULT_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got ${rawPort}`);
  }

  const databaseUrl = env.DATABASE_URL?.trim() || undefined;
  const nodeEnv = env.NODE_ENV?.trim() || 'development';
  const authModeSetting = resolveAuthModeSetting(env, nodeEnv);
  const oidc = resolveOidcEnv(env, authModeSetting);
  const corsOrigins = resolveCorsOrigins(env);

  const rawMax = env.RATE_LIMIT_MAX ?? (nodeEnv === 'test' ? '10000' : '100');
  const rateLimitMax = Number(rawMax);
  if (!Number.isInteger(rateLimitMax) || rateLimitMax <= 0) {
    throw new Error(`RATE_LIMIT_MAX must be a positive integer, got ${rawMax}`);
  }

  return {
    port,
    host: '0.0.0.0',
    databaseUrl,
    nodeEnv,
    authModeSetting,
    oidc,
    corsOrigins,
    rateLimitMax,
    rateLimitWindowMs: 60_000,
  };
}

export function requireDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. See .env.example.');
  }
  return databaseUrl;
}

export function developmentAuthAllowed(nodeEnv: string, authModeSetting: AuthModeSetting): boolean {
  if (authModeSetting !== 'development') {
    return false;
  }
  return nodeEnv === 'development' || nodeEnv === 'test';
}

function resolveAuthModeSetting(env: NodeJS.ProcessEnv, nodeEnv: string): AuthModeSetting {
  const raw = env.EARTH_AUTH_MODE?.trim().toLowerCase() ?? '';

  if (!raw) {
    if (nodeEnv === 'production') {
      throw new Error(
        'EARTH_AUTH_MODE is required when NODE_ENV=production and must be oidc. Development headers are DEVELOPMENT_ONLY and are not production authentication.',
      );
    }
    return 'development';
  }

  if (raw !== 'development' && raw !== 'oidc') {
    throw new Error('EARTH_AUTH_MODE must be "development" or "oidc".');
  }

  if (raw === 'development' && nodeEnv === 'production') {
    throw new Error(
      'EARTH_AUTH_MODE=development is refused when NODE_ENV=production. Development headers are DEVELOPMENT_ONLY and are not production authentication.',
    );
  }

  return raw;
}

function resolveOidcEnv(env: NodeJS.ProcessEnv, authModeSetting: AuthModeSetting): OidcEnv | null {
  switch (authModeSetting) {
    case 'development':
      return null;
    case 'oidc': {
      const issuerUrl = env.OIDC_ISSUER_URL?.trim() ?? '';
      const audience = env.OIDC_AUDIENCE?.trim() ?? '';
      if (!issuerUrl || !audience) {
        throw new Error(
          'EARTH_AUTH_MODE=oidc requires OIDC_ISSUER_URL and OIDC_AUDIENCE. Optional OIDC_JWKS_URI overrides discovery from the issuer.',
        );
      }
      return {
        issuerUrl,
        audience,
        jwksUri: env.OIDC_JWKS_URI?.trim() || undefined,
      };
    }
    default:
      return assertNever(authModeSetting);
  }
}

function resolveCorsOrigins(env: NodeJS.ProcessEnv): string[] {
  const raw = env.CORS_ORIGINS?.trim();
  const origins = raw
    ? raw
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [DEFAULT_DEV_CORS_ORIGIN];

  if (origins.some((origin) => origin === '*')) {
    throw new Error(
      'CORS_ORIGINS must not include a wildcard when credentials may be sent. List explicit origins such as http://localhost:5180.',
    );
  }

  return origins;
}
