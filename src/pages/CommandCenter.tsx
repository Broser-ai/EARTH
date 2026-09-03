import { useEffect, useRef } from 'react';
import {
  Power,
  Cpu,
  Layers,
  ShieldCheck,
  Compass,
  Swords,
  Terminal,
  GitBranch,
  Play,
} from 'lucide-react';
import clsx from 'clsx';
import KernelAdapterHud from '../components/KernelAdapterHud.tsx';
import GraphHud from '../components/GraphHud.tsx';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';
import { SPECIALIST_CAPABILITIES } from '../sovereign/swarm/capabilities.ts';

export default function CommandCenter() {
  const { runtime, generation } = useEarthRuntime();
  const logEndRef = useRef<HTMLDivElement | null>(null);
  void generation;

  const logs = runtime.bus.history();
  const online = runtime.isBooted;
  const carbon = runtime.eliability.asCarbonView();
  const trajectories = runtime.prime.trajectories();

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs.length]);

  const subsystems = [
    {
      id: 'prime',
      name: 'Prime Agent',
      icon: Compass,
      stats: [
        { label: 'Policy', value: runtime.prime.actingTrainedLabel() },
        { label: 'RL trained', value: runtime.prime.actingTrainedLabel() },
        { label: 'Trajectories', value: String(trajectories.length) },
      ],
    },
    {
      id: 'harness',
      name: 'H-Agent',
      icon: GitBranch,
      stats: [
        { label: 'Role', value: 'coordinator' },
        { label: 'Catalog', value: String(runtime.catalog.length) },
        { label: 'Pending', value: String(runtime.pendingMissions().length) },
      ],
    },
    {
      id: 'swarm',
      name: 'S-Agent swarm',
      icon: Cpu,
      stats: [
        { label: 'Specialists', value: String(SPECIALIST_CAPABILITIES.length) },
        { label: 'Executed', value: String(trajectories.reduce((sum, row) => sum + row.outcome.executed, 0)) },
        { label: 'Blocked', value: String(trajectories.reduce((sum, row) => sum + row.outcome.blocked, 0)) },
      ],
    },
    {
      id: 'compass',
      name: 'COMPASS gate',
      icon: Swords,
      stats: [
        { label: 'Pillars', value: '4' },
        { label: 'Mode', value: 'deterministic' },
        { label: 'Synthesizer', value: 'min-floor' },
      ],
    },
    {
      id: 'ledger',
      name: 'Aegis ledger',
      icon: ShieldCheck,
      stats: [
        { label: 'Entries', value: String(runtime.ledger.length) },
        { label: 'Hash', value: 'SHA-256' },
        { label: 'DID', value: runtime.operatorDid.id.replace('did:earth:', '') },
      ],
    },
    {
      id: 'spine',
      name: 'E-liability spine',
      icon: Layers,
      stats: [
        { label: 'Total tCO₂e', value: carbon.totalTCO2e.toLocaleString() },
        { label: 'Posts', value: String(carbon.posts.length) },
        { label: 'CSRD', value: 'E1-6' },
      ],
    },
  ];

  return (
    <div className="w-full text-text-primary">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest">SOVEREIGN COMMAND CENTER</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Kernel HUD — LangGraph ticks, session-rl Prime, COMPASS, e-liability spine
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void runtime.runNextMission();
            }}
            disabled={!online || runtime.pendingMissions().length === 0}
            className={clsx(
              'flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-xs font-semibold tracking-wider transition-all',
              !online || runtime.pendingMissions().length === 0
                ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-text-muted'
                : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20',
            )}
          >
            <Play className="h-4 w-4" />
            RUN NEXT MISSION
          </button>
          <button
            onClick={() => (online ? runtime.halt() : runtime.boot())}
          className={clsx(
            'flex items-center gap-2 rounded-lg border px-5 py-2.5 font-mono text-xs font-semibold tracking-wider transition-all',
            online
              ? 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/20'
              : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20',
          )}
        >
          <Power className="h-4 w-4" />
          {online ? 'HALT RUNTIME' : 'BOOT RUNTIME'}
        </button>
        </div>
      </div>

      <KernelAdapterHud adapters={runtime.adapterStatus()} />

      <GraphHud graph={runtime.graphState()} policy={runtime.policyStats()} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Kernel modules" value="10" />
        <StatTile
          label="Runtime"
          value={online ? 'ONLINE' : 'COLD'}
          tone={online ? 'success' : 'muted'}
        />
        <StatTile label="Bus events" value={String(logs.length)} tone={logs.length > 0 ? 'accent' : 'muted'} />
        <StatTile
          label="Spine tCO₂e"
          value={carbon.totalTCO2e.toLocaleString()}
          tone="accent"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subsystems.map((sub) => {
          const Icon = sub.icon;
          return (
            <div
              key={sub.id}
              className={clsx(
                'rounded-lg border bg-white/[0.03] p-4 backdrop-blur transition-colors',
                online ? 'border-accent/20' : 'border-white/5',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-md',
                      online ? 'bg-accent/10' : 'bg-white/[0.04]',
                    )}
                  >
                    <Icon className={clsx('h-4 w-4', online ? 'text-accent' : 'text-text-muted')} />
                  </div>
                  <span className="font-mono text-xs font-semibold tracking-wide">{sub.name}</span>
                </div>
                <span
                  className={clsx(
                    'font-mono text-[9px] tracking-wider',
                    online ? 'text-success' : 'text-text-muted',
                  )}
                >
                  {online ? 'ONLINE' : 'COLD'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                {sub.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="truncate font-mono text-[9px] uppercase tracking-wide text-text-muted">
                      {stat.label}
                    </p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-text-primary">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <Terminal className="h-3.5 w-3.5 text-accent" />
          <span className="font-mono text-[11px] font-semibold tracking-wider">LIVE EVENT BUS</span>
          <span className="ml-auto font-mono text-[10px] text-text-muted">{logs.length} events</span>
        </div>
        <div className="h-56 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 && (
            <p className="text-text-muted">Boot the runtime or run the swarm catalog to emit events.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="shrink-0 text-text-muted">{log.ts.slice(11, 19)}</span>
              <span className="shrink-0 font-semibold text-accent">[{log.source}]</span>
              <span className="text-text-secondary">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
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
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className={clsx('mt-1.5 font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
    </div>
  );
}
