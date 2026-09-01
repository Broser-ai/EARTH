import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Leaf, ShieldCheck, TrendingUp, Calendar, Download } from 'lucide-react';

const KPIS = [
  { label: 'Total Credits', value: '2,847', color: '#60A5FA' },
  { label: 'Active', value: '1,435', color: '#34D399' },
  { label: 'Retired', value: '1,412', color: '#94A3B8' },
  { label: 'Total Invested', value: '€142k', color: '#F59E0B' },
  { label: 'Avg Price', value: '€49.80', color: '#E2E8F0' },
];

const PORTFOLIO = [
  { project: 'Amazon Rainforest REDD+', registry: 'Verra VCS', regColor: '#34D399', type: 'Nature-based', vintage: 2024, credits: 500, price: 24, status: 'Active' },
  { project: 'Kenya Cookstoves', registry: 'Gold Standard', regColor: '#F59E0B', type: 'Energy efficiency', vintage: 2025, credits: 400, price: 18, status: 'Retired' },
  { project: 'India Wind Farm', registry: 'Verra VCS', regColor: '#34D399', type: 'Renewable energy', vintage: 2025, credits: 350, price: 22, status: 'Active' },
  { project: 'Nordic Biochar', registry: 'Puro.earth', regColor: '#60A5FA', type: 'Carbon removal', vintage: 2026, credits: 200, price: 145, status: 'Active' },
  { project: 'Brazil Reforestation', registry: 'Verra VCS', regColor: '#34D399', type: 'Nature-based', vintage: 2024, credits: 447, price: 28, status: 'Retired' },
  { project: 'Indonesia Mangrove', registry: 'Gold Standard', regColor: '#F59E0B', type: 'Blue carbon', vintage: 2025, credits: 300, price: 35, status: 'Active' },
  { project: 'Swiss DAC', registry: 'Puro.earth', regColor: '#60A5FA', type: 'Direct air capture', vintage: 2026, credits: 150, price: 380, status: 'Active' },
  { project: 'Ghana Solar', registry: 'Gold Standard', regColor: '#F59E0B', type: 'Renewable energy', vintage: 2025, credits: 500, price: 15, status: 'Retired' },
];

const RETIREMENTS = [
  { date: 'Aug 15, 2026', credits: 200, purpose: 'CSRD annual reporting', project: 'Amazon REDD+' },
  { date: 'Sep 30, 2026', credits: 150, purpose: 'Voluntary net-zero commitment', project: 'Nordic Biochar' },
  { date: 'Oct 15, 2026', credits: 300, purpose: 'Customer offset program', project: 'Kenya Cookstoves' },
  { date: 'Dec 31, 2026', credits: 500, purpose: 'Annual retirement schedule', project: 'Various' },
];

const MARKET_PRICES = [
  { registry: 'Verra VCS', range: '€22 – €28', trend: '+4.2%' },
  { registry: 'Gold Standard', range: '€15 – €35', trend: '+2.8%' },
  { registry: 'Puro.earth (removal)', range: '€145 – €380', trend: '+12.1%' },
];

const QUALITY = [
  { dimension: 'Additionality', level: 'High', color: '#34D399' },
  { dimension: 'Permanence', level: 'Medium', color: '#F59E0B' },
  { dimension: 'Co-benefits', level: 'High', color: '#34D399' },
  { dimension: 'MRV methodology', level: 'High', color: '#34D399' },
];

const statusStyle: Record<string, string> = {
  Active: 'bg-[#34D399]/10 text-[#34D399]',
  Retired: 'bg-white/5 text-[#94A3B8]',
  Expiring: 'bg-[#F59E0B]/10 text-[#F59E0B]',
};

export default function OffsetCredits() {
  const [filter, setFilter] = useState('All');

  const filtered = PORTFOLIO.filter(p => filter === 'All' || p.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Offset Credits</h1>
          <p className="text-[11px] text-[#94A3B8]">Carbon credit portfolio management</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#94A3B8]"><Download size={12} />Export</button>
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#F59E0B]"><Leaf size={12} />Retire credits</button>
          <button className="flex items-center gap-1 rounded-md bg-[#60A5FA] px-3 py-1.5 text-[10px] font-medium text-[#060B18]"><Plus size={12} />Purchase credits</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {KPIS.map(k => (
          <div key={k.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-center">
            <p className="font-mono text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <h2 className="text-[11px] font-medium text-[#E2E8F0]">Portfolio</h2>
              <div className="flex gap-1">
                {['All', 'Active', 'Retired'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={clsx('px-2 py-0.5 rounded-md text-[9px] font-mono', filter === f ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B]')}>{f}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Project', 'Registry', 'Type', 'Vintage', 'Credits', 'Price/credit', 'Total', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.project} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0] max-w-[180px] truncate">{p.project}</td>
                      <td className="px-3 py-1.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${p.regColor}15`, color: p.regColor }}>{p.registry}</span></td>
                      <td className="px-3 py-1.5 text-[10px] text-[#94A3B8]">{p.type}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{p.vintage}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{p.credits}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">€{p.price}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#34D399]">€{(p.credits * p.price).toLocaleString()}</td>
                      <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', statusStyle[p.status])}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
            <div className="border-b border-white/[0.06] px-4 py-2.5">
              <h2 className="text-[11px] font-medium text-[#E2E8F0]">Retirement Schedule</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {RETIREMENTS.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Calendar size={12} className="text-[#64748B]" />
                    <div>
                      <p className="text-[10px] text-[#E2E8F0]">{r.purpose}</p>
                      <p className="text-[9px] text-[#64748B]">{r.project}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] text-[#E2E8F0]">{r.credits} credits</p>
                    <p className="font-mono text-[9px] text-[#64748B]">{r.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><TrendingUp size={10} />Market Prices</h3>
            <div className="space-y-2">
              {MARKET_PRICES.map(m => (
                <div key={m.registry}>
                  <p className="text-[10px] text-[#E2E8F0]">{m.registry}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-[#94A3B8]">{m.range}</span>
                    <span className="font-mono text-[9px] text-[#34D399]">{m.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><ShieldCheck size={10} />Quality Assessment</h3>
            <div className="space-y-1.5">
              {QUALITY.map(q => (
                <div key={q.dimension} className="flex items-center justify-between">
                  <span className="text-[10px] text-[#94A3B8]">{q.dimension}</span>
                  <span className="font-mono text-[9px] font-semibold" style={{ color: q.color }}>{q.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
