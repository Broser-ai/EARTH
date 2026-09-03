import { Activity } from 'lucide-react';
import clsx from 'clsx';

export type EarthSection =
  | 'overview'
  | 'operations'
  | 'carbon-esg'
  | 'compliance'
  | 'circular'
  | 'reports';

interface CommandBarProps {
  activeSection: EarthSection;
  onNavigate: (section: EarthSection) => void;
}

const navItems: { id: EarthSection; label: string }[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'operations', label: 'OPERATIONS' },
  { id: 'carbon-esg', label: 'CARBON & ESG' },
  { id: 'compliance', label: 'COMPLIANCE' },
  { id: 'circular', label: 'CIRCULAR' },
  { id: 'reports', label: 'REPORTS' },
];

const tenantName = 'Hornbach Germany';
const tenantInitials = 'HB';

export default function CommandBar({ activeSection, onNavigate }: CommandBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-white/[0.06] bg-[#0D1425]/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <span className="font-mono text-sm font-bold tracking-widest text-accent">EARTH</span>
        </div>

        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={clsx(
                'rounded px-3 py-1.5 font-mono text-[10px] font-medium tracking-wider transition-all',
                activeSection === item.id
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded border border-amber/40 px-2 py-0.5 font-mono text-[10px] tracking-wider text-amber">
          DEVELOPMENT
        </span>
        <span className="text-[11px] text-text-secondary">{tenantName}</span>
        <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent/10">
          <span className="font-mono text-[10px] font-bold text-accent">{tenantInitials}</span>
        </div>
      </div>
    </header>
  );
}
