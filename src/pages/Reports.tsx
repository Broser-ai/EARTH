import { useState } from 'react';
import clsx from 'clsx';
import { FileText, Leaf, Trash2, RefreshCw, Users, BarChart3, Plus, Download, Calendar, Mail, ToggleLeft, ToggleRight } from 'lucide-react';

const TEMPLATES = [
  { icon: FileText, title: 'CSRD Annual Report', desc: 'EU CSRD-compliant sustainability report with ESRS disclosures', lastRun: 'Jun 15, 2026', format: 'PDF' },
  { icon: Leaf, title: 'Carbon Footprint', desc: 'Scope 1/2/3 emissions with GHG Protocol methodology', lastRun: 'Jul 1, 2026', format: 'PDF + Excel' },
  { icon: Trash2, title: 'Waste Operations', desc: 'Monthly waste streams, recycling rates, cost analysis', lastRun: 'Jul 31, 2026', format: 'Excel' },
  { icon: RefreshCw, title: 'Circular Impact', desc: 'Take-back programs, material recovery, circularity metrics', lastRun: 'Jul 15, 2026', format: 'PDF' },
  { icon: Users, title: 'Supplier Scorecard', desc: 'Recycler performance, certifications, SLA compliance', lastRun: 'Jul 28, 2026', format: 'PDF' },
  { icon: BarChart3, title: 'Board ESG Summary', desc: 'Executive summary for board presentation', lastRun: 'Jun 30, 2026', format: 'PowerPoint' },
];

const GENERATED = [
  { name: 'Waste Operations Summary — July 2026', type: 'Operations', by: 'System (auto)', date: '2026-07-31', format: 'Excel', size: '2.4 MB', status: 'Ready' },
  { name: 'Supplier Scorecard Q2 2026', type: 'Supplier', by: 'Anna Müller', date: '2026-07-28', format: 'PDF', size: '1.8 MB', status: 'Ready' },
  { name: 'Carbon Footprint H1 2026', type: 'Carbon', by: 'Thomas Weber', date: '2026-07-15', format: 'PDF', size: '3.2 MB', status: 'Ready' },
  { name: 'Circular Impact Report — June 2026', type: 'Circular', by: 'System (auto)', date: '2026-07-01', format: 'PDF', size: '2.1 MB', status: 'Ready' },
  { name: 'CSRD Annual Report 2025', type: 'CSRD', by: 'Lisa Schmidt', date: '2026-06-15', format: 'PDF', size: '8.7 MB', status: 'Ready' },
  { name: 'Board ESG Summary Q2 2026', type: 'Board', by: 'Michael Klein', date: '2026-06-30', format: 'PPTX', size: '4.5 MB', status: 'Ready' },
  { name: 'Waste Operations Summary — June 2026', type: 'Operations', by: 'System (auto)', date: '2026-06-30', format: 'Excel', size: '2.2 MB', status: 'Ready' },
  { name: 'GRI Content Index 2025', type: 'GRI', by: 'Anna Müller', date: '2026-06-20', format: 'PDF', size: '1.4 MB', status: 'Ready' },
];

const SCHEDULED = [
  { name: 'Weekly Waste Summary', schedule: 'Every Monday 08:00', format: 'PDF', recipients: 'ops@hornbach.de', active: true },
  { name: 'Monthly Carbon Report', schedule: '1st of month', format: 'Excel', recipients: 'sustainability@hornbach.de', active: true },
  { name: 'Quarterly Compliance', schedule: 'Q-end + 5 days', format: 'PDF', recipients: 'compliance@hornbach.de, board@hornbach.de', active: true },
  { name: 'Annual CSRD', schedule: 'Dec 15', format: 'PDF + Excel', recipients: 'board@hornbach.de, audit@kpmg.de', active: false },
];

const DATA_SOURCES = [
  { name: 'Waste Operations', lastSync: '2 min ago', fresh: true },
  { name: 'Carbon Accounting', lastSync: 'Real-time', fresh: true },
  { name: 'Compliance Module', lastSync: '15 min ago', fresh: true },
  { name: 'Supplier Portal', lastSync: '2 hours ago', fresh: false },
  { name: 'Product Registry', lastSync: '6 hours ago', fresh: false },
];

const typeBadge: Record<string, string> = {
  Operations: 'bg-[#60A5FA]/10 text-[#60A5FA]',
  Supplier: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  Carbon: 'bg-[#34D399]/10 text-[#34D399]',
  Circular: 'bg-purple-500/10 text-purple-400',
  CSRD: 'bg-[#60A5FA]/10 text-[#60A5FA]',
  Board: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  GRI: 'bg-[#34D399]/10 text-[#34D399]',
};

export default function Reports() {
  const [scheduleStates, setScheduleStates] = useState(SCHEDULED.map(s => s.active));

  const toggleSchedule = (i: number) => {
    const next = [...scheduleStates];
    next[i] = !next[i];
    setScheduleStates(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Reports</h1>
          <p className="text-[11px] text-[#94A3B8]">Generate, schedule, and manage compliance and operational reports</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[#60A5FA] px-3 py-1.5 text-[10px] font-medium text-[#060B18]">
          <Plus size={12} />New Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {TEMPLATES.map(t => (
          <div key={t.title} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 hover:border-[#60A5FA]/20 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-[#60A5FA]/10 p-2"><t.icon size={16} className="text-[#60A5FA]" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[11px] font-medium text-[#E2E8F0]">{t.title}</h3>
                <p className="mt-0.5 text-[9px] text-[#64748B] line-clamp-2">{t.desc}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[8px] text-[#64748B]">Last: {t.lastRun} · {t.format}</span>
                  <button className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[9px] text-[#60A5FA] opacity-0 group-hover:opacity-100 transition-opacity">Generate</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
        <div className="border-b border-white/[0.06] px-4 py-2.5">
          <h2 className="text-[11px] font-medium text-[#E2E8F0]">Generated Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Report', 'Type', 'Generated by', 'Date', 'Format', 'Size', ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GENERATED.map((g, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0] max-w-[280px] truncate">{g.name}</td>
                  <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', typeBadge[g.type])}>{g.type}</span></td>
                  <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{g.by}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{g.date}</td>
                  <td className="px-3 py-1.5 font-mono text-[9px] text-[#64748B]">{g.format}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{g.size}</td>
                  <td className="px-3 py-1.5"><button className="rounded p-1 text-[#64748B] hover:text-[#60A5FA]"><Download size={12} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Scheduled Reports</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {SCHEDULED.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleSchedule(i)}>
                    {scheduleStates[i] ? <ToggleRight size={18} className="text-[#34D399]" /> : <ToggleLeft size={18} className="text-[#64748B]" />}
                  </button>
                  <div>
                    <p className="text-[11px] text-[#E2E8F0]">{s.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[9px] text-[#64748B]"><Calendar size={9} />{s.schedule}</span>
                      <span className="flex items-center gap-1 text-[9px] text-[#64748B]"><FileText size={9} />{s.format}</span>
                      <span className="flex items-center gap-1 text-[9px] text-[#64748B]"><Mail size={9} />{s.recipients}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Data Freshness</h3>
          <div className="space-y-2">
            {DATA_SOURCES.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="text-[10px] text-[#E2E8F0]">{d.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className={clsx('h-1.5 w-1.5 rounded-full', d.fresh ? 'bg-[#34D399]' : 'bg-[#F59E0B]')} />
                  <span className="font-mono text-[9px] text-[#64748B]">{d.lastSync}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
