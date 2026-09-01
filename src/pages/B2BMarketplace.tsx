import { useState } from 'react';
import clsx from 'clsx';
import { Gavel, Clock, Eye, Package, TrendingUp, ShoppingCart, Truck, FileText, AlertCircle } from 'lucide-react';

const TABS = ['Live Auctions', 'Completed', 'My Bids', 'Watchlist'] as const;

const AUCTIONS = [
  { id: 'AUC-047', title: 'Mixed Power Tools Lot', items: 47, weight: '1.2t', type: 'Dutch', typeBg: 'bg-[#F59E0B]/10 text-[#F59E0B]', reserve: 5680, current: 4200, bids: 0, remaining: '2h 14m', desc: 'Declining reserve -5%/hr. Auto-locks at first bid.' },
  { id: 'AUC-046', title: 'Scrap Metal Batch', items: 1, weight: '2.4t', type: 'Sealed', typeBg: 'bg-[#60A5FA]/10 text-[#60A5FA]', reserve: 8400, current: null, bids: 7, remaining: '4h 02m', desc: 'Hidden bids. Highest wins. Min increment €100.' },
  { id: 'AUC-045', title: 'Timber Pallet Lot', items: 180, weight: '3.6t', type: 'Vickrey', typeBg: 'bg-purple-500/10 text-purple-400', reserve: 2100, current: null, bids: 12, remaining: '6h 18m', desc: 'Highest wins, pays second-highest price.' },
  { id: 'AUC-044', title: 'E-Waste Batch', items: 847, weight: '0.8t', type: 'Dutch', typeBg: 'bg-[#F59E0B]/10 text-[#F59E0B]', reserve: 3840, current: 3072, bids: 0, remaining: '1h 47m', desc: 'Declining reserve -5%/hr. Auto-locks at first bid.' },
];

const SETTLEMENTS = [
  { id: 'LOT-891', desc: 'Power tools mix (34 items)', type: 'Dutch', winning: '€4,120', winner: 'Recycla GmbH', date: '2026-07-29', logistics: 'Collected', invoice: 'Paid' },
  { id: 'LOT-890', desc: 'Ferrous metal 3.2t', type: 'Sealed', winning: '€9,847', winner: 'MetallRecycling AG', date: '2026-07-28', logistics: 'In transit', invoice: 'Paid' },
  { id: 'LOT-889', desc: 'Mixed plastics 1.8t', type: 'Vickrey', winning: '€2,412', winner: 'PlastikWerk GmbH', date: '2026-07-27', logistics: 'Collected', invoice: 'Paid' },
  { id: 'LOT-888', desc: 'Timber offcuts 2.1t', type: 'Dutch', winning: '€1,847', winner: 'HolzRecycling e.K.', date: '2026-07-25', logistics: 'Collected', invoice: 'Pending' },
  { id: 'LOT-887', desc: 'E-waste batch (412 items)', type: 'Sealed', winning: '€5,280', winner: 'ElektroRecycling AG', date: '2026-07-24', logistics: 'Pickup scheduled', invoice: 'Pending' },
  { id: 'LOT-886', desc: 'Cardboard bales 4.7t', type: 'Dutch', winning: '€847', winner: 'PapierWert GmbH', date: '2026-07-22', logistics: 'Collected', invoice: 'Overdue' },
];

const LOT_BUILDER = [
  { name: 'Mixed electronics', current: 340, threshold: 500 },
  { name: 'Scrap plastics', current: 487, threshold: 500 },
  { name: 'Timber offcuts', current: 210, threshold: 500 },
];

const invoiceStyle: Record<string, string> = {
  Paid: 'bg-[#34D399]/10 text-[#34D399]',
  Pending: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  Overdue: 'bg-[#EF4444]/10 text-[#EF4444]',
};

const logisticsStyle: Record<string, string> = {
  Collected: 'bg-[#34D399]/10 text-[#34D399]',
  'In transit': 'bg-[#60A5FA]/10 text-[#60A5FA]',
  'Pickup scheduled': 'bg-white/5 text-[#94A3B8]',
};

export default function B2BMarketplace() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Live Auctions');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-medium text-[#E2E8F0]">B2B Marketplace</h1>
          <p className="text-[11px] text-[#94A3B8]">Wholesale auctions — Dutch, Sealed-bid, Vickrey</p>
        </div>
        <button className="rounded-md bg-[#60A5FA] px-3 py-1.5 text-[10px] font-medium text-[#060B18]">+ Create lot</button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Lots Sold (30d)', value: '24', color: '#60A5FA' },
          { label: 'Total Revenue', value: '€87,412', color: '#34D399' },
          { label: 'Avg Lot Value', value: '€3,642', color: '#E2E8F0' },
          { label: 'Active Bidders', value: '18', color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-center">
            <p className="font-mono text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[8px] font-mono uppercase tracking-wider text-[#64748B]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={clsx('flex-1 rounded-md px-3 py-1.5 text-[10px] font-mono transition-colors', activeTab === t ? 'bg-[#60A5FA]/10 text-[#60A5FA]' : 'text-[#64748B] hover:text-[#94A3B8]')}>
            {t}{t === 'Live Auctions' ? ' (4)' : ''}
          </button>
        ))}
      </div>

      {activeTab === 'Live Auctions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {AUCTIONS.map(a => (
              <div key={a.id} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 hover:border-white/[0.12] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] text-[#64748B]">{a.id}</span>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', a.typeBg)}>{a.type}</span>
                </div>
                <h3 className="text-[12px] font-medium text-[#E2E8F0]">{a.title}</h3>
                <p className="text-[9px] text-[#64748B] mt-0.5">{a.items} items · {a.weight}</p>
                <p className="text-[8px] text-[#475569] mt-1 italic">{a.desc}</p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[8px] font-mono uppercase text-[#64748B]">Reserve</p>
                    <p className="font-mono text-[11px] text-[#94A3B8]">€{a.reserve.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase text-[#64748B]">{a.current !== null ? 'Current' : 'Bids'}</p>
                    <p className="font-mono text-[11px] text-[#E2E8F0]">{a.current !== null ? `€${a.current.toLocaleString()}` : a.bids}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase text-[#64748B]">Remaining</p>
                    <p className="font-mono text-[11px] text-[#F59E0B] flex items-center gap-0.5"><Clock size={9} />{a.remaining}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button className="flex-1 rounded-md bg-[#60A5FA] py-1.5 text-[10px] font-medium text-[#060B18]">Place bid</button>
                  <button className="rounded-md border border-white/[0.06] p-1.5 text-[#64748B] hover:text-[#E2E8F0]"><Eye size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-medium text-[#E2E8F0]">Lot Builder</h3>
              <span className="text-[9px] text-[#64748B]">Auto-bundle threshold: 500kg</span>
            </div>
            <div className="space-y-2">
              {LOT_BUILDER.map(l => {
                const pct = Math.round((l.current / l.threshold) * 100);
                const ready = pct >= 95;
                return (
                  <div key={l.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-[#94A3B8]">{l.name}</span>
                      <span className="font-mono text-[10px] text-[#E2E8F0]">{l.current} / {l.threshold} kg</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06]">
                      <div className={clsx('h-full rounded-full transition-all', ready ? 'bg-[#34D399]' : pct > 80 ? 'bg-[#F59E0B]' : 'bg-[#60A5FA]')} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'Completed' || activeTab === 'My Bids' || activeTab === 'Watchlist') && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03]">
          <div className="border-b border-white/[0.06] px-4 py-2.5">
            <h2 className="text-[11px] font-medium text-[#E2E8F0]">Settlement History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Lot ID', 'Description', 'Type', 'Winning Bid', 'Winner', 'Date', 'Logistics', 'Invoice'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-mono uppercase tracking-wider text-[#475569]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SETTLEMENTS.map(s => (
                  <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#60A5FA]">{s.id}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#E2E8F0]">{s.desc}</td>
                    <td className="px-3 py-1.5 font-mono text-[9px] text-[#94A3B8]">{s.type}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#34D399]">{s.winning}</td>
                    <td className="px-3 py-1.5 text-[11px] text-[#94A3B8]">{s.winner}</td>
                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#94A3B8]">{s.date}</td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', logisticsStyle[s.logistics])}>{s.logistics}</span></td>
                    <td className="px-3 py-1.5"><span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-semibold', invoiceStyle[s.invoice])}>{s.invoice}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
