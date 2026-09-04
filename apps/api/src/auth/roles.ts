import { assertNever, type UserRole } from '../contracts.js';
import { RoleForbiddenError } from './errors.js';

const START_AND_RUN_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS'];
const READ_ROLES: readonly UserRole[] = ['OWNER', 'ESG_LEAD', 'OPERATIONS', 'REVIEWER', 'VIEWER'];

export function canStartMaterialOpportunity(role: UserRole): boolean {
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

export function canRunDevelopmentTask(role: UserRole): boolean {
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

export function canReadSession(role: UserRole): boolean {
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

export function canReadAuditEvents(role: UserRole): boolean {
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

export function requireRole(role: UserRole, allowed: readonly UserRole[]): void {
  if (!allowed.includes(role)) {
    throw new RoleForbiddenError(
      `role ${role} is not permitted for this action. Role is loaded from the provisioned account, not from the request body or headers.`,
    );
  }
}

export function assertCanStartMaterialOpportunity(role: UserRole): void {
  if (!canStartMaterialOpportunity(role)) {
    requireRole(role, START_AND_RUN_ROLES);
  }
}

export function assertCanRunDevelopmentTask(role: UserRole): void {
  if (!canRunDevelopmentTask(role)) {
    requireRole(role, START_AND_RUN_ROLES);
  }
}

export function assertCanReadSession(role: UserRole): void {
  if (!canReadSession(role)) {
    requireRole(role, READ_ROLES);
  }
}

export function assertCanReadAuditEvents(role: UserRole): void {
  if (!canReadAuditEvents(role)) {
    requireRole(role, READ_ROLES);
  }
}

/** @deprecated Use canReadSession. */
export const canReadIntake = canReadSession;
/** @deprecated Use canStartMaterialOpportunity / canRunDevelopmentTask. */
export const canWriteIntake = canStartMaterialOpportunity;
