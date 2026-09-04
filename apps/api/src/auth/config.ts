import type { JWTVerifyOptions } from 'jose';
import { AUTH_MODE_DEVELOPMENT, AUTH_MODE_OIDC, type AuthMode } from './types.js';

export interface DevelopmentAuthConfig {
    mode: typeof AUTH_MODE_DEVELOPMENT;
}

export interface OidcAuthConfig {
    mode: typeof AUTH_MODE_OIDC;
    issuerUrl: string;
    audience: string;
    jwksUri: string;
    allowedAlgorithms: NonNullable<JWTVerifyOptions['algorithms']>;
}

export type AuthConfig = DevelopmentAuthConfig | OidcAuthConfig;

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
    const requestedMode = env.EARTH_AUTH_MODE;
    if (requestedMode === 'development') {
        if (env.NODE_ENV !== 'development') {
            throw new Error('DEVELOPMENT_AUTH_DISABLED: development auth requires NODE_ENV=development');
        }
        return { mode: AUTH_MODE_DEVELOPMENT };
    }

    if (requestedMode !== 'oidc') {
        throw new Error('EARTH_AUTH_MODE must be development or oidc');
    }

    const issuerUrl = required(env.OIDC_ISSUER_URL, 'OIDC_ISSUER_URL');
    const audience = required(env.OIDC_AUDIENCE, 'OIDC_AUDIENCE');
    const jwksUri = required(env.OIDC_JWKS_URI, 'OIDC_JWKS_URI');
    assertUrl(issuerUrl, 'OIDC_ISSUER_URL');
    assertUrl(jwksUri, 'OIDC_JWKS_URI');
    const allowedAlgorithms = parseAlgorithms(env.OIDC_ALLOWED_ALGORITHMS);

    return { mode: AUTH_MODE_OIDC, issuerUrl, audience, jwksUri, allowedAlgorithms };
}

export function authModeLabel(config: AuthConfig): AuthMode {
    return config.mode;
}

function required(value: string | undefined, name: string): string {
    const trimmed = value?.trim();
    if (!trimmed) throw new Error(`${name} is required when EARTH_AUTH_MODE=oidc`);
    return trimmed;
}

function assertUrl(value: string, name: string): void {
    try {
        new URL(value);
    } catch {
        throw new Error(`${name} must be an absolute URL`);
    }
}

function parseAlgorithms(value: string | undefined): NonNullable<JWTVerifyOptions['algorithms']> {
    const algorithms = (value ?? 'RS256,ES256')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    if (algorithms.length === 0 || algorithms.some((algorithm) => algorithm !== 'RS256' && algorithm !== 'ES256')) {
        throw new Error('OIDC_ALLOWED_ALGORITHMS must contain only RS256 and/or ES256');
    }
    return algorithms as NonNullable<JWTVerifyOptions['algorithms']>;
}