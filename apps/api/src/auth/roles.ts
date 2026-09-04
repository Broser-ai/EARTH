import { assertNever, type UserRole } from '../contracts.js';
import { RoleForbiddenError } from './errors.js';
import type { AuthenticatedActor } from './types.js';

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

export function assertCanReadIntake(actor: AuthenticatedActor): void {
  if (!canReadIntake(actor.role)) {
    throw new RoleForbiddenError(
      `DEVELOPMENT ONLY: role ${actor.role} cannot read intake. Role is loaded from Postgres.`,
    );
  }
}

export function assertCanWriteIntake(actor: AuthenticatedActor): void {
  if (!canWriteIntake(actor.role)) {
    throw new RoleForbiddenError(
      `DEVELOPMENT ONLY: role ${actor.role} cannot mutate intake. Role is loaded from Postgres, not from x-earth-user-role.`,
    );
  }
}
