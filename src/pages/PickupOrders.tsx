import { useState } from 'react';
import clsx from 'clsx';
import { Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Truck, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

const STATUSES = ['All', 'Scheduled', 'In transit', 'Completed', 'Overdue', 'Cancelled'] as const;
const MATERIALS = ['All materials', 'Mixed waste', 'Cardboard', 'Plastics', 'Metal scrap', 'Wood', 'E-waste', 'Glass', 'Hazardous', 'Organic'] as const;

const SUMMARY = [
  { label: 'Total', value: 248, color: '#60A5FA' },
  { label: 'Scheduled', value: 34, color: '#94A3B8' },
  { label: 'In Transit', value: 12, color: '#60A5FA' },
  { label: 'Completed', value: 189, color: '#34D399' },
  { label: 'Overdue', value: 7, color: '#EF4444' },
  { label: 'Cancelled', value: 6, color: '#64748B' },
];

const ORDERS = [
  { id: 'PU-2847', location: 'Hamburg Altona', material: 'Mixed waste', weight: 4200, recycler: 'Alba Group', scheduled: '2026-08-01', status: 'In transit' },
  { id: 'PU-2846', location: 'Munich Pasing', material: 'Cardboard', weight: 2800, recycler: 'Remondis', scheduled: '2026-08-01', status: 'Scheduled' },
  { id: 'PU-2845', location: 'Berlin Spandau', material: 'Plastics', weight: 3100, recycler: 'Veolia', scheduled: '2026-07-31', status: 'Completed' },
  { id: 'PU-2844', location: 'Frankfurt Süd', material: 'Metal scrap', weight: 8700, recycler: 'PreZero', scheduled: '2026-07-31', status: 'Completed' },
  { id: 'PU-2843', location: 'Cologne Ehrenfeld', material: 'Wood', weight: 5400, recycler: 'Interzero', scheduled: '2026-07-30', status: 'Overdue' },
  { id: 'PU-2842', location: 'Stuttgart Mitte', material: 'E-waste', weight: 1200, recycler: 'Alba Group', scheduled: '2026-07-30', status: 'Completed' },
  { id: 'PU-2841', location: 'Dortmund Nord', material: 'Glass', weight: 6300, recycler: 'Remondis', scheduled: '2026-07-29', status: 'Completed' },
  { id: 'PU-2840', location: 'Düsseldorf Flingern', material: 'Hazardous', weight: 420, recycler: 'Stena Recycling', scheduled: '2026-07-29', status: 'Completed' },
  { id: 'PU-2839', location: 'Hannover Linden', material: 'Mixed waste', weight: 3800, recycler: 'Hoffmann', scheduled: '2026-07-28', status: 'Completed' },
  { id: 'PU-2838', location: 'Leipzig Plagwitz', material: 'Organic', weight: 2100, recycler: 'Tönsmeier', scheduled: '2026-07-28', status: 'Overdue' },
  { id: 'PU-2837', location: 'Nuremberg Süd', material: 'Cardboard', weight: 4500, recycler: 'Veolia', scheduled: '2026-07-27', status: 'Completed' },
  { id: 'PU-2836', location: 'Dresden Neustadt', material: 'Metal scrap', weight: 7200, recycler: 'PreZero', scheduled: '2026-07-27', status: 'Cancelled' },
];

const statusStyle: Record<string, string> = {
  'Completed': 'bg-[#34D399]/10 text-[#34D399]',
  'In transit': 'bg-[#60A5FA]/10 text-[#60A5FA]',
  'Scheduled': 'bg-white/5 text-[#94A3B8]',
  'Overdue': 'bg-[#EF4444]/10 text-[#EF4444]',
  'Cancelled': 'bg-white/5 text-[#64748B]',
};

export default function PickupOrders() {
  const [statusFilter, setStatusFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All materials');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = ORDERS.filter(o => {
    if (statusFilter !== 'All' && o.status !== statusFilter) return false;
    if (materialFilter !== 'All materials' && o.material !== materialFilter) return false;
    if (searchQuery && !o.location.toLowerCase().includes(searchQuery.toLowerCase()) && !o.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Pickup Orders</h1>
          <p className="text-[11px] text-[#94A3B8]">248 orders across 847 locations</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[#60A5FA] px-3 py-1.5 text-[10px] font-medium text-[#060B18] hover:bg-[#60A5FA]/90">
          <Plus size={12} />New order
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {SUMMARY.map(s => (
          <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-center">
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search orders, locations..." className="w-full rounded-md border border-white/[0.06] bg-white/[0.03] py-1.5 pl-8 pr-3 text-[11px] text-[#E2E8F0] placeholder-[#64748B] outline-none focus:border-[#60A5FA]/30" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-md border border-white/[0.06] bg-[#0a1628] px-2.5 py-1.5 text-[11px] text-[#E2E8F0] outline-none">
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)} className="rounded-md border border-white/[0.06] bg-[#0a1628] px-2.5 py-1.5 text-[11px] text-[#E2E8F0] outline-none">
          {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="w-8 px-3 py-2">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                {['Order ID', 'Location', 'Material', 'Weight', 'Recycler', 'Scheduled', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className={clsx('border-b border-white/[0.03] transition-colors', selected.has(o.id) ? 'bg-[#60A5FA]/5' : 'hover:bg-white/[0.02]')}>
                  <td className="w-8 px-3 py-1.5">
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#60A5FA]">#{o.id}</td>
                  <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0]">{o.location}</td>
                  <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{o.material}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{(o.weight / 1000).toFixed(1)}t</td>
                  <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{o.recycler}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{o.scheduled}</td>
                  <td className="px-3 py-1.5">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', statusStyle[o.status])}>{o.status}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <button className="rounded p-1 text-[#64748B] hover:bg-white/[0.05] hover:text-[#E2E8F0]"><Eye size={12} /></button>
                      <button className="rounded p-1 text-[#64748B] hover:bg-white/[0.05] hover:text-[#E2E8F0]"><Pencil size={12} /></button>
                      <button className="rounded p-1 text-[#64748B] hover:bg-white/[0.05] hover:text-[#EF4444]"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2">
          <p className="text-[10px] text-[#64748B]">
            {selected.size > 0 ? `${selected.size} selected · ` : ''}Showing {filtered.length} of 248
          </p>
          <div className="flex items-center gap-1">
            <button className="rounded p-1 text-[#64748B] hover:bg-white/[0.05]"><ChevronLeft size={14} /></button>
            {[1, 2, 3].map(p => (
              <button key={p} className={clsx('rounded px-2 py-0.5 font-mono text-[10px]', p === 1 ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B]')}>{p}</button>
            ))}
            <span className="font-mono text-[10px] text-[#64748B]">...</span>
            <button className="rounded px-2 py-0.5 font-mono text-[10px] text-[#64748B]">21</button>
            <button className="rounded p-1 text-[#64748B] hover:bg-white/[0.05]"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
