import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, AlertTriangle, FileText, Shield } from 'lucide-react';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';

const ESRS = [
  { code: 'E1', topic: 'Climate change', done: 12, total: 12, color: '#34D399' },
  { code: 'E2', topic: 'Pollution', done: 8, total: 8, color: '#34D399' },
  { code: 'E3', topic: 'Water & marine resources', done: 6, total: 8, color: '#F59E0B' },
  { code: 'E4', topic: 'Biodiversity & ecosystems', done: 4, total: 6, color: '#F59E0B' },
  { code: 'E5', topic: 'Resource use & circular economy', done: 10, total: 10, color: '#34D399' },
  { code: 'S1', topic: 'Own workforce', done: 14, total: 14, color: '#34D399' },
  { code: 'S2', topic: 'Workers in value chain', done: 8, total: 10, color: '#F59E0B' },
  { code: 'S3', topic: 'Affected communities', done: 6, total: 6, color: '#34D399' },
  { code: 'S4', topic: 'Consumers & end-users', done: 4, total: 4, color: '#34D399' },
  { code: 'G1', topic: 'Business conduct', done: 6, total: 6, color: '#34D399' },
];

const DATAPOINTS = [
  { code: 'E1-1', name: 'Transition plan for climate change mitigation', topic: 'E1', type: 'Narrative', status: 'Complete', source: 'Manual', updated: 'Jul 28', verified: true },
  { code: 'E1-2', name: 'Policies related to climate change', topic: 'E1', type: 'Narrative', status: 'Complete', source: 'Manual', updated: 'Jul 28', verified: true },
  { code: 'E1-3', name: 'Actions and resources for climate policies', topic: 'E1', type: 'Quantitative', status: 'Complete', source: 'Auto', updated: 'Jul 31', verified: true },
  { code: 'E1-4', name: 'Targets related to climate change', topic: 'E1', type: 'Quantitative', status: 'Complete', source: 'Auto', updated: 'Jul 31', verified: true },
  { code: 'E1-5', name: 'Energy consumption and mix', topic: 'E1', type: 'Quantitative', status: 'Complete', source: 'Auto', updated: 'Jul 31', verified: true },
  { code: 'E1-6', name: 'Gross Scopes 1, 2, 3 and total GHG emissions', topic: 'E1', type: 'Quantitative', status: 'Complete', source: 'Auto', updated: 'Jul 31', verified: true },
  { code: 'E3-1', name: 'Water consumption in areas of water stress', topic: 'E3', type: 'Quantitative', status: 'Pending', source: 'Manual', updated: 'Jul 15', verified: false },
  { code: 'E3-4', name: 'Water intensity per revenue', topic: 'E3', type: 'Quantitative', status: 'Pending', source: 'Pending', updated: '—', verified: false },
  { code: 'E4-1', name: 'Transition plan for biodiversity', topic: 'E4', type: 'Narrative', status: 'Pending', source: 'Manual', updated: 'Jul 18', verified: false },
  { code: 'E4-3', name: 'Biodiversity targets and action plans', topic: 'E4', type: 'Narrative', status: 'Pending', source: 'Pending', updated: '—', verified: false },
  { code: 'E5-1', name: 'Policies for resource use and circular economy', topic: 'E5', type: 'Narrative', status: 'Complete', source: 'Auto', updated: 'Jul 29', verified: true },
  { code: 'S1-1', name: 'Policies for own workforce', topic: 'S1', type: 'Narrative', status: 'Complete', source: 'Manual', updated: 'Jul 22', verified: true },
  { code: 'S2-1', name: 'Policies for value chain workers', topic: 'S2', type: 'Narrative', status: 'Pending', source: 'Manual', updated: 'Jul 10', verified: false },
  { code: 'S2-4', name: 'Taking action on value chain workers impacts', topic: 'S2', type: 'Qualitative', status: 'Pending', source: 'Pending', updated: '—', verified: false },
  { code: 'G1-1', name: 'Business conduct policies', topic: 'G1', type: 'Narrative', status: 'Complete', source: 'Manual', updated: 'Jul 20', verified: true },
];

const MATERIALITY = [
  { topic: 'Climate action', impact: 92, financial: 88 },
  { topic: 'Circular economy', impact: 85, financial: 78 },
  { topic: 'Waste management', impact: 78, financial: 82 },
  { topic: 'Worker safety', impact: 72, financial: 45 },
  { topic: 'Supply chain', impact: 68, financial: 72 },
  { topic: 'Biodiversity', impact: 55, financial: 35 },
  { topic: 'Water stewardship', impact: 48, financial: 42 },
  { topic: 'Anti-corruption', impact: 35, financial: 58 },
];

const statusStyle: Record<string, string> = {
  Complete: 'bg-[#34D399]/10 text-[#34D399]',
  Pending: 'bg-[#F59E0B]/10 text-[#F59E0B]',
};

export default function CSRDDisclosure() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['E1']));
  const { runtime } = useEarthRuntime();
  const csrd = runtime.eliability.asCsrdView();

  const toggle = (code: string) => {
    const next = new Set(expanded);
    next.has(code) ? next.delete(code) : next.add(code);
    setExpanded(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">CSRD Disclosure</h1>
          <p className="text-[11px] text-[#94A3B8]">
            ESRS · {csrd.datapoint} total {csrd.totalTCO2e.toLocaleString()} tCO₂e (same e-liability spine)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-[#34D399]">94%</p>
            <p className="text-[8px] font-mono text-[#64748B]">COMPLETE</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px] text-[#F59E0B]">Dec 15, 2026</p>
            <p className="text-[8px] font-mono text-[#64748B]">137 DAYS</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
        <div className="border-b border-white/[0.06] px-4 py-2.5">
          <h2 className="text-[11px] font-medium text-[#E2E8F0]">ESRS Topics</h2>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {ESRS.map(e => (
            <div key={e.code}>
              <button onClick={() => toggle(e.code)} className="flex items-center justify-between w-full px-4 py-2 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  {expanded.has(e.code) ? <ChevronDown size={12} className="text-[#64748B]" /> : <ChevronRight size={12} className="text-[#64748B]" />}
                  <span className="font-mono text-[10px] text-[#60A5FA] w-6">{e.code}</span>
                  <span className="text-[11px] text-[#E2E8F0]">{e.topic}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${(e.done / e.total) * 100}%`, backgroundColor: e.color }} />
                  </div>
                  <span className="font-mono text-[10px] w-12 text-right" style={{ color: e.color }}>{e.done}/{e.total}</span>
                  {e.done === e.total ? <CheckCircle2 size={12} className="text-[#34D399]" /> : <Clock size={12} className="text-[#F59E0B]" />}
                </div>
              </button>
              {expanded.has(e.code) && (
                <div className="bg-black/10 px-4 py-2">
                  {DATAPOINTS.filter(d => d.topic === e.code).map(d => (
                    <div key={d.code} className="flex items-center justify-between py-1 border-b border-white/[0.02] last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-[#64748B] w-10">{d.code}</span>
                        <span className="text-[10px] text-[#94A3B8]">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-[#64748B]">{d.type}</span>
                        <span className={clsx('px-1.5 py-0.5 rounded text-[8px] font-semibold', statusStyle[d.status] || 'bg-white/5 text-[#64748B]')}>{d.status}</span>
                        {d.verified ? <CheckCircle2 size={10} className="text-[#34D399]" /> : <Clock size={10} className="text-[#64748B]" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4">
          <h3 className="text-[11px] font-medium text-[#E2E8F0] mb-3">Double Materiality Matrix</h3>
          <div className="relative h-[200px] border-l border-b border-white/[0.08]">
            <span className="absolute -left-1 top-0 text-[7px] text-[#64748B] -rotate-90 origin-bottom-left translate-y-full">Impact materiality →</span>
            <span className="absolute bottom-[-14px] right-0 text-[7px] text-[#64748B]">Financial materiality →</span>
            {MATERIALITY.map(m => (
              <div key={m.topic} className="absolute group" style={{ left: `${m.financial}%`, bottom: `${m.impact}%`, transform: 'translate(-50%, 50%)' }}>
                <div className={clsx('h-3 w-3 rounded-full border-2 cursor-pointer transition-transform hover:scale-150', m.impact > 70 && m.financial > 70 ? 'bg-[#EF4444]/40 border-[#EF4444]' : m.impact > 50 || m.financial > 50 ? 'bg-[#F59E0B]/40 border-[#F59E0B]' : 'bg-[#34D399]/40 border-[#34D399]')} />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[8px] text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity bg-[#060B18] px-1 rounded">{m.topic}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2 flex items-center gap-1"><Shield size={10} />Assurance</h3>
            <p className="text-[10px] text-[#E2E8F0]">Limited assurance engagement</p>
            <p className="text-[9px] text-[#64748B] mt-1">Auditor: KPMG AG</p>
            <p className="text-[9px] text-[#64748B]">Ref: ESG-2026-HB-001</p>
            <p className="text-[9px] text-[#64748B] mt-1">Scope: ESRS E1, E5, S1, G1</p>
            <div className="mt-2 pt-2 border-t border-white/[0.06]">
              <p className="text-[8px] font-mono text-[#64748B]">Fieldwork: Oct 2026</p>
              <p className="text-[8px] font-mono text-[#64748B]">Report: Nov 2026</p>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Pending Actions</h3>
            <div className="space-y-1.5">
              {[
                'E3: Water stress area mapping',
                'E4: Biodiversity action plan',
                'S2: Value chain worker assessment',
                'E4: Ecosystem impact quantification',
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <AlertTriangle size={9} className="text-[#F59E0B] flex-shrink-0" />
                  <span className="text-[9px] text-[#94A3B8]">{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
