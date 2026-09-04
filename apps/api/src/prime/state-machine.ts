import {
  PolicyError,
  assertNever,
  type SessionState,
  type TaskState,
} from './types.js';

const SESSION_TRANSITIONS: Record<SessionState, readonly SessionState[]> = {
  QUEUED: ['RUNNING', 'CANCELLED', 'EXPIRED'],
  RUNNING: [
    'WAITING_FOR_DEPENDENCY',
    'WAITING_FOR_APPROVAL',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'BUDGET_STOPPED',
    'EXPIRED',
  ],
  WAITING_FOR_DEPENDENCY: ['RUNNING', 'CANCELLED', 'EXPIRED', 'FAILED'],
  WAITING_FOR_APPROVAL: ['RUNNING', 'CANCELLED', 'COMPLETED', 'FAILED', 'EXPIRED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  BUDGET_STOPPED: [],
  EXPIRED: [],
};

const TASK_TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  QUEUED: ['RUNNING', 'CANCELLED', 'NOT_CONFIGURED'],
  RUNNING: [
    'COMPLETED',
    'PARTIAL',
    'ABSTAINED',
    'FAILED',
    'BLOCKED',
    'NOT_CONFIGURED',
    'CANCELLED',
    'QUEUED',
  ],
  COMPLETED: [],
  PARTIAL: [],
  ABSTAINED: [],
  FAILED: ['QUEUED'],
  BLOCKED: ['QUEUED', 'CANCELLED'],
  NOT_CONFIGURED: [],
  CANCELLED: [],
};

export function assertSessionTransition(from: SessionState, to: SessionState): void {
  if (from === to) {
    return;
  }
  const allowed = SESSION_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new PolicyError(
      'INVALID_STATE_TRANSITION',
      `session cannot move from ${from} to ${to}`,
    );
  }
}

export function assertTaskTransition(from: TaskState, to: TaskState): void {
  if (from === to) {
    return;
  }
  const allowed = TASK_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new PolicyError(
      'INVALID_STATE_TRANSITION',
      `task cannot move from ${from} to ${to}`,
    );
  }
}

export function isTerminalSession(state: SessionState): boolean {
  switch (state) {
    case 'COMPLETED':
    case 'FAILED':
    case 'CANCELLED':
    case 'BUDGET_STOPPED':
    case 'EXPIRED':
      return true;
    case 'QUEUED':
    case 'RUNNING':
    case 'WAITING_FOR_DEPENDENCY':
    case 'WAITING_FOR_APPROVAL':
      return false;
    default:
      return assertNever(state);
  }
}

export function isRequiredSettled(state: TaskState): boolean {
  switch (state) {
    case 'COMPLETED':
    case 'PARTIAL':
      return true;
    case 'QUEUED':
    case 'RUNNING':
    case 'ABSTAINED':
    case 'FAILED':
    case 'BLOCKED':
    case 'NOT_CONFIGURED':
    case 'CANCELLED':
      return false;
    default:
      return assertNever(state);
  }
}
