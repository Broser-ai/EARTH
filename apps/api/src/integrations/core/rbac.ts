import type { UserRole } from '../../contracts.js';
import { assertNever } from '../../contracts.js';
import type { TenantContext } from '../../auth/types.js';

const REQUEST_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS'];
const CANCEL_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD'];
const READ_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER'];

export function canRequestIntegrationOperation(role: UserRole): boolean {
  switch (role) {
    case 'OWNER':
    case 'ESG_LEAD':
    case 'OPERATIONS':
      return true;
    case 'REVIEWER':
    case 'VIEWER':
      return false;
    default:
      return assertNever(role);
  }
}

export function canCancelIntegrationOperation(role: UserRole): boolean {
  switch (role) {
    case 'OWNER':
    case 'ESG_LEAD':
      return true;
    case 'OPERATIONS':
    case 'REVIEWER':
    case 'VIEWER':
      return false;
    default:
      return assertNever(role);
  }
}

export function canReadIntegrations(role: UserRole): boolean {
  switch (role) {
    case 'OWNER':
    case 'ESG_LEAD':
    case 'OPERATIONS':
    case 'REVIEWER':
    case 'VIEWER':
      return true;
    default:
      return assertNever(role);
  }
}

export function assertAuthenticatedTenant(context: TenantContext): void {
  if (!context.actorId || !context.organizationId || !context.role) {
    throw new Error('TenantContext is required for integration operations');
  }
}

export { REQUEST_ROLES, CANCEL_ROLES, READ_ROLES };
