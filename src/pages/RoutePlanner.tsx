import { useState } from 'react';
import {
  Route as RouteIcon,
  Wand2,
  Plus,
  MapPin,
  Truck,
  Gauge,
  Clock,
  CheckCircle2,
  ArrowRightCircle,
  Circle,
  Fuel,
  Leaf,
  TrendingDown,
  Map as MapIcon,
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RouteStatus = 'in-progress' | 'scheduled' | 'completed';

interface RouteStop {
  id: number;
  address: string;
  eta: string;
  container: string;
  material: string;
  state: 'completed' | 'current' | 'upcoming';
}

interface CollectionRoute {
  id: string;
  driver: string;
  truck: string;
  stopsDone: number;
  stopsTotal: number;
  progress: number;
  status: RouteStatus;
  stops: RouteStop[];
}

const STATUS_TONE: Record<RouteStatus, 'success' | 'accent' | 'amber'> = {
  'in-progress': 'accent',
  scheduled: 'amber',
  completed: 'success',
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const ROUTES: CollectionRoute[] = [
  {
    id: 'BER-01',
    driver: 'M. Schmidt',
    truck: 'HB-4847',
    stopsDone: 8,
    stopsTotal: 12,
    progress: 67,
    status: 'in-progress',
    stops: [
      { id: 1, address: 'Karl-Marx-Allee 24', eta: '07:10', container: '1100L Bin', material: 'Mixed recycling', state: 'completed' },
      { id: 2, address: 'Frankfurter Allee 118', eta: '07:28', container: '660L Bin', material: 'Paper & cardboard', state: 'completed' },
      { id: 3, address: 'Warschauer Str. 45', eta: '07:47', container: '1100L Bin', material: 'Residual waste', state: 'completed' },
      { id: 4, address: 'Revaler Str. 9', eta: '08:05', container: '360L Bin', material: 'Glass', state: 'completed' },
      { id: 5, address: 'Boxhagener Str. 71', eta: '08:22', container: '1100L Bin', material: 'Mixed recycling', state: 'completed' },
      { id: 6, address: 'Simon-Dach-Str. 12', eta: '08:41', container: '660L Bin', material: 'Organic waste', state: 'completed' },
      { id: 7, address: 'Grünberger Str. 55', eta: '09:03', container: '1100L Bin', material: 'Residual waste', state: 'completed' },
      { id: 8, address: 'Gärtnerstr. 30', eta: '09:20', container: '360L Bin', material: 'Paper & cardboard', state: 'completed' },
      { id: 9, address: 'Krossener Str. 3', eta: '09:38', container: '1100L Bin', material: 'Mixed recycling', state: 'current' },
      { id: 10, address: 'Lenaustr. 17', eta: '09:55', container: '660L Bin', material: 'Glass', state: 'upcoming' },
      { id: 11, address: 'Wühlischstr. 42', eta: '10:12', container: '1100L Bin', material: 'Residual waste', state: 'upcoming' },
      { id: 12, address: 'Gabriel-Max-Str. 8', eta: '10:30', container: '360L Bin', material: 'Organic waste', state: 'upcoming' },
    ],
  },
  {
    id: 'MUC-03',
    driver: 'K. Weber',
    truck: 'HB-2214',
    stopsDone: 3,
    stopsTotal: 9,
    progress: 33,
    status: 'in-progress',
    stops: [
      { id: 1, address: 'Maximilianstr. 14', eta: '07:15', container: '1100L Bin', material: 'Mixed recycling', state: 'completed' },
      { id: 2, address: 'Sonnenstr. 27', eta: '07:40', container: '660L Bin', material: 'Paper & cardboard', state: 'completed' },
      { id: 3, address: 'Landwehrstr. 61', eta: '08:05', container: '1100L Bin', material: 'Residual waste', state: 'completed' },
      { id: 4, address: 'Schwanthalerstr. 88', eta: '08:32', container: '360L Bin', material: 'Glass', state: 'current' },
      { id: 5, address: 'Bayerstr. 10', eta: '08:55', container: '1100L Bin', material: 'Organic waste', state: 'upcoming' },
      { id: 6, address: 'Goethestr. 33', eta: '09:18', container: '660L Bin', material: 'Mixed recycling', state: 'upcoming' },
      { id: 7, address: 'Paul-Heyse-Str. 5', eta: '09:40', container: '1100L Bin', material: 'Residual waste', state: 'upcoming' },
      { id: 8, address: 'Hermann-Lingg-Str. 2', eta: '10:02', container: '360L Bin', material: 'Paper & cardboard', state: 'upcoming' },
      { id: 9, address: 'Marsstr. 19', eta: '10:24', container: '660L Bin', material: 'Glass', state: 'upcoming' },
    ],
  },
  {
    id: 'HAM-02',
    driver: 'T. Müller',
    truck: 'HB-1847',
    stopsDone: 0,
    stopsTotal: 7,
    progress: 0,
    status: 'scheduled',
    stops: [
      { id: 1, address: 'Reeperbahn 45', eta: '11:00', container: '1100L Bin', material: 'Mixed recycling', state: 'upcoming' },
      { id: 2, address: 'Große Freiheit 22', eta: '11:25', container: '660L Bin', material: 'Residual waste', state: 'upcoming' },
      { id: 3, address: 'Talstr. 8', eta: '11:48', container: '360L Bin', material: 'Glass', state: 'upcoming' },
      { id: 4, address: 'Simon-von-Utrecht-Str. 30', eta: '12:10', container: '1100L Bin', material: 'Organic waste', state: 'upcoming' },
      { id: 5, address: 'Wohlwillstr. 14', eta: '12:33', container: '660L Bin', material: 'Paper & cardboard', state: 'upcoming' },
      { id: 6, address: 'Schulterblatt 19', eta: '12:56', container: '1100L Bin', material: 'Mixed recycling', state: 'upcoming' },
      { id: 7, address: 'Susannenstr. 3', eta: '13:18', container: '360L Bin', material: 'Residual waste', state: 'upcoming' },
    ],
  },
  {
    id: 'CGN-01',
    driver: 'S. Fischer',
    truck: 'HB-3312',
    stopsDone: 6,
    stopsTotal: 6,
    progress: 100,
    status: 'completed',
    stops: [
      { id: 1, address: 'Hohe Str. 100', eta: '06:30', container: '1100L Bin', material: 'Mixed recycling', state: 'completed' },
      { id: 2, address: 'Schildergasse 55', eta: '06:52', container: '660L Bin', material: 'Paper & cardboard', state: 'completed' },
      { id: 3, address: 'Ehrenstr. 18', eta: '07:15', container: '1100L Bin', material: 'Residual waste', state: 'completed' },
      { id: 4, address: 'Aachener Str. 9', eta: '07:38', container: '360L Bin', material: 'Glass', state: 'completed' },
      { id: 5, address: 'Zülpicher Str. 40', eta: '08:00', container: '1100L Bin', material: 'Organic waste', state: 'completed' },
      { id: 6, address: 'Venloer Str. 77', eta: '08:22', container: '660L Bin', material: 'Mixed recycling', state: 'completed' },
    ],
  },
  {
    id: 'FRA-02',
    driver: 'L. Bauer',
    truck: 'HB-5521',
    stopsDone: 4,
    stopsTotal: 8,
    progress: 50,
    status: 'in-progress',
    stops: [
      { id: 1, address: 'Zeil 90', eta: '07:00', container: '1100L Bin', material: 'Mixed recycling', state: 'completed' },
      { id: 2, address: 'Kaiserstr. 22', eta: '07:24', container: '660L Bin', material: 'Residual waste', state: 'completed' },
      { id: 3, address: 'Berger Str. 130', eta: '07:47', container: '1100L Bin', material: 'Paper & cardboard', state: 'completed' },
      { id: 4, address: 'Leipziger Str. 42', eta: '08:10', container: '360L Bin', material: 'Glass', state: 'completed' },
      { id: 5, address: 'Schweizer Str. 15', eta: '08:33', container: '1100L Bin', material: 'Organic waste', state: 'current' },
      { id: 6, address: 'Oeder Weg 60', eta: '08:56', container: '660L Bin', material: 'Mixed recycling', state: 'upcoming' },
      { id: 7, address: 'Eschersheimer Landstr. 200', eta: '09:19', container: '1100L Bin', material: 'Residual waste', state: 'upcoming' },
      { id: 8, address: 'Friedberger Landstr. 33', eta: '09:42', container: '360L Bin', material: 'Glass', state: 'upcoming' },
    ],
  },
  {
    id: 'STR-01',
    driver: 'J. Hoffmann',
    truck: 'HB-7743',
    stopsDone: 2,
    stopsTotal: 5,
    progress: 40,
    status: 'in-progress',
    stops: [
      { id: 1, address: 'Königstr. 40', eta: '11:30', container: '1100L Bin', material: 'Mixed recycling', state: 'completed' },
      { id: 2, address: 'Calwer Str. 21', eta: '11:52', container: '660L Bin', material: 'Residual waste', state: 'completed' },
      { id: 3, address: 'Eberhardstr. 16', eta: '12:15', container: '360L Bin', material: 'Glass', state: 'current' },
      { id: 4, address: 'Tübinger Str. 9', eta: '12:38', container: '1100L Bin', material: 'Organic waste', state: 'upcoming' },
      { id: 5, address: 'Rotebühlstr. 88', eta: '13:00', container: '660L Bin', material: 'Paper & cardboard', state: 'upcoming' },
    ],
  },
];

const STATUS_LABEL: Record<RouteStatus, string> = {
  'in-progress': 'In progress',
  scheduled: 'Scheduled',
  completed: 'Completed',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoutePlanner() {
  const [selectedId, setSelectedId] = useState<string>(ROUTES[0].id);
  const selectedRoute = ROUTES.find((r) => r.id === selectedId) ?? ROUTES[0];

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            ROUTE PLANNER
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Route planning &amp; optimization for waste collection trucks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 font-mono text-xs font-semibold tracking-wider text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary">
            <Plus className="h-4 w-4" />
            ADD STOP
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-5 py-2.5 font-mono text-xs font-semibold tracking-wider text-accent transition-colors hover:bg-accent/20">
            <Wand2 className="h-4 w-4" />
            OPTIMIZE ROUTES
          </button>
        </div>
      </div>

      {/* Today's summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active Routes" value="12" icon={RouteIcon} tone="accent" />
        <StatTile label="Stops Remaining" value="47" icon={MapPin} tone="amber" />
        <StatTile label="Trucks Deployed" value="8" icon={Truck} tone="default" />
        <StatTile label="Est. Completion" value="16:45" icon={Clock} tone="success" />
      </div>

      {/* Route list table */}
      <div className="mb-6 overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <RouteIcon className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
            TODAY&apos;S ROUTES
          </span>
          <span className="ml-auto font-mono text-[10px] text-text-muted">
            {ROUTES.length} routes
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Route</th>
                <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Driver</th>
                <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Truck</th>
                <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Stops</th>
                <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Progress</th>
                <th className="px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ROUTES.map((route) => (
                <RouteRow
                  key={route.id}
                  route={route}
                  selected={route.id === selectedId}
                  onSelect={() => setSelectedId(route.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel + map */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        {/* Route detail */}
        <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-4 py-2.5">
            <Gauge className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              ROUTE DETAIL — {selectedRoute.id}
            </span>
            <span className="text-xs text-text-secondary">
              {selectedRoute.driver} &middot; {selectedRoute.truck}
            </span>
            <StatusBadge status={selectedRoute.status} className="ml-auto" />
          </div>

          <div className="max-h-[480px] divide-y divide-white/5 overflow-y-auto">
            {selectedRoute.stops.map((stop, idx) => (
              <StopRow key={stop.id} stop={stop} index={idx + 1} />
            ))}
          </div>
        </div>

        {/* Map placeholder */}
        <div className="flex min-h-[400px] flex-col rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur lg:min-h-full">
          <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
            <MapIcon className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              MAP VIEW
            </span>
            <span className="ml-auto font-mono text-[10px] text-text-muted">
              Route {selectedRoute.id}
            </span>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden">
            <div className="absolute inset-4 rounded-md border border-dashed border-white/10" />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(96,165,250,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.4) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }}
            />
            <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
              <MapIcon className="h-10 w-10 text-text-muted" />
              <p className="font-mono text-sm font-semibold tracking-wide text-text-secondary">
                Map view — route visualization
              </p>
              <p className="max-w-sm text-xs text-text-muted">
                Live map integration (Mapbox / Google Maps) renders truck positions, stop
                sequence, and turn-by-turn geometry here once connected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization metrics */}
      <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <TrendingDown className="h-3.5 w-3.5 text-success" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
            OPTIMIZATION IMPACT
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <MetricTile
            label="Distance Saved"
            value="142 km"
            delta="-18%"
            icon={RouteIcon}
          />
          <MetricTile
            label="Fuel Saved"
            value="47 L"
            delta={null}
            icon={Fuel}
          />
          <MetricTile
            label="CO2 Reduced"
            value="124 kg"
            delta={null}
            icon={Leaf}
          />
          <MetricTile
            label="Time Saved"
            value="2.4 hrs"
            delta={null}
            icon={Clock}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: typeof RouteIcon;
  tone?: 'default' | 'success' | 'amber' | 'danger' | 'accent' | 'muted';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-text-primary',
    success: 'text-success',
    amber: 'text-amber',
    danger: 'text-danger',
    accent: 'text-accent',
    muted: 'text-text-secondary',
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <Icon className={clsx('h-3.5 w-3.5', toneClass[tone])} />
      </div>
      <p className={clsx('mt-1.5 font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  className,
}: {
  status: RouteStatus;
  className?: string;
}) {
  const tone = STATUS_TONE[status];
  const toneClass: Record<string, string> = {
    success: 'border-success/30 bg-success/10 text-success',
    accent: 'border-accent/30 bg-accent/10 text-accent',
    amber: 'border-amber/30 bg-amber/10 text-amber',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider',
        toneClass[tone],
        className
      )}
    >
      <span
        className={clsx('h-1.5 w-1.5 rounded-full', {
          'bg-accent animate-pulse': tone === 'accent',
          'bg-amber': tone === 'amber',
          'bg-success': tone === 'success',
        })}
      />
      {STATUS_LABEL[status].toUpperCase()}
    </span>
  );
}

function RouteRow({
  route,
  selected,
  onSelect,
}: {
  route: CollectionRoute;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <tr
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={clsx(
        'cursor-pointer outline-none transition-colors focus-visible:bg-accent/[0.08]',
        selected ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.03]'
      )}
    >
      <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wide text-text-primary">
        Route {route.id}
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary">{route.driver}</td>
      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{route.truck}</td>
      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
        {route.stopsDone}/{route.stopsTotal}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
            <div
              className={clsx('h-full rounded-full', {
                'bg-success': STATUS_TONE[route.status] === 'success',
                'bg-accent': STATUS_TONE[route.status] === 'accent',
                'bg-amber': STATUS_TONE[route.status] === 'amber',
              })}
              style={{ width: `${route.progress}%` }}
            />
          </div>
          <span className="font-mono text-[11px] font-semibold text-text-secondary">
            {route.progress}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={route.status} />
      </td>
    </tr>
  );
}

function StopRow({ stop, index }: { stop: RouteStop; index: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center">
        {stop.state === 'completed' && <CheckCircle2 className="h-4 w-4 text-success" />}
        {stop.state === 'current' && <ArrowRightCircle className="h-4 w-4 animate-pulse text-accent" />}
        {stop.state === 'upcoming' && <Circle className="h-3.5 w-3.5 text-text-muted" />}
      </div>

      <span className="w-6 shrink-0 font-mono text-[10px] text-text-muted">{index}</span>

      <div className="min-w-0 flex-1">
        <p
          className={clsx('truncate text-xs font-medium', {
            'text-text-secondary': stop.state === 'completed',
            'text-text-primary': stop.state === 'current',
            'text-text-primary/90': stop.state === 'upcoming',
          })}
        >
          {stop.address}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-text-muted">
          {stop.container} &middot; {stop.material}
        </p>
      </div>

      <span
        className={clsx('shrink-0 font-mono text-xs font-semibold', {
          'text-success': stop.state === 'completed',
          'text-accent': stop.state === 'current',
          'text-text-muted': stop.state === 'upcoming',
        })}
      >
        {stop.eta}
      </span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string | null;
  icon: typeof RouteIcon;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <Icon className="h-3.5 w-3.5 text-success" />
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="font-mono text-xl font-bold text-text-primary">{value}</p>
        {delta && <span className="font-mono text-xs font-semibold text-success">{delta}</span>}
      </div>
    </div>
  );
}
