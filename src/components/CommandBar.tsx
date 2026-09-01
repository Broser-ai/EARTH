import { Activity } from 'lucide-react';
import clsx from 'clsx';

export type EarthSection =
  | 'overview'
  | 'operations'
  | 'carbon-esg'
  | 'compliance'
  | 'circular'
  | 'reports'
  | 'mission';

export interface CommandBarProps {
  activeSection: EarthSection;
  activePage: string;
  onSection: (section: EarthSection) => void;
  onPage: (page: string) => void;
  hitlPending: number;
  runtimeOnline: boolean;
}

interface NavItem {
  id: EarthSection;
  label: string;
}

interface PageItem {
  id: string;
  label: string;
}

const NAV: NavItem[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'operations', label: 'OPERATIONS' },
  { id: 'carbon-esg', label: 'CARBON' },
  { id: 'compliance', label: 'COMPLIANCE' },
  { id: 'circular', label: 'CIRCULAR' },
  { id: 'reports', label: 'REPORTS' },
  { id: 'mission', label: 'MISSION' },
];

export const SECTION_PAGES: Record<EarthSection, PageItem[]> = {
  overview: [{ id: 'dashboard', label: 'Command overview' }],
  operations: [
    { id: 'pickup-orders', label: 'Pickup orders' },
    { id: 'container-fleet', label: 'Container fleet' },
    { id: 'recycler-network', label: 'Recycler network' },
    { id: 'route-planner', label: 'Route planner' },
    { id: 'weight-scanning', label: 'Weight & scanning' },
  ],
  circular: [
    { id: 'reverse-logistics', label: 'Reverse logistics' },
    { id: 'take-back-programs', label: 'Take-back' },
    { id: 'b2b-marketplace', label: 'B2B marketplace' },
    { id: 'material-exchange', label: 'Material exchange' },
    { id: 'product-passports', label: 'Product passports' },
  ],
  'carbon-esg': [
    { id: 'carbon-accounting', label: 'Carbon accounting' },
    { id: 'emissions-scope', label: 'Scope 1/2/3' },
    { id: 'reduction-targets', label: 'Reduction targets' },
    { id: 'offset-credits', label: 'Offset credits' },
  ],
  compliance: [
    { id: 'compliance-dashboard', label: 'Compliance' },
    { id: 'csrd-disclosure', label: 'CSRD' },
    { id: 'gri-reporting', label: 'GRI' },
    { id: 'eudr-tracking', label: 'EUDR' },
    { id: 'audit-trail', label: 'Audit trail' },
  ],
  reports: [
    { id: 'reports', label: 'Reports' },
    { id: 'locations', label: 'Locations' },
    { id: 'users-roles', label: 'Users & roles' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'billing', label: 'Billing' },
  ],
  mission: [
    { id: 'command-center', label: 'Command center' },
    { id: 'dev-swarm', label: 'Dev swarm' },
    { id: 'aegis', label: 'Aegis ledger' },
    { id: 'war-game', label: 'War game' },
  ],
};

const tenantName = 'Hornbach Germany';
const tenantInitials = 'HB';

export default function CommandBar({
  activeSection,
  activePage,
  onSection,
  onPage,
  hitlPending,
  runtimeOnline,
}: CommandBarProps) {
  const pages = SECTION_PAGES[activeSection];

  return (
    <header className="border-b border-white/[0.06] bg-[#0D1425]/80 backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <span className="font-mono text-sm font-bold tracking-widest text-accent">EARTH</span>
          </div>

          <nav className="flex items-center gap-0.5">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => onSection(item.id)}
                className={clsx(
                  'rounded px-3 py-1.5 font-sans text-[10px] font-medium tracking-wider transition-all',
                  activeSection === item.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary',
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'flex items-center gap-1.5 font-mono text-[10px] tracking-wider',
              runtimeOnline ? 'text-success' : 'text-text-muted',
            )}
          >
            <span
              className={clsx(
                'h-1.5 w-1.5 rounded-full',
                runtimeOnline ? 'animate-pulse bg-success' : 'bg-text-muted',
              )}
            />
            {runtimeOnline ? 'RUNTIME' : 'COLD'}
          </span>
          {hitlPending > 0 && (
            <span className="rounded border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] text-amber">
              HITL {hitlPending}
            </span>
          )}
          <span className="text-[11px] text-text-secondary">{tenantName}</span>
          <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent/10">
            <span className="font-mono text-[10px] font-bold text-accent">{tenantInitials}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-6 py-1.5">
        {pages.map((page) => (
          <button
            key={page.id}
            onClick={() => onPage(page.id)}
            className={clsx(
              'whitespace-nowrap rounded px-2.5 py-1 font-sans text-[11px] transition-colors',
              activePage === page.id
                ? 'bg-white/[0.06] text-text-primary'
                : 'text-text-muted hover:bg-white/[0.03] hover:text-text-secondary',
            )}
          >
            {page.label}
          </button>
        ))}
      </div>
    </header>
  );
}
