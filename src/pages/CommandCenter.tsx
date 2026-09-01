import { useEffect, useRef, useState } from 'react';
import {
  Power,
  Cpu,
  Orbit,
  Layers,
  ShieldCheck,
  Compass,
  Swords,
  Terminal,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubsystemId =
  | 'moss'
  | 'chronos'
  | 'hyper-matrix'
  | 'aegis'
  | 'guru'
  | 'war-game';

interface Subsystem {
  id: SubsystemId;
  name: string;
  icon: typeof Cpu;
  stats: { label: string; value: string }[];
}

interface LogEvent {
  id: number;
  ts: string;
  source: string;
  message: string;
  level: 'info' | 'warn' | 'success';
}

const SUBSYSTEMS: Subsystem[] = [
  {
    id: 'moss',
    name: 'MOSS Dev Swarm',
    icon: Cpu,
    stats: [
      { label: 'Pipeline Stages', value: '7' },
      { label: 'Evolutions', value: '14,208' },
      { label: 'Dev Agents', value: '64' },
    ],
  },
  {
    id: 'chronos',
    name: 'Chronos Oracle',
    icon: Orbit,
    stats: [
      { label: 'Twin Agents', value: '10.0M' },
      { label: 'Accuracy', value: '91.2%' },
      { label: 'Data Sources', value: '312' },
    ],
  },
  {
    id: 'hyper-matrix',
    name: 'Hyper-Matrix',
    icon: Layers,
    stats: [
      { label: 'Tick Counter', value: '0' },
      { label: 'Materials Tracked', value: '8,441' },
      { label: 'SDE Frequency', value: '120Hz' },
    ],
  },
  {
    id: 'aegis',
    name: 'Aegis Protocol',
    icon: ShieldCheck,
    stats: [
      { label: 'Mutations', value: '2,051' },
      { label: 'Security', value: '256-bit' },
      { label: 'FHE Ops/s', value: '4,096' },
    ],
  },
  {
    id: 'guru',
    name: 'Guru Orchestrator',
    icon: Compass,
    stats: [
      { label: 'Personas', value: '12' },
      { label: 'Framework', value: '9R' },
      { label: 'Planetary Boundaries', value: '9' },
    ],
  },
  {
    id: 'war-game',
    name: 'War Game',
    icon: Swords,
    stats: [
      { label: 'Scenarios', value: '128' },
      { label: 'Crisis Steps', value: '36' },
      { label: 'Resolution Time', value: '4.2s' },
    ],
  },
];

const BOOT_STEPS = [
  'Initializing MOSS pipeline...',
  'Spinning up dev-agent swarm...',
  'Synchronizing Chronos twin registry...',
  'Calibrating Hyper-Matrix SDE solver...',
  'Engaging Aegis defense grid...',
  'Provisioning FHE key material...',
  'Loading Guru persona ensemble...',
  'Compiling War Game scenario bank...',
  'Sovereign runtime nominal.',
];

const TOTAL_MODULES = 2698;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function timestamp(offsetSeconds = 0): string {
  return new Date(Date.now() - offsetSeconds * 1000).toLocaleTimeString('en-GB', {
    hour12: false,
  });
}

let logIdCounter = 0;
function makeLog(source: string, message: string, level: LogEvent['level'] = 'info'): LogEvent {
  logIdCounter += 1;
  return { id: logIdCounter, ts: timestamp(), source, message, level };
}

const IDLE_EVENTS: [string, string][] = [
  ['MOSS', 'Evolution cycle 14,209 queued'],
  ['CHRONOS', 'Twin agent drift within tolerance'],
  ['HYPER-MATRIX', 'SDE tick committed'],
  ['AEGIS', 'FHE keypair rotated'],
  ['GURU', 'Planetary boundary check passed'],
  ['WAR GAME', 'Scenario resolution converged'],
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommandCenter() {
  const [booted, setBooted] = useState(false);
  const [booting, setBooting] = useState(false);
  const [bootStepIndex, setBootStepIndex] = useState(-1);
  const [onlineSubsystems, setOnlineSubsystems] = useState<Set<SubsystemId>>(new Set());
  const [uptime, setUptime] = useState(0);
  const [buildErrors] = useState(0);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const pushLog = (source: string, message: string, level: LogEvent['level'] = 'info') => {
    setLogs((prev) => [...prev.slice(-99), makeLog(source, message, level)]);
  };

  // Boot sequence
  const handleBoot = () => {
    if (booted || booting) return;
    setBooting(true);
    setBootStepIndex(0);
    pushLog('CORE', 'Boot sequence initiated by operator', 'info');

    BOOT_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setBootStepIndex(i);
        pushLog('BOOT', step, i === BOOT_STEPS.length - 1 ? 'success' : 'info');

        const map: Record<number, SubsystemId> = {
          1: 'moss',
          2: 'chronos',
          3: 'hyper-matrix',
          4: 'aegis',
          6: 'guru',
          7: 'war-game',
        };
        const sub = map[i];
        if (sub) {
          setOnlineSubsystems((prev) => new Set(prev).add(sub));
        }

        if (i === BOOT_STEPS.length - 1) {
          setBooted(true);
          setBooting(false);
          setBootStepIndex(-1);
          pushLog('CORE', 'All subsystems online. Sovereign runtime active.', 'success');
        }
      }, (i + 1) * 550);
    });
  };

  const handleShutdown = () => {
    setBooted(false);
    setBooting(false);
    setBootStepIndex(-1);
    setOnlineSubsystems(new Set());
    setUptime(0);
    pushLog('CORE', 'Shutdown command received. Halting all subsystems.', 'warn');
  };

  // Uptime ticker
  useEffect(() => {
    if (!booted) return;
    const interval = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(interval);
  }, [booted]);

  // Ambient event stream once booted
  useEffect(() => {
    if (!booted) return;
    const interval = setInterval(() => {
      const [source, message] = IDLE_EVENTS[Math.floor(Math.random() * IDLE_EVENTS.length)];
      pushLog(source, message, Math.random() > 0.85 ? 'warn' : 'info');
    }, 2400);
    return () => clearInterval(interval);
  }, [booted]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [logs]);

  const onlineCount = onlineSubsystems.size;

  return (
    <div className="min-h-screen w-full bg-[#060B18] px-6 py-6 text-[#F1F5F9]">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest text-[#F1F5F9]">
            SOVEREIGN COMMAND CENTER
          </h1>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Unified boot &amp; status console for all EARTH subsystems
          </p>
        </div>

        <button
          onClick={booted ? handleShutdown : handleBoot}
          disabled={booting}
          className={clsx(
            'flex items-center gap-2 rounded-lg border px-5 py-2.5 font-mono text-xs font-semibold tracking-wider transition-all',
            booted
              ? 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20'
              : booting
                ? 'cursor-wait border-white/10 bg-white/[0.03] text-[#94A3B8]'
                : 'border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20'
          )}
        >
          {booting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          {booted ? 'SHUTDOWN' : booting ? 'BOOTING...' : 'BOOT RUNTIME'}
        </button>
      </div>

      {/* Boot progress */}
      <AnimatePresence>
        {booting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-[#60A5FA]" />
              <span className="font-mono text-xs text-[#F1F5F9]">
                {bootStepIndex >= 0 ? BOOT_STEPS[bootStepIndex] : ''}
              </span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full bg-[#60A5FA]"
                initial={{ width: 0 }}
                animate={{
                  width: `${((bootStepIndex + 1) / BOOT_STEPS.length) * 100}%`,
                }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Modules" value={TOTAL_MODULES.toLocaleString()} />
        <StatTile
          label="Subsystems Online"
          value={`${onlineCount}/6`}
          tone={onlineCount === 6 ? 'success' : onlineCount > 0 ? 'amber' : 'muted'}
        />
        <StatTile
          label="Build Errors"
          value={String(buildErrors)}
          tone={buildErrors > 0 ? 'danger' : 'success'}
        />
        <StatTile label="Uptime" value={formatUptime(uptime)} tone={booted ? 'accent' : 'muted'} />
      </div>

      {/* Subsystem grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SUBSYSTEMS.map((sub) => (
          <SubsystemCard key={sub.id} subsystem={sub} online={onlineSubsystems.has(sub.id)} />
        ))}
      </div>

      {/* Live event stream */}
      <div className="rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <Terminal className="h-3.5 w-3.5 text-[#60A5FA]" />
          <span className="font-mono text-[11px] font-semibold tracking-wider text-[#F1F5F9]">
            LIVE EVENT STREAM
          </span>
          <span className="ml-auto font-mono text-[10px] text-[#475569]">
            {logs.length} events
          </span>
        </div>
        <div className="h-56 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 && (
            <p className="text-[#475569]">Awaiting runtime boot to begin event capture...</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="shrink-0 text-[#475569]">{log.ts}</span>
              <span
                className={clsx('shrink-0 font-semibold', {
                  'text-[#60A5FA]': log.level === 'info',
                  'text-[#F59E0B]': log.level === 'warn',
                  'text-[#34D399]': log.level === 'success',
                })}
              >
                [{log.source}]
              </span>
              <span className="text-[#94A3B8]">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
    default: 'text-[#F1F5F9]',
    success: 'text-[#34D399]',
    amber: 'text-[#F59E0B]',
    danger: 'text-[#EF4444]',
    accent: 'text-[#60A5FA]',
    muted: 'text-[#94A3B8]',
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[#475569]">{label}</p>
      <p className={clsx('mt-1.5 font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
    </div>
  );
}

function SubsystemCard({ subsystem, online }: { subsystem: Subsystem; online: boolean }) {
  const Icon = subsystem.icon;

  return (
    <div
      className={clsx(
        'rounded-lg border bg-white/[0.03] p-4 backdrop-blur transition-colors',
        online ? 'border-[#60A5FA]/20' : 'border-white/5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-md',
              online ? 'bg-[#60A5FA]/10' : 'bg-white/[0.04]'
            )}
          >
            <Icon className={clsx('h-4 w-4', online ? 'text-[#60A5FA]' : 'text-[#475569]')} />
          </div>
          <span className="font-mono text-xs font-semibold tracking-wide text-[#F1F5F9]">
            {subsystem.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'h-1.5 w-1.5 rounded-full',
              online ? 'bg-[#34D399] animate-pulse' : 'bg-[#475569]'
            )}
          />
          <span
            className={clsx(
              'font-mono text-[9px] tracking-wider',
              online ? 'text-[#34D399]' : 'text-[#475569]'
            )}
          >
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
        {subsystem.stats.map((stat) => (
          <div key={stat.label}>
            <p className="truncate font-mono text-[9px] uppercase tracking-wide text-[#475569]">
              {stat.label}
            </p>
            <p
              className={clsx(
                'mt-0.5 font-mono text-sm font-semibold',
                online ? 'text-[#F1F5F9]' : 'text-[#94A3B8]'
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
