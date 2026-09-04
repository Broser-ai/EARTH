import { useState } from 'react';
import clsx from 'clsx';
import { Download, Upload, Target, Shield, Leaf, BarChart3 } from 'lucide-react';
import TruthBadge from '../components/TruthBadge';
import { GHG_CATEGORIES, GHG_SCOPE_SHARE, GHG_SPINE, GHG_TOTAL, type HonestyLabel } from '../demo/canonical';

const SCOPES = [
  { name: 'Scope 1', label: 'Direct emissions', value: GHG_SPINE.scope1, pct: GHG_SCOPE_SHARE.scope1Pct, color: '#EF4444' },
  { name: 'Scope 2', label: 'Energy indirect', value: GHG_SPINE.scope2, pct: GHG_SCOPE_SHARE.scope2Pct, color: '#F59E0B' },
  { name: 'Scope 3', label: 'Value chain', value: GHG_SPINE.scope3, pct: GHG_SCOPE_SHARE.scope3Pct, color: '#60A5FA' },
];

const scopeColor: Record<string, string> = {
  'Scope 1': 'bg-[#EF4444]/10 text-[#EF4444]',
  'Scope 2': 'bg-[#F59E0B]/10 text-[#F59E0B]',
  'Scope 3': 'bg-[#60A5FA]/10 text-[#60A5FA]',
};

const honestyBadge: Record<HonestyLabel, string> = {
  DEMO: 'bg-white/5 text-[#94A3B8]',
  ESTIMATED: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  INPUT_UNVERIFIED: 'bg-white/5 text-[#94A3B8]',
};

const methodBadge: Record<string, string> = {
  'Measured': 'bg-[#34D399]/10 text-[#34D399]',
  'Calculated': 'bg-[#60A5FA]/10 text-[#60A5FA]',
  'Location-based': 'bg-[#F59E0B]/10 text-[#F59E0B]',
  'Spend-based': 'bg-white/5 text-[#94A3B8]',
  'Distance-based': 'bg-white/5 text-[#94A3B8]',
  'Survey': 'bg-white/5 text-[#94A3B8]',
  'Waste-type': 'bg-white/5 text-[#94A3B8]',
  'Average-data': 'bg-white/5 text-[#94A3B8]',
};

export default function CarbonAccounting() {
  const [period, setPeriod] = useState('H1 2026');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Carbon Accounting</h1>
          <p className="text-[11px] text-[#94A3B8]">
            DEMO inventory · GHG Protocol layout only · not ISO 14064 certified
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-md border border-white/[0.06] bg-[#0a1628] px-2.5 py-1.5 text-[11px] text-[#E2E8F0] outline-none">
            {['Q1 2026', 'Q2 2026', 'H1 2026', 'Annual 2026', 'Annual 2025'].map(p => <option key={p}>{p}</option>)}
          </select>
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#94A3B8]"><Upload size={12} />Import</button>
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#94A3B8]"><Download size={12} />Export</button>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-center">
        <p className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] flex items-center justify-center gap-1.5">
          Total Emissions
          <TruthBadge kind="ESTIMATED" className="px-1 py-0 text-[8px]" />
        </p>
        <p className="mt-1 font-mono text-3xl font-bold text-[#E2E8F0]">{GHG_TOTAL.toLocaleString()} <span className="text-sm text-[#94A3B8]">{GHG_SPINE.unit}</span></p>
        <p className="mt-0.5 text-[10px] font-mono text-[#94A3B8]">INPUT_UNVERIFIED · DEMO scenario · not a compliance figure</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SCOPES.map(s => (
          <div key={s.name} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-[#E2E8F0]">{s.name}</span>
              <span className="font-mono text-[9px]" style={{ color: s.color }}>{s.pct}%</span>
            </div>
            <p className="text-[9px] text-[#64748B] mb-1.5">{s.label}</p>
            <p className="font-mono text-lg font-bold text-[#E2E8F0]">{s.value.toLocaleString()} <span className="text-[10px] text-[#94A3B8]">tCO₂e</span></p>
            <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Emissions by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Category', 'Scope', 'Amount (tCO₂e)', 'Method', 'Honesty'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GHG_CATEGORIES.map((e, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0]">{e.category}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', scopeColor[e.scope])}>{e.scope}</span></td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{e.amount.toLocaleString()}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px]', methodBadge[e.method] ?? 'bg-white/5 text-[#94A3B8]')}>{e.method}</span></td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[8px] font-mono', honestyBadge[e.honesty])}>{e.honesty}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><Target size={10} />Reduction Targets</h3>
            <p className="text-[10px] text-[#E2E8F0] flex items-center gap-1.5">
              SBTi Near-term 2030
              <TruthBadge kind="DEMO" className="px-1 py-0 text-[8px]" />
            </p>
            <p className="text-[8px] text-[#64748B] mt-0.5">Not submitted · not validated</p>
            <div className="mt-1.5 space-y-1">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-[#94A3B8]">Scope 1+2: -42%</span>
                <span className="font-mono text-[#34D399]">-31.2% current</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[#34D399]" style={{ width: '74%' }} /></div>
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-[#94A3B8]">Scope 3: -29.9%</span>
                <span className="font-mono text-[#F59E0B]">-18.7% current</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[#F59E0B]" style={{ width: '63%' }} /></div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><Shield size={10} />Verification</h3>
            <p className="text-[10px] text-[#E2E8F0] flex items-center gap-1.5">
              ISO 14064-1
              <TruthBadge kind="DEMO" className="px-1 py-0 text-[8px]" />
            </p>
            <p className="text-[9px] text-[#64748B] mt-0.5">Not certified · no auditor engagement</p>
            <p className="text-[9px] text-[#64748B]">KPMG named here is fictional DEMO copy</p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><Leaf size={10} />Offset Credits</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Total credits</span>
                <span className="font-mono text-[#E2E8F0]">2,847</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Retired</span>
                <span className="font-mono text-[#E2E8F0]">1,412</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Total invested</span>
                <span className="font-mono text-[#34D399]">€142k</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><BarChart3 size={10} />Data Quality</h3>
            <p className="font-mono text-lg font-bold text-[#F59E0B]">n/a</p>
            <p className="text-[9px] text-[#64748B]">No measured quality score — INPUT_UNVERIFIED DEMO rows</p>
          </div>
        </div>
      </div>
    </div>
  );
}
