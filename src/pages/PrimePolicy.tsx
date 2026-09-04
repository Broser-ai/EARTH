import clsx from 'clsx';
import { Compass, Cpu, Radio } from 'lucide-react';
import GraphHud from '../components/GraphHud.tsx';
import { EarthLink } from '../routing/EarthLink.tsx';
import { useRouter } from '../routing/Router.tsx';
import {
  inklingLesson,
  presenceLabel,
  presenceTone,
  probeAdapter,
} from '../routing/kernelProbe.ts';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';

export default function PrimePolicy() {
  const { canonical } = useRouter();
  const { runtime, generation } = useEarthRuntime();
  void generation;

  const inkling = probeAdapter('inkling', runtime);
  const tinker = probeAdapter('tinker', runtime);
  const lesson = inklingLesson();
  const trajectories = runtime.prime.trajectories();
  const inklingTrained = runtime.inkling.trained();
  const session = runtime.policyStats();
  const acting = runtime.prime.actingTrainedLabel();

  return (
    <div className="space-y-4 text-text-primary">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">MISSION / PRIME</p>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest">PRIME POLICY</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Live Prime is an in-session softmax bandit until Inkling/Tinker weights exist. HUD reads{' '}
            <span className="font-mono text-accent">trained={acting}</span>
            {acting === 'session-rl' ? ' — not a hosted brain, not a STARK.' : '.'} COMPASS still
            blocks illegal actions.
          </p>
        </div>
        <span className="font-mono text-[11px] text-text-muted">{canonical}</span>
      </div>

      <GraphHud graph={runtime.graphState()} policy={session} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusTile label="RL trained" value={acting} tone={acting === 'untrained' ? 'amber' : 'success'} />
        <StatusTile label="Trajectories" value={String(trajectories.length)} tone="accent" />
        <StatusTile
          label="Inkling"
          value={inklingTrained ? 'WEIGHTS' : presenceLabel(inkling.presence)}
          tone={inklingTrained ? 'success' : presenceTone(inkling.presence)}
        />
        <StatusTile
          label="Tinker"
          value={presenceLabel(tinker.presence)}
          tone={presenceTone(tinker.presence)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AdapterCard
          icon={Compass}
          adapter={inkling}
          extra={lesson ? `Lesson ${lesson.id} — ${lesson.title}` : 'No lesson module on this branch yet'}
        />
        <AdapterCard
          icon={Cpu}
          adapter={tinker}
          extra="Prime trajectories are the dataset. No worker attached from this surface."
        />
      </div>

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

function AdapterCard({
  icon: Icon,
  adapter,
  extra,
}: {
  icon: typeof Compass;
  adapter: ReturnType<typeof probeAdapter>;
  extra: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="font-mono text-xs font-semibold tracking-wide">{adapter.product}</p>
          <p className="font-mono text-[10px] text-text-muted">{adapter.vendor}</p>
        </div>
        <span
          className={clsx(
            'ml-auto font-mono text-[9px] tracking-wider',
            adapter.modulePresent ? 'text-accent' : 'text-amber',
          )}
        >
          {adapter.modulePresent ? 'MODULE' : 'AWAITING'}
        </span>
      </div>
      <p className="mt-3 text-sm text-text-secondary">{adapter.role}</p>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-muted">{adapter.note}</p>
      <p className="mt-2 text-[11px] text-text-secondary">{extra}</p>
      <p className="mt-3 font-mono text-[10px] text-text-muted">
        KERNEL {adapter.runtimeLinked ? `LINKED · ${adapter.linkedKey}` : 'NOT ATTACHED'}
      </p>
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
