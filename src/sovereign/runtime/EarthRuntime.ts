import { buildAdapterStatuses, type AdapterHudStatus } from '../adapters/status.ts';
import type { EarthSecretPresence } from '../config/env.ts';
import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import { EarthGraph } from '../graph/EarthGraph.ts';
import type { EarthGraphState } from '../graph/state.ts';
import type { ELiabilityGraph } from '../eliability/ELiabilityGraph.ts';
import type { HashChainLedger } from '../identity/HashChainLedger.ts';
import type { DidDocument } from '../identity/did.ts';
import type { InklingBrain } from '../prime/inkling/InklingBrain.ts';
import type { PrimeAgent } from '../prime/PrimeAgent.ts';
import type { TinkerTrainer } from '../prime/tinker/TinkerTrainer.ts';
import type { SwarmCoordinator } from '../swarm/SwarmCoordinator.ts';
import type { EarthCtx, MissionSpec, PolicySnapshot, SwarmOutcome } from '../types.ts';
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
  readonly graph: EarthGraph;
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
    this.graph = new EarthGraph(this);
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

  graphState(): EarthGraphState | null {
    return this.graph.snapshot();
  }

  policyStats(): PolicySnapshot {
    return this.prime.policyStats(this.catalog.map((mission) => mission.id));
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
        modules: [
          'bus',
          'compass',
          'swarm',
          'prime',
          'langgraph',
          'ledger',
          'eliability',
          'vision',
          'inkling',
          'tinker',
        ],
        did: this.operatorDid.id,
        adapters: adapters.map((row) => ({ id: row.id, link: row.link, trained: row.trained })),
        prime: this.prime.actingTrainedLabel(),
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
    if (pending.length === 0) {
      throw new Error('no pending missions');
    }
    const outcome = await this.graph.invokeMission({
      pendingMissionIds: pending.map((mission) => mission.id),
    });
    this.applyGraphOutcome(outcome);
    return outcome;
  }

  async runMissionById(missionId: string): Promise<SwarmOutcome> {
    this.ensureBooted();
    const mission = this.catalog.find((item) => item.id === missionId);
    if (!mission) throw new Error(`unknown mission ${missionId}`);
    const outcome = await this.graph.invokeMission({
      requestedMissionId: missionId,
      pendingMissionIds: [missionId],
    });
    this.applyGraphOutcome(outcome);
    return outcome;
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

  private applyGraphOutcome(outcome: SwarmOutcome): void {
    this.completed.add(outcome.missionId);
    this.lastOutcome = outcome;
    this.step += 1;
  }

  private ensureBooted(): void {
    if (!this.booted) this.boot();
  }
}
