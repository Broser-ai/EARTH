import clsx from 'clsx';
import { Eye, Radio, ShieldAlert } from 'lucide-react';
import { EarthLink } from '../routing/EarthLink.tsx';
import { useRouter } from '../routing/Router.tsx';
import { presenceLabel, presenceTone, probeAdapter } from '../routing/kernelProbe.ts';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';

export default function VisionSurface() {
  const { canonical } = useRouter();
  const { runtime, generation } = useEarthRuntime();
  void generation;
  const adapter = probeAdapter('roboflow', runtime);

  const tone = presenceTone(adapter.presence);
  const linked = adapter.runtimeLinked;

  return (
    <div className="space-y-4 text-text-primary">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">MISSION / VISION</p>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest">ROBOFLOW UPLINK</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Vision observations for S-Agent <span className="font-mono text-accent">vision.infer</span>.
            This station does not call Roboflow write APIs.
          </p>
        </div>
        <span className="font-mono text-[11px] text-text-muted">{canonical}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatusTile
          label="Adapter module"
          value={adapter.modulePresent ? 'PRESENT' : 'AWAITING'}
          tone={adapter.modulePresent ? 'accent' : 'amber'}
        />
        <StatusTile
          label="Kernel link"
          value={linked ? adapter.linkedKey ?? 'LINKED' : 'NOT ON RUNTIME'}
          tone={linked ? 'success' : 'muted'}
        />
        <StatusTile label="MCP" value={presenceLabel(adapter.presence)} tone={tone} />
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs font-semibold tracking-wider">{adapter.product}</span>
          <span className="font-mono text-[10px] text-text-muted">{adapter.vendor}</span>
        </div>
        <p className="mt-2 text-sm text-text-secondary">{adapter.role}</p>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted">{adapter.note}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] text-amber">
            READ ONLY
          </span>
          <span className="rounded border border-white/10 px-2 py-0.5 font-mono text-[10px] text-text-muted">
            NO DESTRUCTIVE CALLS
          </span>
        </div>
      </div>

      {!adapter.modulePresent && (
        <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/5 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <p className="text-sm text-text-secondary">
            Sibling kernel is wiring the Roboflow adapter. This flight path is reserved so the
            address bar already shows <span className="font-mono text-accent">/mission/vision</span>.
          </p>
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
