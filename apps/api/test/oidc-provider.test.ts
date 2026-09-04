import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { OidcJwtAuthProvider } from '../src/auth/oidc-provider.js';

const issuer = 'https://issuer.example.test/';
const audience = 'earth-api';

afterEach(() => {
    vi.unstubAllGlobals();
});

async function providerFor(subject = 'provisioned-subject') {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'local-test-key';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))));

    const pool = {
        query: vi.fn(async (_query: string, values: readonly string[]) => ({
            rows:
                values[0] === subject
                    ? [
                        {
                            actorId: '22222222-2222-2222-2222-222222222222',
                            organizationId: '11111111-1111-1111-1111-111111111111',
                            role: 'OWNER',
                            email: 'dev-owner@earth.local',
                            subject,
                        },
                    ]
                    : [],
        })),
    } as unknown as Pool;

    return {
        privateKey,
        provider: new OidcJwtAuthProvider(pool, {
            mode: 'OIDC',
            issuerUrl: issuer,
            audience,
            jwksUri: `${issuer}jwks`,
            allowedAlgorithms: ['RS256'],
        }),
    };
}

async function token(
    privateKey: CryptoKey,
    overrides: { issuer?: string; audience?: string; subject?: string; expiration?: string } = {},
): Promise<string> {
    return new SignJWT({ role: 'VIEWER' })
        .setProtectedHeader({ alg: 'RS256', kid: 'local-test-key' })
        .setIssuedAt()
        .setIssuer(overrides.issuer ?? issuer)
        .setAudience(overrides.audience ?? audience)
        .setSubject(overrides.subject ?? 'provisioned-subject')
        .setExpirationTime(overrides.expiration ?? '5m')
        .sign(privateKey);
}

function request(authorization: string): FastifyRequest {
    return { headers: { authorization } } as FastifyRequest;
}

describe('OidcJwtAuthProvider', () => {
    it('rejects malformed and unsigned tokens without contacting a real issuer', async () => {
        const { provider } = await providerFor();
        await expect(provider.getActor(request('Bearer malformed'))).rejects.toMatchObject({
            status: 401,
            code: 'INVALID_AUTH_TOKEN',
        });
        await expect(provider.getActor(request('Bearer eyJhbGciOiJub25lIn0.e30.'))).rejects.toMatchObject({
            status: 401,
            code: 'INVALID_AUTH_TOKEN',
        });
    });

    it('verifies issuer, audience, expiry, and subject before database membership lookup', async () => {
        const { provider, privateKey } = await providerFor();
        for (const invalid of [
            await token(privateKey, { issuer: 'https://wrong.example.test/' }),
            await token(privateKey, { audience: 'wrong-audience' }),
            await token(privateKey, { expiration: '-1s' }),
            await token(privateKey, { subject: '   ' }),
        ]) {
            await expect(provider.getActor(request(`Bearer ${invalid}`))).rejects.toMatchObject({
                status: 401,
                code: 'INVALID_AUTH_TOKEN',
            });
        }
    });

    it('uses database membership role, never the JWT role claim', async () => {
        const { provider, privateKey } = await providerFor();
        const actor = await provider.getActor(request(`Bearer ${await token(privateKey)}`));
        expect(actor.role).toBe('OWNER');
        expect(actor.authMode).toBe('OIDC');
    });

    it('rejects a valid token for an account without an active EARTH membership', async () => {
        const { provider, privateKey } = await providerFor();
        await expect(
            provider.getActor(request(`Bearer ${await token(privateKey, { subject: 'unprovisioned' })}`)),
        ).rejects.toMatchObject({ status: 403, code: 'AUTHORIZED_ACCOUNT_NOT_PROVISIONED' });
    });
});