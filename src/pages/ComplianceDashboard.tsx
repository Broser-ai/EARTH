import { useState } from 'react';
import clsx from 'clsx';
import { Shield, FileText, Leaf, TreePine, Factory, AlertTriangle, Clock, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';

const FRAMEWORKS = [
  { name: 'CSRD', fullName: 'Corporate Sustainability Reporting Directive', pct: 94, done: 62, total: 66, color: '#34D399', updated: 'Jul 28, 2026' },
  { name: 'GRI', fullName: 'Global Reporting Initiative', pct: 88, done: 84, total: 96, color: '#34D399', updated: 'Jul 25, 2026' },
  { name: 'EUDR', fullName: 'EU Deforestation Regulation', pct: 67, done: 987, total: 1455, color: '#F59E0B', updated: 'Jul 30, 2026' },
  { name: 'CBAM', fullName: 'Carbon Border Adjustment Mechanism', pct: 52, done: 24, total: 46, color: '#EF4444', updated: 'Jul 22, 2026' },
];

const DEADLINES = [
  { name: 'CBAM Q3 Declaration', date: 'Aug 31, 2026', days: 30, urgency: 'critical' },
  { name: 'CSRD Annual Report', date: 'Dec 15, 2026', days: 137, urgency: 'ok' },
  { name: 'GRI Content Index Update', date: 'Sep 30, 2026', days: 61, urgency: 'warn' },
  { name: 'EUDR Due Diligence Statement', date: 'Oct 15, 2026', days: 76, urgency: 'warn' },
];

const DISCLOSURES = [
  { req: 'Climate change mitigation targets', framework: 'CSRD', category: 'E1', status: 'Complete', source: 'Auto', updated: 'Jul 28' },
  { req: 'GHG emissions Scope 1', framework: 'CSRD', category: 'E1', status: 'Complete', source: 'Auto', updated: 'Jul 31' },
  { req: 'GHG emissions Scope 2', framework: 'CSRD', category: 'E1', status: 'Complete', source: 'Auto', updated: 'Jul 31' },
  { req: 'GHG emissions Scope 3', framework: 'CSRD', category: 'E1', status: 'In progress', source: 'Manual', updated: 'Jul 25' },
  { req: 'Energy consumption', framework: 'GRI', category: 'GRI 302', status: 'Complete', source: 'Auto', updated: 'Jul 30' },
  { req: 'Water withdrawal', framework: 'GRI', category: 'GRI 303', status: 'In progress', source: 'Manual', updated: 'Jul 20' },
  { req: 'Waste generation', framework: 'GRI', category: 'GRI 306', status: 'Complete', source: 'Auto', updated: 'Jul 31' },
  { req: 'Timber product traceability', framework: 'EUDR', category: 'Forest', status: 'In progress', source: 'Pending', updated: 'Jul 28' },
  { req: 'Palm oil supply chain mapping', framework: 'EUDR', category: 'Agriculture', status: 'Not started', source: 'Pending', updated: '—' },
  { req: 'Rubber supplier geolocation', framework: 'EUDR', category: 'Forest', status: 'In progress', source: 'Manual', updated: 'Jul 15' },
  { req: 'Steel embedded emissions', framework: 'CBAM', category: 'Metals', status: 'In progress', source: 'Manual', updated: 'Jul 22' },
  { req: 'Aluminium carbon intensity', framework: 'CBAM', category: 'Metals', status: 'Not started', source: 'Pending', updated: '—' },
  { req: 'Cement carbon factor', framework: 'CBAM', category: 'Minerals', status: 'Overdue', source: 'Pending', updated: '—' },
  { req: 'Biodiversity impact assessment', framework: 'CSRD', category: 'E4', status: 'In progress', source: 'Manual', updated: 'Jul 18' },
  { req: 'Circular economy strategy', framework: 'CSRD', category: 'E5', status: 'Complete', source: 'Auto', updated: 'Jul 29' },
];

const DATA_SOURCES = [
  { name: 'SAP S/4HANA', status: 'connected', records: '847 records synced' },
  { name: 'Carbon accounting module', status: 'connected', records: 'Real-time' },
  { name: 'Waste operations', status: 'connected', records: 'Hourly sync' },
  { name: 'Supplier portal', status: 'partial', records: '67% coverage' },
  { name: 'Product registry', status: 'disconnected', records: 'Not connected' },
];

const frameworkBadge: Record<string, string> = {
  CSRD: 'bg-[#60A5FA]/10 text-[#60A5FA]',
  GRI: 'bg-[#34D399]/10 text-[#34D399]',
  EUDR: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  CBAM: 'bg-[#EF4444]/10 text-[#EF4444]',
};

const statusStyle: Record<string, string> = {
  'Complete': 'bg-[#34D399]/10 text-[#34D399]',
  'In progress': 'bg-[#60A5FA]/10 text-[#60A5FA]',
  'Not started': 'bg-white/5 text-[#64748B]',
  'Overdue': 'bg-[#EF4444]/10 text-[#EF4444]',
};

const urgencyStyle: Record<string, string> = {
  critical: 'text-[#EF4444]',
  warn: 'text-[#F59E0B]',
  ok: 'text-[#34D399]',
};

export default function ComplianceDashboard() {
  const [frameworkFilter, setFrameworkFilter] = useState('All');

  const filtered = DISCLOSURES.filter(d => frameworkFilter === 'All' || d.framework === frameworkFilter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-medium text-[#E2E8F0]">Compliance</h1>
        <p className="text-[11px] text-[#94A3B8]">Multi-framework compliance management</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {FRAMEWORKS.map(f => (
          <div key={f.name} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', frameworkBadge[f.name])}>{f.name}</span>
              <span className="font-mono text-lg font-bold" style={{ color: f.color }}>{f.pct}%</span>
            </div>
            <p className="text-[9px] text-[#64748B] mb-2">{f.fullName}</p>
            <div className="h-1.5 rounded-full bg-white/[0.06] mb-1">
              <div className="h-full rounded-full" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] text-[#64748B]">{f.done}/{f.total} disclosures</span>
              <span className="font-mono text-[8px] text-[#64748B]">Updated {f.updated}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Upcoming Deadlines</h3>
        <div className="grid grid-cols-4 gap-3">
          {DEADLINES.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <Clock size={12} className={urgencyStyle[d.urgency]} />
              <div>
                <p className="text-[10px] text-[#E2E8F0]">{d.name}</p>
                <p className={clsx('font-mono text-[9px]', urgencyStyle[d.urgency])}>{d.date} · {d.days} days</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_240px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Disclosure Checklist</h2>
            <div className="flex gap-1">
              {['All', 'CSRD', 'GRI', 'EUDR', 'CBAM'].map(f => (
                <button key={f} onClick={() => setFrameworkFilter(f)} className={clsx('px-2 py-0.5 rounded-md text-[9px] font-mono', frameworkFilter === f ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B] hover:text-[#94A3B8]')}>{f}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Requirement', 'Framework', 'Category', 'Status', 'Source', 'Updated'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0] max-w-[240px]">{d.req}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', frameworkBadge[d.framework])}>{d.framework}</span></td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-[#94A3B8]">{d.category}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', statusStyle[d.status])}>{d.status}</span></td>
                    <td className="px-3 py-1.5 text-[10px] text-[#94A3B8]">{d.source}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-[#64748B]">{d.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><Link2 size={10} />Data Sources</h3>
          <div className="space-y-2">
            {DATA_SOURCES.map(d => (
              <div key={d.name}>
                <div className="flex items-center gap-1.5">
                  <div className={clsx('h-1.5 w-1.5 rounded-full', d.status === 'connected' ? 'bg-[#34D399]' : d.status === 'partial' ? 'bg-[#F59E0B]' : 'bg-[#EF4444]')} />
                  <span className="text-[10px] text-[#E2E8F0]">{d.name}</span>
                </div>
                <p className="text-[8px] text-[#64748B] ml-3">{d.records}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
