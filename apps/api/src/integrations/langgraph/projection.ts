import type { NextRecommendedAction, SessionState, TaskState, TaskType } from '../../prime/types.js';

export interface PrimeProjectedTask {
  id: string;
  taskType: TaskType;
  state: TaskState;
  required: boolean;
  priority: number;
}

export interface PrimeWorkflowProjection {
  sessionId: string;
  organizationId: string;
  state: SessionState;
  workflowType: string;
  workflowVersion: string;
  tasks: PrimeProjectedTask[];
  nextRecommendedAction: NextRecommendedAction;
}

export interface PrimeProjectionReadArgs {
  sessionId: string;
  organizationId: string;
}

export interface PrimeProjectionReader {
  read(args: PrimeProjectionReadArgs): Promise<PrimeWorkflowProjection | null>;
}

export const defaultPrimeProjectionReader: PrimeProjectionReader = {
  async read(_args: PrimeProjectionReadArgs): Promise<PrimeWorkflowProjection | null> {
    void _args;
    return null;
  },
};
