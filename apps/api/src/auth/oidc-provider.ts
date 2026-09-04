import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { OidcAuthConfig } from './config.js';
import { AuthError } from './errors.js';
import { findActiveMembershipBySubject } from './membership.js';
import { AUTH_MODE_OIDC, type AuthenticatedActor, type AuthProvider } from './types.js';

export class OidcJwtAuthProvider implements AuthProvider {
    readonly authMode = AUTH_MODE_OIDC;
    private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

    constructor(
        private readonly pool: Pool,
        private readonly config: OidcAuthConfig,
    ) {
        this.jwks = createRemoteJWKSet(new URL(config.jwksUri));
    }

    async getActor(request: FastifyRequest): Promise<AuthenticatedActor> {
        const token = bearerToken(request);
        if (!token) {
            throw new AuthError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
        }

        let subject: string;
        try {
            const verified = await jwtVerify(token, this.jwks, {
                issuer: this.config.issuerUrl,
                audience: this.config.audience,
                algorithms: this.config.allowedAlgorithms,
            });
            subject = verified.payload.sub?.trim() ?? '';
        } catch {
            throw new AuthError(401, 'INVALID_AUTH_TOKEN', 'Authentication token is invalid.');
        }

        if (!subject) {
            throw new AuthError(401, 'INVALID_AUTH_TOKEN', 'Authentication token is invalid.');
        }

        const membership = await findActiveMembershipBySubject(this.pool, subject);
        if (!membership) {
            throw new AuthError(403, 'AUTHORIZED_ACCOUNT_NOT_PROVISIONED', 'Account is not provisioned for EARTH.');
        }

        return {
            actorId: membership.actorId,
            organizationId: membership.organizationId,
            role: membership.role,
            email: membership.email,
            subject,
            authMode: AUTH_MODE_OIDC,
        };
    }
}

function bearerToken(request: FastifyRequest): string | undefined {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') return undefined;
    const match = /^Bearer ([^\s]+)$/i.exec(authorization.trim());
    return match?.[1];
}