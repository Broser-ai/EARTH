import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import type { HAgent } from '../agents/HAgent.ts';
import type { CapabilityTree } from './capabilities.ts';
import type { EarthCtx, MissionSpec, SwarmOutcome } from '../types.ts';

export interface SwarmCoordinatorOptions {
  bus: EarthBus;
  compass: CompassGate;
  tree: CapabilityTree;
  harness: HAgent;
}

export class SwarmCoordinator {
  readonly tree: CapabilityTree;
  private readonly bus: EarthBus;
  private readonly compass: CompassGate;
  private readonly harness: HAgent;

  constructor(options: SwarmCoordinatorOptions) {
    this.bus = options.bus;
    this.compass = options.compass;
    this.tree = options.tree;
    this.harness = options.harness;
  }

  async run(mission: MissionSpec, ctx: EarthCtx): Promise<SwarmOutcome> {
    this.bus.emit({
      type: 'swarm.mission.started',
      source: this.harness.id,
      message: mission.title,
      payload: { missionId: mission.id, tasks: mission.tasks.length },
    });

    const coordinated = await this.harness.coordinate(mission, ctx, {
      bus: this.bus,
      compass: this.compass,
      tree: this.tree,
    });

    const executed = coordinated.results.filter((row) => row.status === 'executed').length;
    const blocked = coordinated.results.filter(
      (row) => row.status === 'blocked' || row.status === 'refused',
    ).length;
    const awaitingHitl = coordinated.results.filter((row) => row.status === 'awaiting_hitl').length;

    const outcome: SwarmOutcome = {
      missionId: mission.id,
      status: coordinated.status,
      executed,
      blocked,
      awaitingHitl,
    };

    this.bus.emit({
      type: 'swarm.mission.completed',
      source: this.harness.id,
      message: `${mission.title} → ${outcome.status}`,
      payload: { ...outcome },
    });

    return outcome;
  }
}
