import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Zap,
  RefreshCw,
  KeyRound,
  Radar,
  Network,
  Boxes,
  Atom,
} from 'lucide-react';

// ---------- helpers ----------

const hex = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const fakeHash = () => hex(64);
const truncHash = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

const nowStamp = () =>
  new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z';

const MUTATION_COMPONENTS = [
  'api-gateway-routing',
  'memory-layout',
  'rpc-ports',
  'session-tokens',
  'ledger-buffers',
];

type ProofStatus = 'verified' | 'pending' | 'generating';

interface Proof {
  id: string;
  hash: string;
  status: ProofStatus;
  ts: string;
}

interface MutationLogEntry {
  cycleId: string;
  rotated: number;
  topologyHash: string;
  ts: string;
}

// ---------- shared bits ----------

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur p-5 flex flex-col',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} style={{ color: accent }} />
      <h2 className="font-mono text-xs tracking-widest uppercase text-[#F1F5F9]">
        {title}
      </h2>
    </div>
  );
}

function Bar({
  value,
  color,
  height = 'h-1.5',
}: {
  value: number;
  color: string;
  height?: string;
}) {
  return (
    <div className={clsx('w-full rounded-full bg-white/5 overflow-hidden', height)}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between font-mono text-[11px]">
      <span className="text-[#475569]">{label}</span>
      <span className="text-[#F1F5F9]">{value}</span>
    </div>
  );
}

// ---------- FHE card ----------

function FheCard() {
  const [noise, setNoise] = useState(23);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [ops, setOps] = useState(184032);

  useEffect(() => {
    const id = setInterval(() => {
      setOps((o) => o + Math.floor(Math.random() * 40) + 5);
      setNoise((n) => {
        const next = n + (Math.random() * 6 - 2);
        if (next > 82) {
          setBootstrapping(true);
          setTimeout(() => setBootstrapping(false), 1800);
          return 4;
        }
        return Math.max(2, Math.min(92, next));
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <SectionLabel icon={Lock} title="FHE Compute Engine" accent="#60A5FA" />
      <p className="text-[#94A3B8] text-xs mb-4 leading-relaxed">
        Fully Homomorphic Encryption — compute directly on ciphertext, plaintext
        never touches memory.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md border border-white/5 bg-black/20 p-2.5">
          <div className="font-mono text-[10px] text-[#475569] mb-1">SCHEME (FLOAT)</div>
          <div className="font-mono text-sm text-[#60A5FA]">CKKS</div>
        </div>
        <div className="rounded-md border border-white/5 bg-black/20 p-2.5">
          <div className="font-mono text-[10px] text-[#475569] mb-1">SCHEME (INT)</div>
          <div className="font-mono text-sm text-[#60A5FA]">BFV</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] text-[#475569] uppercase">
            Noise Budget
          </span>
          <span className="font-mono text-[10px] text-[#F1F5F9]">
            {noise.toFixed(1)}%
          </span>
        </div>
        <Bar value={noise} color={noise > 70 ? '#F59E0B' : '#34D399'} />
      </div>

      <AnimatePresence>
        {bootstrapping && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex items-center gap-2 rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1.5"
          >
            <RefreshCw size={12} className="text-[#F59E0B] animate-spin" />
            <span className="font-mono text-[10px] text-[#F59E0B]">
              BOOTSTRAPPING — refreshing ciphertext noise
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-3 border-t border-white/5 space-y-1.5">
        <StatRow label="Operations executed" value={ops.toLocaleString()} />
        <StatRow label="Compute-on-ciphertext" value="ACTIVE" />
      </div>
    </Card>
  );
}

// ---------- Polymorphic mutation card ----------

function MutationCard() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<MutationLogEntry[]>([
    {
      cycleId: 'CYC-0417',
      rotated: 5,
      topologyHash: truncHash(fakeHash()),
      ts: nowStamp(),
    },
  ]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activate = () => {
    if (active) return;
    setActive(true);
    setProgress(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / 4000) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        setActive(false);
        setLog((prev) => {
          const entry: MutationLogEntry = {
            cycleId: `CYC-${Math.floor(1000 + Math.random() * 9000)}`,
            rotated: MUTATION_COMPONENTS.length,
            topologyHash: truncHash(fakeHash()),
            ts: nowStamp(),
          };
          return [entry, ...prev].slice(0, 5);
        });
      }
    }, 80);
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <Card>
      <SectionLabel icon={Boxes} title="Polymorphic Mutation Engine" accent="#34D399" />
      <p className="text-[#94A3B8] text-xs mb-4 leading-relaxed">
        Continuously rotates internal topology to invalidate reconnaissance and
        stale exploits.
      </p>

      <button
        onClick={activate}
        disabled={active}
        className={clsx(
          'font-mono text-xs uppercase tracking-wider rounded-md py-2 mb-4 border transition-colors',
          active
            ? 'border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] cursor-wait'
            : 'border-[#34D399]/40 bg-[#34D399]/10 text-[#34D399] hover:bg-[#34D399]/20',
        )}
      >
        {active ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw size={12} className="animate-spin" />
            Mutating…
          </span>
        ) : (
          'Activate Defense'
        )}
      </button>

      {active && (
        <div className="mb-4">
          <Bar value={progress} color="#34D399" height="h-1" />
          <div className="mt-1.5 font-mono text-[10px] text-[#475569]">
            rotating: {MUTATION_COMPONENTS.join(', ')}
          </div>
        </div>
      )}

      <div className="mb-3">
        <StatRow label="Mutation frequency" value="every 4.0s (adaptive)" />
      </div>

      <div className="flex-1 min-h-0">
        <div className="font-mono text-[10px] text-[#475569] uppercase mb-1.5">
          Mutation Log
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {log.map((entry) => (
            <div
              key={entry.cycleId + entry.ts}
              className="rounded-md border border-white/5 bg-black/20 px-2.5 py-1.5 font-mono text-[10px]"
            >
              <div className="flex justify-between text-[#94A3B8]">
                <span>{entry.cycleId}</span>
                <span>{entry.rotated} rotated</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[#475569]">{entry.topologyHash}</span>
                <span className="text-[#475569]">{entry.ts.slice(11, 19)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------- ZK-STARK card ----------

function ZkCard() {
  const [proofs, setProofs] = useState<Proof[]>([
    { id: 'P-9931', hash: truncHash(fakeHash()), status: 'verified', ts: nowStamp() },
    { id: 'P-9930', hash: truncHash(fakeHash()), status: 'verified', ts: nowStamp() },
    { id: 'P-9929', hash: truncHash(fakeHash()), status: 'verified', ts: nowStamp() },
  ]);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(9931);

  const generate = () => {
    if (generating) return;
    setGenerating(true);
    const id = `P-${count + 1}`;
    setProofs((prev) => {
      const entry: Proof = {
        id,
        hash: truncHash(fakeHash()),
        status: 'generating',
        ts: nowStamp(),
      };
      return [entry, ...prev].slice(0, 6);
    });
    setTimeout(() => {
      setCount((c) => c + 1);
      setProofs((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'verified' } : p)),
      );
      setGenerating(false);
    }, 1500);
  };

  return (
    <Card>
      <SectionLabel icon={Atom} title="Post-Quantum ZK-STARKs" accent="#60A5FA" />
      <p className="text-[#94A3B8] text-xs mb-4 leading-relaxed">
        Transparent, quantum-resistant proofs — no trusted setup, hash-based
        soundness.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md border border-white/5 bg-black/20 p-2.5">
          <div className="font-mono text-[10px] text-[#475569] mb-1">SECURITY LEVEL</div>
          <div className="font-mono text-[11px] text-[#60A5FA]">NIST-PQC-L5</div>
        </div>
        <div className="rounded-md border border-white/5 bg-black/20 p-2.5">
          <div className="font-mono text-[10px] text-[#475569] mb-1">SECURITY BITS</div>
          <div className="font-mono text-sm text-[#60A5FA]">256</div>
        </div>
      </div>

      <button
        onClick={generate}
        disabled={generating}
        className={clsx(
          'font-mono text-xs uppercase tracking-wider rounded-md py-2 mb-4 border transition-colors',
          generating
            ? 'border-[#60A5FA]/30 bg-[#60A5FA]/10 text-[#60A5FA] cursor-wait'
            : 'border-[#60A5FA]/40 bg-[#60A5FA]/10 text-[#60A5FA] hover:bg-[#60A5FA]/20',
        )}
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw size={12} className="animate-spin" />
            Generating Proof…
          </span>
        ) : (
          'Generate Proof'
        )}
      </button>

      <div className="mb-3 space-y-1.5">
        <StatRow label="Proofs generated" value={count.toLocaleString()} />
        <StatRow label="Verification rate" value="99.998%" />
      </div>

      <div className="flex-1 min-h-0">
        <div className="font-mono text-[10px] text-[#475569] uppercase mb-1.5">
          Proof Grid
        </div>
        <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {proofs.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-white/5 bg-black/20 px-2.5 py-1.5 font-mono text-[10px]"
            >
              <div className="flex flex-col">
                <span className="text-[#94A3B8]">{p.id}</span>
                <span className="text-[#475569]">{p.hash}</span>
              </div>
              <span
                className={clsx(
                  'rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide border',
                  p.status === 'verified' &&
                    'text-[#34D399] border-[#34D399]/30 bg-[#34D399]/10',
                  p.status === 'generating' &&
                    'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10 animate-pulse',
                  p.status === 'pending' &&
                    'text-[#94A3B8] border-white/10 bg-white/5',
                )}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ---------- Threat matrix ----------

const THREATS = [
  { name: 'Quantum', level: 97, icon: Atom, color: '#60A5FA' },
  { name: 'AI-Adversarial', level: 91, icon: Cpu, color: '#34D399' },
  { name: 'Network', level: 88, icon: Network, color: '#F59E0B' },
  { name: 'Supply-Chain', level: 94, icon: Radar, color: '#60A5FA' },
];

function ThreatMatrix() {
  return (
    <Card>
      <SectionLabel icon={Radar} title="Threat Matrix — Current Protection Level" accent="#94A3B8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {THREATS.map((t) => (
          <div key={t.name}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <t.icon size={13} style={{ color: t.color }} />
                <span className="font-mono text-[11px] text-[#F1F5F9]">{t.name}</span>
              </div>
              <span className="font-mono text-[11px] text-[#94A3B8]">{t.level}%</span>
            </div>
            <Bar value={t.level} color={t.color} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Status banner ----------

function StatusBanner() {
  return (
    <motion.div
      className="relative rounded-lg border border-[#34D399]/30 bg-white/[0.03] backdrop-blur px-5 py-4 mb-6 overflow-hidden"
      animate={{
        boxShadow: [
          '0 0 0px rgba(52,211,153,0.0)',
          '0 0 22px rgba(52,211,153,0.35)',
          '0 0 0px rgba(52,211,153,0.0)',
        ],
      }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-[#34D399]" />
          <div>
            <div className="font-mono text-sm tracking-widest text-[#34D399]">
              DEFENSE GRID: ACTIVE
            </div>
            <div className="font-mono text-[10px] text-[#475569]">
              AEGIS PROTOCOL // FHE + POLYMORPHIC MUTATION + POST-QUANTUM ZK
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] text-[#94A3B8]">
          <span className="flex items-center gap-1.5">
            <KeyRound size={12} className="text-[#60A5FA]" /> keys rotated 4s ago
          </span>
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-[#F59E0B]" /> latency +0.8ms
          </span>
          <span>{nowStamp()}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------- page ----------

export default function AegisProtocol() {
  return (
    <div className="min-h-screen bg-[#060B18] px-6 py-8 text-[#F1F5F9]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={22} className="text-[#60A5FA]" />
            <h1 className="font-mono text-lg tracking-widest uppercase">
              Aegis Protocol
            </h1>
          </div>
          <p className="text-[#94A3B8] text-sm">
            Fully homomorphic encryption, polymorphic code mutation, and
            post-quantum ZK-STARK verification — layered defense-in-depth.
          </p>
        </div>

        <StatusBanner />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <FheCard />
          <MutationCard />
          <ZkCard />
        </div>

        <ThreatMatrix />
      </div>
    </div>
  );
}
