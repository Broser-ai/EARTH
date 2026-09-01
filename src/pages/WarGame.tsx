import { useState, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Ban,
  PackageX,
  Users,
  TrendingUp,
  CheckCircle2,
  FileCheck2,
  Swords,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

type Severity = 'crisis' | 'warning' | 'resolution';

interface SimStep {
  id: string;
  label: string;
  title: string;
  detail: string;
  severity: Severity;
  icon: typeof AlertTriangle;
}

const STEPS: SimStep[] = [
  {
    id: 'horizon-scan',
    label: 'HORIZON SCAN',
    title: 'Regulatory shock detected',
    detail: 'EUDR zero-grace enforcement — severity 0.92',
    severity: 'crisis',
    icon: AlertTriangle,
  },
  {
    id: 'sentinel-alert',
    label: 'SENTINEL ALERT',
    title: 'Supplier SUP-BR-001 flagged',
    detail: 'Deforestation index 0.082 > threshold 0.05',
    severity: 'crisis',
    icon: ShieldAlert,
  },
  {
    id: 'compass-block',
    label: 'COMPASS BLOCK',
    title: 'Material batch MB-2026-0451 blocked',
    detail: 'Ethical score 0.31 — below compliance floor',
    severity: 'crisis',
    icon: Ban,
  },
  {
    id: 'shortage-alert',
    label: 'SHORTAGE ALERT',
    title: '15t production at risk',
    detail: '72h deadline to secure alternative supply',
    severity: 'warning',
    icon: PackageX,
  },
  {
    id: 'flash-mob',
    label: 'FLASH MOB',
    title: 'Coalition formed',
    detail: '3 verified suppliers assembled in 4.2s',
    severity: 'warning',
    icon: Users,
  },
  {
    id: 'green-premium',
    label: 'GREEN PREMIUM',
    title: 'Dynamic price computed',
    detail: '+12.4% premium, justified by CO2 offset',
    severity: 'warning',
    icon: TrendingUp,
  },
  {
    id: 'deal-settled',
    label: 'DEAL SETTLED',
    title: 'SUP-DE-044 accepted',
    detail: '15.2t rPET at €1,847/t',
    severity: 'resolution',
    icon: CheckCircle2,
  },
  {
    id: 'dpp-issued',
    label: 'DPP ISSUED',
    title: 'W3C DID credential anchored',
    detail: 'Full supply chain verified end-to-end',
    severity: 'resolution',
    icon: FileCheck2,
  },
];

const STEP_DELAY_MS = 1250;

const severityStyles: Record<Severity, { text: string; bg: string; border: string; dot: string }> = {
  crisis: { text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30', dot: 'bg-danger' },
  warning: { text: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/30', dot: 'bg-amber' },
  resolution: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/30', dot: 'bg-success' },
};

interface Kpi {
  label: string;
  value: string;
  accent: string;
}

const KPIS: Kpi[] = [
  { label: 'RESOLUTION TIME', value: '9.7s', accent: 'text-accent' },
  { label: 'NET SAVING', value: '+251K DKK', accent: 'text-success' },
  { label: 'CO2 PREVENTED', value: '18.5t', accent: 'text-success' },
  { label: 'COMPASS SCORE', value: '0.94', accent: 'text-accent' },
];

export default function WarGame() {
  const [running, setRunning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [complete, setComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback((next: number) => {
    if (next > STEPS.length) return;
    timerRef.current = setTimeout(() => {
      setVisibleCount(next);
      if (next === STEPS.length) {
        setComplete(true);
        setRunning(false);
      } else {
        scheduleNext(next + 1);
      }
    }, STEP_DELAY_MS);
  }, []);

  const triggerCrisis = useCallback(() => {
    clearTimer();
    setRunning(true);
    setComplete(false);
    setVisibleCount(0);
    scheduleNext(1);
  }, [clearTimer, scheduleNext]);

  const resetSim = useCallback(() => {
    clearTimer();
    setRunning(false);
    setComplete(false);
    setVisibleCount(0);
  }, [clearTimer]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      {/* Scenario brief */}
      <div className="rounded-lg border border-danger/20 bg-danger/[0.04] p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger/10">
            <Swords className="h-4.5 w-4.5 text-danger" />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-widest text-danger">
                SCENARIO: EUDR SHOCK
              </span>
              <span className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-danger">
                LIVE
              </span>
            </div>
            <p className="text-sm text-text-secondary">
              EUDR enforcement advanced with zero grace period. Horizon Scanner detects
              regulatory shock. Autonomous crisis response protocol is on standby.
            </p>
          </div>
        </div>
      </div>

      {/* Trigger controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={triggerCrisis}
          disabled={running}
          className={clsx(
            'flex items-center gap-2 rounded-md border px-5 py-2.5 font-mono text-xs font-bold tracking-widest transition-all',
            running
              ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-text-muted'
              : 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 hover:shadow-[0_0_20px_rgba(239,68,68,0.25)]'
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {running ? 'SIMULATION RUNNING…' : 'TRIGGER CRISIS'}
        </button>

        {(complete || (running && visibleCount > 0)) && (
          <button
            onClick={resetSim}
            className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] font-medium tracking-wider text-text-secondary transition-all hover:bg-white/[0.06] hover:text-text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            RESET
          </button>
        )}
      </div>

      {/* Timeline log */}
      <div className="min-h-[120px] rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        {visibleCount === 0 && (
          <div className="flex h-24 items-center justify-center font-mono text-xs text-text-muted">
            AWAITING TRIGGER — no active crisis
          </div>
        )}
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {STEPS.slice(0, visibleCount).map((step, idx) => {
              const s = severityStyles[step.severity];
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -32 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className={clsx(
                    'flex items-center gap-3 rounded-md border px-3 py-2.5',
                    s.bg,
                    s.border
                  )}
                >
                  <span className="font-mono text-[10px] text-text-muted">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <Icon className={clsx('h-4 w-4 shrink-0', s.text)} />
                  <div className="flex flex-1 flex-wrap items-baseline gap-x-2">
                    <span className={clsx('font-mono text-[11px] font-bold tracking-wider', s.text)}>
                      {step.label}
                    </span>
                    <span className="text-sm font-medium text-text-primary">{step.title}</span>
                    <span className="text-xs text-text-secondary">{step.detail}</span>
                  </div>
                  <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* KPI results */}
      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur"
              >
                <div className="mb-1.5 font-mono text-[10px] font-medium tracking-widest text-text-muted">
                  {kpi.label}
                </div>
                <div className={clsx('font-mono text-2xl font-bold', kpi.accent)}>{kpi.value}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline bar */}
      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        <div className="mb-3 font-mono text-[10px] font-medium tracking-widest text-text-muted">
          RESPONSE TIMELINE
        </div>
        <div className="relative flex items-center justify-between">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/5" />
          <div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-accent transition-all duration-500"
            style={{
              width: visibleCount === 0 ? '0%' : `${((visibleCount - 1) / (STEPS.length - 1)) * 100}%`,
            }}
          />
          {STEPS.map((step, idx) => {
            const active = idx < visibleCount;
            const s = severityStyles[step.severity];
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
                <span
                  className={clsx(
                    'h-2.5 w-2.5 rounded-full border-2 transition-all',
                    active
                      ? clsx(s.dot, s.border, 'shadow-[0_0_8px_rgba(96,165,250,0.5)]')
                      : 'border-white/10 bg-space-card'
                  )}
                />
                <span
                  className={clsx(
                    'hidden font-mono text-[8px] tracking-wider md:block',
                    active ? 'text-text-secondary' : 'text-text-muted'
                  )}
                >
                  {step.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
