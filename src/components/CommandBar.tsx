import { useState } from 'react';
import { Activity, Copy, Radio } from 'lucide-react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import {
  SECTION_HOME,
  routesForSection,
  type EarthSection,
} from '../routing/catalog.ts';
import { EarthLink } from '../routing/EarthLink.tsx';
import { useRouter } from '../routing/Router.tsx';
import UplinkManifest from './UplinkManifest';

export type { EarthSection };

export interface CommandBarProps {
  hitlPending: number;
  runtimeOnline: boolean;
}

interface NavItem {
  id: EarthSection;
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

const tenantName = 'Hornbach Germany';
const tenantInitials = 'HB';

export default function CommandBar({ hitlPending, runtimeOnline }: CommandBarProps) {
  const { match, canonical, copyCanonical, navigate } = useRouter();
  const [copied, setCopied] = useState(false);
  const [uplinkOpen, setUplinkOpen] = useState(false);

  const activeSection = match.kind === 'known' ? match.route.section : null;
  const activePath = match.kind === 'known' ? match.route.path : null;
  const pages = activeSection ? routesForSection(activeSection) : [];

  async function handleCopy() {
    const ok = await copyCanonical();
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <header className="border-b border-white/[0.06] bg-[#0D1425]/80 backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-6">
          <EarthLink to="/" className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            <span className="font-mono text-sm font-bold tracking-widest text-accent">EARTH</span>
          </EarthLink>

          <nav className="flex items-center gap-0.5">
            {NAV.map((item) => (
              <EarthLink
                key={item.id}
                to={SECTION_HOME[item.id]}
                className={clsx(
                  'rounded px-3 py-1.5 font-sans text-[10px] font-medium tracking-wider transition-all',
                  activeSection === item.id
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary',
                )}
              >
                {item.label}
              </EarthLink>
            ))}
          </nav>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 items-center gap-1.5 lg:flex">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex max-w-[min(420px,36vw)] items-center gap-2 truncate rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-text-secondary hover:border-accent/30 hover:text-accent"
              title="Copy canonical URL"
            >
              <Copy className="h-3 w-3 shrink-0" />
              <span className="truncate">{canonical}</span>
            </button>
            {copied && (
              <span className="font-mono text-[9px] tracking-wider text-success">COPIED</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setUplinkOpen(true)}
            className={clsx(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] tracking-wider transition-colors',
              activePath === '/uplink'
                ? 'border-accent/50 bg-accent/15 text-accent'
                : 'border-accent/40 bg-accent/10 text-accent hover:border-accent hover:bg-accent/20',
            )}
          >
            <Radio className="h-3 w-3" />
            UPLINK
          </button>

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
          <span className="hidden text-[11px] text-text-secondary xl:inline">{tenantName}</span>
          <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-accent/10">
            <span className="font-mono text-[10px] font-bold text-accent">{tenantInitials}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-6 py-1.5">
        {pages.map((page) => (
          <EarthLink
            key={page.path}
            to={page.path}
            className={clsx(
              'whitespace-nowrap rounded px-2.5 py-1 font-sans text-[11px] transition-colors',
              activePath === page.path
                ? 'bg-white/[0.06] text-text-primary'
                : 'text-text-muted hover:bg-white/[0.03] hover:text-text-secondary',
            )}
          >
            {page.label}
          </EarthLink>
        ))}
        {match.kind === 'unknown' && (
          <span className="font-mono text-[10px] tracking-wider text-amber">NO STATION · {match.path}</span>
        )}
        {activePath === '/uplink' && pages.length === 0 && (
          <span className="font-mono text-[10px] tracking-wider text-accent">FLIGHT PATH MANIFEST</span>
        )}
      </div>

      <AnimatePresence>
        {uplinkOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-[#060B18]/80 p-6 pt-16 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUplinkOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-h-[min(80vh,900px)] w-full max-w-5xl overflow-y-auto rounded-lg border border-white/5 bg-[#060B18] p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.28em] text-accent">COMMAND BAR · UPLINK</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUplinkOpen(false);
                      navigate('/uplink');
                    }}
                    className="rounded-lg border border-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-text-secondary hover:text-accent"
                  >
                    EXPAND /uplink
                  </button>
                  <button
                    type="button"
                    onClick={() => setUplinkOpen(false)}
                    className="rounded-lg border border-white/5 px-2.5 py-1 font-mono text-[10px] tracking-wider text-text-muted hover:text-text-primary"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
              <UplinkManifest compact />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
