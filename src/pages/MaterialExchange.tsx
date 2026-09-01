import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  LineChart,
  Package,
  ShoppingCart,
  History,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  BellRing,
} from 'lucide-react';

// ---------- types ----------

type Trend = 'up' | 'down' | 'flat';

interface TickerItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  changePct: number; // signed, 0 = flat
}

interface PriceHistory {
  id: string;
  name: string;
  unit: string;
  current: number;
  changePct: number;
  spark: number[]; // relative series, last 14 points
}

interface AvailableMaterial {
  id: string;
  material: string;
  qty: number;
  qtyUnit: string;
  grade: 'A' | 'B' | 'C';
  location: string;
  marketPrice: number;
  yourPrice: number;
}

interface WantedMaterial {
  id: string;
  material: string;
  qty: number;
  qtyUnit: string;
  deadline: string;
  bestOffer: number;
  supplier: string;
}

interface Transaction {
  id: string;
  date: string;
  material: string;
  qty: number;
  qtyUnit: string;
  price: number;
  counterparty: string;
  type: 'sold' | 'bought';
  status: 'settled' | 'pending' | 'disputed';
}

interface PriceAlert {
  id: string;
  material: string;
  condition: 'above' | 'below';
  threshold: number;
  current: number;
  active: boolean;
}

// ---------- mock data ----------

const TICKER: TickerItem[] = [
  { id: 'mix-plastic', name: 'Mixed plastics', price: 142, unit: 't', changePct: 3.2 },
  { id: 'cardboard', name: 'Cardboard', price: 87, unit: 't', changePct: -1.8 },
  { id: 'metal-scrap', name: 'Metal scrap', price: 310, unit: 't', changePct: 5.1 },
  { id: 'glass', name: 'Glass', price: 54, unit: 't', changePct: 0 },
  { id: 'wood', name: 'Wood waste', price: 42, unit: 't', changePct: 0.8 },
  { id: 'ewaste', name: 'E-waste', price: 1240, unit: 't', changePct: 7.2 },
  { id: 'copper', name: 'Copper', price: 8847, unit: 't', changePct: -2.1 },
  { id: 'aluminum', name: 'Aluminum', price: 2410, unit: 't', changePct: 1.4 },
];

const PRICE_HISTORY: PriceHistory[] = [
  {
    id: 'mix-plastic',
    name: 'Mixed plastics',
    unit: '€/t',
    current: 142,
    changePct: 3.2,
    spark: [118, 121, 119, 124, 128, 126, 131, 129, 133, 137, 135, 139, 140, 142],
  },
  {
    id: 'cardboard',
    name: 'Cardboard',
    unit: '€/t',
    current: 87,
    changePct: -1.8,
    spark: [96, 95, 93, 94, 91, 92, 90, 89, 91, 88, 89, 87, 88, 87],
  },
  {
    id: 'metal-scrap',
    name: 'Metal scrap',
    unit: '€/t',
    current: 310,
    changePct: 5.1,
    spark: [252, 258, 261, 265, 270, 268, 275, 281, 288, 292, 298, 301, 305, 310],
  },
  {
    id: 'ewaste',
    name: 'E-waste',
    unit: '€/t',
    current: 1240,
    changePct: 7.2,
    spark: [980, 1005, 1020, 1040, 1060, 1055, 1090, 1110, 1140, 1160, 1190, 1205, 1225, 1240],
  },
  {
    id: 'copper',
    name: 'Copper',
    unit: '€/t',
    current: 8847,
    changePct: -2.1,
    spark: [9200, 9150, 9180, 9100, 9050, 9080, 9010, 8980, 8940, 8900, 8920, 8880, 8860, 8847],
  },
  {
    id: 'aluminum',
    name: 'Aluminum',
    unit: '€/t',
    current: 2410,
    changePct: 1.4,
    spark: [2340, 2350, 2338, 2360, 2355, 2370, 2365, 2380, 2375, 2390, 2395, 2400, 2405, 2410],
  },
];

const AVAILABLE: AvailableMaterial[] = [
  { id: 'AVL-01', material: 'Mixed plastics (PP/PE)', qty: 84, qtyUnit: 't', grade: 'A', location: 'Hamburg DC', marketPrice: 142, yourPrice: 138 },
  { id: 'AVL-02', material: 'Cardboard (baled)', qty: 210, qtyUnit: 't', grade: 'A', location: 'Berlin DC', marketPrice: 87, yourPrice: 89 },
  { id: 'AVL-03', material: 'Metal scrap — ferrous', qty: 46, qtyUnit: 't', grade: 'B', location: 'Munich DC', marketPrice: 310, yourPrice: 295 },
  { id: 'AVL-04', material: 'Glass cullet — clear', qty: 128, qtyUnit: 't', grade: 'A', location: 'Cologne DC', marketPrice: 54, yourPrice: 54 },
  { id: 'AVL-05', material: 'Wood waste — pallets', qty: 340, qtyUnit: 't', grade: 'B', location: 'Stuttgart DC', marketPrice: 42, yourPrice: 40 },
  { id: 'AVL-06', material: 'E-waste — small appliances', qty: 12, qtyUnit: 't', grade: 'A', location: 'Hamburg DC', marketPrice: 1240, yourPrice: 1210 },
  { id: 'AVL-07', material: 'Copper wire scrap', qty: 3.4, qtyUnit: 't', grade: 'A', location: 'Frankfurt DC', marketPrice: 8847, yourPrice: 8700 },
  { id: 'AVL-08', material: 'Aluminum profile offcuts', qty: 18, qtyUnit: 't', grade: 'B', location: 'Leipzig DC', marketPrice: 2410, yourPrice: 2380 },
  { id: 'AVL-09', material: 'Mixed construction rubble', qty: 520, qtyUnit: 't', grade: 'C', location: 'Dresden DC', marketPrice: 18, yourPrice: 15 },
  { id: 'AVL-10', material: 'Plastic film — LDPE', qty: 61, qtyUnit: 't', grade: 'B', location: 'Nuremberg DC', marketPrice: 96, yourPrice: 92 },
];

const WANTED: WantedMaterial[] = [
  { id: 'WNT-01', material: 'Cardboard (baled) — bulk', qty: 150, qtyUnit: 't', deadline: '2026-08-08', bestOffer: 85, supplier: 'PreZero' },
  { id: 'WNT-02', material: 'Metal scrap — non-ferrous', qty: 22, qtyUnit: 't', deadline: '2026-08-12', bestOffer: 3180, supplier: 'Stena Recycling' },
  { id: 'WNT-03', material: 'Recycled PET pellets', qty: 40, qtyUnit: 't', deadline: '2026-08-05', bestOffer: 610, supplier: 'Interzero' },
  { id: 'WNT-04', material: 'Wood chip — biomass grade', qty: 200, qtyUnit: 't', deadline: '2026-08-20', bestOffer: 38, supplier: 'Tönsmeier' },
  { id: 'WNT-05', material: 'E-waste — batteries (sorted)', qty: 6, qtyUnit: 't', deadline: '2026-08-03', bestOffer: 1480, supplier: 'Remondis' },
  { id: 'WNT-06', material: 'Glass cullet — mixed color', qty: 90, qtyUnit: 't', deadline: '2026-08-15', bestOffer: 49, supplier: 'Veolia DE' },
];

const TRANSACTIONS: Transaction[] = [
  { id: 'TXN-1042', date: '2026-07-30', material: 'Cardboard (baled)', qty: 95, qtyUnit: 't', price: 88, counterparty: 'PreZero', type: 'sold', status: 'settled' },
  { id: 'TXN-1041', date: '2026-07-29', material: 'Metal scrap — ferrous', qty: 30, qtyUnit: 't', price: 302, counterparty: 'Stena Recycling', type: 'sold', status: 'settled' },
  { id: 'TXN-1040', date: '2026-07-28', material: 'Recycled PET pellets', qty: 18, qtyUnit: 't', price: 605, counterparty: 'Interzero', type: 'bought', status: 'settled' },
  { id: 'TXN-1039', date: '2026-07-27', material: 'E-waste — small appliances', qty: 4, qtyUnit: 't', price: 1195, counterparty: 'Remondis', type: 'sold', status: 'pending' },
  { id: 'TXN-1038', date: '2026-07-25', material: 'Aluminum profile offcuts', qty: 9, qtyUnit: 't', price: 2370, counterparty: 'ELG Haniel', type: 'sold', status: 'settled' },
  { id: 'TXN-1037', date: '2026-07-24', material: 'Wood chip — biomass grade', qty: 60, qtyUnit: 't', price: 39, counterparty: 'Tönsmeier', type: 'bought', status: 'disputed' },
  { id: 'TXN-1036', date: '2026-07-22', material: 'Copper wire scrap', qty: 1.2, qtyUnit: 't', price: 8790, counterparty: 'Scherer + Kohl', type: 'sold', status: 'settled' },
  { id: 'TXN-1035', date: '2026-07-21', material: 'Glass cullet — clear', qty: 44, qtyUnit: 't', price: 55, counterparty: 'Veolia DE', type: 'sold', status: 'settled' },
];

const ALERTS: PriceAlert[] = [
  { id: 'ALR-01', material: 'Copper', condition: 'above', threshold: 9000, current: 8847, active: true },
  { id: 'ALR-02', material: 'Mixed plastics', condition: 'above', threshold: 150, current: 142, active: true },
  { id: 'ALR-03', material: 'Cardboard', condition: 'below', threshold: 80, current: 87, active: false },
  { id: 'ALR-04', material: 'E-waste', condition: 'above', threshold: 1300, current: 1240, active: true },
];

// ---------- helpers ----------

const trendOf = (pct: number): Trend => (pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat');

const trendColor: Record<Trend, string> = {
  up: '#34D399',
  down: '#EF4444',
  flat: '#94A3B8',
};

const gradeColor: Record<AvailableMaterial['grade'], string> = {
  A: '#34D399',
  B: '#60A5FA',
  C: '#F59E0B',
};

const statusStyles: Record<Transaction['status'], string> = {
  settled: 'text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10',
  pending: 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10',
  disputed: 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10',
};

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: n < 100 ? 2 : 0 });

const fmtQty = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 1 : 0 });

// ---------- shared bits ----------

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  accent,
  right,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color: accent }} />
        <h2 className="font-mono text-xs tracking-widest uppercase text-[#F1F5F9]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function TrendIcon({ trend, size = 11 }: { trend: Trend; size?: number }) {
  if (trend === 'up') return <TrendingUp size={size} style={{ color: trendColor.up }} />;
  if (trend === 'down') return <TrendingDown size={size} style={{ color: trendColor.down }} />;
  return <Minus size={size} style={{ color: trendColor.flat }} />;
}

function ChangeBadge({ pct }: { pct: number }) {
  const trend = trendOf(pct);
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums"
      style={{ color: trendColor[trend] }}
    >
      <TrendIcon trend={trend} size={11} />
      {pct === 0 ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}
    </span>
  );
}

// ---------- ticker bar ----------

function TickerBar() {
  const loop = [...TICKER, ...TICKER];
  return (
    <Card className="!p-0 overflow-hidden mb-6">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex items-stretch divide-x divide-white/5 min-w-max">
          {loop.map((item, i) => {
            const trend = trendOf(item.changePct);
            return (
              <div
                key={`${item.id}-${i}`}
                className="flex items-center gap-3 px-5 py-3.5 whitespace-nowrap"
              >
                <span className="font-mono text-[11px] uppercase tracking-wide text-[#94A3B8]">
                  {item.name}
                </span>
                <span className="font-mono text-sm text-[#F1F5F9] tabular-nums">
                  €{fmtMoney(item.price)}/{item.unit}
                </span>
                <ChangeBadge pct={item.changePct} />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

// ---------- price history sparklines ----------

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-[2px] h-10">
      {data.map((v, i) => {
        const h = Math.max(4, ((v - min) / range) * 100);
        return (
          <div
            key={i}
            className="w-1.5 rounded-sm"
            style={{
              height: `${h}%`,
              backgroundColor: color,
              opacity: 0.35 + (i / data.length) * 0.65,
            }}
          />
        );
      })}
    </div>
  );
}

function PriceHistorySection() {
  return (
    <Card>
      <SectionLabel icon={LineChart} title="Price history — 14 day" accent="#60A5FA" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRICE_HISTORY.map((p) => {
          const trend = trendOf(p.changePct);
          const color = trendColor[trend];
          return (
            <div
              key={p.id}
              className="rounded-md border border-white/5 bg-black/20 p-3.5"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-[12px] text-[#F1F5F9]">{p.name}</div>
                  <div className="font-mono text-lg text-[#F1F5F9] tabular-nums">
                    €{fmtMoney(p.current)}
                    <span className="text-[10px] text-[#475569] ml-1">{p.unit}</span>
                  </div>
                </div>
                <ChangeBadge pct={p.changePct} />
              </div>
              <Sparkline data={p.spark} color={color} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- list material modal ----------

function ListMaterialModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#111827] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-xs tracking-widest uppercase text-[#F1F5F9]">
            List Material
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
              Material
            </label>
            <input
              type="text"
              placeholder="e.g. Mixed plastics (PP/PE)"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Quantity (t)
              </label>
              <input
                type="number"
                placeholder="0"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-mono text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Asking price (€/t)
              </label>
              <input
                type="number"
                placeholder="0"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm font-mono text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Quality grade
              </label>
              <select className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#60A5FA]/50">
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Hamburg DC"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-wider rounded-md px-3 py-2 border border-white/10 text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-wider rounded-md px-3 py-2 border border-[#60A5FA]/40 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors"
          >
            Publish listing
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- available materials table ----------

function AvailableMaterialsTable() {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-1">
        <SectionLabel icon={Package} title="Available materials" accent="#34D399" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[860px]">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-[#475569]">
              <th className="py-2 pl-4 pr-2 font-normal">Material</th>
              <th className="py-2 px-2 font-normal text-right">Qty available</th>
              <th className="py-2 px-2 font-normal">Grade</th>
              <th className="py-2 px-2 font-normal">Location</th>
              <th className="py-2 px-2 font-normal text-right">Market price</th>
              <th className="py-2 px-2 font-normal text-right">Your price</th>
              <th className="py-2 pr-4 pl-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {AVAILABLE.map((m) => {
              const diff = m.yourPrice - m.marketPrice;
              const diffColor =
                diff > 0 ? '#34D399' : diff < 0 ? '#EF4444' : '#94A3B8';
              return (
                <tr
                  key={m.id}
                  className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="py-3 pl-4 pr-2 text-[12px] text-[#F1F5F9]">
                    {m.material}
                  </td>
                  <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right tabular-nums">
                    {fmtQty(m.qty)} {m.qtyUnit}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide border font-mono"
                      style={{
                        color: gradeColor[m.grade],
                        borderColor: `${gradeColor[m.grade]}4D`,
                        backgroundColor: `${gradeColor[m.grade]}1A`,
                      }}
                    >
                      Grade {m.grade}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-mono text-[11px] text-[#94A3B8]">
                    {m.location}
                  </td>
                  <td className="py-3 px-2 font-mono text-[12px] text-[#94A3B8] text-right tabular-nums">
                    €{fmtMoney(m.marketPrice)}
                  </td>
                  <td className="py-3 px-2 font-mono text-[12px] text-right tabular-nums">
                    <span style={{ color: diffColor }}>€{fmtMoney(m.yourPrice)}</span>
                  </td>
                  <td className="py-3 pr-4 pl-2 text-right">
                    <div className="inline-flex gap-1.5">
                      <button className="font-mono text-[10px] uppercase tracking-wide rounded px-2 py-1 border border-white/10 text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/20 transition-colors">
                        List
                      </button>
                      <button className="font-mono text-[10px] uppercase tracking-wide rounded px-2 py-1 border border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] hover:bg-[#34D399]/20 transition-colors">
                        Sell
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-white/5 font-mono text-[10px] text-[#475569]">
        showing {AVAILABLE.length} of {AVAILABLE.length} listings
      </div>
    </Card>
  );
}

// ---------- wanted materials table ----------

function WantedMaterialsTable() {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-1">
        <SectionLabel icon={ShoppingCart} title="Wanted materials" accent="#F59E0B" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-[#475569]">
              <th className="py-2 pl-4 pr-2 font-normal">Material</th>
              <th className="py-2 px-2 font-normal text-right">Qty needed</th>
              <th className="py-2 px-2 font-normal">Deadline</th>
              <th className="py-2 px-2 font-normal text-right">Best offer</th>
              <th className="py-2 px-2 font-normal">Supplier</th>
              <th className="py-2 pr-4 pl-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {WANTED.map((w) => (
              <tr
                key={w.id}
                className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-3 pl-4 pr-2 text-[12px] text-[#F1F5F9]">
                  {w.material}
                </td>
                <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right tabular-nums">
                  {fmtQty(w.qty)} {w.qtyUnit}
                </td>
                <td className="py-3 px-2 font-mono text-[11px] text-[#94A3B8]">
                  {w.deadline}
                </td>
                <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right tabular-nums">
                  €{fmtMoney(w.bestOffer)}
                </td>
                <td className="py-3 px-2 text-[12px] text-[#94A3B8]">
                  {w.supplier}
                </td>
                <td className="py-3 pr-4 pl-2 text-right">
                  <div className="inline-flex gap-1.5">
                    <button className="font-mono text-[10px] uppercase tracking-wide rounded px-2 py-1 border border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors">
                      Buy
                    </button>
                    <button className="font-mono text-[10px] uppercase tracking-wide rounded px-2 py-1 border border-white/10 text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/20 transition-colors">
                      Counter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-white/5 font-mono text-[10px] text-[#475569]">
        showing {WANTED.length} of {WANTED.length} requests
      </div>
    </Card>
  );
}

// ---------- recent transactions ----------

function RecentTransactions() {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-1">
        <SectionLabel icon={History} title="Recent transactions" accent="#94A3B8" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-wider text-[#475569]">
              <th className="py-2 pl-4 pr-2 font-normal">Date</th>
              <th className="py-2 px-2 font-normal">Material</th>
              <th className="py-2 px-2 font-normal text-right">Qty</th>
              <th className="py-2 px-2 font-normal text-right">Price</th>
              <th className="py-2 px-2 font-normal">Counterparty</th>
              <th className="py-2 px-2 font-normal">Type</th>
              <th className="py-2 pr-4 pl-2 font-normal text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map((t) => (
              <tr
                key={t.id}
                className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-3 pl-4 pr-2 font-mono text-[11px] text-[#94A3B8]">
                  {t.date}
                </td>
                <td className="py-3 px-2 text-[12px] text-[#F1F5F9]">
                  {t.material}
                </td>
                <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right tabular-nums">
                  {fmtQty(t.qty)} {t.qtyUnit}
                </td>
                <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right tabular-nums">
                  €{fmtMoney(t.price)}
                </td>
                <td className="py-3 px-2 text-[12px] text-[#94A3B8]">
                  {t.counterparty}
                </td>
                <td className="py-3 px-2">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide',
                      t.type === 'sold' ? 'text-[#34D399]' : 'text-[#60A5FA]',
                    )}
                  >
                    {t.type === 'sold' ? (
                      <ArrowUpRight size={11} />
                    ) : (
                      <ArrowDownRight size={11} />
                    )}
                    {t.type}
                  </span>
                </td>
                <td className="py-3 pr-4 pl-2 text-right">
                  <span
                    className={clsx(
                      'rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide border font-mono',
                      statusStyles[t.status],
                    )}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-3 border-t border-white/5 font-mono text-[10px] text-[#475569]">
        showing {TRANSACTIONS.length} of {TRANSACTIONS.length} transactions
      </div>
    </Card>
  );
}

// ---------- price alerts ----------

function PriceAlerts() {
  const [alerts, setAlerts] = useState(ALERTS);

  const toggle = (id: string) =>
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)),
    );

  return (
    <Card>
      <SectionLabel
        icon={Bell}
        title="Price alerts"
        accent="#F59E0B"
        right={
          <button className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide rounded px-2 py-1 border border-white/10 text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/20 transition-colors">
            <Plus size={11} />
            New
          </button>
        }
      />
      <div className="space-y-2.5">
        {alerts.map((a) => {
          const triggered =
            a.condition === 'above' ? a.current >= a.threshold : a.current <= a.threshold;
          return (
            <div
              key={a.id}
              className={clsx(
                'rounded-md border px-3 py-2.5',
                triggered && a.active
                  ? 'border-[#F59E0B]/30 bg-[#F59E0B]/5'
                  : 'border-white/5 bg-black/20',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {triggered && a.active ? (
                    <BellRing size={12} className="text-[#F59E0B]" />
                  ) : (
                    <Bell size={12} className="text-[#475569]" />
                  )}
                  <span className="text-[12px] text-[#F1F5F9]">{a.material}</span>
                </div>
                <button
                  onClick={() => toggle(a.id)}
                  className={clsx(
                    'font-mono text-[9px] uppercase tracking-wide rounded px-1.5 py-0.5 border',
                    a.active
                      ? 'text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10'
                      : 'text-[#475569] border-white/10',
                  )}
                >
                  {a.active ? 'on' : 'off'}
                </button>
              </div>
              <div className="font-mono text-[10px] text-[#94A3B8] mt-1 flex items-center justify-between">
                <span>
                  alert when {a.condition} €{fmtMoney(a.threshold)}
                </span>
                <span className="tabular-nums">now €{fmtMoney(a.current)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- market snapshot (sidebar) ----------

function MarketSnapshot() {
  const gainers = useMemo(
    () => [...TICKER].sort((a, b) => b.changePct - a.changePct).slice(0, 3),
    [],
  );
  const losers = useMemo(
    () => [...TICKER].sort((a, b) => a.changePct - b.changePct).slice(0, 3),
    [],
  );

  return (
    <Card>
      <SectionLabel icon={LineChart} title="Market snapshot" accent="#60A5FA" />
      <div className="mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wide text-[#475569] mb-1.5">
          Top gainers
        </div>
        <div className="space-y-1.5">
          {gainers.map((g) => (
            <div key={g.id} className="flex items-center justify-between">
              <span className="text-[12px] text-[#F1F5F9]">{g.name}</span>
              <ChangeBadge pct={g.changePct} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wide text-[#475569] mb-1.5">
          Top decliners
        </div>
        <div className="space-y-1.5">
          {losers.map((l) => (
            <div key={l.id} className="flex items-center justify-between">
              <span className="text-[12px] text-[#F1F5F9]">{l.name}</span>
              <ChangeBadge pct={l.changePct} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------- page ----------

export default function MaterialExchange() {
  const [listOpen, setListOpen] = useState(false);

  const totalListed = AVAILABLE.reduce((s, m) => s + m.qty, 0);
  const totalDemand = WANTED.reduce((s, w) => s + w.qty, 0);
  const settledCount = TRANSACTIONS.filter((t) => t.status === 'settled').length;
  const activeAlerts = ALERTS.filter((a) => a.active).length;

  return (
    <div className="min-h-screen bg-[#060B18] px-6 py-8 text-[#F1F5F9]">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LineChart size={22} className="text-[#60A5FA]" />
              <h1 className="font-mono text-lg tracking-widest uppercase">
                Material Exchange
              </h1>
              <span className="rounded-full border border-[#34D399]/30 bg-[#34D399]/10 px-2 py-0.5 font-mono text-[11px] text-[#34D399] animate-pulse">
                live
              </span>
            </div>
            <p className="text-[#94A3B8] text-sm">
              Real-time secondary market for recyclable material streams —
              trade, price, and settle across the recycler network.
            </p>
          </div>
          <button
            onClick={() => setListOpen(true)}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider rounded-md px-3 py-2 border border-[#60A5FA]/40 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors"
          >
            <Plus size={14} />
            List material
          </button>
        </div>

        {/* ticker */}
        <TickerBar />

        {/* summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#475569]">
              Listed for sale
            </span>
            <span className="font-mono text-2xl leading-none text-[#34D399] tabular-nums">
              {fmtQty(totalListed)}t
            </span>
            <span className="text-[11px] text-[#94A3B8]">across {AVAILABLE.length} listings</span>
          </Card>
          <Card className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#475569]">
              Demand open
            </span>
            <span className="font-mono text-2xl leading-none text-[#F59E0B] tabular-nums">
              {fmtQty(totalDemand)}t
            </span>
            <span className="text-[11px] text-[#94A3B8]">across {WANTED.length} requests</span>
          </Card>
          <Card className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#475569]">
              Settled trades
            </span>
            <span className="font-mono text-2xl leading-none text-[#F1F5F9] tabular-nums">
              {settledCount}/{TRANSACTIONS.length}
            </span>
            <span className="text-[11px] text-[#94A3B8]">last 10 days</span>
          </Card>
          <Card className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#475569]">
              Active alerts
            </span>
            <span className="font-mono text-2xl leading-none text-[#60A5FA] tabular-nums">
              {activeAlerts}
            </span>
            <span className="text-[11px] text-[#94A3B8]">of {ALERTS.length} configured</span>
          </Card>
        </div>

        {/* price history + snapshot */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 mb-4">
          <PriceHistorySection />
          <MarketSnapshot />
        </div>

        {/* available materials */}
        <div className="mb-4">
          <AvailableMaterialsTable />
        </div>

        {/* wanted materials */}
        <div className="mb-4">
          <WantedMaterialsTable />
        </div>

        {/* transactions + alerts */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <RecentTransactions />
          <PriceAlerts />
        </div>
      </div>

      <AnimatePresence>
        {listOpen && <ListMaterialModal onClose={() => setListOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
