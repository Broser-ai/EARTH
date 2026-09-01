import { useEffect, useRef, useState } from 'react';
import {
  Cpu,
  GitBranch,
  Eye,
  Terminal,
  TestTube2,
  Rocket,
  Play,
  Users,
  RefreshCcw,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';
import { SPECIALIST_CAPABILITIES } from '../sovereign/swarm/capabilities.ts';
import type { EarthEvent, EarthEventType } from '../sovereign/types.ts';
import { assertNever } from '../sovereign/types.ts';

type StageId =
  | 'LOCATE'
  | 'PLAN'
  | 'PLAN_REVIEW'
  | 'IMPLEMENT'
  | 'CODE_REVIEW'
  | 'TRIAL_EVALUATE'
  | 'VERDICT_DEPLOY';

const STAGES: { id: StageId; label: string; icon: typeof Cpu }[] = [
  { id: 'LOCATE', label: 'Prime', icon: Cpu },
  { id: 'PLAN', label: 'H-Agent', icon: GitBranch },
  { id: 'PLAN_REVIEW', label: 'COMPASS', icon: Eye },
  { id: 'IMPLEMENT', label: 'S-Agent', icon: Terminal },
  { id: 'CODE_REVIEW', label: 'Ledger', icon: Eye },
  { id: 'TRIAL_EVALUATE', label: 'Outcome', icon: TestTube2 },
  { id: 'VERDICT_DEPLOY', label: 'Trajectory', icon: Rocket },
];

type EventStatus = 'active' | 'success' | 'failure' | 'retry';

function stageFor(type: EarthEventType): StageId {
  switch (type) {
    case 'prime.decision':
      return 'LOCATE';
    case 'swarm.mission.started':
    case 'action.proposed':
      return 'PLAN';
    case 'compass.verdict':
    case 'hitl.requested':
    case 'hitl.approved':
    case 'hitl.rejected':
      return 'PLAN_REVIEW';
    case 'agent.dispatched':
      return 'IMPLEMENT';
    case 'ledger.appended':
    case 'agent.completed':
      return 'CODE_REVIEW';
    case 'agent.blocked':
    case 'agent.refused':
      return 'TRIAL_EVALUATE';
    case 'swarm.mission.completed':
    case 'prime.trajectory.recorded':
    case 'runtime.booted':
    case 'runtime.halted':
    case 'eliability.posted':
    case 'intake.recorded':
      return 'VERDICT_DEPLOY';
    default:
      return assertNever(type, 'unmapped swarm event');
  }
}

function statusFor(event: EarthEvent): EventStatus {
  if (event.type === 'agent.blocked' || event.type === 'agent.refused' || event.type === 'runtime.halted') {
    return 'failure';
  }
  if (event.type === 'hitl.requested') return 'retry';
  if (event.type === 'compass.verdict' && event.payload.allow === false) return 'failure';
  if (
    event.type === 'agent.completed' ||
    event.type === 'prime.trajectory.recorded' ||
    event.type === 'swarm.mission.completed'
  ) {
    return 'success';
  }
  return 'active';
}

const STATUS_COLOR: Record<EventStatus, string> = {
  active: 'text-accent border-accent/30 bg-accent/10',
  success: 'text-success border-success/30 bg-success/10',
  failure: 'text-danger border-danger/30 bg-danger/10',
  retry: 'text-amber border-amber/30 bg-amber/10',
};

function StatusIcon({ status }: { status: EventStatus }) {
  if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'failure') return <XCircle className="h-3.5 w-3.5" />;
  if (status === 'retry') return <RefreshCcw className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5 animate-pulse" />;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default function DevSwarm() {
  const { runtime, reset, generation } = useEarthRuntime();
  const [running, setRunning] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  void generation;

  const events = runtime.bus.history();
  const currentEvent = events.at(-1);
  const currentStage = currentEvent ? stageFor(currentEvent.type) : null;
  const lastStatus = currentEvent ? statusFor(currentEvent) : null;
  const trajectories = runtime.prime.trajectories();
  const blocked = trajectories.filter((row) => row.outcome.blocked > 0).length;
  const activeStageOrder = currentStage ? STAGES.findIndex((stage) => stage.id === currentStage) : -1;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  async function startEvolution() {
    if (running) return;
    setRunning(true);
    const live = reset();
    live.boot();
    while (live.pendingMissions().length > 0) {
      await live.runNextMission();
      await sleep(280);
    }
    setRunning(false);
  }

  return (
    <div className="flex w-full flex-col gap-6 text-text-primary">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-wide text-text-primary">DEV SWARM</h1>
          <p className="text-sm text-text-secondary">
            Prime → H-Agent → COMPASS → S-Agents. Catalog missions on the live bus.
          </p>
        </div>
        <button
          onClick={() => {
            void startEvolution();
          }}
          disabled={running}
          className={clsx(
            'flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs font-semibold tracking-wide transition-colors',
            running
              ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-text-muted'
              : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
          )}
        >
          <Play className="h-3.5 w-3.5" />
          {running ? 'SWARM RUNNING…' : 'RUN CATALOG'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="PIPELINE STAGE"
          value={currentStage ? currentStage.replace('_', ' ') : 'IDLE'}
          icon={Activity}
          accentClass={running ? 'text-accent' : 'text-text-muted'}
        />
        <StatCard
          label="TRAJECTORIES"
          value={String(trajectories.length)}
          icon={GitBranch}
          accentClass="text-success"
        />
        <StatCard label="BLOCKED" value={String(blocked)} icon={RefreshCcw} accentClass="text-amber" />
        <StatCard
          label="S-AGENTS"
          value={String(SPECIALIST_CAPABILITIES.length)}
          icon={Users}
          accentClass="text-accent"
        />
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-6 backdrop-blur">
        <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Prime / H-Agent / COMPASS / S-Agent
        </div>
        <div className="flex items-center">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isCurrent = currentStage === stage.id;
            const isPast = activeStageOrder > i && (running || events.length > 0);
            const isFailure = isCurrent && lastStatus === 'failure';
            return (
              <div key={stage.id} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    animate={isCurrent ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={{ repeat: isCurrent ? Infinity : 0, duration: 1.2 }}
                    className={clsx(
                      'flex h-11 w-11 items-center justify-center rounded-full border-2 font-mono text-sm',
                      isFailure && 'border-danger bg-danger/15 text-danger',
                      !isFailure &&
                        isCurrent &&
                        'border-accent bg-accent/15 text-accent shadow-[0_0_16px_rgba(96,165,250,0.4)]',
                      !isFailure && !isCurrent && isPast && 'border-success/60 bg-success/10 text-success',
                      !isFailure && !isCurrent && !isPast && 'border-white/10 bg-white/[0.02] text-text-muted',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.div>
                  <span
                    className={clsx(
                      'max-w-[80px] text-center font-mono text-[10px] leading-tight',
                      isCurrent ? 'text-accent' : isPast ? 'text-success' : 'text-text-muted',
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={clsx('mx-1 mb-5 h-[2px] flex-1', isPast ? 'bg-success/50' : 'bg-white/10')} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-text-muted">Swarm event bus</span>
          <span className="font-mono text-[11px] text-text-muted">{events.length} events</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto px-5 py-4">
          {events.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
              <Terminal className="h-6 w-6 text-text-muted" />
              <p className="text-sm text-text-secondary">
                Bus idle. RUN CATALOG dispatches Prime → H-Agent → S-Agents through COMPASS.
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {events.map((ev) => {
                const stage = stageFor(ev.type);
                const StageIcon = STAGES.find((item) => item.id === stage)?.icon ?? Cpu;
                const status = statusFor(ev);
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={clsx('flex items-start gap-3 rounded-md border px-3 py-2.5', STATUS_COLOR[status])}
                  >
                    <div className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-black/20">
                      <StageIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wide">
                        <span>{ev.type}</span>
                        <span className="flex items-center gap-1 rounded px-1.5 py-0.5">
                          <StatusIcon status={status} />
                          {status.toUpperCase()}
                        </span>
                        <span className="ml-auto font-normal normal-case text-text-muted">{ev.source}</span>
                      </div>
                      <p className="mt-1 font-sans text-[13px] leading-snug text-text-secondary">{ev.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  accentClass: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 backdrop-blur">
      <div className={clsx('flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.04]', accentClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{label}</span>
        <span className={clsx('font-mono text-sm font-semibold', accentClass)}>{value}</span>
      </div>
    </div>
  );
}
