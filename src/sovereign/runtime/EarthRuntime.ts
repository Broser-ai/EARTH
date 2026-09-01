import { buildAdapterStatuses, type AdapterHudStatus } from '../adapters/status.ts';
import type { EarthSecretPresence } from '../config/env.ts';
import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import type { ELiabilityGraph } from '../eliability/ELiabilityGraph.ts';
import type { HashChainLedger } from '../identity/HashChainLedger.ts';
import type { DidDocument } from '../identity/did.ts';
import type { InklingBrain } from '../prime/inkling/InklingBrain.ts';
import type { PrimeAgent } from '../prime/PrimeAgent.ts';
import type { TinkerTrainer } from '../prime/tinker/TinkerTrainer.ts';
import type { SwarmCoordinator } from '../swarm/SwarmCoordinator.ts';
import type { EarthCtx, MissionSpec, SwarmOutcome, Trajectory } from '../types.ts';
import type { RoboflowVisionAdapter } from '../vision/roboflow/RoboflowVisionAdapter.ts';

export class EarthRuntime {
  readonly bus: EarthBus;
  readonly compass: CompassGate;
  readonly swarm: SwarmCoordinator;
  readonly prime: PrimeAgent;
  readonly ledger: HashChainLedger;
  readonly eliability: ELiabilityGraph;
  readonly operatorDid: DidDocument;
  readonly catalog: MissionSpec[];
  readonly vision: RoboflowVisionAdapter;
  readonly inkling: InklingBrain;
  readonly tinker: TinkerTrainer;
  readonly secrets: EarthSecretPresence;
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
    vision: RoboflowVisionAdapter;
    inkling: InklingBrain;
    tinker: TinkerTrainer;
    secrets: EarthSecretPresence;
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
    this.vision = modules.vision;
    this.inkling = modules.inkling;
    this.tinker = modules.tinker;
    this.secrets = modules.secrets;
  }

  get isBooted(): boolean {
    return this.booted;
  }

  adapterStatus(): AdapterHudStatus[] {
    return buildAdapterStatuses({
      vision: this.vision,
      inkling: this.inkling,
      tinker: this.tinker,
      secrets: this.secrets,
    });
  }

  boot(): void {
    if (this.booted) return;
    this.booted = true;
    const adapters = this.adapterStatus();
    this.bus.emit({
      type: 'runtime.booted',
      source: 'prime',
      message: 'EARTH sovereign runtime online',
      payload: {
        modules: ['bus', 'compass', 'swarm', 'prime', 'ledger', 'eliability', 'vision', 'inkling', 'tinker'],
        did: this.operatorDid.id,
        adapters: adapters.map((row) => ({ id: row.id, link: row.link, trained: row.trained })),
      },
    });
    this.bus.emit({
      type: 'adapter.status',
      source: 'prime',
      message: adapters.map((row) => `${row.id}:${row.link}`).join(' '),
      payload: { adapters },
    });
    const lesson = this.inkling.currentLesson();
    if (lesson) {
      this.bus.emit({
        type: 'inkling.lesson.attached',
        source: 'prime.inkling',
        message: lesson.title,
        payload: { lessonId: lesson.id, concept: lesson.concept.kind, trained: this.inkling.trained() },
      });
    }
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
    const trajectory = this.prime.recordOutcome(decision, outcome, {
      lessonId: this.inkling.currentLesson()?.id,
    });
    this.inkling.observe(trajectory);
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
        lessonId: trajectory.lessonId ?? null,
        trained: decision.trained,
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
