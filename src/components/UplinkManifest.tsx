import clsx from 'clsx';
import { Copy, Radio } from 'lucide-react';
import { useState } from 'react';
import { BAND_ORDER, EARTH_ROUTES, type EarthBand, type EarthRoute } from '../routing/catalog.ts';
import { EarthLink } from '../routing/EarthLink.tsx';
import { useRouter } from '../routing/Router.tsx';
import { formatCanonical } from '../routing/resolve.ts';
import { presenceLabel, presenceTone, probeAdapters, type AdapterId } from '../routing/kernelProbe.ts';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';

const ADAPTER_FOR_PATH: Record<string, AdapterId[]> = {
  '/mission/vision': ['roboflow'],
  '/mission/prime': ['inkling', 'tinker'],
};

function bandLabel(band: EarthBand): string {
  switch (band) {
    case 'OVERVIEW':
      return 'OVERVIEW';
    case 'OPERATIONS':
      return 'OPERATIONS';
    case 'CIRCULAR':
      return 'CIRCULAR';
    case 'CARBON':
      return 'CARBON';
    case 'COMPLIANCE':
      return 'COMPLIANCE';
    case 'REPORTS':
      return 'REPORTS / SETTINGS';
    case 'MISSION':
      return 'MISSION';
    case 'UPLINK':
      return 'UPLINK';
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

export default function UplinkManifest({ compact = false }: { compact?: boolean }) {
  const { origin, path, navigate } = useRouter();
  const { runtime } = useEarthRuntime();
  const adapters = probeAdapters(runtime);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPath(route: EarthRoute) {
    const url = formatCanonical(origin, route.path);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(route.path);
      window.setTimeout(() => setCopied((current) => (current === route.path ? null : current)), 1400);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className={clsx('space-y-5', compact ? 'p-1' : '')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">UPLINK</p>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest text-text-primary">
            CANONICAL FLIGHT PATHS
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            How the URL looks now — Tinker, Inkling, and Roboflow are in the equation. Paths are
            path-absolute on this origin. Address bar is the station callsign.
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-text-secondary">
          <span className="text-text-muted">ORIGIN</span>{' '}
          <span className="text-accent">{origin}</span>
        </div>
      </div>

      {BAND_ORDER.map((band) => {
        const routes = EARTH_ROUTES.filter((route) => route.band === band);
        return (
          <section key={band}>
            <p className="mb-2 font-mono text-[10px] tracking-[0.22em] text-text-muted">{bandLabel(band)}</p>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
              {routes.map((route) => {
                const url = formatCanonical(origin, route.path);
                const active = path === route.path;
                const slotIds = ADAPTER_FOR_PATH[route.path] ?? [];
                return (
                  <article
                    key={route.path}
                    className={clsx(
                      'rounded-lg border bg-white/[0.03] p-3 backdrop-blur',
                      active ? 'border-accent/40' : 'border-white/5',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] tracking-[0.2em] text-accent">
                            {route.callsign}
                          </span>
                          {active && (
                            <span className="font-mono text-[9px] tracking-wider text-success">LIVE</span>
                          )}
                        </div>
                        <EarthLink
                          to={route.path}
                          className="mt-1 block truncate font-mono text-[12px] text-text-primary hover:text-accent"
                        >
                          {url}
                        </EarthLink>
                        <p className="mt-1 text-[11px] text-text-secondary">{route.blurb}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void copyPath(route)}
                          className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5 text-text-muted hover:text-accent"
                          aria-label={`Copy ${url}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(route.path)}
                          className="rounded-lg border border-white/5 bg-white/[0.03] p-1.5 text-text-muted hover:text-accent"
                          aria-label={`Open ${route.path}`}
                        >
                          <Radio className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {copied === route.path && (
                      <p className="mt-2 font-mono text-[10px] tracking-wider text-success">COPIED</p>
                    )}
                    {slotIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {slotIds.map((id) => {
                          const adapter = adapters.find((row) => row.id === id);
                          if (!adapter) return null;
                          const tone = presenceTone(adapter.presence);
                          return (
                            <span
                              key={id}
                              className={clsx(
                                'rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-wider',
                                tone === 'success' && 'border-success/30 bg-success/10 text-success',
                                tone === 'amber' && 'border-amber/30 bg-amber/10 text-amber',
                                tone === 'muted' && 'border-white/10 bg-white/[0.03] text-text-muted',
                              )}
                            >
                              {adapter.product} · {presenceLabel(adapter.presence)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
