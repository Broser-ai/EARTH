import type { MissionState, PolicyDecision, PolicySnapshot, PolicyTrainedLabel } from '../types.ts';
import type { RlPolicy } from './UntrainedRlPolicy.ts';

export const SESSION_RL_STORAGE_KEY = 'earth.prime.session-rl.v1';

interface StoredSession {
  logits: Record<string, number>;
  pulls: Record<string, number>;
  rewardSum: Record<string, number>;
  episodes: number;
}

export interface SessionRlPolicyOptions {
  catalogIds?: readonly string[];
  learningRate?: number;
  persist?: boolean;
  storageKey?: string;
  rng?: () => number;
}

function softmax(logits: number[]): number[] {
  if (logits.length === 0) return [];
  const max = Math.max(...logits);
  const exps = logits.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0);
  return exps.map((value) => value / sum);
}

function sampleIndex(probs: number[], rng: () => number): number {
  const draw = rng();
  let cursor = 0;
  for (let i = 0; i < probs.length; i += 1) {
    cursor += probs[i] ?? 0;
    if (draw <= cursor) return i;
  }
  return Math.max(0, probs.length - 1);
}

function readStore(key: string): StoredSession | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStore(key: string, value: StoredSession): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // session-only — ephemeral filesystem / private mode
  }
}

/**
 * In-memory softmax bandit over the mission catalog.
 * This is the live Prime policy until Inkling/Tinker weights exist.
 * Honest HUD label: trained=session-rl (not a STARK, not hosted Inkling).
 */
export class SessionRlPolicy implements RlPolicy {
  readonly kind = 'rl' as const;
  readonly trained = true;
  readonly trainedLabel: PolicyTrainedLabel = 'session-rl';
  private readonly learningRate: number;
  private readonly persist: boolean;
  private readonly storageKey: string;
  private readonly rng: () => number;
  private readonly logits = new Map<string, number>();
  private readonly pulls = new Map<string, number>();
  private readonly rewardSum = new Map<string, number>();
  private episodes = 0;

  constructor(options: SessionRlPolicyOptions = {}) {
    this.learningRate = options.learningRate ?? 0.35;
    this.persist = options.persist ?? typeof window !== 'undefined';
    this.storageKey = options.storageKey ?? SESSION_RL_STORAGE_KEY;
    this.rng = options.rng ?? Math.random;
    for (const id of options.catalogIds ?? []) {
      this.logits.set(id, 0);
      this.pulls.set(id, 0);
      this.rewardSum.set(id, 0);
    }
    if (this.persist) {
      const stored = readStore(this.storageKey);
      if (stored) this.hydrate(stored);
    }
  }

  select(state: MissionState): PolicyDecision {
    const pending = state.pendingMissions;
    if (pending.length === 0) {
      throw new Error('session-rl has no pending missions to select');
    }
    const probabilities = this.probabilitiesFor(pending.map((mission) => mission.id));
    const index = sampleIndex(
      pending.map((mission) => probabilities[mission.id] ?? 0),
      this.rng,
    );
    const chosen = pending[index];
    if (!chosen) {
      throw new Error('session-rl failed to sample a mission');
    }
    const p = probabilities[chosen.id] ?? 0;
    return {
      missionId: chosen.id,
      policyKind: 'rl',
      trained: true,
      trainedLabel: 'session-rl',
      reason: `session-rl softmax selected ${chosen.id} p=${p.toFixed(3)} (no Inkling/Tinker weights)`,
      probabilities,
    };
  }

  observe(decision: PolicyDecision, reward: number): void {
    this.episodes += 1;
    const selected = decision.missionId;
    this.pulls.set(selected, (this.pulls.get(selected) ?? 0) + 1);
    this.rewardSum.set(selected, (this.rewardSum.get(selected) ?? 0) + reward);

    const ids = new Set<string>([
      ...this.logits.keys(),
      selected,
      ...Object.keys(decision.probabilities ?? {}),
    ]);
    const idList = [...ids];
    const probs = this.probabilitiesFor(idList);

    for (const id of idList) {
      const pi = probs[id] ?? 0;
      const indicator = id === selected ? 1 : 0;
      const current = this.logits.get(id) ?? 0;
      this.logits.set(id, current + this.learningRate * reward * (indicator - pi));
    }
    this.flush();
  }

  probabilitiesFor(ids: readonly string[]): Record<string, number> {
    const logits = ids.map((id) => this.logits.get(id) ?? 0);
    const probs = softmax(logits);
    return Object.fromEntries(ids.map((id, i) => [id, probs[i] ?? 0]));
  }

  snapshot(pendingIds: readonly string[] = [...this.logits.keys()]): PolicySnapshot {
    const ids = pendingIds.length > 0 ? pendingIds : [...this.logits.keys()];
    const meanReward: Record<string, number> = {};
    for (const id of ids) {
      const pulls = this.pulls.get(id) ?? 0;
      meanReward[id] = pulls === 0 ? 0 : (this.rewardSum.get(id) ?? 0) / pulls;
    }
    return {
      trainedLabel: this.trainedLabel,
      episodes: this.episodes,
      logits: Object.fromEntries(ids.map((id) => [id, this.logits.get(id) ?? 0])),
      pulls: Object.fromEntries(ids.map((id) => [id, this.pulls.get(id) ?? 0])),
      meanReward,
      probabilities: this.probabilitiesFor(ids),
    };
  }

  private hydrate(stored: StoredSession): void {
    this.episodes = stored.episodes ?? 0;
    for (const [id, value] of Object.entries(stored.logits ?? {})) this.logits.set(id, value);
    for (const [id, value] of Object.entries(stored.pulls ?? {})) this.pulls.set(id, value);
    for (const [id, value] of Object.entries(stored.rewardSum ?? {})) this.rewardSum.set(id, value);
  }

  private flush(): void {
    if (!this.persist) return;
    writeStore(this.storageKey, {
      logits: Object.fromEntries(this.logits),
      pulls: Object.fromEntries(this.pulls),
      rewardSum: Object.fromEntries(this.rewardSum),
      episodes: this.episodes,
    });
  }
}
