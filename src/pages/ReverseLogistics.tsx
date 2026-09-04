import { useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, Package, Cpu, Factory, ShoppingCart, RefreshCw, Gavel, Clock, CheckCircle2, AlertTriangle, ArrowUpRight, Zap, Link2 } from 'lucide-react';

const TABS = ['Loop A (OEM)', 'Loop B (B2B)', 'Rules Engine', 'Activity Log'] as const;

const PIPELINE = [
  { label: 'Intake', count: 1847, icon: Package, color: '#60A5FA' },
  { label: 'Rules Engine', count: 214, icon: Cpu, color: '#F59E0B' },
  { label: 'OEM Take-back', count: 892, icon: Factory, color: '#34D399' },
  { label: 'B2B Marketplace', count: 741, icon: ShoppingCart, color: '#a78bfa' },
];

const KPIS = [
  { label: 'Items Processed', value: '42,847', delta: '+1,247 this week' },
  { label: 'OEM Credits', value: '€847k', delta: '+€34k this week' },
  { label: 'Auction Revenue', value: '€312k', delta: '+€18k this week' },
  { label: 'Recovery Rate', value: '94.2%', delta: '+0.8pp' },
  { label: 'CO₂ Avoided', value: '1,847t', delta: '+124t' },
];

const OEM_CONTRACTS = [
  { oem: 'Bosch Power Tools', sku: 'BPT-1000–BPT-4999', minCondition: 'B', credit: '€18.50', active: 247, expiry: '2027-03-15', status: 'Active' },
  { oem: 'Makita Europe', sku: 'MAK-2000–MAK-6999', minCondition: 'B', credit: '€22.00', active: 183, expiry: '2027-06-30', status: 'Active' },
  { oem: 'Hilti AG', sku: 'HLT-1000–HLT-3999', minCondition: 'A', credit: '€45.00', active: 92, expiry: '2026-12-31', status: 'Active' },
  { oem: 'DeWalt / Stanley', sku: 'DW-5000–DW-8999', minCondition: 'C', credit: '€12.00', active: 214, expiry: '2027-09-30', status: 'Active' },
  { oem: 'Festool GmbH', sku: 'FST-1000–FST-2999', minCondition: 'A', credit: '€52.00', active: 56, expiry: '2026-11-15', status: 'Expiring' },
];

const RECENT_RETURNS = [
  { id: 'RT-8472', product: 'Bosch GSR 18V-60', condition: 'A', credit: '€24.00', replacement: true, recycler: 'Alba Group' },
  { id: 'RT-8471', product: 'Makita DHP486', condition: 'B', credit: '€22.00', replacement: true, recycler: 'Remondis' },
  { id: 'RT-8470', product: 'Hilti TE 6-A22', condition: 'C', credit: '€15.00', replacement: false, recycler: 'Veolia' },
  { id: 'RT-8469', product: 'DeWalt DCD791', condition: 'A', credit: '€18.00', replacement: true, recycler: 'PreZero' },
  { id: 'RT-8468', product: 'Festool TID 18', condition: 'D', credit: '€0.00', replacement: false, recycler: 'Interzero' },
  { id: 'RT-8467', product: 'Bosch GWS 18V-10', condition: 'B', credit: '€19.50', replacement: true, recycler: 'Alba Group' },
];

const AUCTIONS = [
  { id: 'AUC-047', title: 'Mixed Power Tools Lot', items: 47, weight: '1.2t', type: 'Dutch', reserve: 5680, current: 4200, bids: 0, remaining: '2h 14m', color: '#F59E0B' },
  { id: 'AUC-046', title: 'Scrap Metal Batch', items: 1, weight: '2.4t', type: 'Sealed', reserve: 8400, current: null, bids: 7, remaining: '4h 02m', color: '#60A5FA' },
  { id: 'AUC-045', title: 'Timber Pallet Lot', items: 180, weight: '3.6t', type: 'Vickrey', reserve: 2100, current: null, bids: 12, remaining: '6h 18m', color: '#a78bfa' },
  { id: 'AUC-044', title: 'E-Waste Batch', items: 847, weight: '0.8t', type: 'Dutch', reserve: 3840, current: 3072, bids: 0, remaining: '1h 47m', color: '#F59E0B' },
];

const RULES = [
  { id: 1, name: 'OEM SKU Match', condition: 'SKU in active OEM contract range', action: 'Route → Loop A', priority: 1, hits: 12847 },
  { id: 2, name: 'Condition Gate', condition: 'Physical condition ≥ OEM minimum threshold', action: 'Route → Loop A', priority: 2, hits: 10234 },
  { id: 3, name: 'Value Offset Check', condition: 'Core value > cross-dock logistics cost', action: 'Route → Loop A', priority: 3, hits: 8921 },
  { id: 4, name: 'Bulk Lot Threshold', condition: 'Category accumulation ≥ 500kg', action: 'Auto-bundle → Loop B Lot', priority: 4, hits: 4712 },
  { id: 5, name: 'High-Value Redirect', condition: 'Resale value > €50 per unit', action: 'Route → Loop B Sealed Bid', priority: 5, hits: 2847 },
  { id: 6, name: 'Hazardous Material', condition: 'Material class = HAZMAT', action: 'Route → Certified Disposal', priority: 6, hits: 423 },
  { id: 7, name: 'Expired Contract', condition: 'OEM contract expired or suspended', action: 'Route → Loop B', priority: 7, hits: 1847 },
  { id: 8, name: 'Catchall', condition: 'No other rule matched', action: 'Route → Loop B General', priority: 99, hits: 847 },
];

const ACTIVITY = [
  { time: '14:32:07', msg: 'Intake: 24 items scanned at Hamburg warehouse', type: 'info' },
  { time: '14:31:45', msg: 'OEM Credit: €442.50 issued to Bosch (19 items)', type: 'success' },
  { time: '14:30:12', msg: 'Auction AUC-047: Dutch price declined to €4,200 (-5%)', type: 'warn' },
  { time: '14:28:33', msg: 'Rules Engine: 8 items routed to Loop A (Makita contract)', type: 'info' },
  { time: '14:27:01', msg: 'Lot Builder: Timber lot AUC-045 reached 500kg threshold', type: 'info' },
  { time: '14:25:44', msg: 'OEM Credit: €198.00 issued to DeWalt (11 items)', type: 'success' },
  { time: '14:24:18', msg: 'Sealed Bid: New bid received on AUC-046 (total: 7)', type: 'info' },
  { time: '14:22:55', msg: 'DEMO: SAP manifest would be sent here — ERP not connected', type: 'warn' },
  { time: '14:21:30', msg: 'Grading: 3 items downgraded to D (no OEM credit)', type: 'warn' },
  { time: '14:20:07', msg: 'Intake: 18 items scanned at Munich warehouse', type: 'info' },
  { time: '14:18:42', msg: 'Auto-replacement: 12 orders triggered from take-back credits', type: 'success' },
  { time: '14:17:15', msg: 'Auction AUC-044: Dutch price declined to €3,072 (-5%)', type: 'warn' },
  { time: '14:15:50', msg: 'Rules Engine: Hazmat item routed to certified disposal', type: 'warn' },
  { time: '14:14:22', msg: 'Core Ledger: Debit Bosch material account €847.00', type: 'info' },
  { time: '14:12:55', msg: 'OEM Credit: €585.00 issued to Hilti (13 items)', type: 'success' },
];

const ERP_SYNC = [
  { name: 'SAP S/4HANA', status: 'demo', lastSync: 'not connected' },
  { name: 'Oracle NetSuite', status: 'demo', lastSync: 'not connected' },
  { name: 'DATEV', status: 'demo', lastSync: 'not connected' },
];

const conditionColor: Record<string, string> = {
  A: 'bg-[#34D399]/10 text-[#34D399]',
  B: 'bg-[#60A5FA]/10 text-[#60A5FA]',
  C: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  D: 'bg-[#EF4444]/10 text-[#EF4444]',
};

export default function ReverseLogistics() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Loop A (OEM)');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">Reverse Logistics</h1>
          <p className="text-[11px] text-[#94A3B8]">Dual-loop processing — OEM take-back & B2B marketplace</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono text-[#94A3B8] hover:text-[#E2E8F0]">Export ledger</button>
          <button className="rounded-md bg-[#60A5FA] px-3 py-1.5 text-[10px] font-medium text-[#060B18]">+ Manual intake</button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
        {PIPELINE.map((p, i) => (
          <div key={p.label} className="flex items-center gap-2 flex-1">
            <div className="flex-1 rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-center">
              <p.icon size={16} className="mx-auto mb-1" style={{ color: p.color }} />
              <p className="font-mono text-lg font-bold text-[#E2E8F0]">{p.count.toLocaleString()}</p>
              <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{p.label}</p>
            </div>
            {i < PIPELINE.length - 1 && <ArrowRight size={14} className="text-[#475569] flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {KPIS.map(k => (
          <div key={k.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-center">
            <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{k.label}</p>
            <p className="mt-0.5 font-mono text-base font-bold text-[#E2E8F0]">{k.value}</p>
            <p className="text-[8px] font-mono text-[#34D399]">{k.delta}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={clsx('flex-1 rounded-md px-3 py-1.5 text-[10px] font-mono transition-colors', activeTab === t ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B] hover:text-[#94A3B8]')}>{t}</button>
        ))}
      </div>

      {activeTab === 'Loop A (OEM)' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
            <div className="border-b border-white/[0.06] px-4 py-2.5">
              <h2 className="text-[11px] font-medium text-[#E2E8F0]">OEM Contracts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['OEM Partner', 'SKU Range', 'Min Condition', 'Credit/Unit', 'Active Returns', 'Expiry', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OEM_CONTRACTS.map(c => (
                    <tr key={c.oem} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 text-[11px] font-medium text-[#E2E8F0]">{c.oem}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-[#94A3B8]">{c.sku}</td>
                      <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', conditionColor[c.minCondition])}>Grade {c.minCondition}</span></td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#34D399]">{c.credit}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{c.active}</td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{c.expiry}</td>
                      <td className="px-3 py-1.5">
                        <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', c.status === 'Active' ? 'bg-[#34D399]/10 text-[#34D399]' : 'bg-[#F59E0B]/10 text-[#F59E0B]')}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
            <div className="border-b border-white/[0.06] px-4 py-2.5">
              <h2 className="text-[11px] font-medium text-[#E2E8F0]">Recent Returns & Grading</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {['Return ID', 'Product', 'Condition', 'Credit', 'Replacement', 'Recycler'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_RETURNS.map(r => (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#60A5FA]">#{r.id}</td>
                      <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0]">{r.product}</td>
                      <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', conditionColor[r.condition])}>{r.condition}</span></td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[#34D399]">{r.credit}</td>
                      <td className="px-3 py-1.5">{r.replacement ? <CheckCircle2 size={12} className="text-[#34D399]" /> : <span className="text-[9px] text-[#64748B]">—</span>}</td>
                      <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{r.recycler}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Loop B (B2B)' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {AUCTIONS.map(a => (
              <div key={a.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] text-[#64748B]">{a.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${a.color}15`, color: a.color }}>{a.type}</span>
                </div>
                <h3 className="text-[11px] font-medium text-[#E2E8F0]">{a.title}</h3>
                <p className="text-[9px] text-[#64748B] mt-0.5">{a.items} items · {a.weight}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[8px] font-mono uppercase text-[#64748B]">Reserve</p>
                    <p className="font-mono text-[11px] text-[#94A3B8]">€{a.reserve.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase text-[#64748B]">{a.current ? 'Current' : 'Bids'}</p>
                    <p className="font-mono text-[11px] text-[#E2E8F0]">{a.current ? `€${a.current.toLocaleString()}` : a.bids}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-mono text-[9px] text-[#F59E0B]"><Clock size={10} />{a.remaining}</span>
                  <button className="rounded-md bg-[#60A5FA] px-2.5 py-1 text-[9px] font-medium text-[#060B18]">Place bid</button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <h3 className="text-[11px] font-medium text-[#E2E8F0] mb-2">Lot Builder</h3>
            <p className="text-[9px] text-[#64748B] mb-2">Auto-bundle threshold: 500kg per lot</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Mixed electronics</span>
                <span className="font-mono text-[#E2E8F0]">340 / 500 kg</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#60A5FA]" style={{ width: '68%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Scrap plastics</span>
                <span className="font-mono text-[#E2E8F0]">487 / 500 kg</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#F59E0B]" style={{ width: '97%' }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8]">Timber offcuts</span>
                <span className="font-mono text-[#E2E8F0]">210 / 500 kg</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#60A5FA]" style={{ width: '42%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Rules Engine' && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Routing Rules</h2>
            <button className="rounded-md bg-[#60A5FA] px-2.5 py-1 text-[9px] font-medium text-[#060B18]">+ Add rule</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Priority', 'Rule Name', 'Condition', 'Action', 'Hits (30d)'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RULES.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#64748B]">{r.priority}</td>
                    <td className="px-3 py-1.5 text-[11px] font-medium text-[#E2E8F0]">{r.name}</td>
                    <td className="px-3 py-1.5 text-[10px] text-[#94A3B8] max-w-[280px]">{r.condition}</td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-[#60A5FA]">{r.action}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#E2E8F0]">{r.hits.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Activity Log' && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Activity Log</h2>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-2">
                <span className="font-mono text-[9px] text-[#64748B] mt-0.5 flex-shrink-0">{a.time}</span>
                <span className={clsx('text-[10px]', a.type === 'success' ? 'text-[#34D399]' : a.type === 'warn' ? 'text-[#F59E0B]' : 'text-[#94A3B8]')}>{a.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-2">
        <Link2 size={12} className="text-[#64748B]" />
        <span className="text-[9px] font-mono uppercase tracking-wider text-[#64748B]">ERP Sync (DEMO)</span>
        {ERP_SYNC.map(e => (
          <div key={e.name} className="flex items-center gap-1.5 ml-2">
            <div className={clsx('h-1.5 w-1.5 rounded-full', e.status === 'synced' ? 'bg-[#34D399]' : 'bg-[#F59E0B]')} />
            <span className="text-[9px] text-[#94A3B8]">{e.name}</span>
            <span className="font-mono text-[8px] text-[#F59E0B]">{e.lastSync}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
