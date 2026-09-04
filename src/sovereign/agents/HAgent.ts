import type { AgentDeps } from './SAgent.ts';
import type { SAgent } from './SAgent.ts';
import type {
  AgentResult,
  EarthCtx,
  HAgentResult,
  MissionSpec,
  MissionStatus,
} from '../types.ts';

export interface HAgentOptions {
  id: string;
  specialists: SAgent[];
}

export class HAgent {
  readonly id: string;
  private readonly specialists: SAgent[];

  constructor(options: HAgentOptions) {
    this.id = options.id;
    this.specialists = options.specialists;
  }

  specialist(capability: string): SAgent | undefined {
    return this.specialists.find((agent) => agent.capability === capability);
  }

  async coordinate(
    mission: MissionSpec,
    ctx: EarthCtx,
    deps: AgentDeps,
  ): Promise<HAgentResult> {
    const results: AgentResult[] = [];

    for (const task of mission.tasks) {
      const agent = this.specialist(task.capability);
      if (!agent) {
        results.push({
          agentId: this.id,
          actionId: task.id,
          status: 'refused',
          reason: `no specialist owns ${task.capability}`,
        });
        continue;
      }
      results.push(await agent.evaluateAndExecute(task, ctx, deps));
    }

    return {
      missionId: mission.id,
      status: rollup(results),
      results,
    };
  }
}

function rollup(results: AgentResult[]): MissionStatus {
  if (results.some((row) => row.status === 'awaiting_hitl')) return 'awaiting_hitl';
  if (results.every((row) => row.status === 'executed')) return 'completed';
  return 'blocked';
}
