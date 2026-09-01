import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  AlertTriangle,
  Container as ContainerIcon,
  Wrench,
  CheckCircle2,
  Ban,
  Map as MapIcon,
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContainerType = 'Skip' | 'Roll-off' | 'Compactor' | 'Front-load';
type ContainerStatus = 'In service' | 'Maintenance' | 'Available' | 'Decommissioned';

interface FleetContainer {
  id: string;
  location: string;
  city: string;
  type: ContainerType;
  capacity: number; // m3
  fillLevel: number; // %
  lastPickup: string; // ISO date
  nextScheduled: string; // ISO date
  status: ContainerStatus;
}

interface MaintenanceAlert {
  containerId: string;
  location: string;
  reason: string;
  dueDate: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const FLEET_TOTAL = 1204;
const FLEET_LOCATIONS = 847;

const CONTAINERS: FleetContainer[] = [
  { id: '#CT-4471', location: 'Hornbach Baumarkt Mitte', city: 'Berlin', type: 'Roll-off', capacity: 30, fillLevel: 92, lastPickup: '2026-07-24', nextScheduled: '2026-08-01', status: 'In service' },
  { id: '#CT-3382', location: 'OBI Sendling', city: 'München', type: 'Compactor', capacity: 20, fillLevel: 41, lastPickup: '2026-07-28', nextScheduled: '2026-08-06', status: 'In service' },
  { id: '#CT-5019', location: 'Bosch Plant Hamburg-Harburg', city: 'Hamburg', type: 'Skip', capacity: 8, fillLevel: 67, lastPickup: '2026-07-26', nextScheduled: '2026-08-02', status: 'In service' },
  { id: '#CT-2856', location: 'Makita Distribution Köln', city: 'Köln', type: 'Roll-off', capacity: 36, fillLevel: 15, lastPickup: '2026-07-29', nextScheduled: '2026-08-12', status: 'Available' },
  { id: '#CT-6094', location: 'BASF Industriepark Frankfurt', city: 'Frankfurt', type: 'Compactor', capacity: 25, fillLevel: 78, lastPickup: '2026-07-22', nextScheduled: '2026-07-31', status: 'In service' },
  { id: '#CT-1147', location: 'Stihl Werk Stuttgart-Ost', city: 'Stuttgart', type: 'Front-load', capacity: 5, fillLevel: 0, lastPickup: '2026-07-18', nextScheduled: '—', status: 'Maintenance' },
  { id: '#CT-7723', location: 'Würth Zentrallager Düsseldorf', city: 'Düsseldorf', type: 'Skip', capacity: 10, fillLevel: 54, lastPickup: '2026-07-27', nextScheduled: '2026-08-03', status: 'In service' },
  { id: '#CT-3305', location: 'Toom Baumarkt Leipzig-Nord', city: 'Leipzig', type: 'Roll-off', capacity: 30, fillLevel: 88, lastPickup: '2026-07-21', nextScheduled: '2026-08-01', status: 'In service' },
  { id: '#CT-9012', location: 'Hagebau Logistikzentrum Dortmund', city: 'Dortmund', type: 'Front-load', capacity: 6, fillLevel: 33, lastPickup: '2026-07-29', nextScheduled: '2026-08-08', status: 'In service' },
  { id: '#CT-4468', location: 'Metabo Werk Essen', city: 'Essen', type: 'Compactor', capacity: 22, fillLevel: 0, lastPickup: '2026-07-15', nextScheduled: '—', status: 'Maintenance' },
  { id: '#CT-2210', location: 'AEG Powertools Bremen', city: 'Bremen', type: 'Skip', capacity: 8, fillLevel: 96, lastPickup: '2026-07-19', nextScheduled: '2026-07-31', status: 'In service' },
  { id: '#CT-5587', location: 'Einhell Vertriebszentrum Dresden', city: 'Dresden', type: 'Roll-off', capacity: 36, fillLevel: 0, lastPickup: '2026-06-30', nextScheduled: '—', status: 'Decommissioned' },
];

const MAINTENANCE_ALERTS: MaintenanceAlert[] = [
  { containerId: '#CT-1147', location: 'Stihl Werk Stuttgart-Ost', reason: 'Hydraulic lid actuator fault', dueDate: '2026-08-01' },
  { containerId: '#CT-4468', location: 'Metabo Werk Essen', reason: 'Compaction motor overheating', dueDate: '2026-08-03' },
  { containerId: '#CT-8834', location: 'Remondis Hub Nürnberg', reason: 'Scheduled 12-month inspection', dueDate: '2026-08-05' },
  { containerId: '#CT-6621', location: 'Interzero Hub Hannover', reason: 'Sensor calibration drift detected', dueDate: '2026-08-07' },
];

const TYPES: ContainerType[] = ['Skip', 'Roll-off', 'Compactor', 'Front-load'];
const STATUSES: ContainerStatus[] = ['In service', 'Maintenance', 'Available', 'Decommissioned'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fillLevelTone(level: number): { bar: string; text: string } {
  if (level >= 85) return { bar: 'bg-danger', text: 'text-danger' };
  if (level >= 60) return { bar: 'bg-amber', text: 'text-amber' };
  return { bar: 'bg-success', text: 'text-success' };
}

function statusBadge(status: ContainerStatus): { bg: string; text: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case 'In service':
      return { bg: 'bg-accent/10', text: 'text-accent', icon: CheckCircle2 };
    case 'Maintenance':
      return { bg: 'bg-amber/10', text: 'text-amber', icon: Wrench };
    case 'Available':
      return { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle2 };
    case 'Decommissioned':
      return { bg: 'bg-white/[0.06]', text: 'text-text-muted', icon: Ban };
  }
}

function formatDate(iso: string): string {
  if (iso === '—') return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContainerFleet() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContainerType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'all'>('all');
  const [capacityFilter, setCapacityFilter] = useState<'all' | 'small' | 'medium' | 'large'>('all');

  const filtered = useMemo(() => {
    return CONTAINERS.filter((c) => {
      const matchesSearch =
        search.trim() === '' ||
        c.location.toLowerCase().includes(search.toLowerCase()) ||
        c.city.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCapacity =
        capacityFilter === 'all' ||
        (capacityFilter === 'small' && c.capacity <= 10) ||
        (capacityFilter === 'medium' && c.capacity > 10 && c.capacity <= 25) ||
        (capacityFilter === 'large' && c.capacity > 25);
      return matchesSearch && matchesType && matchesStatus && matchesCapacity;
    });
  }, [search, typeFilter, statusFilter, capacityFilter]);

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            CONTAINER FLEET
          </h1>
          <span className="font-mono text-sm text-text-secondary">
            {FLEET_TOTAL.toLocaleString()} containers · {FLEET_LOCATIONS.toLocaleString()} locations
          </span>
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20">
          <Plus className="h-4 w-4" />
          ADD CONTAINER
        </button>
      </div>

      {/* Fleet summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total containers"
          value={FLEET_TOTAL.toLocaleString()}
          icon={ContainerIcon}
          tone="default"
        />
        <SummaryCard
          label="In service"
          value="1,087"
          sub="90.3%"
          icon={CheckCircle2}
          tone="accent"
        />
        <SummaryCard label="Maintenance" value="84" icon={Wrench} tone="amber" />
        <SummaryCard label="Available" value="33" icon={CheckCircle2} tone="success" />
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white/[0.03] p-3 backdrop-blur">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location or container ID..."
            className="w-full rounded-md border border-border bg-white/[0.03] py-2 pl-9 pr-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none"
          />
        </div>

        <FilterSelect
          value={typeFilter}
          onChange={(v) => setTypeFilter(v as ContainerType | 'all')}
          options={[{ value: 'all', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: t }))]}
        />

        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as ContainerStatus | 'all')}
          options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
        />

        <FilterSelect
          value={capacityFilter}
          onChange={(v) => setCapacityFilter(v as 'all' | 'small' | 'medium' | 'large')}
          options={[
            { value: 'all', label: 'All capacities' },
            { value: 'small', label: '≤ 10 m³' },
            { value: 'medium', label: '11–25 m³' },
            { value: 'large', label: '> 25 m³' },
          ]}
        />
      </div>

      {/* Data table */}
      <div className="mb-6 overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
            FLEET REGISTER
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            Showing {filtered.length} of {CONTAINERS.length} sampled containers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5 font-medium">Container ID</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Capacity</th>
                <th className="px-4 py-2.5 font-medium">Fill level</th>
                <th className="px-4 py-2.5 font-medium">Last pickup</th>
                <th className="px-4 py-2.5 font-medium">Next scheduled</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const fill = fillLevelTone(c.fillLevel);
                const badge = statusBadge(c.status);
                const BadgeIcon = badge.icon;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-accent">{c.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-text-primary">{c.location}</div>
                      <div className="text-[10px] text-text-muted">{c.city}, Germany</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{c.type}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{c.capacity} m³</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={clsx('h-full rounded-full', fill.bar)}
                            style={{ width: `${c.fillLevel}%` }}
                          />
                        </div>
                        <span className={clsx('font-mono text-[11px] font-semibold', fill.text)}>
                          {c.fillLevel}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {formatDate(c.lastPickup)}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-secondary">
                      {formatDate(c.nextScheduled)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide',
                          badge.bg,
                          badge.text
                        )}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                    No containers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Map placeholder */}
        <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <MapIcon className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              CONTAINER LOCATIONS
            </span>
          </div>
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-space-light/60 text-center">
            <MapPin className="h-6 w-6 text-text-muted" />
            <p className="font-mono text-xs text-text-secondary">
              Live map integration pending
            </p>
            <p className="max-w-xs text-[11px] text-text-muted">
              Geolocation overlay for all {FLEET_LOCATIONS.toLocaleString()} sites will render here
              once the mapping provider (Mapbox/MapLibre) is connected.
            </p>
          </div>
        </div>

        {/* Maintenance alerts */}
        <div className="rounded-lg border border-amber/20 bg-white/[0.03] p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              MAINTENANCE ALERTS
            </span>
            <span className="ml-auto rounded-full bg-amber/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber">
              {MAINTENANCE_ALERTS.length}
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {MAINTENANCE_ALERTS.map((alert) => (
              <div
                key={alert.containerId}
                className="rounded-md border border-border bg-white/[0.02] px-3 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-accent">
                    {alert.containerId}
                  </span>
                  <span className="font-mono text-[10px] text-amber">
                    Due {formatDate(alert.dueDate)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-text-secondary">{alert.location}</p>
                <p className="text-[10px] text-text-muted">{alert.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof ContainerIcon;
  tone: 'default' | 'accent' | 'amber' | 'success';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-text-primary',
    accent: 'text-accent',
    amber: 'text-amber',
    success: 'text-success',
  };
  const iconBg: Record<string, string> = {
    default: 'bg-white/[0.04]',
    accent: 'bg-accent/10',
    amber: 'bg-amber/10',
    success: 'bg-success/10',
  };

  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <div className={clsx('flex h-6 w-6 items-center justify-center rounded-md', iconBg[tone])}>
          <Icon className={clsx('h-3.5 w-3.5', toneClass[tone])} />
        </div>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={clsx('font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
        {sub && <span className="font-mono text-xs font-semibold text-text-secondary">{sub}</span>}
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-md border border-border bg-white/[0.03] px-3 py-2 font-mono text-xs text-text-secondary focus:border-accent/40 focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-space-light text-text-primary">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
