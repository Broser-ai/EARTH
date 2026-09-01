import clsx from 'clsx';
import { Compass, Cpu, Radio } from 'lucide-react';
import KernelAdapterHud from '../components/KernelAdapterHud.tsx';
import { EarthLink } from '../routing/EarthLink.tsx';
import { useRouter } from '../routing/Router.tsx';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';

export default function PrimePolicy() {
  const { canonical } = useRouter();
  const { runtime, generation } = useEarthRuntime();
  void generation;

  const adapters = runtime.adapterStatus();
  const lesson = runtime.inkling.currentLesson();
  const trajectories = runtime.prime.trajectories();
  const trained = runtime.inkling.trained();
  const tinkerJob = runtime.tinker.lastSubmitted();
  const tinkerMode = runtime.tinker.mode();

  return (
    <div className="space-y-4 text-text-primary">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-accent">MISSION / PRIME</p>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest">PRIME POLICY</h1>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Inkling is the policy brain. Tinker fine-tunes from Prime trajectories. Address bar:{' '}
            <span className="font-mono text-accent">/mission/prime</span>. Until weights exist, the
            kernel refuses to invent a policy.
          </p>
        </div>
        <span className="font-mono text-[11px] text-text-muted">{canonical}</span>
      </div>

      <KernelAdapterHud adapters={adapters} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatusTile label="RL trained" value={trained ? 'YES' : 'NO'} tone={trained ? 'success' : 'amber'} />
        <StatusTile label="Trajectories" value={String(trajectories.length)} tone="accent" />
        <StatusTile label="Tinker client" value={tinkerMode.toUpperCase()} tone={tinkerMode === 'stub' ? 'muted' : 'success'} />
        <StatusTile
          label="Last job"
          value={tinkerJob ? tinkerJob.status.toUpperCase() : 'NONE'}
          tone={tinkerJob ? 'accent' : 'muted'}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <Compass className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide">INKLING</p>
              <p className="font-mono text-[10px] text-text-muted">Thinking Machines Lab</p>
            </div>
            <span className={clsx('ml-auto font-mono text-[9px] tracking-wider', trained ? 'text-success' : 'text-amber')}>
              {trained ? 'WEIGHTS' : 'UNTRAINED'}
            </span>
          </div>
          {lesson ? (
            <div className="mt-3 space-y-1">
              <p className="font-mono text-[11px] text-accent">{lesson.id}</p>
              <p className="text-sm text-text-secondary">{lesson.title}</p>
              <p className="font-mono text-[10px] text-text-muted">
                concept {lesson.concept.kind} · sim {lesson.sim.source} · min {lesson.sim.minEpisodes}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">No lesson attached.</p>
          )}
          <p className="mt-3 font-mono text-[10px] text-text-muted">
            liveInference {String(runtime.inkling.policy.liveInference)} · hooked{' '}
            {runtime.inkling.hookedEpisodes().length}
          </p>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
              <Cpu className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-mono text-xs font-semibold tracking-wide">TINKER</p>
              <p className="font-mono text-[10px] text-text-muted">Thinking Machines Lab</p>
            </div>
            <span className="ml-auto font-mono text-[9px] tracking-wider text-text-muted">
              {tinkerMode.toUpperCase()}
            </span>
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            Fine-tune backend. Prime trajectories are the dataset. This surface does not submit jobs.
          </p>
          <p className="mt-2 font-mono text-[11px] text-text-muted">
            {tinkerJob
              ? `${tinkerJob.id} · ${tinkerJob.status} · samples ${tinkerJob.samples}`
              : 'No job submitted this session'}
          </p>
        </div>
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
