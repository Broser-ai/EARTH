import { assertNever, type UserRole } from '../../contracts.js';

const WRITE_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS'];
const READ_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER'];

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

export function canCreateIntegrationOperation(role: UserRole): boolean {
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
  return canCreateIntegrationOperation(role);
}

export { WRITE_ROLES, READ_ROLES };
