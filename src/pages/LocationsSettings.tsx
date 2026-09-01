import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Upload,
  MapPin,
  Building2,
  CheckCircle2,
  PauseCircle,
  Wrench,
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LocationRegion =
  | 'Berlin-Brandenburg'
  | 'Bayern'
  | 'Hamburg'
  | 'Nordrhein-Westfalen'
  | 'Hessen'
  | 'Baden-Württemberg'
  | 'Niedersachsen'
  | 'Sachsen';

type LocationStatus = 'Active' | 'Onboarding' | 'Maintenance' | 'Paused';

interface HornbachLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  region: LocationRegion;
  containers: number;
  programs: string[];
  status: LocationStatus;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TOTAL_LOCATIONS = 847;

const LOCATIONS: HornbachLocation[] = [
  { id: 'HB-1001', name: 'Berlin Tempelhof', address: 'Tempelhofer Damm 227', city: 'Berlin', region: 'Berlin-Brandenburg', containers: 6, programs: ['Take-back', 'Reverse logistics'], status: 'Active' },
  { id: 'HB-1002', name: 'München Pasing', address: 'Landsberger Straße 480', city: 'München', region: 'Bayern', containers: 5, programs: ['Take-back'], status: 'Active' },
  { id: 'HB-1003', name: 'Hamburg Altona', address: 'Kieler Straße 333', city: 'Hamburg', region: 'Hamburg', containers: 4, programs: ['Return & replace', 'Take-back'], status: 'Active' },
  { id: 'HB-1004', name: 'Köln Mülheim', address: 'Frankfurter Straße 100', city: 'Köln', region: 'Nordrhein-Westfalen', containers: 7, programs: ['Reverse logistics'], status: 'Maintenance' },
  { id: 'HB-1005', name: 'Frankfurt Süd', address: 'Mörfelder Landstraße 199', city: 'Frankfurt', region: 'Hessen', containers: 5, programs: ['Take-back', 'B2B marketplace'], status: 'Active' },
  { id: 'HB-1006', name: 'Stuttgart West', address: 'Vaihinger Straße 150', city: 'Stuttgart', region: 'Baden-Württemberg', containers: 6, programs: ['Take-back'], status: 'Active' },
  { id: 'HB-1007', name: 'Düsseldorf Nord', address: 'Kalkumer Schlossallee 20', city: 'Düsseldorf', region: 'Nordrhein-Westfalen', containers: 4, programs: ['Reverse logistics', 'Return & replace'], status: 'Onboarding' },
  { id: 'HB-1008', name: 'Hannover Mitte', address: 'Vahrenwalder Straße 269', city: 'Hannover', region: 'Niedersachsen', containers: 5, programs: ['Take-back'], status: 'Active' },
  { id: 'HB-1009', name: 'Nürnberg Süd', address: 'Regensburger Straße 200', city: 'Nürnberg', region: 'Bayern', containers: 3, programs: ['Take-back', 'Reverse logistics'], status: 'Paused' },
  { id: 'HB-1010', name: 'Leipzig Ost', address: 'Permoserstraße 12', city: 'Leipzig', region: 'Sachsen', containers: 5, programs: ['Return & replace'], status: 'Active' },
  { id: 'HB-1011', name: 'Dortmund Hörde', address: 'Faßstraße 3', city: 'Dortmund', region: 'Nordrhein-Westfalen', containers: 4, programs: ['Take-back'], status: 'Active' },
  { id: 'HB-1012', name: 'Bremen Vahr', address: 'Züricher Straße 30', city: 'Bremen', region: 'Niedersachsen', containers: 3, programs: ['Reverse logistics'], status: 'Active' },
];

const REGIONS: LocationRegion[] = [
  'Berlin-Brandenburg',
  'Bayern',
  'Hamburg',
  'Nordrhein-Westfalen',
  'Hessen',
  'Baden-Württemberg',
  'Niedersachsen',
  'Sachsen',
];

const STATUSES: LocationStatus[] = ['Active', 'Onboarding', 'Maintenance', 'Paused'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: LocationStatus): { bg: string; text: string; icon: typeof CheckCircle2 } {
  switch (status) {
    case 'Active':
      return { bg: 'bg-success/10', text: 'text-success', icon: CheckCircle2 };
    case 'Onboarding':
      return { bg: 'bg-accent/10', text: 'text-accent', icon: Building2 };
    case 'Maintenance':
      return { bg: 'bg-amber/10', text: 'text-amber', icon: Wrench };
    case 'Paused':
      return { bg: 'bg-white/[0.06]', text: 'text-text-muted', icon: PauseCircle };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocationsSettings() {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<LocationRegion | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LocationStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return LOCATIONS.filter((loc) => {
      const matchesSearch =
        search.trim() === '' ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        loc.city.toLowerCase().includes(search.toLowerCase()) ||
        loc.id.toLowerCase().includes(search.toLowerCase());
      const matchesRegion = regionFilter === 'all' || loc.region === regionFilter;
      const matchesStatus = statusFilter === 'all' || loc.status === statusFilter;
      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [search, regionFilter, statusFilter]);

  const activeCount = LOCATIONS.filter((l) => l.status === 'Active').length;
  const totalContainers = LOCATIONS.reduce((sum, l) => sum + l.containers, 0);

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            LOCATIONS
          </h1>
          <span className="font-mono text-sm text-text-secondary">
            {TOTAL_LOCATIONS.toLocaleString()} Hornbach sites across Germany
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-4 py-2 font-mono text-xs font-semibold tracking-wider text-text-secondary transition-all hover:bg-white/[0.06]">
            <Upload className="h-4 w-4" />
            BULK IMPORT
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20">
            <Plus className="h-4 w-4" />
            ADD LOCATION
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Total locations" value={TOTAL_LOCATIONS.toLocaleString()} icon={Building2} tone="default" />
        <SummaryCard label="Active" value={activeCount.toLocaleString()} icon={CheckCircle2} tone="success" />
        <SummaryCard label="Total containers" value={totalContainers.toLocaleString()} icon={MapPin} tone="accent" />
        <SummaryCard label="Regions covered" value={REGIONS.length.toString()} icon={MapPin} tone="amber" />
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white/[0.03] p-3 backdrop-blur">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search location, city or ID..."
            className="w-full rounded-md border border-border bg-white/[0.03] py-2 pl-9 pr-3 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none"
          />
        </div>

        <FilterSelect
          value={regionFilter}
          onChange={(v) => setRegionFilter(v as LocationRegion | 'all')}
          options={[{ value: 'all', label: 'All regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
        />

        <FilterSelect
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as LocationStatus | 'all')}
          options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      {/* Data table */}
      <div className="overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
            LOCATION REGISTER
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            Showing {filtered.length} of {TOTAL_LOCATIONS.toLocaleString()} locations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5 font-medium">Location name</th>
                <th className="px-4 py-2.5 font-medium">Address</th>
                <th className="px-4 py-2.5 font-medium">City</th>
                <th className="px-4 py-2.5 font-medium">Region</th>
                <th className="px-4 py-2.5 font-medium">Containers</th>
                <th className="px-4 py-2.5 font-medium">Active programs</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loc) => {
                const badge = statusBadge(loc.status);
                const BadgeIcon = badge.icon;
                return (
                  <tr key={loc.id} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text-primary">{loc.name}</div>
                      <div className="font-mono text-[10px] text-text-muted">{loc.id}</div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{loc.address}</td>
                    <td className="px-4 py-3 text-text-secondary">{loc.city}</td>
                    <td className="px-4 py-3 text-text-secondary">{loc.region}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{loc.containers}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {loc.programs.map((p) => (
                          <span
                            key={p}
                            className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-secondary"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
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
                        {loc.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                    No locations match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
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
      <div className="mt-1.5">
        <p className={clsx('font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
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
