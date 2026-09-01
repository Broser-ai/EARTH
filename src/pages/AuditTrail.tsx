import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';
import {
  Download,
  Search,
  Calendar,
  User as UserIcon,
  Layers,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  FileOutput,
  CheckCircle2,
  Cpu,
  Zap,
  Route,
  Lock,
  Users,
  BarChart3,
  Hash,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Exported'
  | 'Approved'
  | 'Auto-generated'
  | 'Triggered'
  | 'Auto-routed'
  | 'Viewed'
  | 'Login';

type ModuleType = 'Operations' | 'Carbon' | 'Compliance' | 'Circular' | 'Reports' | 'System';

interface AuditRow {
  id: string;
  timestamp: string;
  user: string;
  action: ActionType;
  module: ModuleType;
  resource: string;
  details: string;
  ip: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const AUDIT_ROWS: AuditRow[] = [
  { id: 'EV-99201', timestamp: 'Jul 31, 14:32', user: 'Sarah Mueller', action: 'Created', module: 'Operations', resource: 'Pickup order #PU-4821', details: 'Berlin Tempelhof, Mixed plastics 2.4t', ip: '192.168.1.42' },
  { id: 'EV-99198', timestamp: 'Jul 31, 14:18', user: 'System', action: 'Auto-generated', module: 'Compliance', resource: 'CSRD report Q3', details: '94% completion, 3 items remaining', ip: '—' },
  { id: 'EV-99192', timestamp: 'Jul 31, 13:47', user: 'Michael Ambrosius', action: 'Approved', module: 'Circular', resource: 'OEM contract renewal', details: 'Bosch Power Tools, €38–142 credit range', ip: '10.0.1.15' },
  { id: 'EV-99187', timestamp: 'Jul 31, 13:22', user: 'Thomas Weber', action: 'Updated', module: 'Carbon', resource: 'Scope 3 data', details: 'Category 1: Purchased goods, +412 tCO2e', ip: '192.168.1.87' },
  { id: 'EV-99181', timestamp: 'Jul 31, 12:58', user: 'System', action: 'Triggered', module: 'Operations', resource: 'Route optimization', details: 'Route BER-01, saved 142km (-18%)', ip: '—' },
  { id: 'EV-99176', timestamp: 'Jul 31, 12:41', user: 'Anna Schmidt', action: 'Exported', module: 'Reports', resource: 'Carbon footprint report', details: 'PDF, Q2 2026, 2.4 MB', ip: '192.168.1.33' },
  { id: 'EV-99170', timestamp: 'Jul 31, 12:15', user: 'System', action: 'Auto-routed', module: 'Circular', resource: 'Take-back item #TB-9847', details: 'Bosch GSR 18V-55 → OEM (Grade A, €84 credit)', ip: '—' },
  { id: 'EV-99163', timestamp: 'Jul 31, 11:52', user: 'Lena Fischer', action: 'Created', module: 'Circular', resource: 'Take-back item #TB-9846', details: 'Makita DHP482, condition assessment pending', ip: '192.168.1.51' },
  { id: 'EV-99158', timestamp: 'Jul 31, 11:30', user: 'Thomas Weber', action: 'Viewed', module: 'Compliance', resource: 'ESRS E1 disclosure draft', details: 'Climate change section, revision 4', ip: '192.168.1.87' },
  { id: 'EV-99149', timestamp: 'Jul 31, 11:04', user: 'System', action: 'Auto-generated', module: 'Carbon', resource: 'Weekly emissions summary', details: 'Scope 1+2, week 31, -6.2% vs. prior week', ip: '—' },
  { id: 'EV-99141', timestamp: 'Jul 31, 10:47', user: 'Michael Ambrosius', action: 'Updated', module: 'Compliance', resource: 'Materiality assessment', details: 'Double materiality matrix, 2 topics reprioritized', ip: '10.0.1.15' },
  { id: 'EV-99133', timestamp: 'Jul 31, 10:19', user: 'Sarah Mueller', action: 'Deleted', module: 'Operations', resource: 'Pickup order #PU-4809', details: 'Duplicate entry, superseded by #PU-4821', ip: '192.168.1.42' },
  { id: 'EV-99127', timestamp: 'Jul 31, 09:58', user: 'Anna Schmidt', action: 'Created', module: 'Reports', resource: 'Investor ESG briefing', details: 'Draft v1, Q3 board pack', ip: '192.168.1.33' },
  { id: 'EV-99120', timestamp: 'Jul 31, 09:41', user: 'System', action: 'Triggered', module: 'Carbon', resource: 'Emission factor sync', details: 'DEFRA 2026 factors applied, 214 records updated', ip: '—' },
  { id: 'EV-99114', timestamp: 'Jul 31, 09:15', user: 'Lena Fischer', action: 'Login', module: 'System', resource: 'User session', details: 'SSO via Okta, MFA verified', ip: '192.168.1.51' },
  { id: 'EV-99108', timestamp: 'Jul 31, 08:52', user: 'Thomas Weber', action: 'Approved', module: 'Carbon', resource: 'Scope 2 market-based recalculation', details: 'Renewable PPA coverage 62%, -1,463 tCO2e', ip: '192.168.1.87' },
  { id: 'EV-99101', timestamp: 'Jul 31, 08:30', user: 'System', action: 'Auto-routed', module: 'Circular', resource: 'Take-back item #TB-9841', details: 'DeWalt DCD host, Grade B, → refurbishment', ip: '—' },
  { id: 'EV-99095', timestamp: 'Jul 31, 08:12', user: 'Michael Ambrosius', action: 'Login', module: 'System', resource: 'User session', details: 'SSO via Okta, MFA verified', ip: '10.0.1.15' },
];

const ACTION_TYPES: (ActionType | 'All actions')[] = [
  'All actions',
  'Created',
  'Updated',
  'Deleted',
  'Exported',
  'Approved',
];

const MODULE_TYPES: (ModuleType | 'All modules')[] = [
  'All modules',
  'Operations',
  'Carbon',
  'Compliance',
  'Circular',
];

const TOP_USERS = [
  { name: 'Sarah Mueller', count: 142, pct: 100 },
  { name: 'Thomas Weber', count: 118, pct: 83 },
  { name: 'System', count: 104, pct: 73 },
  { name: 'Anna Schmidt', count: 76, pct: 54 },
  { name: 'Michael Ambrosius', count: 61, pct: 43 },
];

const TOP_MODULES = [
  { name: 'Operations', count: 312, color: '#60A5FA' },
  { name: 'Circular', count: 254, color: '#34D399' },
  { name: 'Carbon', count: 189, color: '#F59E0B' },
  { name: 'Compliance', count: 92, color: '#EF4444' },
];

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur', className)}>
      {children}
    </div>
  );
}

const ACTION_META: Record<
  ActionType,
  { icon: typeof Plus; color: string }
> = {
  Created: { icon: Plus, color: '#34D399' },
  Updated: { icon: Pencil, color: '#60A5FA' },
  Deleted: { icon: Trash2, color: '#EF4444' },
  Exported: { icon: FileOutput, color: '#F59E0B' },
  Approved: { icon: CheckCircle2, color: '#34D399' },
  'Auto-generated': { icon: Cpu, color: '#94A3B8' },
  Triggered: { icon: Zap, color: '#94A3B8' },
  'Auto-routed': { icon: Route, color: '#94A3B8' },
  Viewed: { icon: BarChart3, color: '#60A5FA' },
  Login: { icon: Lock, color: '#60A5FA' },
};

function ActionBadge({ action }: { action: ActionType }) {
  const meta = ACTION_META[action];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide"
      style={{
        borderColor: `${meta.color}4D`,
        backgroundColor: `${meta.color}1A`,
        color: meta.color,
      }}
    >
      <Icon className="h-2.5 w-2.5" />
      {action}
    </span>
  );
}

const MODULE_COLOR: Record<ModuleType, string> = {
  Operations: '#60A5FA',
  Carbon: '#F59E0B',
  Compliance: '#EF4444',
  Circular: '#34D399',
  Reports: '#94A3B8',
  System: '#94A3B8',
};

function ModuleTag({ module }: { module: ModuleType }) {
  const color = MODULE_COLOR[module];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#94A3B8]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {module}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditTrail() {
  const { runtime, generation } = useEarthRuntime();
  void generation;
  const spine = runtime.eliability.asAuditView();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<(ActionType | 'All actions')>('All actions');
  const [moduleFilter, setModuleFilter] = useState<(ModuleType | 'All modules')>('All modules');
  const [userFilter, setUserFilter] = useState('All users');
  const [dateRange, setDateRange] = useState('Today');

  const users = useMemo(() => ['All users', ...Array.from(new Set(AUDIT_ROWS.map((r) => r.user)))], []);

  const filteredRows = useMemo(() => {
    return AUDIT_ROWS.filter((row) => {
      if (actionFilter !== 'All actions' && row.action !== actionFilter) return false;
      if (moduleFilter !== 'All modules' && row.module !== moduleFilter) return false;
      if (userFilter !== 'All users' && row.user !== userFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${row.resource} ${row.details} ${row.user} ${row.id}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [actionFilter, moduleFilter, userFilter, search]);

  return (
    <div className="min-h-screen w-full bg-[#060B18] px-6 py-6 text-[#F1F5F9]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-[#F1F5F9]">AUDIT TRAIL</h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            E-liability spine {spine.totalTCO2e.toLocaleString()} tCO₂e · hash-chain {runtime.ledger.length} entries
          </p>
        </div>
        <button
          className={clsx(
            'flex items-center gap-2 rounded-md border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-4 py-2',
            'font-mono text-xs font-semibold tracking-wide text-[#60A5FA] transition-colors hover:bg-[#60A5FA]/20'
          )}
        >
          <Download className="h-3.5 w-3.5" />
          Export log
        </button>
      </div>

      {/* Filter bar */}
      <Card className="mb-6 flex flex-wrap items-center gap-3 p-3">
        <FilterSelect
          icon={Calendar}
          value={dateRange}
          onChange={setDateRange}
          options={['Today', 'Last 7 days', 'Last 30 days', 'Q3 2026', 'Custom range']}
        />
        <FilterSelect icon={UserIcon} value={userFilter} onChange={setUserFilter} options={users} />
        <FilterSelect
          icon={ShieldCheck}
          value={actionFilter}
          onChange={(v) => setActionFilter(v as ActionType | 'All actions')}
          options={ACTION_TYPES}
        />
        <FilterSelect
          icon={Layers}
          value={moduleFilter}
          onChange={(v) => setModuleFilter(v as ModuleType | 'All modules')}
          options={MODULE_TYPES}
        />
        <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 sm:flex-none sm:w-64">
          <Search className="h-3.5 w-3.5 shrink-0 text-[#475569]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resource, user, event ID…"
            className="w-full bg-transparent font-mono text-xs text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none"
          />
        </div>
      </Card>

      {/* Main content: log table + sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        {/* Audit log table */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-3">
            <ShieldCheck className="h-3.5 w-3.5 text-[#60A5FA]" />
            <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">EVENT LOG</span>
            <span className="ml-auto font-mono text-[10px] text-[#475569]">
              {filteredRows.length} of {AUDIT_ROWS.length} events shown
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead>
                <tr className="border-b border-white/5 font-mono text-[10px] uppercase tracking-wide text-[#475569]">
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Module</th>
                  <th className="px-4 py-2.5 font-medium">Resource</th>
                  <th className="px-4 py-2.5 font-medium">Details</th>
                  <th className="px-4 py-2.5 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#94A3B8]">{row.timestamp}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#F1F5F9]">{row.user}</td>
                    <td className="px-4 py-2.5">
                      <ActionBadge action={row.action} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <ModuleTag module={row.module} />
                    </td>
                    <td className="px-4 py-2.5 text-[#F1F5F9]">{row.resource}</td>
                    <td className="max-w-[320px] px-4 py-2.5 text-[#94A3B8]">{row.details}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[#475569]">{row.ip}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#475569]">
                      No events match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Activity summary sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-[#60A5FA]" />
              <span className="font-mono text-[11px] font-semibold tracking-wide text-[#F1F5F9]">
                ACTIVITY SUMMARY
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-white/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#475569]">Today</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#60A5FA]">847</p>
                <p className="font-mono text-[10px] text-[#475569]">actions</p>
              </div>
              <div className="rounded-md border border-white/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#475569]">This week</p>
                <p className="mt-1 font-mono text-xl font-bold text-[#F1F5F9]">4,218</p>
                <p className="font-mono text-[10px] text-[#475569]">actions</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-[#60A5FA]" />
              <span className="font-mono text-[11px] font-semibold tracking-wide text-[#F1F5F9]">
                TOP USERS BY ACTIVITY
              </span>
            </div>
            <div className="space-y-2.5">
              {TOP_USERS.map((u) => (
                <div key={u.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#F1F5F9]">{u.name}</span>
                    <span className="font-mono text-[11px] text-[#94A3B8]">{u.count}</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-[#60A5FA]"
                      style={{ width: `${u.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-[#60A5FA]" />
              <span className="font-mono text-[11px] font-semibold tracking-wide text-[#F1F5F9]">
                MOST ACTIVE MODULES
              </span>
            </div>
            <div className="space-y-2.5">
              {TOP_MODULES.map((m) => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="flex-1 font-mono text-[11px] text-[#F1F5F9]">{m.name}</span>
                  <span className="font-mono text-[11px] text-[#94A3B8]">{m.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Compliance note */}
      <Card className="mt-6 flex flex-wrap items-center gap-3 p-4">
        <Hash className="h-4 w-4 shrink-0 text-[#34D399]" />
        <p className="text-xs text-[#94A3B8]">
          All audit logs retained for <span className="text-[#F1F5F9]">7 years</span> per CSRD Article 19a
          requirements. Tamper-proof storage with{' '}
          <span className="font-mono text-[#34D399]">SHA-256</span> hash verification.
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterSelect<T extends string>({
  icon: Icon,
  value,
  onChange,
  options,
}: {
  icon: typeof Calendar;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#475569]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer bg-transparent font-mono text-xs text-[#F1F5F9] focus:outline-none [&>option]:bg-[#0D1425]"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
