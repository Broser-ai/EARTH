import { useState } from 'react';
import clsx from 'clsx';
import {
  Upload,
  AlertTriangle,
  Clock,
  MapPin,
  FileText,
  Satellite,
  ShieldAlert,
  CheckCircle2,
  FileCheck2,
  TreeDeciduous,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RiskLevel = 'Low risk' | 'Medium risk' | 'High risk' | 'N/A';
type StatusTag = 'Complete' | 'In progress' | 'Action needed' | 'Not applicable';
type StatementState = 'Submitted' | 'Draft' | 'Blocked';
type DocKind = 'Due diligence statement' | 'Satellite imagery' | 'Supplier declaration' | 'Legality certificate';

interface CategoryRow {
  category: string;
  skus: string;
  suppliersMapped: string;
  suppliersMappedPct: number;
  geoMapped: string;
  geoMappedPct: number;
  risk: RiskLevel;
  status: StatusTag;
}

interface DueDiligenceStatement {
  group: string;
  state: StatementState;
  detail: string;
}

interface MitigationAction {
  title: string;
  category: string;
  risk: Exclude<RiskLevel, 'N/A'>;
  action: string;
  deadline: string;
  daysLeft: number;
}

interface RepoDoc {
  name: string;
  kind: DocKind;
  category: string;
  updated: string;
  status: 'Verified' | 'Pending review' | 'Missing';
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const READINESS_PCT = 67;
const DEADLINE_LABEL = 'Aug 15, 2026';
const DAYS_TO_DEADLINE = 15;
const PENALTY_NOTE = 'Non-compliance penalty: up to 4% of total EU-wide annual turnover (EUDR Art. 25)';

const CATEGORY_ROWS: CategoryRow[] = [
  {
    category: 'Timber / Wood',
    skus: '847 SKUs',
    suppliersMapped: '12/14 mapped',
    suppliersMappedPct: (12 / 14) * 100,
    geoMapped: '8/14 geolocated',
    geoMappedPct: (8 / 14) * 100,
    risk: 'Medium risk',
    status: 'In progress',
  },
  {
    category: 'Palm oil derivatives',
    skus: '124 SKUs',
    suppliersMapped: '3/5 mapped',
    suppliersMappedPct: (3 / 5) * 100,
    geoMapped: '1/5 geolocated',
    geoMappedPct: (1 / 5) * 100,
    risk: 'High risk',
    status: 'Action needed',
  },
  {
    category: 'Rubber products',
    skus: '48 SKUs',
    suppliersMapped: '6/6 mapped',
    suppliersMappedPct: 100,
    geoMapped: '6/6 geolocated',
    geoMappedPct: 100,
    risk: 'Low risk',
    status: 'Complete',
  },
  {
    category: 'Paper / Cardboard',
    skus: '412 SKUs',
    suppliersMapped: '9/11 mapped',
    suppliersMappedPct: (9 / 11) * 100,
    geoMapped: '5/11 geolocated',
    geoMappedPct: (5 / 11) * 100,
    risk: 'Medium risk',
    status: 'In progress',
  },
  {
    category: 'Soy derivatives',
    skus: '24 SKUs',
    suppliersMapped: '2/3 mapped',
    suppliersMappedPct: (2 / 3) * 100,
    geoMapped: '0/3 geolocated',
    geoMappedPct: 0,
    risk: 'High risk',
    status: 'Action needed',
  },
  {
    category: 'Cocoa products',
    skus: '0 SKUs',
    suppliersMapped: '—',
    suppliersMappedPct: 0,
    geoMapped: '—',
    geoMappedPct: 0,
    risk: 'N/A',
    status: 'Not applicable',
  },
];

const DUE_DILIGENCE_STATEMENTS: DueDiligenceStatement[] = [
  { group: 'Rubber products', state: 'Submitted', detail: 'DDS filed via EU Information System · Ref# DDS-RB-2026-0417' },
  { group: 'Timber / Wood', state: 'Draft', detail: '12 of 14 supplier attestations collected — awaiting 2 outstanding before submission' },
  { group: 'Paper / Cardboard', state: 'Draft', detail: '9 of 11 supplier attestations collected — geolocation gap blocks final risk assessment' },
  { group: 'Palm oil derivatives', state: 'Blocked', detail: 'Only 1 of 5 suppliers geolocated — cannot complete Art. 9 due diligence' },
  { group: 'Soy derivatives', state: 'Blocked', detail: 'Zero suppliers geolocated — high deforestation-risk sourcing region flagged' },
  { group: 'Cocoa products', state: 'Submitted', detail: 'Not applicable — no cocoa-derived SKUs in current catalog' },
];

const MITIGATION_ACTIONS: MitigationAction[] = [
  {
    title: 'Obtain plot-level GPS coordinates from 4 remaining palm oil suppliers',
    category: 'Palm oil derivatives',
    risk: 'High risk',
    action: 'Request Article 9 geolocation data (lat/long or polygon) for all production plots > 4ha',
    deadline: 'Aug 4, 2026',
    daysLeft: 4,
  },
  {
    title: 'Escalate soy supplier onboarding — zero coordinates on file',
    category: 'Soy derivatives',
    risk: 'High risk',
    action: 'Suspend PO issuance to non-compliant soy suppliers until geolocation + legality proof received',
    deadline: 'Aug 6, 2026',
    daysLeft: 6,
  },
  {
    title: 'Close geolocation gap on 6 timber suppliers',
    category: 'Timber / Wood',
    risk: 'Medium risk',
    action: 'Cross-reference supplier coordinates against JRC forest-cover baseline map (2020)',
    deadline: 'Aug 11, 2026',
    daysLeft: 11,
  },
  {
    title: 'Verify 6 unmapped paper/cardboard geolocations against satellite imagery',
    category: 'Paper / Cardboard',
    risk: 'Medium risk',
    action: 'Run satellite deforestation-risk overlay (Global Forest Watch) on submitted coordinates',
    deadline: 'Aug 13, 2026',
    daysLeft: 13,
  },
  {
    title: 'Finalize and file Timber/Wood due diligence statement',
    category: 'Timber / Wood',
    risk: 'Medium risk',
    action: 'Submit DDS to EU Information System once all 14 suppliers geolocated',
    deadline: 'Aug 15, 2026',
    daysLeft: 15,
  },
];

const REPO_DOCS: RepoDoc[] = [
  { name: 'DDS-RB-2026-0417.pdf', kind: 'Due diligence statement', category: 'Rubber products', updated: '2026-07-22', status: 'Verified' },
  { name: 'timber-supplier-attestations-batch3.zip', kind: 'Supplier declaration', category: 'Timber / Wood', updated: '2026-07-28', status: 'Pending review' },
  { name: 'gfw-satellite-overlay-timber-Q3.geojson', kind: 'Satellite imagery', category: 'Timber / Wood', updated: '2026-07-29', status: 'Verified' },
  { name: 'palm-oil-legality-cert-MY-2026.pdf', kind: 'Legality certificate', category: 'Palm oil derivatives', updated: '2026-06-30', status: 'Verified' },
  { name: 'palm-oil-geolocation-plots.csv', kind: 'Supplier declaration', category: 'Palm oil derivatives', updated: '—', status: 'Missing' },
  { name: 'soy-supplier-coordinates.csv', kind: 'Supplier declaration', category: 'Soy derivatives', updated: '—', status: 'Missing' },
  { name: 'paper-cardboard-satellite-check.geojson', kind: 'Satellite imagery', category: 'Paper / Cardboard', updated: '2026-07-25', status: 'Pending review' },
  { name: 'cocoa-not-applicable-memo.pdf', kind: 'Due diligence statement', category: 'Cocoa products', updated: '2026-05-02', status: 'Verified' },
];

// ---------------------------------------------------------------------------
// Small shared bits
// ---------------------------------------------------------------------------

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur', className)}>
      {children}
    </div>
  );
}

const RISK_COLORS: Record<RiskLevel, string> = {
  'Low risk': '#34D399',
  'Medium risk': '#F59E0B',
  'High risk': '#EF4444',
  'N/A': '#475569',
};

const STATUS_COLORS: Record<StatusTag, string> = {
  Complete: '#34D399',
  'In progress': '#F59E0B',
  'Action needed': '#EF4444',
  'Not applicable': '#475569',
};

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const color = RISK_COLORS[risk];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
      style={{ borderColor: `${color}4D`, backgroundColor: `${color}1A`, color }}
    >
      {risk}
    </span>
  );
}

function StatusBadge({ status }: { status: StatusTag }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
      style={{ borderColor: `${color}4D`, backgroundColor: `${color}1A`, color }}
    >
      {status === 'Action needed' && <AlertTriangle className="h-2.5 w-2.5" />}
      {status}
    </span>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full min-w-[64px] overflow-hidden rounded-full bg-white/5">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  color,
  title,
  subtitle,
}: {
  icon: typeof MapPin;
  color: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-white/5 px-4 py-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${color}1A` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">{title}</span>
      {subtitle && <span className="ml-auto font-mono text-[10px] text-[#475569]">{subtitle}</span>}
    </div>
  );
}

const STATEMENT_STATE_COLORS: Record<StatementState, string> = {
  Submitted: '#34D399',
  Draft: '#F59E0B',
  Blocked: '#EF4444',
};

const DOC_STATUS_COLORS: Record<RepoDoc['status'], string> = {
  Verified: '#34D399',
  'Pending review': '#F59E0B',
  Missing: '#EF4444',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EUDRTracking() {
  const [importOpen, setImportOpen] = useState(false);

  const totalSkus = 847 + 124 + 48 + 412 + 24;
  const actionNeededCount = CATEGORY_ROWS.filter((r) => r.status === 'Action needed').length;

  return (
    <div className="min-h-screen w-full bg-[#060B18] px-6 py-6 text-[#F1F5F9]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-[#F1F5F9]">EUDR TRACKING</h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            EU Deforestation Regulation (2023/1115) — due diligence, geolocation &amp; risk assessment across{' '}
            {totalSkus.toLocaleString('en-US')} in-scope SKUs
          </p>
        </div>
        <button
          onClick={() => setImportOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-4 py-2 font-mono text-xs font-semibold tracking-wide text-[#60A5FA] transition-colors hover:bg-[#60A5FA]/20"
        >
          <Upload className="h-3.5 w-3.5" />
          Import supply chain data
        </button>
      </div>

      {importOpen && (
        <Card className="mb-6 border-[#60A5FA]/20 p-4">
          <p className="font-mono text-xs text-[#94A3B8]">
            Drop supplier CSV/XLSX, geolocation GeoJSON, or ERP export here — or connect a supply-chain system via API.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-[#F1F5F9] hover:border-white/20">
              Upload file
            </button>
            <button className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-[#F1F5F9] hover:border-white/20">
              Connect ERP / SAP (DEMO — not connected)
            </button>
            <button
              onClick={() => setImportOpen(false)}
              className="ml-auto rounded-md border border-white/5 px-3 py-1.5 font-mono text-[11px] text-[#475569] hover:text-[#94A3B8]"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Readiness score + deadline */}
      <Card className="mb-6 border-[#F59E0B]/20 p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="3"
                  strokeDasharray={`${(READINESS_PCT / 100) * 100.5} 100.5`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-mono text-lg font-bold text-[#F59E0B]">{READINESS_PCT}%</span>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-wide text-[#F59E0B]">
                <AlertTriangle className="h-3.5 w-3.5" />
                EUDR readiness score
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">
                {actionNeededCount} of 5 applicable categories require immediate action before enforcement.
              </p>
            </div>
          </div>

          <div className="hidden w-px bg-white/5 lg:block" />

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-[#EF4444]/10">
              <Clock className="h-6 w-6 text-[#EF4444]" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
                Compliance deadline: {DEADLINE_LABEL}
              </p>
              <p className="mt-1 font-mono text-[11px] font-bold text-[#EF4444]">
                {DAYS_TO_DEADLINE} days remaining
              </p>
              <p className="mt-1 text-[11px] text-[#94A3B8]">{PENALTY_NOTE}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Category table */}
      <Card className="mb-6 overflow-hidden">
        <SectionHeader
          icon={TreeDeciduous}
          color="#60A5FA"
          title="Product categories requiring EUDR due diligence"
          subtitle={`${totalSkus.toLocaleString('en-US')} SKUs across 6 commodity groups`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead>
              <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Products affected</th>
                <th className="px-4 py-2.5 font-medium">Suppliers mapped</th>
                <th className="px-4 py-2.5 font-medium">Geo-coordinates</th>
                <th className="px-4 py-2.5 font-medium">Risk assessment</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {CATEGORY_ROWS.map((row) => (
                <tr key={row.category} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[#F1F5F9]">{row.category}</td>
                  <td className="px-4 py-2.5 text-[#94A3B8]">{row.skus}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#94A3B8]">{row.suppliersMapped}</span>
                      {row.suppliersMappedPct > 0 && (
                        <ProgressBar pct={row.suppliersMappedPct} color="#60A5FA" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          row.geoMappedPct === 0 && row.risk !== 'N/A' ? 'font-semibold text-[#EF4444]' : 'text-[#94A3B8]'
                        )}
                      >
                        {row.geoMapped}
                      </span>
                      {row.geoMappedPct > 0 && (
                        <ProgressBar
                          pct={row.geoMappedPct}
                          color={row.geoMappedPct === 100 ? '#34D399' : '#F59E0B'}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <RiskBadge risk={row.risk} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Supply chain map placeholder */}
      <Card className="mb-6 overflow-hidden">
        <SectionHeader icon={MapPin} color="#60A5FA" title="Supplier geolocation map" />
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 border-t-0 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#60A5FA]/10">
            <MapPin className="h-6 w-6 text-[#60A5FA]" />
          </div>
          <p className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
            Supplier geolocation map — coordinates required for EUDR Article 9
          </p>
          <p className="max-w-md text-[11px] text-[#94A3B8]">
            16 of 39 mapped suppliers are missing plot-level geolocation data. Import coordinates or connect a
            supplier portal to render the map and run automated deforestation-risk overlays.
          </p>
        </div>
      </Card>

      {/* Due diligence statements + Risk mitigation */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <SectionHeader icon={FileCheck2} color="#34D399" title="Due diligence statements" />
          <div className="divide-y divide-white/5">
            {DUE_DILIGENCE_STATEMENTS.map((s) => (
              <div key={s.group} className="flex items-start gap-3 px-4 py-3">
                <span
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: STATEMENT_STATE_COLORS[s.state] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#F1F5F9]">{s.group}</span>
                    <span
                      className="ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
                      style={{
                        borderColor: `${STATEMENT_STATE_COLORS[s.state]}4D`,
                        backgroundColor: `${STATEMENT_STATE_COLORS[s.state]}1A`,
                        color: STATEMENT_STATE_COLORS[s.state],
                      }}
                    >
                      {s.state}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#94A3B8]">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden border-[#EF4444]/15">
          <SectionHeader
            icon={ShieldAlert}
            color="#EF4444"
            title="Risk mitigation actions"
            subtitle={`${MITIGATION_ACTIONS.length} open items`}
          />
          <div className="divide-y divide-white/5">
            {MITIGATION_ACTIONS.map((a) => {
              const urgent = a.daysLeft <= 7;
              return (
                <div key={a.title} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      style={{ color: RISK_COLORS[a.risk] }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs font-semibold text-[#F1F5F9]">{a.title}</p>
                      <p className="mt-1 text-[11px] text-[#94A3B8]">{a.action}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RiskBadge risk={a.risk} />
                        <span className="font-mono text-[10px] text-[#475569]">{a.category}</span>
                        <span
                          className={clsx(
                            'ml-auto flex items-center gap-1 font-mono text-[10px] font-bold',
                            urgent ? 'text-[#EF4444]' : 'text-[#F59E0B]'
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          Due {a.deadline} ({a.daysLeft}d)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Document repository */}
      <Card className="overflow-hidden">
        <SectionHeader
          icon={FileText}
          color="#60A5FA"
          title="Document repository"
          subtitle={`${REPO_DOCS.length} documents · due diligence statements, supplier declarations & satellite imagery`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Last updated</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              {REPO_DOCS.map((doc) => {
                const color = DOC_STATUS_COLORS[doc.status];
                const Icon = doc.kind === 'Satellite imagery' ? Satellite : FileText;
                return (
                  <tr key={doc.name} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 text-[#F1F5F9]">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[#475569]" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{doc.kind}</td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{doc.category}</td>
                    <td className="px-4 py-2.5 text-[#94A3B8]">{doc.updated}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
                        style={{ borderColor: `${color}4D`, backgroundColor: `${color}1A`, color }}
                      >
                        {doc.status === 'Verified' && <CheckCircle2 className="h-2.5 w-2.5" />}
                        {doc.status === 'Missing' && <AlertTriangle className="h-2.5 w-2.5" />}
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-white/5 px-4 py-3">
          <span className="font-mono text-[10px] text-[#475569]">
            2 documents missing — palm oil &amp; soy geolocation files block final due diligence statements
          </span>
          <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#475569]" />
        </div>
      </Card>
    </div>
  );
}
