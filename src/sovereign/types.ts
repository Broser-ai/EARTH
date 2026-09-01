export type EarthEventType =
  | 'runtime.booted'
  | 'runtime.halted'
  | 'action.proposed'
  | 'compass.verdict'
  | 'hitl.requested'
  | 'hitl.approved'
  | 'hitl.rejected'
  | 'agent.dispatched'
  | 'agent.completed'
  | 'agent.blocked'
  | 'agent.refused'
  | 'swarm.mission.started'
  | 'swarm.mission.completed'
  | 'prime.decision'
  | 'prime.trajectory.recorded'
  | 'ledger.appended'
  | 'eliability.posted'
  | 'intake.recorded';

export interface EarthEvent {
  id: string;
  ts: string;
  type: EarthEventType;
  source: string;
  message: string;
  payload: Record<string, unknown>;
}

export type EarthEventInput = Omit<EarthEvent, 'id' | 'ts' | 'payload'> & {
  id?: string;
  ts?: string;
  payload?: Record<string, unknown>;
};

export type ActionRisk = 'low' | 'medium' | 'high' | 'critical';

export interface ProposedAction {
  id: string;
  capability: string;
  intent: string;
  actorDid: string;
  risk: ActionRisk;
  payload: Record<string, unknown>;
}

export interface EarthCtx {
  actorDid: string;
  allowedJurisdictions: string[];
  now: Date;
  hitlApprovals: ReadonlySet<string>;
}

export type CompassPillar = 'sovereignty' | 'eco' | 'compliance' | 'ethics';

export interface AgentOpinion {
  score: number;
  floor: number;
  evidence: string[];
  constraints: string[];
  requiresHitl: boolean;
}

export interface CompassVerdict {
  allow: boolean;
  opinions: Record<CompassPillar, AgentOpinion>;
  conflicts: string[];
  requiresHitl: boolean;
  digest: string;
}

export interface MissionSpec {
  id: string;
  title: string;
  tasks: ProposedAction[];
}

export type AgentResultStatus = 'executed' | 'blocked' | 'refused' | 'awaiting_hitl';

export interface AgentResult {
  agentId: string;
  actionId: string;
  status: AgentResultStatus;
  verdict?: CompassVerdict;
  output?: unknown;
  reason?: string;
}

export type MissionStatus = 'completed' | 'blocked' | 'awaiting_hitl';

export interface HAgentResult {
  missionId: string;
  status: MissionStatus;
  results: AgentResult[];
}

export interface SwarmOutcome {
  missionId: string;
  status: MissionStatus;
  executed: number;
  blocked: number;
  awaitingHitl: number;
}

export interface MissionState {
  pendingMissions: MissionSpec[];
  lastOutcome: SwarmOutcome | null;
  step: number;
}

export type PolicyKind = 'rl' | 'deterministic';

export interface PolicyDecision {
  missionId: string;
  policyKind: PolicyKind;
  trained: boolean;
  reason: string;
}

export interface Trajectory {
  id: string;
  missionId: string;
  decision: PolicyDecision;
  outcome: SwarmOutcome;
  reward: number;
  ts: string;
}

export interface CapabilityNodeSpec {
  id: string;
  label: string;
  children: CapabilityNodeSpec[];
}

export function assertNever(value: never, message: string): never {
  throw new Error(`${message}: ${String(value)}`);
}
