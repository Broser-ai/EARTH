import { assertNever, type UserRole } from '../contracts.js';
import { RoleForbiddenError } from './errors.js';
import type { TenantContext } from './types.js';

export function canReadIntake(role: UserRole): boolean {
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

export function canWriteIntake(role: UserRole): boolean {
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

export function requireAuthenticatedActor(context: TenantContext | undefined): asserts context is TenantContext {
  if (!context) {
    throw new RoleForbiddenError('Authentication is required.');
  }
}

export function requireRole(context: TenantContext, roles: readonly UserRole[]): void {
  if (!roles.includes(context.role)) {
    throw new RoleForbiddenError('You do not have permission to perform this action.');
  }
}

export function canStartMaterialOpportunity(context: TenantContext): void {
  requireRole(context, ['OWNER', 'ESG_LEAD', 'OPERATIONS']);
}

export function canReadSession(context: TenantContext): void {
  requireRole(context, ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER']);
}

export function canRunDevelopmentTask(context: TenantContext): void {
  requireRole(context, ['OWNER', 'ESG_LEAD', 'OPERATIONS']);
}

export function canReadAuditEvents(context: TenantContext): void {
  requireRole(context, ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER']);
}
