import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { OidcEnv } from '../config.js';
import type { UserRole } from '../contracts.js';
import { OIDC_ALLOWED_ALGORITHMS } from './algorithms.js';
import { AccountNotProvisionedError, AuthError } from './errors.js';
import { readHeader } from './headers.js';
import {
  AUTH_MODE_OIDC,
  type AuthenticatedActor,
  type AuthProvider,
} from './types.js';

const BEARER = /^Bearer\s+(\S+)/i;

export interface OidcJwtAuthProviderOptions extends OidcEnv {
  jwksUri: string;
  getKey?: JWTVerifyGetKey;
}

/**
 * Validates a Bearer JWT against the configured issuer's JWKS.
 * Role and organization are loaded from the local user row keyed by `sub`.
 * Token claims never grant org, role, or user id.
 */
export class OidcJwtAuthProvider implements AuthProvider {
  readonly authMode = AUTH_MODE_OIDC;

  private readonly issuer: string;
  private readonly audience: string;
  private readonly getKey: JWTVerifyGetKey;

  constructor(
    private readonly pool: Pool,
    options: OidcJwtAuthProviderOptions,
  ) {
    this.issuer = options.issuerUrl;
    this.audience = options.audience;
    this.getKey = options.getKey ?? createRemoteJWKSet(new URL(options.jwksUri));
  }

  static async connect(pool: Pool, oidc: OidcEnv): Promise<OidcJwtAuthProvider> {
    const jwksUri = oidc.jwksUri ?? (await discoverJwksUri(oidc.issuerUrl));
    return new OidcJwtAuthProvider(pool, { ...oidc, jwksUri });
  }

  async getActor(request: FastifyRequest): Promise<AuthenticatedActor> {
    const authorization = readHeader(request, 'authorization');
    const match = authorization ? BEARER.exec(authorization) : null;
    const token = match?.[1];
    if (!token) {
      throw new AuthError(
        401,
        'OIDC_TOKEN_MISSING',
        'Authorization Bearer token is required.',
      );
    }

    let subject: string;
    try {
      const { payload } = await jwtVerify(token, this.getKey, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: [...OIDC_ALLOWED_ALGORITHMS],
        clockTolerance: 0,
        requiredClaims: ['sub'],
      });
      if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
        throw new Error('missing sub');
      }
      subject = payload.sub;
    } catch {
      throw new AuthError(401, 'OIDC_TOKEN_INVALID', 'Access token is invalid.');
    }

    const result = await this.pool.query<{
      id: string;
      organization_id: string;
      role: UserRole;
      email: string;
      oidc_subject: string;
    }>(
      `SELECT id, organization_id, role, email, oidc_subject
       FROM users
       WHERE oidc_subject = $1`,
      [subject],
    );
    const user = result.rows[0];
    if (!user) {
      throw new AccountNotProvisionedError();
    }

    return {
      actorId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      authMode: AUTH_MODE_OIDC,
      email: user.email,
      subject: user.oidc_subject,
    };
  }
}

export async function discoverJwksUri(issuerUrl: string): Promise<string> {
  const wellKnown = `${issuerUrl.replace(/\/+$/, '')}/.well-known/openid-configuration`;
  let response: Response;
  try {
    response = await fetch(wellKnown, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new Error(
      'OIDC provider init failed: could not reach the issuer discovery document. Set OIDC_JWKS_URI to skip discovery.',
    );
  }

  if (!response.ok) {
    throw new Error(
      'OIDC provider init failed: issuer discovery document was not available. Set OIDC_JWKS_URI to skip discovery.',
    );
  }

  const body: unknown = await response.json();
  const jwksUri =
    body &&
    typeof body === 'object' &&
    'jwks_uri' in body &&
    typeof (body as { jwks_uri: unknown }).jwks_uri === 'string'
      ? (body as { jwks_uri: string }).jwks_uri.trim()
      : '';

  if (!jwksUri) {
    throw new Error(
      'OIDC provider init failed: discovery document did not include jwks_uri. Set OIDC_JWKS_URI.',
    );
  }

  return jwksUri;
}
