import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import type { HashChainLedger } from '../identity/HashChainLedger.ts';
import type { InklingBrain } from '../prime/inkling/InklingBrain.ts';
import type { PrimeAgent } from '../prime/PrimeAgent.ts';
import type { TinkerTrainer } from '../prime/tinker/TinkerTrainer.ts';
import type { SwarmCoordinator } from '../swarm/SwarmCoordinator.ts';
import type {
  AgentResult,
  CompassVerdict,
  EarthCtx,
  GraphTick,
  MissionSpec,
  PolicyDecision,
  ProposedAction,
  SwarmOutcome,
  Trajectory,
} from '../types.ts';
import type { RoboflowVisionAdapter } from '../vision/roboflow/RoboflowVisionAdapter.ts';

export interface EarthGraphHost {
  bus: EarthBus;
  compass: CompassGate;
  swarm: SwarmCoordinator;
  prime: PrimeAgent;
  ledger: HashChainLedger;
  inkling: InklingBrain;
  tinker: TinkerTrainer;
  vision: RoboflowVisionAdapter;
  catalog: MissionSpec[];
  ctx: EarthCtx;
}

export interface EarthGraphInput {
  requestedMissionId?: string | null;
  pendingMissionIds?: string[];
  submitTinker?: boolean;
}

export function lastValue<T>(_left: T, right: T): T {
  return right;
}

export function concatTicks(left: GraphTick[], right: GraphTick[]): GraphTick[] {
  return left.concat(right);
}

export function concatResults(left: AgentResult[], right: AgentResult[]): AgentResult[] {
  return left.concat(right);
}

export function tick(node: GraphTick['node'], summary: string): GraphTick {
  return { node, ts: new Date().toISOString(), summary };
}

export type { AgentResult, CompassVerdict, GraphTick, PolicyDecision, ProposedAction, SwarmOutcome, Trajectory };
