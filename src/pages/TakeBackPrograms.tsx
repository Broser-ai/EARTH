import { useState } from 'react';
import clsx from 'clsx';
import { Package, Search, CheckCircle2, ArrowRight, RefreshCw, Recycle, CreditCard, ShoppingCart, Wrench } from 'lucide-react';

const STEPS = [
  { label: 'Return', count: 1847, icon: Package, color: '#60A5FA' },
  { label: 'Grade', count: 1623, icon: Search, color: '#F59E0B' },
  { label: 'Credit', count: 1487, icon: CreditCard, color: '#34D399' },
  { label: 'Replace', count: 1064, icon: ShoppingCart, color: '#a78bfa' },
  { label: 'Recycle', count: 847, icon: Recycle, color: '#94A3B8' },
];

const KPIS = [
  { label: 'Items Returned', value: '12,847' },
  { label: 'Credits Issued', value: '€487k' },
  { label: 'Replacements', value: '9,214' },
  { label: 'Conversion', value: '71.7%' },
  { label: 'Materials Recovered', value: '847t' },
];

const PROGRAMS = [
  { name: 'Power Tools Trade-in', partners: 'Bosch, Makita, Hilti', returns: 4847, avgCredit: '€23.00', recovery: '94.2%', status: 'Active' },
  { name: 'Paint Container Return', partners: 'BASF, AkzoNobel', returns: 3214, avgCredit: '€2.80', recovery: '98.7%', status: 'Active' },
  { name: 'Battery Collection', partners: 'Varta, Duracell', returns: 2847, avgCredit: 'Weight-based', recovery: '99.1%', status: 'Active' },
  { name: 'Packaging Take-back', partners: 'All brands', returns: 1247, avgCredit: '€0.25/kg', recovery: '96.4%', status: 'Paused' },
  { name: 'Lighting Recycling', partners: 'Osram, Philips', returns: 692, avgCredit: '€1.50', recovery: '87.3%', status: 'Pilot' },
];

const RETURNS = [
  { id: 'RT-8472', customer: 'Bauer GmbH', product: 'Bosch GSR 18V-60', condition: 'A', credit: '€24.00', replacement: true, recycler: 'Alba Group' },
  { id: 'RT-8471', customer: 'Schmidt Bau AG', product: 'Makita DHP486', condition: 'B', credit: '€22.00', replacement: true, recycler: 'Remondis' },
  { id: 'RT-8470', customer: 'Weber Handwerk', product: 'Hilti TE 6-A22', condition: 'C', credit: '€15.00', replacement: false, recycler: 'Veolia' },
  { id: 'RT-8469', customer: 'Müller & Söhne', product: 'DeWalt DCD791', condition: 'A', credit: '€18.00', replacement: true, recycler: 'PreZero' },
  { id: 'RT-8468', customer: 'Fischer Technik', product: 'Festool TID 18', condition: 'D', credit: '€0.00', replacement: false, recycler: 'Interzero' },
  { id: 'RT-8467', customer: 'Hartmann AG', product: 'Bosch GWS 18V-10', condition: 'B', credit: '€19.50', replacement: true, recycler: 'Alba Group' },
  { id: 'RT-8466', customer: 'Klein Elektro', product: 'Makita DTD172', condition: 'A', credit: '€25.00', replacement: true, recycler: 'Remondis' },
  { id: 'RT-8465', customer: 'Roth Bau GmbH', product: 'Hilti SF 6H-A22', condition: 'B', credit: '€32.00', replacement: true, recycler: 'Veolia' },
];

const REPLACEMENTS = [
  { original: 'Bosch GSR 18V-60 (2021)', replacement: 'Bosch GSR 18V-90 FC', price: '€289.00', credit: '€24.00', net: '€265.00' },
  { original: 'Makita DHP486 (2020)', replacement: 'Makita DHP487', price: '€199.00', credit: '€22.00', net: '€177.00' },
  { original: 'DeWalt DCD791 (2022)', replacement: 'DeWalt DCD800', price: '€249.00', credit: '€18.00', net: '€231.00' },
  { original: 'Hilti SF 6H-A22 (2021)', replacement: 'Hilti SF 6H-A22 (2025)', price: '€459.00', credit: '€32.00', net: '€427.00' },
];

const conditionColor: Record<string, string> = {
  A: 'bg-[#34D399]/10 text-[#34D399]',
  B: 'bg-[#60A5FA]/10 text-[#60A5FA]',
  C: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  D: 'bg-[#EF4444]/10 text-[#EF4444]',
};

const programStatus: Record<string, string> = {
  Active: 'bg-[#34D399]/10 text-[#34D399]',
  Paused: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  Pilot: 'bg-[#60A5FA]/10 text-[#60A5FA]',
};

export default function TakeBackPrograms() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Take-Back Programs</h1>
          <p className="text-[11px] text-[#94A3B8]">Return & Replace — OEM trade-in with automatic replacement ordering</p>
        </div>
        <button className="rounded-md bg-[#60A5FA] px-3 py-1.5 text-[10px] font-medium text-[#060B18]">+ New program</button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1 flex-1">
            <button onClick={() => setActiveStep(i)} className={clsx('flex-1 rounded-lg border p-2.5 text-center transition-colors', activeStep === i ? 'border-white/[0.12] bg-white/[0.05]' : 'border-white/[0.06] bg-black/20')}>
              <s.icon size={14} className="mx-auto mb-1" style={{ color: s.color }} />
              <p className="font-mono text-sm font-bold text-[#E2E8F0]">{s.count.toLocaleString()}</p>
              <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{s.label}</p>
            </button>
            {i < STEPS.length - 1 && <ArrowRight size={12} className="text-[#475569] flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {KPIS.map(k => (
          <div key={k.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-center">
            <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{k.label}</p>
            <p className="mt-0.5 font-mono text-base font-bold text-[#E2E8F0]">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
        <div className="border-b border-white/[0.06] px-4 py-2.5">
          <h2 className="text-[11px] font-medium text-[#E2E8F0]">Programs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Program', 'OEM Partners', 'Returns (30d)', 'Avg Credit', 'Recovery', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROGRAMS.map(p => (
                <tr key={p.name} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-3 py-1.5 text-[11px] font-medium text-[#E2E8F0]">{p.name}</td>
                  <td className="px-3 py-1.5 text-[10px] text-[#94A3B8]">{p.partners}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{p.returns.toLocaleString()}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#34D399]">{p.avgCredit}</td>
                  <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{p.recovery}</td>
                  <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', programStatus[p.status])}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Recent Returns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['ID', 'Customer', 'Product', 'Grade', 'Credit', 'Replaced', 'Recycler'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RETURNS.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#60A5FA]">#{r.id}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0]">{r.customer}</td>
                    <td className="px-3 py-1.5 text-[10px] text-[#94A3B8]">{r.product}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', conditionColor[r.condition])}>{r.condition}</span></td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#34D399]">{r.credit}</td>
                    <td className="px-3 py-1.5">{r.replacement ? <CheckCircle2 size={12} className="text-[#34D399]" /> : <span className="text-[9px] text-[#64748B]">—</span>}</td>
                    <td className="px-3 py-1.5 text-[10px] text-[#94A3B8]">{r.recycler}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Credit Balance</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Outstanding</span>
                <span className="font-mono font-bold text-[#E2E8F0]">€23,847</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Redeemed (30d)</span>
                <span className="font-mono text-[#34D399]">€8,412</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Expired</span>
                <span className="font-mono text-[#EF4444]">€1,247</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Suggested Replacements</h3>
            <div className="space-y-2">
              {REPLACEMENTS.map((r, i) => (
                <div key={i} className="rounded border border-white/[0.06] bg-black/20 p-2">
                  <p className="text-[9px] text-[#64748B]">{r.original}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ArrowRight size={8} className="text-[#60A5FA]" />
                    <p className="text-[10px] text-[#E2E8F0]">{r.replacement}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-[9px] text-[#94A3B8]">{r.price} - {r.credit}</span>
                    <span className="font-mono text-[9px] font-semibold text-[#34D399]">Net {r.net}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[9px] font-mono uppercase tracking-wider text-[#64748B] mb-2">Material Recovery</h3>
            {[
              { name: 'Metals', pct: 42, color: '#60A5FA' },
              { name: 'Plastics', pct: 28, color: '#34D399' },
              { name: 'Glass', pct: 12, color: '#F59E0B' },
              { name: 'Paper', pct: 10, color: '#a78bfa' },
              { name: 'Other', pct: 8, color: '#64748B' },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-2 mb-1">
                <span className="text-[9px] text-[#94A3B8] w-12">{m.name}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
                </div>
                <span className="font-mono text-[9px] text-[#64748B] w-8 text-right">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
