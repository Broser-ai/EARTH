import clsx from 'clsx';
import { Eye, Radio, ShieldAlert } from 'lucide-react';
import KernelAdapterHud from '../components/KernelAdapterHud.tsx';
import { EarthLink } from '../routing/EarthLink.tsx';
import { useRouter } from '../routing/Router.tsx';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';

export default function VisionSurface() {
  const { canonical } = useRouter();
  const { runtime, generation } = useEarthRuntime();
  void generation;

  const adapters = runtime.adapterStatus();
  const vision = adapters.find((row) => row.id === 'roboflow');
  const mode = runtime.vision.mode();
  const detections = runtime.bus.history().filter((event) => event.type === 'vision.detected');

  return (
    <div className="space-y-4 text-text-primary">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">MISSION / VISION</p>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest">ROBOFLOW UPLINK</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Vision observations for S-Agent <span className="font-mono text-accent">vision.infer</span>.
            Address bar: <span className="font-mono text-accent">/mission/vision</span>. This station
            does not call Roboflow write APIs.
          </p>
        </div>
        <span className="font-mono text-[11px] text-text-muted">{canonical}</span>
      </div>

      <KernelAdapterHud adapters={adapters} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatusTile label="Client" value={mode.toUpperCase()} tone={mode === 'live' ? 'success' : 'amber'} />
        <StatusTile
          label="Kernel link"
          value={vision?.link.toUpperCase() ?? 'UNKNOWN'}
          tone={vision?.link === 'connected' ? 'success' : 'muted'}
        />
        <StatusTile label="Bus detections" value={String(detections.length)} tone="accent" />
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs font-semibold tracking-wider">ROBOFLOW</span>
          <span className="font-mono text-[10px] text-text-muted">read-only HUD</span>
        </div>
        <p className="mt-2 text-sm text-text-secondary">{vision?.role}</p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted">{vision?.detail}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] text-amber">
            READ ONLY
          </span>
          <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-text-muted">
            NO DESTRUCTIVE CALLS
          </span>
        </div>
      </div>

      {mode === 'stub' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/5 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <p className="text-sm text-text-secondary">
            Stub client is attached. Live inference stays off until a non-browser worker injects
            credentials. The flight path is already canonical.
          </p>
        </div>
      )}

      {detections.length > 0 && (
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 font-mono text-[11px]">
          <p className="mb-2 tracking-wider text-text-muted">RECENT vision.detected</p>
          {detections.slice(-8).map((event) => (
            <p key={event.id} className="text-text-secondary">
              {event.ts.slice(11, 19)} · {event.message}
            </p>
          ))}
        </div>
      )}

      <EarthLink
        to="/uplink"
        className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-accent hover:underline"
      >
        <Radio className="h-3.5 w-3.5" />
        OPEN UPLINK MANIFEST
      </EarthLink>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'amber' | 'muted' | 'accent';
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p
        className={clsx(
          'mt-1.5 font-mono text-sm font-semibold',
          tone === 'success' && 'text-success',
          tone === 'amber' && 'text-amber',
          tone === 'muted' && 'text-text-secondary',
          tone === 'accent' && 'text-accent',
        )}
      >
        {value}
      </p>
    </div>
  );
}
