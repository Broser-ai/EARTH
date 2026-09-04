import { requireRole } from '../auth/roles.js';
import type { TenantContext } from '../auth/types.js';

export function canWriteEvidence(context: TenantContext): void { requireRole(context, ['OWNER', 'ESG_LEAD', 'OPERATIONS']); }
export function canReadEvidence(context: TenantContext): void { requireRole(context, ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER']); }
export function canDecideApproval(context: TenantContext, requiredRoles: readonly string[]): void {
  if (!['OWNER', 'ESG_LEAD', 'REVIEWER'].includes(context.role) || !requiredRoles.includes(context.role)) throw new Error('APPROVAL_ROLE_REQUIRED');
}