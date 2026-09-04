import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Flame,
  Zap,
  Globe2,
  Layers,
  Gauge,
  Info,
  CheckCircle2,
  Calculator,
  HelpCircle,
} from 'lucide-react';
import {
  GHG_LINE_ITEMS,
  GHG_SCOPE_SHARE,
  GHG_SPINE,
} from '../demo/canonical';
import {
  demoGhgMethodHonesty,
  demoGhgMethodLabel,
  type DemoGhgLineItem,
  type DemoGhgMethod,
} from '../contracts';

type ScopeId = 'all' | 'scope1' | 'scope2' | 'scope3';
type DataQuality = 'High' | 'Medium' | 'Low' | 'N/A';
type MethodTone = 'measured' | 'calculated' | 'estimated';

interface SpineRow {
  id: string;
  name: string;
  description: string;
  emissions: number;
  method: string;
  honesty: 'ESTIMATED' | 'INPUT_UNVERIFIED';
  quality: DataQuality;
}

const SCOPE_TOTALS = {
  scope1: { value: GHG_SPINE.scope1, pct: GHG_SCOPE_SHARE.scope1Pct, color: '#EF4444', label: 'Direct emissions' },
  scope2: { value: GHG_SPINE.scope2, pct: GHG_SCOPE_SHARE.scope2Pct, color: '#F59E0B', label: 'Energy indirect' },
  scope3: { value: GHG_SPINE.scope3, pct: GHG_SCOPE_SHARE.scope3Pct, color: '#60A5FA', label: 'Value chain' },
};

const GRAND_TOTAL = GHG_SPINE.scope1 + GHG_SPINE.scope2 + GHG_SPINE.scope3;

const LINE_NOTES: Record<string, string> = {
  'spine-001': 'DEMO on-site combustion — synthetic, not metered',
  'spine-002': 'DEMO owned fleet — synthetic, not metered',
  'spine-003': 'DEMO refrigerant leak estimate — synthetic',
  'spine-004': 'DEMO purchased electricity — synthetic stand-in, not a location/market dual report',
  'spine-005': 'DEMO district heating — synthetic',
  'spine-006': 'DEMO spend-based stand-in — not supplier PCFs',
  'spine-007': 'DEMO upstream freight — synthetic',
  'spine-008': 'DEMO commuting estimate — synthetic',
  'spine-009': 'DEMO business travel — synthetic',
  'spine-010': 'DEMO waste — synthetic, not weighbridge data',
  'spine-011': 'DEMO downstream freight — synthetic',
  'spine-012': 'DEMO use-phase estimate — synthetic',
};

function qualityForMethod(method: DemoGhgMethod): DataQuality {
  switch (method) {
    case 'measured':
      return 'High';
    case 'calculated':
      return 'Medium';
    case 'estimated':
      return 'Low';
    default: {
      const exhaustive: never = method;
      return exhaustive;
    }
  }
}

function toSpineRow(item: DemoGhgLineItem): SpineRow {
  return {
    id: item.id,
    name: item.label,
    description: LINE_NOTES[item.id] ?? 'DEMO / INPUT_UNVERIFIED synthetic line',
    emissions: item.tCO2e,
    method: demoGhgMethodLabel(item.method),
    honesty: demoGhgMethodHonesty(item.method),
    quality: qualityForMethod(item.method),
  };
}

const SCOPE1_ROWS = GHG_LINE_ITEMS.filter((item) => item.scope === 'scope1').map(toSpineRow);
const SCOPE2_ROWS = GHG_LINE_ITEMS.filter((item) => item.scope === 'scope2').map(toSpineRow);
const SCOPE3_ROWS = GHG_LINE_ITEMS.filter((item) => item.scope === 'scope3').map(toSpineRow);

const SCOPE1_SUBTOTAL = SCOPE1_ROWS.reduce((sum, row) => sum + row.emissions, 0);
const SCOPE2_SUBTOTAL = SCOPE2_ROWS.reduce((sum, row) => sum + row.emissions, 0);
const SCOPE3_SUBTOTAL = SCOPE3_ROWS.reduce((sum, row) => sum + row.emissions, 0);

const QUALITY_BUCKETS = (['measured', 'calculated', 'estimated'] as const).map((tone) => {
  const value = GHG_LINE_ITEMS.filter((item) => item.method === tone).reduce(
    (sum, item) => sum + item.tCO2e,
    0,
  );
  const labels: Record<DemoGhgMethod, { label: string; color: string }> = {
    measured: { label: 'Measured (still INPUT_UNVERIFIED DEMO)', color: '#34D399' },
    calculated: { label: 'Calculated (DEMO)', color: '#F59E0B' },
    estimated: { label: 'Estimated (DEMO)', color: '#EF4444' },
  };
  return { ...labels[tone], value, tone: tone as MethodTone };
});
const QUALITY_TOTAL = QUALITY_BUCKETS.reduce((sum, bucket) => sum + bucket.value, 0);

const RECOMMENDATIONS = [
  'DEMO / INPUT_UNVERIFIED / synthetic. Unsuitable for reporting, tax, audit, customer, or investor use.',
  'Totals are scope1 + scope2 + scope3 from packages/earth-contracts. Not a GHG Protocol inventory.',
  'The in-tab kernel e-liability graph posts the same line items. Refresh wipes the graph. Not Neo4j.',
  'Do not treat these figures as Hornbach (or any tenant) inventory, CSRD E1-6 evidence, or ISO 14064.',
];

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: n % 1 === 0 ? 0 : 1 });
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur', className)}>
      {children}
    </div>
  );
}

function QualityBadge({ quality }: { quality: DataQuality }) {
  const styles: Record<DataQuality, string> = {
    High: 'border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399]',
    Medium: 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]',
    Low: 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]',
    'N/A': 'border-white/10 bg-white/[0.04] text-[#475569]',
  };
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide',
        styles[quality]
      )}
    >
      {quality}
    </span>
  );
}

export default function EmissionsScope() {
  const [activeScope, setActiveScope] = useState<ScopeId>('all');

  const tabs: { id: ScopeId; label: string }[] = [
    { id: 'all', label: 'All scopes' },
    { id: 'scope1', label: 'Scope 1' },
    { id: 'scope2', label: 'Scope 2' },
    { id: 'scope3', label: 'Scope 3' },
  ];

  const showScope1 = activeScope === 'all' || activeScope === 'scope1';
  const showScope2 = activeScope === 'all' || activeScope === 'scope2';
  const showScope3 = activeScope === 'all' || activeScope === 'scope3';

  const stackedSegments = useMemo(
    () => [
      { id: 'scope1', ...SCOPE_TOTALS.scope1 },
      { id: 'scope2', ...SCOPE_TOTALS.scope2 },
      { id: 'scope3', ...SCOPE_TOTALS.scope3 },
    ],
    []
  );

  return (
    <div className="min-h-screen w-full bg-[#060B18] px-6 py-6 text-[#F1F5F9]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-[#F1F5F9]">
            SCOPE 1 / 2 / 3 BREAKDOWN
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            DEMO / ESTIMATED / INPUT_UNVERIFIED synthetic inventory — not a verified disclosure
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-2 backdrop-blur">
          <Gauge className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-[11px] text-[#94A3B8]">DEMO total</span>
          <span className="font-mono text-sm font-bold text-[#F1F5F9]">{fmt(GRAND_TOTAL)} tCO2e</span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveScope(tab.id)}
            className={clsx(
              'rounded-md border px-4 py-2 font-mono text-xs font-semibold tracking-wide transition-all',
              activeScope === tab.id
                ? 'border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA]'
                : 'border-white/5 bg-white/[0.03] text-[#94A3B8] hover:border-white/10 hover:text-[#F1F5F9]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card className="mb-6 p-4">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ['scope1', 'Scope 1', SCOPE_TOTALS.scope1],
              ['scope2', 'Scope 2', SCOPE_TOTALS.scope2],
              ['scope3', 'Scope 3', SCOPE_TOTALS.scope3],
            ] as const
          ).map(([id, title, s]) => (
            <div
              key={id}
              className={clsx(
                'rounded-md border p-3 transition-colors',
                activeScope === id || activeScope === 'all' ? 'border-white/10' : 'border-white/5 opacity-50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="font-mono text-[11px] font-semibold tracking-wide text-[#F1F5F9]">{title}</span>
                <span className="ml-auto font-mono text-[10px] text-[#475569]">{s.label}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-xl font-bold" style={{ color: s.color }}>
                  {fmt(s.value)}
                </span>
                <span className="font-mono text-[11px] text-[#94A3B8]">tCO2e</span>
                <span className="ml-auto font-mono text-xs text-[#94A3B8]">{s.pct}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="h-4 w-full overflow-hidden rounded-full bg-white/5">
          <div className="flex h-full w-full">
            {stackedSegments.map((seg) => (
              <div
                key={seg.id}
                style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                className="h-full transition-opacity"
                title={`${seg.label}: ${seg.pct}%`}
              />
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-between font-mono text-[10px] text-[#475569]">
          <span>0%</span>
          <span>
            DEMO inventory: {fmt(GRAND_TOTAL)} tCO2e across {GHG_LINE_ITEMS.length} synthetic sources
          </span>
          <span>100%</span>
        </div>
      </Card>

      {showScope1 && (
        <ScopeTable
          icon={Flame}
          color="#EF4444"
          title="Scope 1 — Direct emissions"
          rows={SCOPE1_ROWS}
          subtotal={SCOPE1_SUBTOTAL}
          totalColor="#EF4444"
        />
      )}

      {showScope2 && (
        <ScopeTable
          icon={Zap}
          color="#F59E0B"
          title="Scope 2 — Energy indirect emissions"
          rows={SCOPE2_ROWS}
          subtotal={SCOPE2_SUBTOTAL}
          totalColor="#F59E0B"
        />
      )}

      {showScope3 && (
        <ScopeTable
          icon={Globe2}
          color="#60A5FA"
          title="Scope 3 — Value chain emissions"
          rows={SCOPE3_ROWS}
          subtotal={SCOPE3_SUBTOTAL}
          totalColor="#60A5FA"
        />
      )}

      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
            DATA QUALITY DASHBOARD
          </span>
          <span className="ml-auto font-mono text-[10px] text-[#475569]">
            {fmt(QUALITY_TOTAL)} tCO2e classified across Scope 1–3 · DEMO
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {QUALITY_BUCKETS.map((bucket) => {
            const pct = QUALITY_TOTAL === 0 ? 0 : (bucket.value / QUALITY_TOTAL) * 100;
            const Icon = bucket.tone === 'measured' ? CheckCircle2 : bucket.tone === 'calculated' ? Calculator : HelpCircle;
            return (
              <div key={bucket.label} className="rounded-md border border-white/5 p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color: bucket.color }} />
                  <span className="font-mono text-[11px] font-semibold text-[#F1F5F9]">{bucket.label}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-bold" style={{ color: bucket.color }}>
                    {pct.toFixed(1)}%
                  </span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">{fmt(bucket.value)} tCO2e</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: bucket.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-[#60A5FA]" />
            <span className="font-mono text-[11px] font-semibold tracking-wide text-[#F1F5F9]">
              HONESTY
            </span>
          </div>
          <ul className="space-y-2">
            {RECOMMENDATIONS.map((rec) => (
              <li key={rec} className="flex gap-2 text-xs text-[#94A3B8]">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[#60A5FA]" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

function ScopeTable({
  icon: Icon,
  color,
  title,
  rows,
  subtotal,
  totalColor,
}: {
  icon: typeof Flame;
  color: string;
  title: string;
  rows: SpineRow[];
  subtotal: number;
  totalColor: string;
}) {
  return (
    <Card className="mb-6 overflow-hidden">
      <SectionHeader
        icon={Icon}
        color={color}
        title={title}
        subtitle={`${fmt(subtotal)} tCO2e across ${rows.length} DEMO sources`}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
              <th className="px-4 py-2.5 font-medium">Source</th>
              <th className="px-4 py-2.5 font-medium">Note</th>
              <th className="px-4 py-2.5 text-right font-medium">Emissions (tCO2e)</th>
              <th className="px-4 py-2.5 font-medium">Method</th>
              <th className="px-4 py-2.5 font-medium">Honesty</th>
              <th className="px-4 py-2.5 font-medium">Data quality</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-2.5 text-[#F1F5F9]">{row.name}</td>
                <td className="max-w-[280px] px-4 py-2.5 text-[#94A3B8]">{row.description}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-[#F1F5F9]">{fmt(row.emissions)}</td>
                <td className="px-4 py-2.5 text-[#94A3B8]">{row.method}</td>
                <td className="px-4 py-2.5 text-[#94A3B8]">{row.honesty}</td>
                <td className="px-4 py-2.5">
                  <QualityBadge quality={row.quality} />
                </td>
              </tr>
            ))}
            <tr className="bg-white/[0.02]">
              <td className="px-4 py-2.5 font-semibold text-[#F1F5F9]" colSpan={2}>
                Scope total
              </td>
              <td className="px-4 py-2.5 text-right font-bold" style={{ color: totalColor }}>
                {fmt(subtotal)}
              </td>
              <td className="px-4 py-2.5" colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: typeof Flame;
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-white/5 px-4 py-3">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-md"
        style={{ backgroundColor: `${color}1A` }}
      >
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">{title}</span>
      <span className="ml-auto font-mono text-[10px] text-[#475569]">{subtitle}</span>
    </div>
  );
}
