import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  Recycle,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Trophy,
  AlarmClock,
  ShieldAlert,
  MapPin,
  FileText,
  MoreHorizontal,
} from 'lucide-react';

// ---------- types ----------

type CertStatus = 'verified' | 'expiring' | 'missing';

interface Recycler {
  id: string;
  name: string;
  materials: string[];
  locations: number;
  tonnageYTD: number;
  onTimeRate: number;
  certifications: string[];
  certStatus: CertStatus;
  contractEnd: string; // ISO date
  contact: string;
}

// ---------- mock data ----------

const TODAY = new Date('2026-07-31');

const daysUntil = (iso: string) =>
  Math.round((new Date(iso).getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));

const RECYCLERS: Recycler[] = [
  {
    id: 'REC-01',
    name: 'Alba Group',
    materials: ['Plastics', 'Cardboard', 'Mixed'],
    locations: 8,
    tonnageYTD: 412,
    onTimeRate: 98,
    certifications: ['ISO 14001', 'EfbV'],
    certStatus: 'verified',
    contractEnd: '2028-03-01',
    contact: 'J. Brandt — regional lead',
  },
  {
    id: 'REC-02',
    name: 'Remondis',
    materials: ['Metal', 'Hazardous', 'E-waste'],
    locations: 12,
    tonnageYTD: 287,
    onTimeRate: 95,
    certifications: ['ISO 14001', 'EMAS'],
    certStatus: 'verified',
    contractEnd: '2027-11-01',
    contact: 'S. Wagner — account manager',
  },
  {
    id: 'REC-03',
    name: 'Veolia DE',
    materials: ['Glass', 'Wood', 'Organic'],
    locations: 6,
    tonnageYTD: 194,
    onTimeRate: 87,
    certifications: ['ISO 14001'],
    certStatus: 'verified',
    contractEnd: '2026-09-10',
    contact: 'M. Keller — ops liaison',
  },
  {
    id: 'REC-04',
    name: 'Interzero',
    materials: ['Mixed plastics', 'Paper'],
    locations: 10,
    tonnageYTD: 312,
    onTimeRate: 96,
    certifications: ['EfbV', 'ISO 14001'],
    certStatus: 'verified',
    contractEnd: '2027-05-01',
    contact: 'A. Hoffmann — account manager',
  },
  {
    id: 'REC-05',
    name: 'PreZero',
    materials: ['Household', 'Commercial'],
    locations: 9,
    tonnageYTD: 247,
    onTimeRate: 92,
    certifications: ['ISO 14001'],
    certStatus: 'verified',
    contractEnd: '2026-08-25',
    contact: 'L. Fischer — regional lead',
  },
  {
    id: 'REC-06',
    name: 'Stena Recycling',
    materials: ['Metal', 'E-waste'],
    locations: 5,
    tonnageYTD: 184,
    onTimeRate: 94,
    certifications: ['R2', 'e-Stewards'],
    certStatus: 'verified',
    contractEnd: '2028-01-01',
    contact: 'P. Nilsson — account manager',
  },
  {
    id: 'REC-07',
    name: 'Hoffmann Recycling',
    materials: ['Construction', 'Wood'],
    locations: 4,
    tonnageYTD: 142,
    onTimeRate: 91,
    certifications: ['EfbV'],
    certStatus: 'expiring',
    contractEnd: '2027-02-01',
    contact: 'D. Hoffmann — owner-operator',
  },
  {
    id: 'REC-08',
    name: 'Tönsmeier',
    materials: ['Organic', 'Biomass'],
    locations: 7,
    tonnageYTD: 98,
    onTimeRate: 89,
    certifications: ['ISO 14001', 'EMAS'],
    certStatus: 'verified',
    contractEnd: '2026-12-01',
    contact: 'R. Bauer — ops liaison',
  },
  {
    id: 'REC-09',
    name: 'Suez Deutschland',
    materials: ['Plastics', 'Paper'],
    locations: 6,
    tonnageYTD: 210,
    onTimeRate: 97,
    certifications: ['ISO 14001'],
    certStatus: 'verified',
    contractEnd: '2027-09-01',
    contact: 'C. Vogel — account manager',
  },
  {
    id: 'REC-10',
    name: 'Nehlsen',
    materials: ['Metal', 'Construction'],
    locations: 5,
    tonnageYTD: 223,
    onTimeRate: 96,
    certifications: ['ISO 14001'],
    certStatus: 'verified',
    contractEnd: '2027-04-01',
    contact: 'T. Nehlsen — regional lead',
  },
  {
    id: 'REC-11',
    name: 'Buhck Gruppe',
    materials: ['Household', 'Commercial'],
    locations: 4,
    tonnageYTD: 152,
    onTimeRate: 90,
    certifications: [],
    certStatus: 'missing',
    contractEnd: '2026-10-01',
    contact: 'H. Buhck — owner-operator',
  },
  {
    id: 'REC-12',
    name: 'Scherer + Kohl',
    materials: ['Hazardous', 'E-waste'],
    locations: 3,
    tonnageYTD: 120,
    onTimeRate: 97,
    certifications: ['ISO 14001', 'EfbV'],
    certStatus: 'verified',
    contractEnd: '2028-06-01',
    contact: 'F. Kohl — account manager',
  },
  {
    id: 'REC-13',
    name: 'ELG Haniel',
    materials: ['Metal', 'Mixed'],
    locations: 5,
    tonnageYTD: 140,
    onTimeRate: 97,
    certifications: ['ISO 14001'],
    certStatus: 'verified',
    contractEnd: '2027-08-01',
    contact: 'B. Haniel — regional lead',
  },
  {
    id: 'REC-14',
    name: 'RIGK',
    materials: ['Plastics', 'Packaging'],
    locations: 3,
    tonnageYTD: 99,
    onTimeRate: 99,
    certifications: ['EfbV'],
    certStatus: 'verified',
    contractEnd: '2027-01-01',
    contact: 'N. Reuter — account manager',
  },
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

function CertBadge({ status, label }: { status: CertStatus; label: string }) {
  const styles: Record<CertStatus, string> = {
    verified: 'text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10',
    expiring: 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10',
    missing: 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10',
  };
  return (
    <span
      className={clsx(
        'rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide border font-mono whitespace-nowrap',
        styles[status],
      )}
    >
      {label}
    </span>
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
      <span
        className="font-mono text-2xl leading-none"
        style={{ color: accent }}
      >
        {value}
      </span>
      {sub && <span className="text-[11px] text-[#94A3B8]">{sub}</span>}
    </Card>
  );
}

// ---------- add recycler modal ----------

function AddRecyclerModal({ onClose }: { onClose: () => void }) {
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
            Add Recycler
          </h3>
          <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9]">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
              Recycler name
            </label>
            <input
              type="text"
              placeholder="e.g. Schwarz Recycling"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
              Materials accepted
            </label>
            <input
              type="text"
              placeholder="Plastics, Metal, Organic..."
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Locations served
              </label>
              <input
                type="number"
                placeholder="0"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#60A5FA]/50"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-[#475569] mb-1">
                Contract end
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#60A5FA]/50"
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
            Save recycler
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- table row ----------

function RecyclerRow({ recycler }: { recycler: Recycler }) {
  const [open, setOpen] = useState(false);
  const days = daysUntil(recycler.contractEnd);
  const rateColor =
    recycler.onTimeRate >= 95
      ? '#34D399'
      : recycler.onTimeRate >= 90
        ? '#60A5FA'
        : '#F59E0B';

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
            <span className="font-mono text-[12px] text-[#F1F5F9]">
              {recycler.name}
            </span>
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {recycler.materials.map((m) => (
              <span
                key={m}
                className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide border border-white/10 text-[#94A3B8] bg-white/[0.03]"
              >
                {m}
              </span>
            ))}
          </div>
        </td>
        <td className="py-3 px-2 font-mono text-[12px] text-[#94A3B8]">
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} className="text-[#475569]" />
            {recycler.locations}
          </span>
        </td>
        <td className="py-3 px-2 font-mono text-[12px] text-[#F1F5F9] text-right">
          {recycler.tonnageYTD.toLocaleString()}t
        </td>
        <td className="py-3 px-2">
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${recycler.onTimeRate}%`, backgroundColor: rateColor }}
              />
            </div>
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{ color: rateColor }}
            >
              {recycler.onTimeRate}%
            </span>
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {recycler.certifications.length > 0 ? (
              recycler.certifications.map((c) => (
                <span
                  key={c}
                  className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wide border border-white/10 text-[#94A3B8] bg-white/[0.03]"
                >
                  {c}
                </span>
              ))
            ) : (
              <span className="font-mono text-[10px] text-[#475569]">—</span>
            )}
            <CertBadge
              status={recycler.certStatus}
              label={
                recycler.certStatus === 'verified'
                  ? 'verified'
                  : recycler.certStatus === 'expiring'
                    ? 'expiring'
                    : 'missing'
              }
            />
          </div>
        </td>
        <td className="py-3 px-2 font-mono text-[11px]">
          <span
            className={clsx(
              days <= 60 ? 'text-[#F59E0B]' : 'text-[#94A3B8]',
            )}
          >
            {recycler.contractEnd}
          </span>
          {days <= 60 && (
            <div className="text-[9px] text-[#F59E0B]/80 mt-0.5">
              {days}d remaining
            </div>
          )}
        </td>
        <td className="py-3 pr-4 pl-2 text-right">
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[#475569] hover:text-[#F1F5F9] transition-colors"
          >
            <MoreHorizontal size={15} />
          </button>
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
                <div className="mx-4 mb-3 rounded-md border border-white/5 bg-black/20 px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-[11px]">
                  <div>
                    <span className="text-[#475569] block mb-0.5">Recycler ID</span>
                    <span className="text-[#F1F5F9]">{recycler.id}</span>
                  </div>
                  <div>
                    <span className="text-[#475569] block mb-0.5">Primary contact</span>
                    <span className="text-[#F1F5F9]">{recycler.contact}</span>
                  </div>
                  <div>
                    <span className="text-[#475569] block mb-0.5">Certification status</span>
                    <span className="text-[#F1F5F9] capitalize">{recycler.certStatus}</span>
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ---------- sidebar sections ----------

function PerformanceRanking() {
  const top3 = useMemo(
    () => [...RECYCLERS].sort((a, b) => b.onTimeRate - a.onTimeRate).slice(0, 3),
    [],
  );
  const medalColor = ['#F59E0B', '#94A3B8', '#D97706'];

  return (
    <Card>
      <SectionLabel icon={Trophy} title="Performance Ranking" accent="#F59E0B" />
      <div className="space-y-2.5">
        {top3.map((r, i) => (
          <div key={r.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[11px] w-4 text-center"
                style={{ color: medalColor[i] }}
              >
                {i + 1}
              </span>
              <span className="text-[12px] text-[#F1F5F9]">{r.name}</span>
            </div>
            <span className="font-mono text-[11px] text-[#34D399]">
              {r.onTimeRate}%
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExpiringContracts() {
  const expiring = useMemo(
    () =>
      RECYCLERS.filter((r) => daysUntil(r.contractEnd) <= 60).sort(
        (a, b) => daysUntil(a.contractEnd) - daysUntil(b.contractEnd),
      ),
    [],
  );

  return (
    <Card>
      <SectionLabel icon={AlarmClock} title="Expiring Contracts" accent="#F59E0B" />
      {expiring.length === 0 ? (
        <p className="text-[11px] text-[#475569]">No contracts expiring soon.</p>
      ) : (
        <div className="space-y-2.5">
          {expiring.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-2.5 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#F1F5F9]">{r.name}</span>
                <span className="font-mono text-[10px] text-[#F59E0B]">
                  {daysUntil(r.contractEnd)}d
                </span>
              </div>
              <div className="font-mono text-[10px] text-[#94A3B8] mt-0.5">
                renews {r.contractEnd}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MissingCertAlerts() {
  const flagged = useMemo(
    () => RECYCLERS.filter((r) => r.certStatus !== 'verified'),
    [],
  );

  return (
    <Card>
      <SectionLabel icon={ShieldAlert} title="Certification Alerts" accent="#EF4444" />
      {flagged.length === 0 ? (
        <p className="text-[11px] text-[#475569]">DEMO — recycler ISO/EfbV badges are scenario labels, not verified certificates.</p>
      ) : (
        <div className="space-y-2.5">
          {flagged.map((r) => (
            <div
              key={r.id}
              className="rounded-md border border-[#EF4444]/20 bg-[#EF4444]/5 px-2.5 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#F1F5F9]">{r.name}</span>
                <CertBadge
                  status={r.certStatus}
                  label={r.certStatus === 'expiring' ? 'expiring' : 'missing'}
                />
              </div>
              <div className="font-mono text-[10px] text-[#94A3B8] mt-0.5">
                {r.certifications.length > 0
                  ? `holds: ${r.certifications.join(', ')}`
                  : 'no active certification on file'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------- page ----------

export default function RecyclerNetwork() {
  const [addOpen, setAddOpen] = useState(false);

  const totalRecyclers = RECYCLERS.length;
  const avgOnTime = (
    RECYCLERS.reduce((s, r) => s + r.onTimeRate, 0) / totalRecyclers
  ).toFixed(1);
  const totalTonnage = RECYCLERS.reduce((s, r) => s + r.tonnageYTD, 0);
  const certsVerified = RECYCLERS.filter((r) => r.certStatus === 'verified').length;

  return (
    <div className="min-h-screen bg-[#060B18] px-6 py-8 text-[#F1F5F9]">
      <div className="max-w-7xl mx-auto">
        {/* header */}
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Recycle size={22} className="text-[#60A5FA]" />
              <h1 className="font-mono text-lg tracking-widest uppercase">
                Recycler Network
              </h1>
              <span className="rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2 py-0.5 font-mono text-[11px] text-[#60A5FA]">
                {totalRecyclers}
              </span>
            </div>
            <p className="text-[#94A3B8] text-sm">
              Certified recycler partners across the Hornbach Germany material
              recovery network.
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider rounded-md px-3 py-2 border border-[#60A5FA]/40 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors"
          >
            <Plus size={14} />
            Add recycler
          </button>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active recyclers"
            value={String(totalRecyclers)}
            sub="under contract"
            accent="#60A5FA"
          />
          <StatCard
            label="Avg on-time rate"
            value={`${avgOnTime}%`}
            sub="fleet-wide"
            accent="#34D399"
          />
          <StatCard
            label="Total tonnage processed"
            value={`${totalTonnage.toLocaleString()}t`}
            sub="year to date"
            accent="#F1F5F9"
          />
          <StatCard
            label="Certifications verified"
            value={`${certsVerified}/${totalRecyclers}`}
            sub={certsVerified < totalRecyclers ? 'action required' : 'all clear'}
            accent={certsVerified < totalRecyclers ? '#F59E0B' : '#34D399'}
          />
        </div>

        {/* main content: table + sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
          <Card className="!p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-1">
              <SectionLabel icon={FileText} title="Recycler Directory" accent="#94A3B8" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-wider text-[#475569]">
                    <th className="py-2 pl-4 pr-2 font-normal">Recycler</th>
                    <th className="py-2 px-2 font-normal">Materials accepted</th>
                    <th className="py-2 px-2 font-normal">Locations</th>
                    <th className="py-2 px-2 font-normal text-right">Tonnage (YTD)</th>
                    <th className="py-2 px-2 font-normal">On-time rate</th>
                    <th className="py-2 px-2 font-normal">Certifications</th>
                    <th className="py-2 px-2 font-normal">Contract</th>
                    <th className="py-2 pr-4 pl-2 font-normal text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {RECYCLERS.map((r) => (
                    <RecyclerRow key={r.id} recycler={r} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-white/5 font-mono text-[10px] text-[#475569]">
              showing {RECYCLERS.length} of {RECYCLERS.length} recyclers — click a row to expand
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <PerformanceRanking />
            <ExpiringContracts />
            <MissingCertAlerts />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {addOpen && <AddRecyclerModal onClose={() => setAddOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
