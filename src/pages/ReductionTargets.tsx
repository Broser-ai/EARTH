import { useMemo } from 'react';
import clsx from 'clsx';
import {
  Target,
  Plus,
  BadgeCheck,
  Thermometer,
  CalendarClock,
  TrendingDown,
  Wallet,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Sun,
  Truck,
  Handshake,
  Factory,
  Leaf,
  Recycle,
  LineChart,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrackStatus = 'on-track' | 'behind' | 'off-track';
type InitiativeStatus = 'Complete' | 'Active' | 'In progress' | 'Planning';
type ValidationStatus = 'Submitted' | 'Under review' | 'Validated';

interface TargetRow {
  target: string;
  scope: string;
  baseYear: number;
  current: number;
  goal: number;
  reductionNeeded: number;
  progressPct: number;
  deadline: number;
  status: TrackStatus;
}

interface Initiative {
  name: string;
  icon: typeof Sun;
  reduction: string;
  investment: string;
  status: InitiativeStatus;
  timeline: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TARGET_ROWS: TargetRow[] = [
  {
    target: 'Near-term 2030',
    scope: 'Scope 1+2',
    baseYear: 8420,
    current: 6350,
    goal: 4884,
    reductionNeeded: -42,
    progressPct: 24.6,
    deadline: 2030,
    status: 'behind',
  },
  {
    target: 'Near-term 2030',
    scope: 'Scope 3',
    baseYear: 12847,
    current: 8497,
    goal: 9010,
    reductionNeeded: -29.9,
    progressPct: 53.8,
    deadline: 2030,
    status: 'on-track',
  },
  {
    target: 'Long-term 2045',
    scope: 'All scopes',
    baseYear: 21267,
    current: 14847,
    goal: 2127,
    reductionNeeded: -90,
    progressPct: 30.2,
    deadline: 2045,
    status: 'off-track',
  },
];

const INITIATIVES: Initiative[] = [
  {
    name: 'Solar PV on 120 locations',
    icon: Sun,
    reduction: '-1,200 tCO2e/yr',
    investment: '€4.2M',
    status: 'In progress',
    timeline: '2025-2027',
  },
  {
    name: 'Fleet electrification (phase 1)',
    icon: Truck,
    reduction: '-480 tCO2e/yr',
    investment: '€2.8M',
    status: 'Planning',
    timeline: '2026-2028',
  },
  {
    name: 'Supplier engagement program',
    icon: Handshake,
    reduction: '-2,100 tCO2e/yr',
    investment: '€340k',
    status: 'Active',
    timeline: 'Ongoing',
  },
  {
    name: 'Energy efficiency retrofits',
    icon: Factory,
    reduction: '-890 tCO2e/yr',
    investment: '€1.6M',
    status: 'Complete',
    timeline: '2024-2025',
  },
  {
    name: 'Green electricity contracts',
    icon: Leaf,
    reduction: '-3,412 tCO2e/yr',
    investment: '€180k/yr',
    status: 'Active',
    timeline: '2025+',
  },
  {
    name: 'Circular packaging redesign',
    icon: Recycle,
    reduction: '-310 tCO2e/yr',
    investment: '€620k',
    status: 'Planning',
    timeline: '2027-2029',
  },
];

const VALIDATION_STEPS: { label: ValidationStatus; date: string }[] = [
  { label: 'Submitted', date: '2026-02-14' },
  { label: 'Under review', date: 'In progress' },
  { label: 'Validated', date: 'Pending' },
];

const CURRENT_VALIDATION: ValidationStatus = 'Under review';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

function statusColor(status: TrackStatus): string {
  return status === 'on-track' ? '#34D399' : status === 'behind' ? '#F59E0B' : '#EF4444';
}

function statusLabel(status: TrackStatus): string {
  return status === 'on-track' ? 'On track' : status === 'behind' ? 'Behind' : 'Significantly behind';
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur', className)}>
      {children}
    </div>
  );
}

function InitiativeStatusBadge({ status }: { status: InitiativeStatus }) {
  const styles: Record<InitiativeStatus, string> = {
    Complete: 'border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]',
    Active: 'border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA]',
    'In progress': 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
    Planning: 'border-white/10 bg-white/[0.04] text-[#94A3B8]',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide',
        styles[status]
      )}
    >
      {status}
    </span>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-[80px] overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[11px] font-semibold" style={{ color }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReductionTargets() {
  const overallProgress = useMemo(() => {
    const baseYear = 2020;
    const targetYear = 2045;
    const nowYear = 2026;
    const timePct = ((nowYear - baseYear) / (targetYear - baseYear)) * 100;
    return timePct;
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#060B18] px-6 py-6 text-[#F1F5F9]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-[#F1F5F9]">
            REDUCTION TARGETS
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Science-based targets aligned with the SBTi Corporate Net-Zero Standard
          </p>
        </div>
        <button
          className={clsx(
            'flex items-center gap-2 rounded-md border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-4 py-2',
            'font-mono text-xs font-semibold tracking-wide text-[#60A5FA] transition-colors hover:bg-[#60A5FA]/20'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Set new target
        </button>
      </div>

      {/* Overall target card */}
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[#60A5FA]/10">
              <Target className="h-6 w-6 text-[#60A5FA]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-xl font-bold text-[#F1F5F9]">Net zero by 2045</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#34D399]">
                  <BadgeCheck className="h-3 w-3" />
                  SBTi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[#60A5FA]">
                  <Thermometer className="h-3 w-3" />
                  1.5°C aligned
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 font-mono text-[11px] text-[#94A3B8]">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-[#475569]" />
                  Base year 2020
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#475569]" />
                  25-year horizon · target 2045
                </span>
              </div>
            </div>
          </div>

          <div className="min-w-[220px] flex-1 sm:flex-none sm:w-72">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wide text-[#475569]">
                Current progress
              </span>
              <span className="font-mono text-sm font-bold text-[#F59E0B]">30.2% achieved</span>
            </div>
            <ProgressBar pct={30.2} color="#F59E0B" />
            <div className="mt-2 flex items-baseline justify-between font-mono text-[10px] text-[#475569]">
              <span>Time elapsed since base year</span>
              <span>{overallProgress.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Target breakdown */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
          <TrendingDown className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
            TARGET BREAKDOWN
          </span>
          <span className="ml-auto font-mono text-[10px] text-[#475569]">
            {TARGET_ROWS.length} active targets
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Scope</th>
                <th className="px-4 py-2.5 text-right font-medium">Base year (tCO2e)</th>
                <th className="px-4 py-2.5 text-right font-medium">Current (tCO2e)</th>
                <th className="px-4 py-2.5 text-right font-medium">Target (tCO2e)</th>
                <th className="px-4 py-2.5 text-right font-medium">Reduction needed</th>
                <th className="px-4 py-2.5 font-medium">Progress</th>
                <th className="px-4 py-2.5 text-right font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {TARGET_ROWS.map((row) => {
                const color = statusColor(row.status);
                return (
                  <tr key={`${row.target}-${row.scope}`} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#F1F5F9]">{row.target}</td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{row.scope}</td>
                    <td className="px-4 py-2.5 text-right text-[#94A3B8]">{fmt(row.baseYear)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#F1F5F9]">{fmt(row.current)}</td>
                    <td className="px-4 py-2.5 text-right text-[#94A3B8]">{fmt(row.goal)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color }}>
                      {row.reductionNeeded}%
                    </td>
                    <td className="px-4 py-2.5">
                      <ProgressBar pct={row.progressPct} color={color} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                          title={statusLabel(row.status)}
                        />
                        <span className="text-[#94A3B8]">{row.deadline}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-white/5 px-4 py-2.5 font-mono text-[10px] text-[#475569]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" /> On track
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" /> Behind
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" /> Significantly behind
          </span>
        </div>
      </Card>

      {/* Reduction initiatives */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
          <Wallet className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
            REDUCTION INITIATIVES
          </span>
          <span className="ml-auto font-mono text-[10px] text-[#475569]">
            {INITIATIVES.length} initiatives in portfolio
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                <th className="px-4 py-2.5 font-medium">Initiative</th>
                <th className="px-4 py-2.5 text-right font-medium">Expected reduction</th>
                <th className="px-4 py-2.5 text-right font-medium">Investment</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Timeline</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {INITIATIVES.map((row) => {
                const Icon = row.icon;
                return (
                  <tr key={row.name} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 text-[#F1F5F9]">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#60A5FA]/10">
                          <Icon className="h-3.5 w-3.5 text-[#60A5FA]" />
                        </div>
                        {row.name}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#34D399]">{row.reduction}</td>
                    <td className="px-4 py-2.5 text-right text-[#94A3B8]">{row.investment}</td>
                    <td className="px-4 py-2.5">
                      <InitiativeStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{row.timeline}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trajectory visualization placeholder */}
        <Card className="p-4 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-3.5 w-3.5 text-[#60A5FA]" />
            <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
              EMISSIONS TRAJECTORY
            </span>
            <span className="ml-auto font-mono text-[10px] text-[#475569]">
              Actual vs. SBTi-required linear pathway
            </span>
          </div>
          <div className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-white/10 bg-white/[0.02]">
            <LineChart className="h-8 w-8 text-[#475569]" />
            <p className="font-mono text-xs text-[#94A3B8]">
              Trajectory chart — actual reduction path vs. required 1.5°C pathway
            </p>
            <p className="font-mono text-[10px] text-[#475569]">
              2020 base year → 2030 near-term → 2045 net zero
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] text-[#475569]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-full bg-[#60A5FA]" /> Actual emissions
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 rounded-full bg-[#475569]" /> Required trajectory
            </span>
          </div>
        </Card>

        {/* SBTi validation status */}
        <Card className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#60A5FA]" />
            <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
              SBTi VALIDATION STATUS
            </span>
          </div>
          <div className="space-y-3">
            {VALIDATION_STEPS.map((step, idx) => {
              const isCurrent = step.label === CURRENT_VALIDATION;
              const isDone =
                VALIDATION_STEPS.findIndex((s) => s.label === CURRENT_VALIDATION) > idx;
              const color = isDone ? '#34D399' : isCurrent ? '#F59E0B' : '#475569';
              return (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                    style={{ borderColor: `${color}55`, backgroundColor: `${color}1A` }}
                  >
                    {isDone ? (
                      <BadgeCheck className="h-3.5 w-3.5" style={{ color }} />
                    ) : isCurrent ? (
                      <AlertTriangle className="h-3 w-3" style={{ color }} />
                    ) : (
                      <Clock className="h-3 w-3" style={{ color }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-xs font-semibold" style={{ color: isCurrent ? '#F1F5F9' : '#94A3B8' }}>
                      {step.label}
                    </p>
                    <p className="font-mono text-[10px] text-[#475569]">{step.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3">
            <p className="font-mono text-[10px] leading-relaxed text-[#94A3B8]">
              Near- and long-term targets submitted for SBTi validation against the 1.5°C
              Corporate Net-Zero Standard. Expected decision within 30 business days.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
