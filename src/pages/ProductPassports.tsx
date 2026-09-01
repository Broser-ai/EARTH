import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ScanLine,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  FileClock,
  FileText,
  QrCode,
  Boxes,
  Factory,
  Truck,
  PackageCheck,
  Recycle,
  Link2,
  UploadCloud,
  FileSpreadsheet,
  Gauge,
} from 'lucide-react';

// ---------- types ----------

type PassportStatus = 'verified' | 'pending' | 'draft';

interface Material {
  name: string;
  pct: number;
}

interface Supplier {
  tier: 1 | 2 | 3;
  name: string;
  location: string;
}

interface Passport {
  id: string;
  product: string;
  category: string;
  materials: Material[];
  recyclability: number;
  carbonFootprint: number; // kgCO2e
  status: PassportStatus;
  created: string; // ISO date
  suppliers: Supplier[];
}

// ---------- mock data ----------

const PASSPORTS: Passport[] = [
  {
    id: 'DPP-00847',
    product: 'Bosch GSR 18V-90 C',
    category: 'Power tools',
    materials: [
      { name: 'Steel', pct: 42 },
      { name: 'Plastic', pct: 28 },
      { name: 'Li-ion', pct: 18 },
      { name: 'Cu', pct: 12 },
    ],
    recyclability: 87,
    carbonFootprint: 12.4,
    status: 'verified',
    created: '2026-07-02',
    suppliers: [
      { tier: 1, name: 'Bosch Power Tools GmbH', location: 'Leinfelden, DE' },
      { tier: 2, name: 'Varta Microbattery', location: 'Ellwangen, DE' },
      { tier: 3, name: 'Ganfeng Lithium', location: 'Xinyu, CN' },
    ],
  },
  {
    id: 'DPP-00846',
    product: 'BASF Paint 10L White',
    category: 'Coatings',
    materials: [
      { name: 'Acrylic', pct: 65 },
      { name: 'TiO2', pct: 15 },
      { name: 'Water', pct: 20 },
    ],
    recyclability: 45,
    carbonFootprint: 8.7,
    status: 'verified',
    created: '2026-06-28',
    suppliers: [
      { tier: 1, name: 'BASF Coatings GmbH', location: 'Münster, DE' },
      { tier: 2, name: 'Tronox Holdings', location: 'Hamilton, MS' },
      { tier: 3, name: 'Rio Tinto Minerals', location: 'Richards Bay, ZA' },
    ],
  },
  {
    id: 'DPP-00845',
    product: 'Knauf Insulation MW-120',
    category: 'Insulation',
    materials: [
      { name: 'Mineral wool', pct: 92 },
      { name: 'Binder', pct: 8 },
    ],
    recyclability: 94,
    carbonFootprint: 3.2,
    status: 'pending',
    created: '2026-07-20',
    suppliers: [
      { tier: 1, name: 'Knauf Insulation', location: 'Iphofen, DE' },
      { tier: 2, name: 'Rockwool Group', location: 'Roermond, NL' },
    ],
  },
  {
    id: 'DPP-00844',
    product: 'Fischer Duopower 8x40',
    category: 'Fasteners',
    materials: [
      { name: 'Nylon', pct: 55 },
      { name: 'Zinc-plated steel', pct: 45 },
    ],
    recyclability: 61,
    carbonFootprint: 1.1,
    status: 'verified',
    created: '2026-06-14',
    suppliers: [
      { tier: 1, name: 'Fischerwerke GmbH', location: 'Waldachtal, DE' },
      { tier: 2, name: 'ThyssenKrupp Steel', location: 'Duisburg, DE' },
    ],
  },
  {
    id: 'DPP-00843',
    product: 'Osram LED Panel 60x60',
    category: 'Lighting',
    materials: [
      { name: 'Aluminum', pct: 38 },
      { name: 'Polycarbonate', pct: 34 },
      { name: 'PCB / rare earths', pct: 16 },
      { name: 'Glass', pct: 12 },
    ],
    recyclability: 72,
    carbonFootprint: 6.8,
    status: 'pending',
    created: '2026-07-18',
    suppliers: [
      { tier: 1, name: 'Osram GmbH', location: 'Munich, DE' },
      { tier: 2, name: 'Foxconn Lighting', location: 'Shenzhen, CN' },
      { tier: 3, name: 'China Rare Earth Group', location: 'Ganzhou, CN' },
    ],
  },
  {
    id: 'DPP-00842',
    product: 'Villeroy & Boch Sink Unit',
    category: 'Sanitaryware',
    materials: [
      { name: 'Ceramic', pct: 88 },
      { name: 'Glaze / silicone', pct: 12 },
    ],
    recyclability: 38,
    carbonFootprint: 14.9,
    status: 'draft',
    created: '2026-07-27',
    suppliers: [{ tier: 1, name: 'Villeroy & Boch AG', location: 'Mettlach, DE' }],
  },
  {
    id: 'DPP-00841',
    product: 'Makita DHP484 Drill',
    category: 'Power tools',
    materials: [
      { name: 'Steel', pct: 35 },
      { name: 'Plastic', pct: 31 },
      { name: 'Li-ion', pct: 22 },
      { name: 'Cu', pct: 12 },
    ],
    recyclability: 83,
    carbonFootprint: 11.6,
    status: 'verified',
    created: '2026-06-09',
    suppliers: [
      { tier: 1, name: 'Makita Corporation', location: 'Anjo, JP' },
      { tier: 2, name: 'Samsung SDI', location: 'Cheonan, KR' },
    ],
  },
  {
    id: 'DPP-00840',
    product: 'Sika Sealant 300ml',
    category: 'Chemicals',
    materials: [
      { name: 'Polyurethane', pct: 70 },
      { name: 'Plasticizer', pct: 18 },
      { name: 'Cartridge PE', pct: 12 },
    ],
    recyclability: 22,
    carbonFootprint: 2.4,
    status: 'draft',
    created: '2026-07-25',
    suppliers: [{ tier: 1, name: 'Sika Deutschland GmbH', location: 'Stuttgart, DE' }],
  },
  {
    id: 'DPP-00839',
    product: 'Gardena Smart Sensor',
    category: 'Garden tech',
    materials: [
      { name: 'ABS plastic', pct: 48 },
      { name: 'PCB', pct: 30 },
      { name: 'Battery cell', pct: 22 },
    ],
    recyclability: 66,
    carbonFootprint: 4.3,
    status: 'pending',
    created: '2026-07-21',
    suppliers: [
      { tier: 1, name: 'Gardena GmbH', location: 'Ulm, DE' },
      { tier: 2, name: 'Jabil Circuit', location: 'Brno, CZ' },
    ],
  },
  {
    id: 'DPP-00838',
    product: 'Rehau Window Profile 2.4m',
    category: 'Building envelope',
    materials: [
      { name: 'PVC', pct: 76 },
      { name: 'Steel reinforcement', pct: 18 },
      { name: 'EPDM seal', pct: 6 },
    ],
    recyclability: 79,
    carbonFootprint: 9.1,
    status: 'verified',
    created: '2026-06-30',
    suppliers: [{ tier: 1, name: 'Rehau Group', location: 'Rehau, DE' }],
  },
];

const MATERIAL_COLORS = ['#60A5FA', '#F59E0B', '#34D399', '#94A3B8', '#EF4444'];

const LIFECYCLE_STAGES = [
  { label: 'Manufacturing', icon: Factory },
  { label: 'Distribution', icon: Truck },
  { label: 'Use', icon: PackageCheck },
  { label: 'End-of-life', icon: Recycle },
];

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
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} style={{ color: accent }} />
      <h2 className="font-mono text-xs tracking-widest uppercase text-[#F1F5F9]">
        {title}
      </h2>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#475569]">
        {label}
      </span>
      <span className="font-mono text-2xl leading-none" style={{ color: accent }}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-[#94A3B8]">{sub}</span>}
    </Card>
  );
}

function StatusBadge({ status }: { status: PassportStatus }) {
  const styles: Record<PassportStatus, string> = {
    verified: 'text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10',
    pending: 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10',
    draft: 'text-[#475569] border-white/10 bg-white/[0.03]',
  };
  const icons: Record<PassportStatus, React.ElementType> = {
    verified: ShieldCheck,
    pending: FileClock,
    draft: FileText,
  };
  const Icon = icons[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide border font-mono whitespace-nowrap',
        styles[status],
      )}
    >
      <Icon size={10} />
      {status}
    </span>
  );
}

function recyclabilityColor(pct: number) {
  return pct >= 80 ? '#34D399' : pct >= 55 ? '#60A5FA' : pct >= 35 ? '#F59E0B' : '#EF4444';
}

// ---------- create passport modal ----------

function CreatePassportModal({ onClose }: { onClose: () => void }) {
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
            Create Passport
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
              Product name
            </label>
            <input
              type="text"
              placeholder="e.g. Bosch GSR 18V-90 C"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="Power tools"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                SKU / GTIN
              </label>
              <input
                type="text"
                placeholder="0-00000-00000"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
              />
            </div>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
              Material composition
            </label>
            <input
              type="text"
              placeholder="Steel 42%, Plastic 28%, Li-ion 18%, Cu 12%"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
            />
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
            Save as draft
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- passport detail (expanded row) ----------

function PassportDetail({ passport }: { passport: Passport }) {
  return (
    <div className="mx-4 mb-3 rounded-md border border-white/5 bg-black/20 p-4 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.8fr] gap-4 font-mono text-[11px]">
      {/* material composition + lifecycle */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-[#475569] block mb-2 uppercase tracking-wider text-[10px]">
            Material composition
          </span>
          <div className="space-y-1.5">
            {passport.materials.map((m, i) => (
              <div key={m.name}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[#94A3B8]">{m.name}</span>
                  <span className="text-[#F1F5F9]">{m.pct}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${m.pct}%`,
                      backgroundColor: MATERIAL_COLORS[i % MATERIAL_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[#475569] block mb-2 uppercase tracking-wider text-[10px]">
            Lifecycle stages
          </span>
          <div className="flex items-center gap-1">
            {LIFECYCLE_STAGES.map((s, i) => (
              <div key={s.label} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-7 h-7 rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 flex items-center justify-center">
                    <s.icon size={13} className="text-[#60A5FA]" />
                  </div>
                  <span className="text-[9px] text-[#94A3B8] text-center leading-tight">
                    {s.label}
                  </span>
                </div>
                {i < LIFECYCLE_STAGES.length - 1 && (
                  <div className="h-px flex-1 bg-white/10 -mt-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* recyclability + supply chain */}
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-[#475569] block mb-2 uppercase tracking-wider text-[10px]">
            Recyclability analysis
          </span>
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke={recyclabilityColor(passport.recyclability)}
                  strokeWidth="3"
                  strokeDasharray={`${(passport.recyclability / 100) * 97.4} 97.4`}
                  strokeLinecap="round"
                />
              </svg>
              <div
                className="absolute inset-0 flex items-center justify-center text-[11px]"
                style={{ color: recyclabilityColor(passport.recyclability) }}
              >
                {passport.recyclability}%
              </div>
            </div>
            <div className="text-[#94A3B8] text-[10px] leading-snug">
              {passport.recyclability >= 80
                ? 'High-value material recovery expected at end-of-life.'
                : passport.recyclability >= 55
                  ? 'Moderate recovery — mixed material separation required.'
                  : 'Low recovery — composite / bonded materials limit recycling.'}
            </div>
          </div>
        </div>

        <div>
          <span className="text-[#475569] block mb-2 uppercase tracking-wider text-[10px]">
            Supply chain traceability
          </span>
          <div className="space-y-1.5">
            {passport.suppliers.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="rounded px-1 py-0.5 text-[8px] border border-white/10 text-[#475569] shrink-0">
                  T{s.tier}
                </span>
                <Link2 size={10} className="text-[#475569] shrink-0" />
                <span className="text-[#F1F5F9] truncate">{s.name}</span>
                <span className="text-[#475569] text-[10px] ml-auto shrink-0">
                  {s.location}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* qr code */}
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-white/5 bg-white/[0.02] p-4">
        <div className="w-20 h-20 rounded bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <QrCode size={48} className="text-[#94A3B8]" />
        </div>
        <span className="text-[9px] text-[#475569] text-center uppercase tracking-wider">
          Physical label QR
        </span>
        <span className="text-[9px] text-[#60A5FA] text-center break-all">
          dpp.earth/{passport.id.toLowerCase()}
        </span>
      </div>
    </div>
  );
}

// ---------- table row ----------

function PassportRow({ passport }: { passport: Passport }) {
  const [open, setOpen] = useState(false);
  const color = recyclabilityColor(passport.recyclability);

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="border-t border-white/5 cursor-pointer hover:bg-white/[0.03] transition-colors"
      >
        <td className="py-3 pl-4 pr-2">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown size={13} className="text-[#475569] shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-[#475569] shrink-0" />
            )}
            <span className="font-mono text-[12px] text-[#F1F5F9]">{passport.id}</span>
          </div>
        </td>
        <td className="py-3 px-2 text-[12px] text-[#F1F5F9] max-w-[200px]">
          {passport.product}
        </td>
        <td className="py-3 px-2">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide border border-white/10 text-[#94A3B8] bg-white/[0.03] whitespace-nowrap">
            {passport.category}
          </span>
        </td>
        <td className="py-3 px-2 font-mono text-[10px] text-[#94A3B8] max-w-[260px]">
          {passport.materials.map((m) => `${m.name} ${m.pct}%`).join(', ')}
        </td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${passport.recyclability}%`, backgroundColor: color }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums" style={{ color }}>
              {passport.recyclability}%
            </span>
          </div>
        </td>
        <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right whitespace-nowrap">
          {passport.carbonFootprint.toFixed(1)} kgCO2e
        </td>
        <td className="py-3 px-2">
          <StatusBadge status={passport.status} />
        </td>
        <td className="py-3 pr-4 pl-2 font-mono text-[11px] text-[#94A3B8] text-right whitespace-nowrap">
          {passport.created}
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {open && (
          <tr>
            <td colSpan={8} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <PassportDetail passport={passport} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- sidebar sections ----------

function ComplianceReadiness() {
  const verified = PASSPORTS.filter((p) => p.status === 'verified').length;
  const score = Math.round((verified / PASSPORTS.length) * 100);
  const color = score >= 80 ? '#34D399' : score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <Card>
      <SectionLabel icon={Gauge} title="EU DPP Readiness" accent={color} />
      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-3xl" style={{ color }}>
          {score}
        </span>
        <span className="text-[11px] text-[#94A3B8] leading-snug">
          readiness score against EU Digital Product Passport Regulation
          (ESPR), enforceable 2027.
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mb-3">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Material disclosure</span>
          <span className="text-[#34D399]">complete</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Supply chain tier data</span>
          <span className="text-[#F59E0B]">partial</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">QR label rollout</span>
          <span className="text-[#F59E0B]">in progress</span>
        </div>
      </div>
    </Card>
  );
}

function BulkImport() {
  return (
    <Card>
      <SectionLabel icon={UploadCloud} title="Bulk Import" accent="#60A5FA" />
      <div className="flex flex-col gap-2">
        <button className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left hover:border-[#60A5FA]/40 hover:bg-[#60A5FA]/5 transition-colors">
          <Boxes size={14} className="text-[#60A5FA]" />
          <div>
            <div className="text-[12px] text-[#F1F5F9]">Import from ERP</div>
            <div className="text-[10px] text-[#475569]">
              SAP, Oracle, Dynamics 365 connectors
            </div>
          </div>
        </button>
        <button className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left hover:border-[#60A5FA]/40 hover:bg-[#60A5FA]/5 transition-colors">
          <FileSpreadsheet size={14} className="text-[#60A5FA]" />
          <div>
            <div className="text-[12px] text-[#F1F5F9]">Import CSV</div>
            <div className="text-[10px] text-[#475569]">
              Bulk upload with material composition template
            </div>
          </div>
        </button>
      </div>
    </Card>
  );
}

function StatusBreakdown() {
  const draft = PASSPORTS.filter((p) => p.status === 'draft').length;
  const pending = PASSPORTS.filter((p) => p.status === 'pending').length;
  const verified = PASSPORTS.filter((p) => p.status === 'verified').length;

  return (
    <Card>
      <SectionLabel icon={ShieldAlert} title="Verification Queue" accent="#F59E0B" />
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#F1F5F9]">Verified</span>
          <span className="font-mono text-[11px] text-[#34D399]">{verified}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#F1F5F9]">Pending verification</span>
          <span className="font-mono text-[11px] text-[#F59E0B]">{pending}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[#F1F5F9]">Draft</span>
          <span className="font-mono text-[11px] text-[#475569]">{draft}</span>
        </div>
      </div>
    </Card>
  );
}

// ---------- page ----------

export default function ProductPassports() {
  const [createOpen, setCreateOpen] = useState(false);

  const total = 2847;
  const verified = 2104;
  const pending = 512;
  const draft = 231;
  const verifiedPct = ((verified / total) * 100).toFixed(1);

  const shown = useMemo(() => PASSPORTS, []);

  return (
    <div className="min-h-screen bg-[#060B18] px-6 py-8 text-[#F1F5F9]">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ScanLine size={22} className="text-[#60A5FA]" />
              <h1 className="font-mono text-lg tracking-widest uppercase">
                Product Passports
              </h1>
              <span className="rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2 py-0.5 font-mono text-[11px] text-[#60A5FA]">
                {total.toLocaleString()}
              </span>
            </div>
            <p className="text-[#94A3B8] text-sm">
              Digital lifecycle twins for every product — material composition,
              recyclability, and full-chain traceability ahead of the EU DPP
              Regulation (2027).
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider rounded-md px-3 py-2 border border-[#60A5FA]/40 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors"
          >
            <Plus size={14} />
            Create passport
          </button>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total passports"
            value={total.toLocaleString()}
            sub="digital twins registered"
            accent="#F1F5F9"
          />
          <StatCard
            label="Verified"
            value={verified.toLocaleString()}
            sub={`${verifiedPct}% of total`}
            accent="#34D399"
          />
          <StatCard
            label="Pending verification"
            value={pending.toLocaleString()}
            sub="awaiting review"
            accent="#F59E0B"
          />
          <StatCard
            label="Draft"
            value={draft.toLocaleString()}
            sub="incomplete data"
            accent="#475569"
          />
        </div>

        {/* main content: table + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <Card className="!p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-1">
              <SectionLabel icon={FileText} title="Passport Registry" accent="#94A3B8" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-wider text-[#475569]">
                    <th className="py-2 pl-4 pr-2 font-normal">Passport ID</th>
                    <th className="py-2 px-2 font-normal">Product</th>
                    <th className="py-2 px-2 font-normal">Category</th>
                    <th className="py-2 px-2 font-normal">Materials</th>
                    <th className="py-2 px-2 font-normal">Recyclability</th>
                    <th className="py-2 px-2 font-normal text-right">
                      Carbon footprint
                    </th>
                    <th className="py-2 px-2 font-normal">Status</th>
                    <th className="py-2 pr-4 pl-2 font-normal text-right">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <PassportRow key={p.id} passport={p} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-white/5 font-mono text-[10px] text-[#475569]">
              showing {shown.length} of {total.toLocaleString()} passports — click a
              row to expand the lifecycle digital twin
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <ComplianceReadiness />
            <StatusBreakdown />
            <BulkImport />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {createOpen && <CreatePassportModal onClose={() => setCreateOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
