import type { AgentResult, MissionStatus } from '../types.ts';
import { assertNever } from '../types.ts';
import type { EarthGraphHost } from './host.ts';
import { tick } from './host.ts';
import type { EarthGraphState, EarthGraphUpdate } from './state.ts';

function rollup(results: AgentResult[]): MissionStatus {
  if (results.some((row) => row.status === 'awaiting_hitl')) return 'awaiting_hitl';
  if (results.every((row) => row.status === 'executed')) return 'completed';
  return 'blocked';
}

function emitNode(host: EarthGraphHost, node: EarthGraphState['node'], summary: string): void {
  host.bus.emit({
    type: 'graph.node',
    source: 'langgraph',
    message: `${node}: ${summary}`,
    payload: { node, summary },
  });
}

export function createEarthGraphNodes(host: EarthGraphHost) {
  async function prime(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const requested = state.requestedMissionId;
    const pendingIds =
      requested != null
        ? [requested]
        : state.pendingMissionIds.length > 0
          ? state.pendingMissionIds
          : host.catalog.map((mission) => mission.id);
    const pending = pendingIds
      .map((id) => host.catalog.find((mission) => mission.id === id))
      .filter((mission): mission is NonNullable<typeof mission> => Boolean(mission));
    const decision = host.prime.decide({
      pendingMissions: pending,
      lastOutcome: state.lastOutcome,
      step: state.step,
    });
    const mission = host.catalog.find((item) => item.id === decision.missionId);
    if (!mission) throw new Error(`Prime selected unknown mission ${decision.missionId}`);

    host.bus.emit({
      type: 'prime.decision',
      source: 'prime',
      message: decision.reason,
      payload: { ...decision },
    });
    host.bus.emit({
      type: 'swarm.mission.started',
      source: host.swarm.harness.id,
      message: mission.title,
      payload: { missionId: mission.id, tasks: mission.tasks.length, graph: true },
    });
    emitNode(host, 'prime', decision.reason);
    return {
      node: 'prime',
      decision,
      mission,
      taskIndex: 0,
      ticks: [tick('prime', decision.reason)],
    };
  }

  async function hAgent(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const mission = state.mission;
    if (!mission) throw new Error('H-Agent node missing mission');
    const action = mission.tasks[state.taskIndex];
    if (!action) throw new Error(`H-Agent has no task at index ${state.taskIndex}`);
    const specialist = host.swarm.harness.specialist(action.capability);
    host.bus.emit({
      type: 'action.proposed',
      source: specialist?.id ?? host.swarm.harness.id,
      message: action.intent,
      payload: { actionId: action.id, capability: action.capability, graph: true },
    });
    const summary = `dispatch ${action.capability} → ${specialist?.id ?? 'none'}`;
    emitNode(host, 'h_agent', summary);
    return {
      node: 'h_agent',
      proposedAction: action,
      specialistId: specialist?.id ?? null,
      visionOutput: null,
      ticks: [tick('h_agent', summary)],
    };
  }

  async function compass(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const action = state.proposedAction;
    if (!action) throw new Error('COMPASS node missing proposed action');
    const verdict = await host.compass.evaluate(action, host.ctx);
    host.bus.emit({
      type: 'compass.verdict',
      source: 'compass',
      message: verdict.allow ? 'COMPASS allow' : 'COMPASS block',
      payload: { actionId: action.id, allow: verdict.allow, digest: verdict.digest, graph: true },
    });
    const summary = verdict.allow
      ? `allow ${action.id}`
      : `deny ${action.id} (${verdict.conflicts[0] ?? 'floor'})`;
    emitNode(host, 'compass', summary);
    return {
      node: 'compass',
      verdict,
      ticks: [tick('compass', summary)],
    };
  }

  async function vision(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const action = state.proposedAction;
    if (!action) throw new Error('vision node missing proposed action');
    const output = await host.vision.inferFromAction(action);
    emitNode(host, 'vision', `infer ${action.id}`);
    return {
      node: 'vision',
      visionOutput: output,
      ticks: [tick('vision', `infer ${action.id}`)],
    };
  }

  async function sAgent(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const action = state.proposedAction;
    const verdict = state.verdict;
    if (!action || !verdict) throw new Error('S-Agent node missing action or verdict');
    const specialist = host.swarm.harness.specialist(action.capability);
    const deps = { bus: host.bus, compass: host.compass, tree: host.swarm.tree };

    let result: AgentResult;
    if (!specialist) {
      result = {
        agentId: host.swarm.harness.id,
        actionId: action.id,
        status: 'refused',
        reason: `no specialist owns ${action.capability}`,
        verdict,
      };
      host.bus.emit({
        type: 'agent.refused',
        source: host.swarm.harness.id,
        message: result.reason ?? 'refused',
        payload: { actionId: action.id },
      });
    } else {
      const precomputed = action.capability === 'vision.infer' && state.visionOutput != null;
      result = await specialist.executeAfterVerdict(
        action,
        host.ctx,
        deps,
        verdict,
        precomputed ? { output: state.visionOutput } : undefined,
      );
    }

    const summary = `${result.status} ${action.id}`;
    emitNode(host, 's_agent', summary);
    return {
      node: 's_agent',
      results: [result],
      taskIndex: state.taskIndex + 1,
      proposedAction: null,
      ticks: [tick('s_agent', summary)],
    };
  }

  async function ledger(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const mission = state.mission;
    const decision = state.decision;
    if (!mission || !decision) throw new Error('ledger node missing mission or decision');
    const executed = state.results.filter((row) => row.status === 'executed').length;
    const blocked = state.results.filter(
      (row) => row.status === 'blocked' || row.status === 'refused',
    ).length;
    const awaitingHitl = state.results.filter((row) => row.status === 'awaiting_hitl').length;
    const outcome = {
      missionId: mission.id,
      status: rollup(state.results),
      executed,
      blocked,
      awaitingHitl,
    };
    const trajectory = host.prime.recordOutcome(decision, outcome, {
      lessonId: host.inkling.currentLesson()?.id,
    });
    await host.ledger.append({
      kind: 'trajectory',
      trajectoryId: trajectory.id,
      missionId: trajectory.missionId,
      reward: trajectory.reward,
      status: outcome.status,
    });
    host.bus.emit({
      type: 'swarm.mission.completed',
      source: host.swarm.harness.id,
      message: `${mission.title} → ${outcome.status}`,
      payload: { ...outcome, graph: true },
    });
    host.bus.emit({
      type: 'ledger.appended',
      source: 'ledger',
      message: `anchored ${trajectory.id}`,
      payload: { trajectoryId: trajectory.id, graph: true },
    });
    host.bus.emit({
      type: 'prime.trajectory.recorded',
      source: 'prime',
      message: `reward ${trajectory.reward}`,
      payload: {
        trajectoryId: trajectory.id,
        missionId: trajectory.missionId,
        reward: trajectory.reward,
        lessonId: trajectory.lessonId ?? null,
        trained: decision.trained,
        trainedLabel: decision.trainedLabel,
        graph: true,
      },
    });
    emitNode(host, 'ledger', `anchored ${trajectory.id} reward=${trajectory.reward}`);
    return {
      node: 'ledger',
      outcome,
      trajectory,
      ticks: [tick('ledger', `anchored ${trajectory.id}`)],
    };
  }

  async function tinker(state: EarthGraphState): Promise<EarthGraphUpdate> {
    const trajectories = host.prime.trajectories();
    await host.tinker.submit(trajectories, host.inkling.currentLesson());
    emitNode(host, 'tinker', `submit samples=${trajectories.length}`);
    return {
      node: 'tinker',
      ticks: [tick('tinker', `submit samples=${trajectories.length}`)],
    };
  }

  async function inkling(state: EarthGraphState): Promise<EarthGraphUpdate> {
    if (state.trajectory) {
      host.inkling.observe(state.trajectory);
    }
    emitNode(host, 'inkling', host.inkling.currentLesson()?.id ?? 'no-lesson');
    return {
      node: 'inkling',
      ticks: [tick('inkling', host.inkling.currentLesson()?.id ?? 'no-lesson')],
    };
  }

  function routeAfterCompass(state: EarthGraphState): 'vision' | 's_agent' {
    if (state.verdict?.allow && state.proposedAction?.capability === 'vision.infer') {
      return 'vision';
    }
    return 's_agent';
  }

  function routeAfterSAgent(state: EarthGraphState): 'h_agent' | 'ledger' {
    const remaining = (state.mission?.tasks.length ?? 0) - state.taskIndex;
    return remaining > 0 ? 'h_agent' : 'ledger';
  }

  function routeAfterLedger(state: EarthGraphState): 'tinker' | 'inkling' {
    return state.submitTinker ? 'tinker' : 'inkling';
  }

  function assertRoute(
    value: 'vision' | 's_agent' | 'h_agent' | 'ledger' | 'tinker' | 'inkling',
  ): typeof value {
    switch (value) {
      case 'vision':
      case 's_agent':
      case 'h_agent':
      case 'ledger':
      case 'tinker':
      case 'inkling':
        return value;
      default:
        return assertNever(value, 'unhandled graph route');
    }
  }

  return {
    prime,
    hAgent,
    compass,
    vision,
    sAgent,
    ledger,
    tinker,
    inkling,
    routeAfterCompass: (state: EarthGraphState) => assertRoute(routeAfterCompass(state)),
    routeAfterSAgent: (state: EarthGraphState) => assertRoute(routeAfterSAgent(state)),
    routeAfterLedger: (state: EarthGraphState) => assertRoute(routeAfterLedger(state)),
  };
}
