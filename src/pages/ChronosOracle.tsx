import { useState } from 'react';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Zap,
  Satellite,
  Radio,
  Cpu,
  Scale,
  CloudRain,
  Truck,
  Play,
  Loader2,
  ShieldAlert,
  Target,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'simulator' | 'prophecy';
type Severity = 'high' | 'medium' | 'low';

interface Policy {
  id: string;
  title: string;
}

interface Bottleneck {
  severity: Severity;
  description: string;
  alternative: string;
}

interface SimResult {
  co2Reduction: number;
  gdpImpact: number;
  confidenceChange: number;
  bottlenecks: Bottleneck[];
  consequences: string[];
}

interface Signal {
  label: string;
  icon: typeof Satellite;
  strength: number;
}

interface Prophecy {
  id: string;
  title: string;
  recommendation: string;
  shortageProbability: number;
  confidence: number;
  signals: Signal[];
}

const POLICIES: Policy[] = [
  { id: 'cbam3', title: 'CBAM Phase 3 — Carbon border adjustment +€75/tCO2' },
  { id: 'eudr0', title: 'EUDR Zero Grace — Immediate enforcement, no transition' },
];

const SIM_RESULTS: Record<string, SimResult> = {
  cbam3: {
    co2Reduction: 14.2,
    gdpImpact: -0.8,
    confidenceChange: -3.1,
    bottlenecks: [
      { severity: 'high', description: 'Steel & cement importers face 40% cost surge at border', alternative: 'Phase in over 18 months with rebate pool' },
      { severity: 'high', description: 'Non-EU trade partners threaten WTO retaliation filings', alternative: 'Pre-negotiate bilateral carbon clubs' },
      { severity: 'medium', description: 'SME importers lack MRV capacity for embedded emissions', alternative: 'Subsidized third-party verification vouchers' },
      { severity: 'low', description: 'Port customs throughput dips during declaration ramp-up', alternative: 'Digital pre-clearance pilot at top 5 ports' },
    ],
    consequences: [
      'Carbon leakage shifts to non-covered downstream goods (furniture, machinery parts)',
      'Short-term inflation pass-through of ~0.4% in construction materials',
      'Accelerated EU domestic green steel investment beyond projected timelines',
    ],
  },
  eudr0: {
    co2Reduction: 9.6,
    gdpImpact: -1.4,
    confidenceChange: -6.7,
    bottlenecks: [
      { severity: 'high', description: 'Smallholder cocoa/coffee exporters cut off without traceability systems', alternative: 'Emergency 6-month bridging certification' },
      { severity: 'high', description: 'EU importers stockpile ahead of deadline, distorting spot prices', alternative: 'Staggered enforcement by commodity class' },
      { severity: 'medium', description: 'Customs flagged shipments back up at Rotterdam & Antwerp', alternative: 'Risk-tiered inspection sampling' },
      { severity: 'medium', description: 'Legal challenges from producer nations delay full rollout', alternative: 'Joint due-diligence recognition agreements' },
    ],
    consequences: [
      'Informal/grey-market channels absorb displaced smallholder volume',
      'Price volatility spike in cocoa futures (+18% implied vol)',
      'Faster adoption of satellite-based plot verification across supply chains',
    ],
  },
};

const PROPHECIES: Prophecy[] = [
  {
    id: 'rpet',
    title: 'rPET Global Supply',
    recommendation: 'BUY_FUTURES',
    shortageProbability: 78,
    confidence: 91,
    signals: [
      { label: 'IOT', icon: Cpu, strength: 82 },
      { label: 'SATELLITE', icon: Satellite, strength: 74 },
      { label: 'RFID', icon: Radio, strength: 88 },
      { label: 'REGULATORY', icon: Scale, strength: 65 },
      { label: 'TRADE_FLOW', icon: Truck, strength: 90 },
      { label: 'WEATHER', icon: CloudRain, strength: 40 },
    ],
  },
  {
    id: 'lithium',
    title: 'Lithium Carbonate EU',
    recommendation: 'HEDGE',
    shortageProbability: 54,
    confidence: 83,
    signals: [
      { label: 'IOT', icon: Cpu, strength: 60 },
      { label: 'SATELLITE', icon: Satellite, strength: 71 },
      { label: 'RFID', icon: Radio, strength: 48 },
      { label: 'REGULATORY', icon: Scale, strength: 85 },
      { label: 'TRADE_FLOW', icon: Truck, strength: 62 },
      { label: 'WEATHER', icon: CloudRain, strength: 30 },
    ],
  },
];

const severityColor: Record<Severity, string> = {
  high: 'text-danger border-danger/30 bg-danger/10',
  medium: 'text-amber border-amber/30 bg-amber/10',
  low: 'text-success border-success/30 bg-success/10',
};

function StatCard({ label, value, unit, positiveIsGood }: { label: string; value: number; unit: string; positiveIsGood: boolean }) {
  const isPositive = value >= 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <div className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">{label}</div>
      <div className={clsx('mt-2 font-mono text-2xl font-bold', isGood ? 'text-success' : 'text-danger')}>
        {isPositive ? '+' : ''}
        {value}
        {unit}
      </div>
    </div>
  );
}

function SignalBar({ signal }: { signal: Signal }) {
  const Icon = signal.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
      <span className="w-20 shrink-0 font-mono text-[10px] tracking-wider text-text-secondary">{signal.label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${signal.strength}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-[10px] text-text-muted">{signal.strength}</span>
    </div>
  );
}

export default function ChronosOracle() {
  const [tab, setTab] = useState<Tab>('simulator');
  const [selectedPolicy, setSelectedPolicy] = useState<string>(POLICIES[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);

  const runSimulation = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(SIM_RESULTS[selectedPolicy]);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-space p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-wide text-text-primary">CHRONOS ORACLE</h1>
            <p className="text-xs text-text-secondary">Macro-economic policy simulator — 10M digital twin agents</p>
          </div>
        </div>

        <div className="mt-6 flex gap-1 border-b border-white/5">
          {(
            [
              { id: 'simulator' as Tab, label: 'POLICY SIMULATOR' },
              { id: 'prophecy' as Tab, label: 'MARKET PROPHECY' },
            ]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={clsx(
                'rounded-t-md px-4 py-2 font-mono text-xs font-medium tracking-wider transition-all',
                tab === item.id
                  ? 'border-b-2 border-accent bg-accent/10 text-accent'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 space-y-6"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {POLICIES.map((policy) => (
                  <button
                    key={policy.id}
                    onClick={() => {
                      setSelectedPolicy(policy.id);
                      setResult(null);
                    }}
                    className={clsx(
                      'rounded-lg border p-4 text-left backdrop-blur transition-all',
                      selectedPolicy === policy.id
                        ? 'border-accent/40 bg-accent/[0.08]'
                        : 'border-white/5 bg-white/[0.03] hover:border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Target className={clsx('h-4 w-4', selectedPolicy === policy.id ? 'text-accent' : 'text-text-muted')} />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">Policy Candidate</span>
                    </div>
                    <p className="mt-2 text-sm text-text-primary">{policy.title}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={runSimulation}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-5 py-2.5 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {loading ? 'RUNNING 10M AGENT SIMULATION...' : 'RUN SIMULATION'}
              </button>

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard label="CO2 Reduction" value={result.co2Reduction} unit="%" positiveIsGood />
                    <StatCard label="GDP Impact" value={result.gdpImpact} unit="%" positiveIsGood />
                    <StatCard label="Market Confidence Δ" value={result.confidenceChange} unit="%" positiveIsGood />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber" />
                      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
                        Bottleneck Predictions
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {result.bottlenecks.map((b, i) => (
                        <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] p-3 backdrop-blur">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm text-text-primary">{b.description}</p>
                            <span
                              className={clsx(
                                'shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider',
                                severityColor[b.severity]
                              )}
                            >
                              {b.severity}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-text-secondary">
                            <span className="text-accent">→ Alternative:</span> {b.alternative}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-danger" />
                      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
                        Unintended Consequences
                      </h2>
                    </div>
                    <div className="space-y-2">
                      {result.consequences.map((c, i) => (
                        <div key={i} className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-sm text-text-secondary backdrop-blur">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {tab === 'prophecy' && (
            <motion.div
              key="prophecy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6 space-y-4"
            >
              <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Digital Twin Status
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <div className="font-mono text-lg font-bold text-accent">10M</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-secondary">Active Agents</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-accent">847</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-secondary">Data Sources</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-success">91.2%</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-secondary">Accuracy</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-accent">2,847</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-secondary">Materials Tracked</div>
                  </div>
                </div>
              </div>

              {PROPHECIES.map((p) => (
                <div key={p.id} className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-accent" />
                      <h3 className="text-sm font-semibold text-text-primary">{p.title}</h3>
                    </div>
                    <span
                      className={clsx(
                        'rounded border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider',
                        p.recommendation === 'BUY_FUTURES'
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-amber/30 bg-amber/10 text-amber'
                      )}
                    >
                      {p.recommendation}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                        <span>Shortage Probability</span>
                        <span className="text-text-primary">{p.shortageProbability}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={clsx(
                            'h-full rounded-full',
                            p.shortageProbability >= 70 ? 'bg-danger' : p.shortageProbability >= 40 ? 'bg-amber' : 'bg-success'
                          )}
                          style={{ width: `${p.shortageProbability}%` }}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                        <span>Confidence Score</span>
                        <span className="text-text-primary">{p.confidence}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${p.confidence}%` }} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      {p.signals.map((s) => (
                        <SignalBar key={s.label} signal={s} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
