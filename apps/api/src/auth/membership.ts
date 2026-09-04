import type { Pool } from 'pg';
import type { EarthRole } from './types.js';

export interface ActiveMembership {
    actorId: string;
    organizationId: string;
    role: EarthRole;
    email: string | undefined;
    subject: string | undefined;
}

export async function findActiveMembershipByUserId(
    pool: Pool,
    userId: string,
): Promise<ActiveMembership | null> {
    const result = await pool.query<ActiveMembership>(
        `SELECT u.id AS "actorId", m.organization_id AS "organizationId", m.role,
            u.email, u.oidc_subject AS subject
       FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
      WHERE u.id = $1 AND m.status = 'ACTIVE'`,
        [userId],
    );
    return result.rows[0] ?? null;
}

export async function findActiveMembershipBySubject(
    pool: Pool,
    subject: string,
): Promise<ActiveMembership | null> {
    const result = await pool.query<ActiveMembership>(
        `SELECT u.id AS "actorId", m.organization_id AS "organizationId", m.role,
            u.email, u.oidc_subject AS subject
       FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
      WHERE u.oidc_subject = $1 AND m.status = 'ACTIVE'`,
        [subject],
    );
    return result.rows[0] ?? null;
}

export async function userExists(pool: Pool, userId: string): Promise<boolean> {
    const result = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    return Boolean(result.rows[0]);
}