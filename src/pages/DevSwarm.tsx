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

type StageId =
  | 'LOCATE'
  | 'PLAN'
  | 'PLAN_REVIEW'
  | 'IMPLEMENT'
  | 'CODE_REVIEW'
  | 'TRIAL_EVALUATE'
  | 'VERDICT_DEPLOY';

const STAGES: { id: StageId; label: string; icon: typeof Cpu }[] = [
  { id: 'LOCATE', label: 'Locate', icon: Cpu },
  { id: 'PLAN', label: 'Plan', icon: GitBranch },
  { id: 'PLAN_REVIEW', label: 'Plan Review', icon: Eye },
  { id: 'IMPLEMENT', label: 'Implement', icon: Terminal },
  { id: 'CODE_REVIEW', label: 'Code Review', icon: Eye },
  { id: 'TRIAL_EVALUATE', label: 'Trial Eval', icon: TestTube2 },
  { id: 'VERDICT_DEPLOY', label: 'Verdict / Deploy', icon: Rocket },
];

type EventStatus = 'active' | 'success' | 'failure' | 'retry';

interface LogEvent {
  id: string;
  stage: StageId;
  status: EventStatus;
  message: string;
  scenario: number;
}

interface ScenarioStep {
  stage: StageId;
  status: EventStatus;
  message: string;
}

interface Scenario {
  title: string;
  steps: ScenarioStep[];
}

const SCENARIOS: Scenario[] = [
  {
    title: 'CBAM Tax Calculator timeout in /api/tax/compute',
    steps: [
      { stage: 'LOCATE', status: 'active', message: 'Isolated fault to /api/tax/compute — upstream carbon-price fetch exceeds 30s budget.' },
      { stage: 'PLAN', status: 'active', message: 'Drafting fix: cache carbon-price lookups, add 8s timeout with fallback rate.' },
      { stage: 'PLAN_REVIEW', status: 'success', message: 'Plan approved — no regression risk to CBAM compliance logic.' },
      { stage: 'IMPLEMENT', status: 'active', message: 'Patched compute() with LRU cache + circuit breaker on price provider.' },
      { stage: 'CODE_REVIEW', status: 'success', message: 'Diff clean — matches EU CBAM Regulation 2023/956 tolerance bands.' },
      { stage: 'TRIAL_EVALUATE', status: 'success', message: 'Sandbox trial: 240/240 tax computations under 1.2s p99.' },
      { stage: 'VERDICT_DEPLOY', status: 'success', message: 'Verdict: SHIP. Deployed to production, rollback window armed.' },
    ],
  },
  {
    title: 'OCO Ontology mismatch on rPET classification',
    steps: [
      { stage: 'LOCATE', status: 'active', message: 'rPET (recycled PET) misclassified under virgin-plastic taxonomy node.' },
      { stage: 'PLAN', status: 'active', message: 'Proposing new OCO subclass: material.plastic.recycled.pet.' },
      { stage: 'PLAN_REVIEW', status: 'success', message: 'Plan approved by ontology reviewer agent.' },
      { stage: 'IMPLEMENT', status: 'active', message: 'Inserted subclass + migrated 1,204 existing product records.' },
      { stage: 'CODE_REVIEW', status: 'success', message: 'Ontology graph validated — no orphaned references.' },
      { stage: 'TRIAL_EVALUATE', status: 'failure', message: 'Trial FAILED — 12 legacy SKUs still resolve to ambiguous parent class.' },
      { stage: 'PLAN', status: 'retry', message: 'Self-correction: adding legacy-SKU alias table for pre-2024 taxonomy.' },
      { stage: 'IMPLEMENT', status: 'retry', message: 'Re-implementing with alias resolution layer.' },
      { stage: 'TRIAL_EVALUATE', status: 'success', message: 'Retry trial: 1,216/1,216 SKUs resolve correctly.' },
      { stage: 'VERDICT_DEPLOY', status: 'success', message: 'Verdict: SHIP after 1 self-correction cycle.' },
    ],
  },
  {
    title: 'COMPASS ethical score below threshold (0.31 < 0.40)',
    steps: [
      { stage: 'LOCATE', status: 'active', message: 'Supplier-scoring model returns 0.31 on labor-fairness axis — below gate.' },
      { stage: 'PLAN', status: 'active', message: 'Rebalancing feature weights: wage-ratio and audit-recency underweighted.' },
      { stage: 'PLAN_REVIEW', status: 'success', message: 'Ethics board agent approves reweighting within policy bounds.' },
      { stage: 'IMPLEMENT', status: 'active', message: 'Applied new weight vector to COMPASS scoring pipeline.' },
      { stage: 'CODE_REVIEW', status: 'success', message: 'No hardcoded overrides detected — score is fully model-derived.' },
      { stage: 'TRIAL_EVALUATE', status: 'success', message: 'Recomputed score: 0.47 — clears 0.40 threshold with margin.' },
      { stage: 'VERDICT_DEPLOY', status: 'success', message: 'Verdict: SHIP. COMPASS threshold gate re-armed.' },
    ],
  },
];

const STATUS_COLOR: Record<EventStatus, string> = {
  active: 'text-accent border-accent/30 bg-accent/10',
  success: 'text-success border-success/30 bg-success/10',
  failure: 'text-danger border-danger/30 bg-danger/10',
  retry: 'text-amber border-amber/30 bg-amber/10',
};

const STATUS_DOT: Record<EventStatus, string> = {
  active: 'bg-accent',
  success: 'bg-success',
  failure: 'bg-danger',
  retry: 'bg-amber',
};

function StatusIcon({ status }: { status: EventStatus }) {
  if (status === 'success') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'failure') return <XCircle className="h-3.5 w-3.5" />;
  if (status === 'retry') return <RefreshCcw className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5 animate-pulse" />;
}

export default function DevSwarm() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<StageId | null>(null);
  const [evolutionsRun, setEvolutionsRun] = useState(0);
  const [selfCorrections, setSelfCorrections] = useState(0);
  const [lastStatus, setLastStatus] = useState<EventStatus | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  function startEvolution() {
    if (running) return;
    setRunning(true);
    setEvents([]);
    setEvolutionsRun(0);
    setSelfCorrections(0);
    setLastStatus(null);
    setCurrentStage(null);

    let scenarioIdx = 0;
    let stepIdx = 0;
    let idCounter = 0;

    const tick = () => {
      const scenario = SCENARIOS[scenarioIdx];
      if (!scenario) {
        setRunning(false);
        setCurrentStage(null);
        return;
      }
      const step = scenario.steps[stepIdx];
      if (!step) {
        scenarioIdx += 1;
        stepIdx = 0;
        setEvolutionsRun((n) => n + 1);
        setTimeout(tick, 900);
        return;
      }

      idCounter += 1;
      setCurrentStage(step.stage);
      setLastStatus(step.status);
      if (step.status === 'retry') setSelfCorrections((n) => n + 1);
      setEvents((prev) => [
        ...prev,
        {
          id: `${scenarioIdx}-${stepIdx}-${idCounter}`,
          stage: step.stage,
          status: step.status,
          message: step.message,
          scenario: scenarioIdx,
        },
      ]);

      stepIdx += 1;
      setTimeout(tick, step.status === 'failure' ? 1400 : 950);
    };

    setTimeout(tick, 400);
  }

  const activeStageOrder = currentStage
    ? STAGES.findIndex((s) => s.id === currentStage)
    : -1;

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono text-lg font-bold tracking-wide text-text-primary">
              MOSS DEV SWARM MONITOR
            </h1>
            <p className="text-sm text-text-secondary">
              7-stage self-evolving pipeline · arXiv:2605.22794
            </p>
          </div>
          <button
            onClick={startEvolution}
            disabled={running}
            className={clsx(
              'flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xs font-semibold tracking-wide transition-colors',
              running
                ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-text-muted'
                : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20',
            )}
          >
            <Play className="h-3.5 w-3.5" />
            {running ? 'EVOLUTION RUNNING…' : 'START EVOLUTION'}
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="PIPELINE STAGE" value={currentStage ? currentStage.replace('_', ' ') : 'IDLE'} icon={Activity} accentClass={running ? 'text-accent' : 'text-text-muted'} />
          <StatCard label="EVOLUTIONS RUN" value={String(evolutionsRun)} icon={GitBranch} accentClass="text-success" />
          <StatCard label="SELF-CORRECTIONS" value={String(selfCorrections)} icon={RefreshCcw} accentClass="text-amber" />
          <StatCard label="DEV AGENTS" value="24" icon={Users} accentClass="text-accent" />
        </div>

        {/* Pipeline visualization */}
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-6 backdrop-blur">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Pipeline Stages
          </div>
          <div className="flex items-center">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isCurrent = currentStage === stage.id;
              const isPast = activeStageOrder > i && running;
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
                        !isFailure && isCurrent && 'border-accent bg-accent/15 text-accent shadow-[0_0_16px_rgba(96,165,250,0.4)]',
                        !isFailure && !isCurrent && isPast && 'border-success/60 bg-success/10 text-success',
                        !isFailure && !isCurrent && !isPast && 'border-white/10 bg-white/[0.02] text-text-muted',
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </motion.div>
                    <span className={clsx('max-w-[80px] text-center font-mono text-[10px] leading-tight', isCurrent ? 'text-accent' : isPast ? 'text-success' : 'text-text-muted')}>
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

        {/* Event log */}
        <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
              Evolution Event Log
            </span>
            <span className="font-mono text-[11px] text-text-muted">
              {events.length} events
            </span>
          </div>
          <div className="max-h-[440px] overflow-y-auto px-5 py-4">
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                <Terminal className="h-6 w-6 text-text-muted" />
                <p className="text-sm text-text-secondary">
                  No evolution cycles yet. Press START EVOLUTION to run the swarm.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {events.map((ev) => {
                  const StageIcon = STAGES.find((s) => s.id === ev.stage)?.icon ?? Cpu;
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={clsx(
                        'flex items-start gap-3 rounded-md border px-3 py-2.5',
                        STATUS_COLOR[ev.status],
                      )}
                    >
                      <div className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-black/20">
                        <StageIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wide">
                          <span>{ev.stage.replace('_', ' ')}</span>
                          <span className={clsx('flex items-center gap-1 rounded px-1.5 py-0.5', STATUS_DOT[ev.status] === 'bg-danger' ? 'bg-danger/20' : '')}>
                            <StatusIcon status={ev.status} />
                            {ev.status.toUpperCase()}
                          </span>
                          <span className="ml-auto font-normal normal-case text-text-muted">
                            scenario {ev.scenario + 1}/3
                          </span>
                        </div>
                        <p className="mt-1 font-sans text-[13px] leading-snug text-text-secondary">
                          {ev.message}
                        </p>
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
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: typeof Activity;
  accentClass: string;
}

function StatCard({ label, value, icon: Icon, accentClass }: StatCardProps) {
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
