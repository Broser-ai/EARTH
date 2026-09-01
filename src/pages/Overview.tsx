import { useState } from 'react';
import clsx from 'clsx';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Truck, CheckCircle2, Clock, Package, Leaf, Shield } from 'lucide-react';

const KPIS = [
  { label: 'CO₂ Saved', value: '2,847', unit: 't', delta: '+12.3%', positive: true },
  { label: 'Recycling Rate', value: '91.4', unit: '%', delta: '+2.1pp', positive: true },
  { label: 'Open Pickups', value: '34', unit: '', delta: '7 overdue', positive: false },
  { label: 'Waste Spend', value: '€847k', unit: '', delta: '-8.7%', positive: true },
  { label: 'Material Revenue', value: '€312k', unit: '', delta: '+24.1%', positive: true },
];

const ORDERS = [
  { id: 'PU-2847', location: 'Hamburg Altona', material: 'Mixed waste', weight: '4.2t', recycler: 'Alba Group', date: '2026-08-01', status: 'In transit' },
  { id: 'PU-2846', location: 'Munich Pasing', material: 'Cardboard', weight: '2.8t', recycler: 'Remondis', date: '2026-08-01', status: 'Scheduled' },
  { id: 'PU-2845', location: 'Berlin Spandau', material: 'Plastics', weight: '3.1t', recycler: 'Veolia', date: '2026-07-31', status: 'Completed' },
  { id: 'PU-2844', location: 'Frankfurt Süd', material: 'Metal scrap', weight: '8.7t', recycler: 'PreZero', date: '2026-07-31', status: 'Completed' },
  { id: 'PU-2843', location: 'Cologne Ehrenfeld', material: 'Wood', weight: '5.4t', recycler: 'Interzero', date: '2026-07-30', status: 'Overdue' },
  { id: 'PU-2842', location: 'Stuttgart Mitte', material: 'E-waste', weight: '1.2t', recycler: 'Alba Group', date: '2026-07-30', status: 'Completed' },
  { id: 'PU-2841', location: 'Dortmund Nord', material: 'Glass', weight: '6.3t', recycler: 'Remondis', date: '2026-07-29', status: 'Completed' },
];

const COMPLIANCE = [
  { name: 'CSRD', pct: 94, color: '#34D399' },
  { name: 'GRI', pct: 88, color: '#34D399' },
  { name: 'EUDR', pct: 67, color: '#F59E0B' },
  { name: 'CBAM', pct: 52, color: '#EF4444' },
];

const RECYCLERS = [
  { name: 'Alba Group', tonnage: '847t', rate: '98.2%' },
  { name: 'Remondis', tonnage: '623t', rate: '95.1%' },
  { name: 'Veolia', tonnage: '412t', rate: '97.8%' },
];

const PRICES = [
  { material: 'Plastics', price: '€142/t', delta: '+3.2%', up: true },
  { material: 'Cardboard', price: '€87/t', delta: '-1.8%', up: false },
  { material: 'Metal scrap', price: '€310/t', delta: '+5.1%', up: true },
  { material: 'Wood', price: '€45/t', delta: '-0.4%', up: false },
];

const statusStyle: Record<string, string> = {
  'Completed': 'bg-[#34D399]/10 text-[#34D399]',
  'In transit': 'bg-[#60A5FA]/10 text-[#60A5FA]',
  'Scheduled': 'bg-white/5 text-[#94A3B8]',
  'Overdue': 'bg-[#EF4444]/10 text-[#EF4444]',
};

export default function Overview() {
  const [timeRange, setTimeRange] = useState('month');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Dashboard</h1>
          <p className="text-[11px] text-[#94A3B8]">Hornbach Germany · 847 locations · Enterprise</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
          {['week', 'month', 'quarter', 'year'].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} className={clsx('px-3 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider transition-colors', timeRange === r ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B] hover:text-[#94A3B8]')}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {KPIS.map(k => (
          <div key={k.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">{k.label}</p>
            <p className="mt-1 text-lg font-mono font-bold text-[#E2E8F0]">{k.value}<span className="text-[11px] text-[#94A3B8]">{k.unit}</span></p>
            <p className={clsx('mt-0.5 text-[9px] font-mono flex items-center gap-0.5', k.positive ? 'text-[#34D399]' : 'text-[#EF4444]')}>
              {k.positive ? <ArrowUpRight size={10} /> : k.label === 'Open Pickups' ? <AlertTriangle size={10} /> : <ArrowUpRight size={10} />}
              {k.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Recent Pickup Orders</h2>
            <button className="text-[9px] font-mono text-[#60A5FA] hover:underline">View all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Order ID', 'Location', 'Material', 'Weight', 'Recycler', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORDERS.map(o => (
                  <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#60A5FA]">#{o.id}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0]">{o.location}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{o.material}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{o.weight}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{o.recycler}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{o.date}</td>
                    <td className="px-3 py-1.5">
                      <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', statusStyle[o.status])}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Compliance</h3>
            <div className="space-y-2">
              {COMPLIANCE.map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-[#E2E8F0]">{c.name}</span>
                    <span className="font-mono text-[10px]" style={{ color: c.color }}>{c.pct}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Top Recyclers</h3>
            <div className="space-y-1.5">
              {RECYCLERS.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-[#64748B]">{i + 1}.</span>
                    <span className="text-[10px] text-[#E2E8F0]">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#94A3B8]">{r.tonnage}</span>
                    <span className="font-mono text-[10px] text-[#34D399]">{r.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Material Prices</h3>
            <div className="space-y-1.5">
              {PRICES.map(p => (
                <div key={p.material} className="flex items-center justify-between">
                  <span className="text-[10px] text-[#E2E8F0]">{p.material}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#E2E8F0]">{p.price}</span>
                    <span className={clsx('font-mono text-[9px] flex items-center gap-0.5', p.up ? 'text-[#34D399]' : 'text-[#EF4444]')}>
                      {p.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {p.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-4 py-3">
        <AlertTriangle size={16} className="text-[#F59E0B] flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-medium text-[#F59E0B]">CBAM Q3 declaration deadline in 12 days</p>
          <p className="text-[10px] text-[#94A3B8]">48% complete — 22 of 46 product categories still require emission data from suppliers</p>
        </div>
        <button className="rounded-md bg-[#F59E0B] px-3 py-1.5 text-[10px] font-medium text-[#060B18] hover:bg-[#F59E0B]/90 transition-colors">Complete now</button>
      </div>
    </div>
  );
}
