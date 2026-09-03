import type { SwarmOutcome } from '../types.ts';
import { compileEarthGraph, type CompiledEarthGraph } from './compileEarthGraph.ts';
import type { EarthGraphHost, EarthGraphInput } from './host.ts';
import type { EarthGraphState } from './state.ts';

export class EarthGraph {
  private readonly compiled: CompiledEarthGraph;
  private last: EarthGraphState | null = null;

  constructor(private readonly host: EarthGraphHost) {
    this.compiled = compileEarthGraph(host);
  }

  snapshot(): EarthGraphState | null {
    return this.last;
  }

  async invoke(input: EarthGraphInput = {}): Promise<EarthGraphState> {
    const state = (await this.compiled.invoke(
      {
        requestedMissionId: input.requestedMissionId ?? null,
        pendingMissionIds: input.pendingMissionIds ?? this.host.catalog.map((mission) => mission.id),
        submitTinker: input.submitTinker ?? false,
      },
      { recursionLimit: 64 },
    )) as EarthGraphState;
    this.last = state;
    return state;
  }

  async invokeMission(input: EarthGraphInput = {}): Promise<SwarmOutcome> {
    const state = await this.invoke(input);
    if (!state.outcome) {
      throw new Error('LangGraph invoke finished without a swarm outcome');
    }
    return state.outcome;
  }
}
