import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScopeId = 'all' | 'scope1' | 'scope2' | 'scope3';
type DataQuality = 'High' | 'Medium' | 'Low' | 'N/A';
type MethodTone = 'measured' | 'calculated' | 'estimated' | 'na';

interface Scope1Row {
  source: string;
  activity: string;
  factor: string;
  emissions: number;
  method: string;
  quality: DataQuality;
}

interface Scope3Row {
  cat: number;
  name: string;
  description: string;
  emissions: number;
  method: string;
  confidence: DataQuality;
}

// ---------------------------------------------------------------------------
// Data — internally reconciled so every subtotal ties out to the headline
// scope totals (accounting-grade: no orphaned rounding).
// ---------------------------------------------------------------------------

const SCOPE_TOTALS = {
  scope1: { value: 2140, pct: 14.4, color: '#EF4444', label: 'Direct emissions' },
  scope2: { value: 4210, pct: 28.3, color: '#F59E0B', label: 'Energy indirect' },
  scope3: { value: 8497, pct: 57.2, color: '#60A5FA', label: 'Value chain' },
};

const SCOPE1_ROWS: Scope1Row[] = [
  {
    source: 'Natural gas (heating)',
    activity: '4,703 MWh',
    factor: '0.202 kgCO2/kWh',
    emissions: 950.0,
    method: 'Measured',
    quality: 'High',
  },
  {
    source: 'Fleet diesel',
    activity: '216,400 L',
    factor: '2.68 kgCO2/L',
    emissions: 580.0,
    method: 'Measured',
    quality: 'High',
  },
  {
    source: 'Refrigerants (R-410A leakage)',
    activity: '143.7 kg',
    factor: '2,088 GWP',
    emissions: 300.0,
    method: 'Estimated',
    quality: 'Medium',
  },
  {
    source: 'Fugitive emissions (SF6, switchgear)',
    activity: '5.16 kg',
    factor: '25,200 GWP',
    emissions: 130.0,
    method: 'Estimated',
    quality: 'Low',
  },
  {
    source: 'On-site backup generators (diesel)',
    activity: '37,310 L',
    factor: '2.68 kgCO2/L',
    emissions: 100.0,
    method: 'Measured',
    quality: 'High',
  },
  {
    source: 'LPG forklifts',
    activity: '52,980 L',
    factor: '1.51 kgCO2/L',
    emissions: 80.0,
    method: 'Measured',
    quality: 'Medium',
  },
];

const SCOPE1_SUBTOTAL = SCOPE1_ROWS.reduce((s, r) => s + r.emissions, 0);

const SCOPE2_ELECTRICITY = {
  activity: '18,400 MWh',
  locationFactor: '0.198 kgCO2/kWh',
  locationBased: 3643.0,
  marketFactor: '0.118 kgCO2/kWh (blended residual mix)',
  marketBased: 2180.0,
  renewablePct: 62,
};

const SCOPE2_HEATING = {
  activity: '12,600 MWh',
  locationFactor: '0.045 kgCO2/kWh',
  locationBased: 567.0,
  marketBased: 567.0, // no market instruments available for district heat
};

const SCOPE2_LOCATION_TOTAL = SCOPE2_ELECTRICITY.locationBased + SCOPE2_HEATING.locationBased;
const SCOPE2_MARKET_TOTAL = SCOPE2_ELECTRICITY.marketBased + SCOPE2_HEATING.marketBased;

const SCOPE3_ROWS: Scope3Row[] = [
  { cat: 1, name: 'Purchased goods & services', description: 'Cradle-to-gate emissions of purchased materials, components and services', emissions: 4218, method: 'Spend-based', confidence: 'Low' },
  { cat: 2, name: 'Capital goods', description: 'Emissions from production of capital equipment, machinery and buildings', emissions: 210, method: 'Spend-based', confidence: 'Low' },
  { cat: 3, name: 'Fuel- and energy-related activities', description: 'Upstream (well-to-tank) emissions of fuel and energy not in Scope 1/2', emissions: 145, method: 'Activity-based', confidence: 'Medium' },
  { cat: 4, name: 'Upstream transportation & distribution', description: 'Third-party freight and logistics moving goods to the company', emissions: 1847, method: 'Activity-based', confidence: 'Medium' },
  { cat: 5, name: 'Waste generated in operations', description: 'Disposal and treatment of waste generated at owned/operated facilities', emissions: 412, method: 'Measured', confidence: 'High' },
  { cat: 6, name: 'Business travel', description: 'Air, rail and road travel for business purposes', emissions: 287, method: 'Distance-based', confidence: 'Medium' },
  { cat: 7, name: 'Employee commuting', description: 'Employee travel between home and work', emissions: 847, method: 'Survey-based', confidence: 'Low' },
  { cat: 8, name: 'Upstream leased assets', description: 'Assets leased by the company, not already in Scope 1/2', emissions: 38, method: 'Activity-based', confidence: 'Medium' },
  { cat: 9, name: 'Downstream transportation & distribution', description: 'Transport and distribution of sold products after point of sale', emissions: 165, method: 'Activity-based', confidence: 'Medium' },
  { cat: 10, name: 'Processing of sold products', description: 'Processing by downstream companies of intermediate products sold', emissions: 0, method: 'Not applicable', confidence: 'N/A' },
  { cat: 11, name: 'Use of sold products', description: 'Direct use-phase emissions of products sold, over their lifetime', emissions: 210, method: 'Estimated', confidence: 'Low' },
  { cat: 12, name: 'End-of-life treatment of sold products', description: 'Disposal and treatment of sold products at end of life', emissions: 68, method: 'Estimated', confidence: 'Medium' },
  { cat: 13, name: 'Downstream leased assets', description: 'Assets owned by the company and leased to other entities', emissions: 12, method: 'Not applicable', confidence: 'N/A' },
  { cat: 14, name: 'Franchises', description: 'Emissions from operation of franchises not in Scope 1/2', emissions: 0, method: 'Not applicable', confidence: 'N/A' },
  { cat: 15, name: 'Investments', description: 'Proportional share of investee operational emissions', emissions: 38, method: 'Spend-based', confidence: 'Low' },
];

const SCOPE3_SUBTOTAL = SCOPE3_ROWS.reduce((s, r) => s + r.emissions, 0);

// Data-quality dashboard — three-bucket rollup across all 14,847 tCO2e
const QUALITY_BUCKETS = [
  { label: 'Measured', value: 6332, color: '#34D399', tone: 'measured' as MethodTone },
  { label: 'Calculated (activity / spend-based)', value: 7807, color: '#F59E0B', tone: 'calculated' as MethodTone },
  { label: 'Estimated', value: 708, color: '#EF4444', tone: 'estimated' as MethodTone },
];
const QUALITY_TOTAL = QUALITY_BUCKETS.reduce((s, b) => s + b.value, 0);

const RECOMMENDATIONS = [
  'Cat 1 (Purchased goods) is spend-based and Low confidence — 49.6% of Scope 3. Highest-leverage upgrade: supplier-specific PCF data for top 20 suppliers by spend.',
  'Cat 7 (Employee commuting) relies on annual survey — move to a rolling quarterly pulse survey to reduce estimation drift.',
  'Fugitive SF6 (Scope 1) is Low quality — install continuous leak-detection sensors on switchgear to convert to Measured.',
  'Cat 11 (Use of sold products) is Low confidence — commission a product-use energy study for the top 3 SKUs by volume.',
  'Scope 2 market-based reporting shows a 1,463 tCO2e reduction from 62% renewable procurement — expand PPA coverage toward 100% to compress this further.',
];

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmissionsScope() {
  const [activeScope, setActiveScope] = useState<ScopeId>('all');
  const { runtime } = useEarthRuntime();
  const spineTotal = runtime.eliability.asCarbonView().totalTCO2e;

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
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-[#F1F5F9]">
            SCOPE 1 / 2 / 3 BREAKDOWN
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Emission sources, calculation methods and data quality — GHG Protocol Corporate Standard
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-2 backdrop-blur">
          <Gauge className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-[11px] text-[#94A3B8]">Total inventory</span>
          <span className="font-mono text-sm font-bold text-[#F1F5F9]">{fmt(spineTotal)} tCO2e</span>
        </div>
      </div>

      {/* Scope selector tabs */}
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

      {/* Scope summary bar */}
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

        {/* Horizontal stacked bar */}
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
          <span>Total inventory: {fmt(spineTotal)} tCO2e across {SCOPE3_ROWS.length + 6 + 2} emission sources</span>
          <span>100%</span>
        </div>
      </Card>

      {/* Scope 1 detail */}
      {showScope1 && (
        <Card className="mb-6 overflow-hidden">
          <SectionHeader
            icon={Flame}
            color="#EF4444"
            title="Scope 1 — Direct emissions"
            subtitle={`${fmt(SCOPE1_SUBTOTAL)} tCO2e across ${SCOPE1_ROWS.length} sources`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                  <th className="px-4 py-2.5 font-medium">Source</th>
                  <th className="px-4 py-2.5 font-medium">Activity data</th>
                  <th className="px-4 py-2.5 font-medium">Emission factor</th>
                  <th className="px-4 py-2.5 text-right font-medium">Emissions (tCO2e)</th>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Data quality</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {SCOPE1_ROWS.map((row) => (
                  <tr key={row.source} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 text-[#F1F5F9]">{row.source}</td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{row.activity}</td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{row.factor}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#F1F5F9]">{fmt(row.emissions)}</td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{row.method}</td>
                    <td className="px-4 py-2.5">
                      <QualityBadge quality={row.quality} />
                    </td>
                  </tr>
                ))}
                <tr className="bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-semibold text-[#F1F5F9]" colSpan={3}>
                    Scope 1 total
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#EF4444]">{fmt(SCOPE1_SUBTOTAL)}</td>
                  <td className="px-4 py-2.5" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Scope 2 detail */}
      {showScope2 && (
        <Card className="mb-6 overflow-hidden">
          <SectionHeader
            icon={Zap}
            color="#F59E0B"
            title="Scope 2 — Energy indirect emissions"
            subtitle="Dual reporting per GHG Protocol Scope 2 Guidance"
          />
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
            <div className="rounded-md border border-white/5 p-4">
              <p className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
                Grid electricity
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[#475569]">
                Activity: {SCOPE2_ELECTRICITY.activity} · {SCOPE2_ELECTRICITY.renewablePct}% covered by renewable PPA / RECs
              </p>
              <div className="mt-3 space-y-2">
                <MethodRow
                  label="Location-based"
                  factor={SCOPE2_ELECTRICITY.locationFactor}
                  value={SCOPE2_ELECTRICITY.locationBased}
                  color="#F59E0B"
                />
                <MethodRow
                  label="Market-based"
                  factor={SCOPE2_ELECTRICITY.marketFactor}
                  value={SCOPE2_ELECTRICITY.marketBased}
                  color="#34D399"
                />
              </div>
            </div>
            <div className="rounded-md border border-white/5 p-4">
              <p className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
                District heating
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[#475569]">
                Activity: {SCOPE2_HEATING.activity} · no market instruments available for this supply
              </p>
              <div className="mt-3 space-y-2">
                <MethodRow
                  label="Location-based"
                  factor={SCOPE2_HEATING.locationFactor}
                  value={SCOPE2_HEATING.locationBased}
                  color="#F59E0B"
                />
                <MethodRow
                  label="Market-based"
                  factor="No supplier-specific instrument"
                  value={SCOPE2_HEATING.marketBased}
                  color="#94A3B8"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-white/5 px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                Location-based total
              </p>
              <p className="font-mono text-lg font-bold text-[#F59E0B]">{fmt(SCOPE2_LOCATION_TOTAL)} tCO2e</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                Market-based total
              </p>
              <p className="font-mono text-lg font-bold text-[#34D399]">{fmt(SCOPE2_MARKET_TOTAL)} tCO2e</p>
              <p className="mt-0.5 font-mono text-[10px] text-[#475569]">
                {fmt(SCOPE2_LOCATION_TOTAL - SCOPE2_MARKET_TOTAL)} tCO2e avoided via renewable procurement
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Scope 3 detail */}
      {showScope3 && (
        <Card className="mb-6 overflow-hidden">
          <SectionHeader
            icon={Globe2}
            color="#60A5FA"
            title="Scope 3 — Value chain emissions"
            subtitle={`All 15 GHG Protocol categories · ${fmt(SCOPE3_SUBTOTAL)} tCO2e`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium">Emissions (tCO2e)</th>
                  <th className="px-4 py-2.5 text-right font-medium">% of Scope 3</th>
                  <th className="px-4 py-2.5 font-medium">Method</th>
                  <th className="px-4 py-2.5 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {SCOPE3_ROWS.map((row) => {
                  const pct = (row.emissions / SCOPE3_SUBTOTAL) * 100;
                  return (
                    <tr key={row.cat} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#F1F5F9]">
                        <span className="mr-1.5 text-[#475569]">Cat {row.cat}</span>
                        {row.name}
                      </td>
                      <td className="max-w-[280px] px-4 py-2.5 text-[#94A3B8]">{row.description}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#F1F5F9]">
                        {row.emissions === 0 ? '—' : fmt(row.emissions)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#94A3B8]">
                        {row.emissions === 0 ? '—' : `${pct.toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-2.5 text-[#94A3B8]">{row.method}</td>
                      <td className="px-4 py-2.5">
                        <QualityBadge quality={row.confidence} />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-semibold text-[#F1F5F9]" colSpan={2}>
                    Scope 3 total
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#60A5FA]">{fmt(SCOPE3_SUBTOTAL)}</td>
                  <td className="px-4 py-2.5 text-right text-[#94A3B8]">100.0%</td>
                  <td className="px-4 py-2.5" colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Data quality dashboard */}
      <Card className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
            DATA QUALITY DASHBOARD
          </span>
          <span className="ml-auto font-mono text-[10px] text-[#475569]">
            {fmt(QUALITY_TOTAL)} tCO2e classified across Scope 1–3
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {QUALITY_BUCKETS.map((bucket) => {
            const pct = (bucket.value / QUALITY_TOTAL) * 100;
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
              IMPROVEMENT RECOMMENDATIONS
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function MethodRow({
  label,
  factor,
  value,
  color,
}: {
  label: string;
  factor: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-white/[0.02] px-2.5 py-2">
      <div>
        <p className="font-mono text-[11px] font-medium text-[#F1F5F9]">{label}</p>
        <p className="font-mono text-[10px] text-[#475569]">{factor}</p>
      </div>
      <p className="font-mono text-sm font-bold" style={{ color }}>
        {fmt(value)} tCO2e
      </p>
    </div>
  );
}
