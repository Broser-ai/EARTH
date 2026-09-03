import type { EarthBus } from '../bus/EarthBus.ts';
import type { CompassGate } from '../compass/CompassGate.ts';
import type { CapabilityTree } from '../swarm/capabilities.ts';
import type {
  AgentResult,
  CompassVerdict,
  EarthCtx,
  ProposedAction,
} from '../types.ts';

export interface AgentDeps {
  bus: EarthBus;
  compass: CompassGate;
  tree: CapabilityTree;
}

export interface SAgentOptions {
  id: string;
  capability: string;
  run: (action: ProposedAction, ctx: EarthCtx) => Promise<unknown>;
}

export class SAgent {
  readonly id: string;
  readonly capability: string;
  private readonly run: SAgentOptions['run'];

  constructor(options: SAgentOptions) {
    this.id = options.id;
    this.capability = options.capability;
    this.run = options.run;
  }

  async evaluateAndExecute(
    action: ProposedAction,
    ctx: EarthCtx,
    deps: AgentDeps,
  ): Promise<AgentResult> {
    deps.bus.emit({
      type: 'action.proposed',
      source: this.id,
      message: action.intent,
      payload: { actionId: action.id, capability: action.capability },
    });

    if (action.capability !== this.capability) {
      deps.bus.emit({
        type: 'agent.refused',
        source: this.id,
        message: `capability mismatch: ${action.capability}`,
        payload: { actionId: action.id },
      });
      return {
        agentId: this.id,
        actionId: action.id,
        status: 'refused',
        reason: `S-Agent ${this.id} is scoped to ${this.capability}`,
      };
    }

    if (!deps.tree.can(action.capability)) {
      return {
        agentId: this.id,
        actionId: action.id,
        status: 'refused',
        reason: `capability ${action.capability} is not on the EARTH tree`,
      };
    }

    const verdict = await deps.compass.evaluate(action, ctx);
    deps.bus.emit({
      type: 'compass.verdict',
      source: 'compass',
      message: verdict.allow ? 'COMPASS allow' : 'COMPASS block',
      payload: { actionId: action.id, allow: verdict.allow, digest: verdict.digest },
    });

    return this.executeAfterVerdict(action, ctx, deps, verdict);
  }

  async executeAfterVerdict(
    action: ProposedAction,
    ctx: EarthCtx,
    deps: AgentDeps,
    verdict: CompassVerdict,
    options?: { output?: unknown },
  ): Promise<AgentResult> {
    if (action.capability !== this.capability) {
      deps.bus.emit({
        type: 'agent.refused',
        source: this.id,
        message: `capability mismatch: ${action.capability}`,
        payload: { actionId: action.id },
      });
      return {
        agentId: this.id,
        actionId: action.id,
        status: 'refused',
        reason: `S-Agent ${this.id} is scoped to ${this.capability}`,
        verdict,
      };
    }

    if (!deps.tree.can(action.capability)) {
      return {
        agentId: this.id,
        actionId: action.id,
        status: 'refused',
        reason: `capability ${action.capability} is not on the EARTH tree`,
        verdict,
      };
    }

    if (!verdict.allow) {
      deps.bus.emit({
        type: 'agent.blocked',
        source: this.id,
        message: `blocked by COMPASS (${verdict.conflicts[0] ?? 'floor'})`,
        payload: { actionId: action.id },
      });
      return {
        agentId: this.id,
        actionId: action.id,
        status: 'blocked',
        verdict,
        reason: verdict.conflicts.join('; ') || 'COMPASS floor',
      };
    }

    if (verdict.requiresHitl && !ctx.hitlApprovals.has(action.id)) {
      deps.bus.emit({
        type: 'hitl.requested',
        source: this.id,
        message: `HITL required for ${action.id}`,
        payload: { actionId: action.id },
      });
      return {
        agentId: this.id,
        actionId: action.id,
        status: 'awaiting_hitl',
        verdict,
        reason: 'human-in-the-loop approval required',
      };
    }

    deps.bus.emit({
      type: 'agent.dispatched',
      source: this.id,
      message: `executing ${action.capability}`,
      payload: { actionId: action.id },
    });

    const output = options && 'output' in options ? options.output : await this.run(action, ctx);
    deps.bus.emit({
      type: 'agent.completed',
      source: this.id,
      message: `executed ${action.capability}`,
      payload: { actionId: action.id },
    });

    return {
      agentId: this.id,
      actionId: action.id,
      status: 'executed',
      verdict,
      output,
    };
  }
}
