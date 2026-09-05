import { assertNever, type SessionState, type TaskState, type TaskType } from '../../prime/types.js';
import type { PrimeProjectedTask, PrimeWorkflowProjection } from './projection.js';

export type WorkflowNodeKind = 'SESSION' | 'TASK' | 'GATE';

export interface WorkflowGraphNode {
  id: string;
  kind: WorkflowNodeKind;
  label: string;
  state: string;
}

export interface WorkflowGraphEdge {
  from: string;
  to: string;
}

export interface WorkflowTransitionRequest {
  action: 'REQUIRES_PRIME_API';
  path: string;
}

export interface WorkflowVisualization {
  honesty: 'INPUT_UNVERIFIED';
  status: 'DRAFT';
  connected: false;
  graph: {
    nodes: WorkflowGraphNode[];
    edges: WorkflowGraphEdge[];
  };
  transitionRequest: WorkflowTransitionRequest;
}

export function primeTransitionRequest(sessionId: string): WorkflowTransitionRequest {
  return {
    action: 'REQUIRES_PRIME_API',
    path: `/v1/sessions/${sessionId}/run-next`,
  };
}

export function buildWorkflowVisualization(
  projection: PrimeWorkflowProjection,
): WorkflowVisualization {
  const sessionNodeId = `session:${projection.sessionId}`;
  const nodes: WorkflowGraphNode[] = [
    {
      id: sessionNodeId,
      kind: 'SESSION',
      label: sessionLabel(projection.state),
      state: projection.state,
    },
  ];
  const edges: WorkflowGraphEdge[] = [];

  const tasks = sortTasks(projection.tasks);
  let previousId = sessionNodeId;
  for (const task of tasks) {
    const taskId = `task:${task.id}`;
    nodes.push({
      id: taskId,
      kind: 'TASK',
      label: taskLabel(task.taskType),
      state: taskStateLabel(task.state),
    });
    edges.push({ from: previousId, to: taskId });
    previousId = taskId;
  }

  if (projection.state === 'WAITING_FOR_APPROVAL') {
    const gateId = 'gate:human-approval';
    nodes.push({
      id: gateId,
      kind: 'GATE',
      label: 'HUMAN_APPROVAL_REQUIRED',
      state: 'WAITING_FOR_APPROVAL',
    });
    edges.push({ from: sessionNodeId, to: gateId });
  }

  return {
    honesty: 'INPUT_UNVERIFIED',
    status: 'DRAFT',
    connected: false,
    graph: { nodes, edges },
    transitionRequest: primeTransitionRequest(projection.sessionId),
  };
}

function sortTasks(tasks: PrimeProjectedTask[]): PrimeProjectedTask[] {
  return [...tasks].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }
    return left.taskType.localeCompare(right.taskType);
  });
}

function sessionLabel(state: SessionState): string {
  switch (state) {
    case 'QUEUED':
      return 'SESSION_QUEUED';
    case 'RUNNING':
      return 'SESSION_RUNNING';
    case 'WAITING_FOR_DEPENDENCY':
      return 'SESSION_WAITING_FOR_DEPENDENCY';
    case 'WAITING_FOR_APPROVAL':
      return 'SESSION_WAITING_FOR_APPROVAL';
    case 'COMPLETED':
      return 'SESSION_COMPLETED';
    case 'FAILED':
      return 'SESSION_FAILED';
    case 'CANCELLED':
      return 'SESSION_CANCELLED';
    case 'BUDGET_STOPPED':
      return 'SESSION_BUDGET_STOPPED';
    case 'EXPIRED':
      return 'SESSION_EXPIRED';
    default:
      return assertNever(state);
  }
}

function taskLabel(taskType: TaskType): string {
  switch (taskType) {
    case 'VALIDATE_BATCH':
      return 'VALIDATE_BATCH';
    case 'CHECK_EVIDENCE':
      return 'CHECK_EVIDENCE';
    case 'CALCULATE_BASELINE':
      return 'CALCULATE_BASELINE';
    case 'FIND_CANDIDATE_ROUTES':
      return 'FIND_CANDIDATE_ROUTES';
    case 'NANOCHAT_EXTRACT':
      return 'NANOCHAT_EXTRACT';
    default:
      return assertNever(taskType);
  }
}

function taskStateLabel(state: TaskState): string {
  switch (state) {
    case 'QUEUED':
      return 'QUEUED';
    case 'RUNNING':
      return 'RUNNING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'PARTIAL':
      return 'PARTIAL';
    case 'ABSTAINED':
      return 'ABSTAINED';
    case 'FAILED':
      return 'FAILED';
    case 'BLOCKED':
      return 'BLOCKED';
    case 'NOT_CONFIGURED':
      return 'NOT_CONFIGURED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return assertNever(state);
  }
}
