import clsx from 'clsx';

interface SidebarItem {
  id: string;
  label: string;
  count?: string;
}

interface SidebarSection {
  label?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const sections: SidebarSection[] = [
  {
    items: [{ id: 'dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Operations',
    items: [
      { id: 'pickup-orders', label: 'Pickup orders', count: '248' },
      { id: 'container-fleet', label: 'Container fleet', count: '1,204' },
      { id: 'recycler-network', label: 'Recycler network', count: '14' },
      { id: 'route-planner', label: 'Route planner' },
      { id: 'weight-scanning', label: 'Weight & scanning' },
    ],
  },
  {
    label: 'Circular',
    items: [
      { id: 'reverse-logistics', label: 'Reverse logistics' },
      { id: 'take-back-programs', label: 'Take-back programs', count: '3' },
      { id: 'return-replace', label: 'Return & replace' },
      { id: 'b2b-marketplace', label: 'B2B marketplace', count: '7 lots' },
      { id: 'auctions', label: 'Auctions', count: '4 live' },
      { id: 'material-exchange', label: 'Material exchange' },
      { id: 'product-passports', label: 'Product passports' },
    ],
  },
  {
    label: 'Carbon & ESG',
    items: [
      { id: 'emissions-overview', label: 'Emissions overview' },
      { id: 'scope-123', label: 'Scope 1/2/3' },
      { id: 'reduction-targets', label: 'Reduction targets' },
      { id: 'offset-credits', label: 'Offset credits' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { id: 'csrd-disclosure', label: 'CSRD disclosure' },
      { id: 'gri-reporting', label: 'GRI reporting' },
      { id: 'eudr-tracking', label: 'EUDR tracking' },
      { id: 'audit-trail', label: 'Audit trail' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'locations', label: 'Locations' },
      { id: 'users-roles', label: 'Users & roles' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'billing', label: 'Billing' },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full w-[185px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/[0.06] bg-transparent px-2 py-4">
      {sections.map((section, idx) => (
        <div key={section.label ?? `section-${idx}`} className="flex flex-col gap-0.5">
          {section.label && (
            <div className="mb-1 px-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-text-muted">
              {section.label}
            </div>
          )}
          {section.items.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[11px] transition-colors',
                activePage === item.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-white/[0.04]'
              )}
            >
              <span className="truncate">{item.label}</span>
              {item.count && (
                <span
                  className={clsx(
                    'shrink-0 font-mono text-[9px]',
                    activePage === item.id ? 'text-accent' : 'text-text-muted'
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
