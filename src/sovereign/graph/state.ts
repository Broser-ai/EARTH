import { Annotation } from '@langchain/langgraph/web';
import type {
  AgentResult,
  CompassVerdict,
  EarthGraphNodeId,
  GraphTick,
  MissionSpec,
  PolicyDecision,
  ProposedAction,
  SwarmOutcome,
  Trajectory,
} from '../types.ts';
import { concatResults, concatTicks, lastValue } from './host.ts';

export const EarthGraphAnnotation = Annotation.Root({
  node: Annotation<EarthGraphNodeId>({
    reducer: lastValue<EarthGraphNodeId>,
    default: () => 'idle',
  }),
  requestedMissionId: Annotation<string | null>({
    reducer: lastValue<string | null>,
    default: () => null,
  }),
  pendingMissionIds: Annotation<string[]>({
    reducer: lastValue<string[]>,
    default: () => [],
  }),
  submitTinker: Annotation<boolean>({
    reducer: lastValue<boolean>,
    default: () => false,
  }),
  step: Annotation<number>({
    reducer: lastValue<number>,
    default: () => 0,
  }),
  taskIndex: Annotation<number>({
    reducer: lastValue<number>,
    default: () => 0,
  }),
  mission: Annotation<MissionSpec | null>({
    reducer: lastValue<MissionSpec | null>,
    default: () => null,
  }),
  decision: Annotation<PolicyDecision | null>({
    reducer: lastValue<PolicyDecision | null>,
    default: () => null,
  }),
  proposedAction: Annotation<ProposedAction | null>({
    reducer: lastValue<ProposedAction | null>,
    default: () => null,
  }),
  specialistId: Annotation<string | null>({
    reducer: lastValue<string | null>,
    default: () => null,
  }),
  verdict: Annotation<CompassVerdict | null>({
    reducer: lastValue<CompassVerdict | null>,
    default: () => null,
  }),
  visionOutput: Annotation<unknown>({
    reducer: lastValue<unknown>,
    default: () => null,
  }),
  results: Annotation<AgentResult[]>({
    reducer: concatResults,
    default: () => [],
  }),
  outcome: Annotation<SwarmOutcome | null>({
    reducer: lastValue<SwarmOutcome | null>,
    default: () => null,
  }),
  trajectory: Annotation<Trajectory | null>({
    reducer: lastValue<Trajectory | null>,
    default: () => null,
  }),
  lastOutcome: Annotation<SwarmOutcome | null>({
    reducer: lastValue<SwarmOutcome | null>,
    default: () => null,
  }),
  ticks: Annotation<GraphTick[]>({
    reducer: concatTicks,
    default: () => [],
  }),
});

export type EarthGraphState = typeof EarthGraphAnnotation.State;
export type EarthGraphUpdate = typeof EarthGraphAnnotation.Update;
