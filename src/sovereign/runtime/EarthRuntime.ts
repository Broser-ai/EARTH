import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import type { ELiabilityGraph } from '../eliability/ELiabilityGraph.ts';
import type { HashChainLedger } from '../identity/HashChainLedger.ts';
import type { DidDocument } from '../identity/did.ts';
import type { PrimeAgent } from '../prime/PrimeAgent.ts';
import type { SwarmCoordinator } from '../swarm/SwarmCoordinator.ts';
import type { EarthCtx, MissionSpec, SwarmOutcome, Trajectory } from '../types.ts';

export class EarthRuntime {
  readonly bus: EarthBus;
  readonly compass: CompassGate;
  readonly swarm: SwarmCoordinator;
  readonly prime: PrimeAgent;
  readonly ledger: HashChainLedger;
  readonly eliability: ELiabilityGraph;
  readonly operatorDid: DidDocument;
  readonly catalog: MissionSpec[];
  ctx: EarthCtx;
  private booted = false;
  private readonly completed = new Set<string>();
  private lastOutcome: SwarmOutcome | null = null;
  private step = 0;

  constructor(modules: {
    bus: EarthBus;
    compass: CompassGate;
    swarm: SwarmCoordinator;
    prime: PrimeAgent;
    ledger: HashChainLedger;
    eliability: ELiabilityGraph;
    operatorDid: DidDocument;
    catalog: MissionSpec[];
    ctx: EarthCtx;
  }) {
    this.bus = modules.bus;
    this.compass = modules.compass;
    this.swarm = modules.swarm;
    this.prime = modules.prime;
    this.ledger = modules.ledger;
    this.eliability = modules.eliability;
    this.operatorDid = modules.operatorDid;
    this.catalog = modules.catalog;
    this.ctx = modules.ctx;
  }

  get isBooted(): boolean {
    return this.booted;
  }

  boot(): void {
    if (this.booted) return;
    this.booted = true;
    this.bus.emit({
      type: 'runtime.booted',
      source: 'prime',
      message: 'EARTH sovereign runtime online',
      payload: {
        modules: ['bus', 'compass', 'swarm', 'prime', 'ledger', 'eliability'],
        did: this.operatorDid.id,
      },
    });
  }

  halt(reason = 'operator shutdown'): void {
    this.booted = false;
    this.bus.emit({
      type: 'runtime.halted',
      source: 'prime',
      message: reason,
      payload: { reason },
    });
  }

  pendingMissions(): MissionSpec[] {
    return this.catalog.filter((mission) => !this.completed.has(mission.id));
  }

  async runNextMission(): Promise<SwarmOutcome> {
    this.ensureBooted();
    const pending = this.pendingMissions();
    const decision = this.prime.decide({
      pendingMissions: pending,
      lastOutcome: this.lastOutcome,
      step: this.step,
    });
    return this.executeDecision(decision);
  }

  async runMissionById(missionId: string): Promise<SwarmOutcome> {
    this.ensureBooted();
    const mission = this.catalog.find((item) => item.id === missionId);
    if (!mission) throw new Error(`unknown mission ${missionId}`);
    const decision = this.prime.decide({
      pendingMissions: [mission],
      lastOutcome: this.lastOutcome,
      step: this.step,
    });
    return this.executeDecision(decision);
  }

  approveHitl(actionId: string): void {
    const next = new Set(this.ctx.hitlApprovals);
    next.add(actionId);
    this.ctx = { ...this.ctx, hitlApprovals: next };
    this.bus.emit({
      type: 'hitl.approved',
      source: this.ctx.actorDid,
      message: `HITL approved ${actionId}`,
      payload: { actionId },
    });
  }

  private async executeDecision(decision: ReturnType<PrimeAgent['decide']>): Promise<SwarmOutcome> {
    this.bus.emit({
      type: 'prime.decision',
      source: 'prime',
      message: decision.reason,
      payload: { ...decision },
    });

    const mission = this.catalog.find((item) => item.id === decision.missionId);
    if (!mission) throw new Error(`Prime selected unknown mission ${decision.missionId}`);

    const outcome = await this.swarm.run(mission, this.ctx);
    const trajectory = this.prime.recordOutcome(decision, outcome);
    await this.anchorTrajectory(trajectory, outcome);

    this.completed.add(mission.id);
    this.lastOutcome = outcome;
    this.step += 1;

    this.bus.emit({
      type: 'prime.trajectory.recorded',
      source: 'prime',
      message: `reward ${trajectory.reward}`,
      payload: {
        trajectoryId: trajectory.id,
        missionId: trajectory.missionId,
        reward: trajectory.reward,
      },
    });

    return outcome;
  }

  private async anchorTrajectory(trajectory: Trajectory, outcome: SwarmOutcome): Promise<void> {
    await this.ledger.append({
      kind: 'trajectory',
      trajectoryId: trajectory.id,
      missionId: trajectory.missionId,
      reward: trajectory.reward,
      status: outcome.status,
    });
    this.bus.emit({
      type: 'ledger.appended',
      source: 'ledger',
      message: `anchored ${trajectory.id}`,
      payload: { trajectoryId: trajectory.id },
    });
  }

  private ensureBooted(): void {
    if (!this.booted) this.boot();
  }
}
