import { useState } from 'react';
import clsx from 'clsx';
import { Download, CheckCircle2, Clock, FileText, BarChart3 } from 'lucide-react';

const STANDARDS = [
  { code: 'GRI 2', name: 'General Disclosures', done: 28, total: 30, color: '#34D399' },
  { code: 'GRI 3', name: 'Material Topics', done: 8, total: 8, color: '#34D399' },
  { code: 'GRI 301', name: 'Materials', done: 6, total: 6, color: '#34D399' },
  { code: 'GRI 302', name: 'Energy', done: 8, total: 8, color: '#34D399' },
  { code: 'GRI 303', name: 'Water & Effluents', done: 4, total: 6, color: '#F59E0B' },
  { code: 'GRI 304', name: 'Biodiversity', done: 2, total: 4, color: '#F59E0B' },
  { code: 'GRI 305', name: 'Emissions', done: 10, total: 10, color: '#34D399' },
  { code: 'GRI 306', name: 'Waste', done: 8, total: 8, color: '#34D399' },
  { code: 'GRI 401', name: 'Employment', done: 6, total: 8, color: '#F59E0B' },
  { code: 'GRI 403', name: 'Occupational Health & Safety', done: 4, total: 4, color: '#34D399' },
];

const CONTENT_INDEX = [
  { gri: '2-1', title: 'Organizational details', category: 'Universal', status: 'Reported', location: 'CSRD Report p.4' },
  { gri: '2-2', title: 'Entities included in reporting', category: 'Universal', status: 'Reported', location: 'CSRD Report p.5' },
  { gri: '2-6', title: 'Activities, value chain, stakeholders', category: 'Universal', status: 'Reported', location: 'CSRD Report p.8-12' },
  { gri: '2-7', title: 'Employees', category: 'Universal', status: 'Reported', location: 'S1 Workforce module' },
  { gri: '2-22', title: 'Statement on sustainable development', category: 'Universal', status: 'Reported', location: 'CEO Statement p.2' },
  { gri: '2-27', title: 'Compliance with laws and regulations', category: 'Universal', status: 'Partially', location: 'Compliance module' },
  { gri: '2-29', title: 'Approach to stakeholder engagement', category: 'Universal', status: 'Reported', location: 'CSRD Report p.15' },
  { gri: '3-1', title: 'Process to determine material topics', category: 'Material', status: 'Reported', location: 'Materiality assessment' },
  { gri: '3-2', title: 'List of material topics', category: 'Material', status: 'Reported', location: 'Materiality matrix' },
  { gri: '301-1', title: 'Materials used by weight or volume', category: 'Topic', status: 'Reported', location: 'Waste operations module' },
  { gri: '301-2', title: 'Recycled input materials used', category: 'Topic', status: 'Reported', location: 'Circular economy module' },
  { gri: '302-1', title: 'Energy consumption within organization', category: 'Topic', status: 'Reported', location: 'Carbon accounting (auto)' },
  { gri: '303-1', title: 'Interactions with water as shared resource', category: 'Topic', status: 'Partially', location: 'Manual entry needed' },
  { gri: '303-5', title: 'Water consumption', category: 'Topic', status: 'Not reported', location: '—', omission: 'Data collection in progress' },
  { gri: '304-1', title: 'Operational sites in protected areas', category: 'Topic', status: 'Partially', location: 'Locations module' },
  { gri: '305-1', title: 'Direct (Scope 1) GHG emissions', category: 'Topic', status: 'Reported', location: 'Carbon accounting (auto)' },
  { gri: '305-2', title: 'Energy indirect (Scope 2) GHG emissions', category: 'Topic', status: 'Reported', location: 'Carbon accounting (auto)' },
  { gri: '305-3', title: 'Other indirect (Scope 3) GHG emissions', category: 'Topic', status: 'Reported', location: 'Carbon accounting (auto)' },
  { gri: '306-3', title: 'Waste generated', category: 'Topic', status: 'Reported', location: 'Waste operations (auto)' },
  { gri: '306-4', title: 'Waste diverted from disposal', category: 'Topic', status: 'Reported', location: 'Recycling metrics (auto)' },
];

const MATERIAL_TOPICS = [
  { topic: 'Climate action', stakeholder: 95, business: 92 },
  { topic: 'Circular economy', stakeholder: 88, business: 85 },
  { topic: 'Waste management', stakeholder: 82, business: 87 },
  { topic: 'Worker safety', stakeholder: 78, business: 62 },
  { topic: 'Supply chain responsibility', stakeholder: 72, business: 75 },
  { topic: 'Biodiversity', stakeholder: 58, business: 42 },
  { topic: 'Water stewardship', stakeholder: 52, business: 48 },
  { topic: 'Anti-corruption', stakeholder: 45, business: 68 },
];

const statusStyle: Record<string, string> = {
  Reported: 'bg-[#34D399]/10 text-[#34D399]',
  Partially: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  'Not reported': 'bg-[#EF4444]/10 text-[#EF4444]',
};

const categoryBadge: Record<string, string> = {
  Universal: 'bg-[#60A5FA]/10 text-[#60A5FA]',
  Material: 'bg-purple-500/10 text-purple-400',
  Topic: 'bg-white/5 text-[#94A3B8]',
};

export default function GRIReporting() {
  const [filter, setFilter] = useState('All');

  const filtered = CONTENT_INDEX.filter(c => filter === 'All' || c.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">GRI Reporting</h1>
          <p className="text-[11px] text-[#94A3B8]">DEMO GRI 2021 layout · 88% is scenario completeness, not a published index</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#94A3B8]"><Download size={12} />Content Index (PDF)</button>
          <button className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-[#94A3B8]"><Download size={12} />Data Pack (Excel)</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {STANDARDS.map(s => (
          <div key={s.code} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-mono text-[9px] text-[#60A5FA]">{s.code}</span>
              <span className="font-mono text-[9px]" style={{ color: s.color }}>{s.done}/{s.total}</span>
            </div>
            <p className="text-[9px] text-[#94A3B8] truncate">{s.name}</p>
            <div className="mt-1 h-1 rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${(s.done / s.total) * 100}%`, backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">GRI Content Index</h2>
            <div className="flex gap-1">
              {['All', 'Reported', 'Partially', 'Not reported'].map(f => (
                <button key={f} onClick={() => setFilter(f)} className={clsx('px-2 py-0.5 rounded-md text-[9px] font-mono', filter === f ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B]')}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['GRI #', 'Disclosure', 'Category', 'Status', 'Location / Omission'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.gri} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#60A5FA]">{c.gri}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0] max-w-[240px]">{c.title}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', categoryBadge[c.category])}>{c.category}</span></td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', statusStyle[c.status])}>{c.status}</span></td>
                    <td className="px-3 py-1.5 text-[10px] text-[#94A3B8]">{c.omission || c.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><BarChart3 size={10} />Material Topics</h3>
          <p className="text-[9px] text-[#64748B] mb-2">Stakeholder engagement assessment</p>
          <div className="space-y-2">
            {MATERIAL_TOPICS.map(m => (
              <div key={m.topic}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-[#E2E8F0]">{m.topic}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] text-[#64748B] w-8">Stake</span>
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#60A5FA]" style={{ width: `${m.stakeholder}%` }} />
                  </div>
                  <span className="font-mono text-[8px] text-[#64748B] w-6 text-right">{m.stakeholder}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[7px] text-[#64748B] w-8">Biz</span>
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#34D399]" style={{ width: `${m.business}%` }} />
                  </div>
                  <span className="font-mono text-[8px] text-[#64748B] w-6 text-right">{m.business}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
