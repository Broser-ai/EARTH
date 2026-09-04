import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Gauge,
  Play,
  Pause,
  Radio,
  Zap,
} from "lucide-react";

// ---------- Types ----------

interface MacroIndicator {
  label: string;
  value: number;
  unit: string;
  decimals: number;
  dir: 1 | -1;
}

interface Material {
  name: string;
  price: number;
  unit: string;
  changePct: number;
  proj30: number;
  proj180: number;
  risk: number; // 0-100
}

interface TechTrend {
  name: string;
  velocity: number;
  breakthrough: string;
}

interface Weights {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
}

// ---------- Demo seed data ----------

const initialMacro: MacroIndicator[] = [
  { label: "EU Inflation", value: 2.1, unit: "%", decimals: 2, dir: 1 },
  { label: "EURIBOR 3M", value: 3.65, unit: "%", decimals: 2, dir: -1 },
  { label: "Energy Spot", value: 87.4, unit: "€/MWh", decimals: 1, dir: 1 },
  { label: "Brent Crude", value: 82.1, unit: "$/bbl", decimals: 1, dir: -1 },
  { label: "Baltic Dry", value: 1847, unit: "pts", decimals: 0, dir: 1 },
  { label: "CBAM Carbon", value: 74.2, unit: "€/t", decimals: 1, dir: 1 },
];

const initialMaterials: Material[] = [
  { name: "rPET", price: 1.24, unit: "€/kg", changePct: 0.3, proj30: 1.27, proj180: 1.35, risk: 32 },
  { name: "Aluminum", price: 2.41, unit: "€/kg", changePct: -0.8, proj30: 2.38, proj180: 2.55, risk: 48 },
  { name: "Copper", price: 8.92, unit: "€/kg", changePct: 1.4, proj30: 9.05, proj180: 9.6, risk: 61 },
  { name: "Lithium", price: 13.6, unit: "€/kg", changePct: -2.1, proj30: 13.1, proj180: 14.8, risk: 79 },
  { name: "Steel-EAF", price: 0.78, unit: "€/kg", changePct: 0.5, proj30: 0.79, proj180: 0.83, risk: 27 },
  { name: "Cardboard", price: 0.31, unit: "€/kg", changePct: 0.1, proj30: 0.31, proj180: 0.33, risk: 14 },
];

const initialTech: TechTrend[] = [
  { name: "Agentic Software", velocity: 2.8, breakthrough: "Q2 2027" },
  { name: "FHE Compute", velocity: 1.4, breakthrough: "Q4 2028" },
  { name: "World Models", velocity: 3.2, breakthrough: "Q1 2027" },
  { name: "Post-Quantum Crypto (SIMULATION)", velocity: 0.9, breakthrough: "Q3 2029" },
  { name: "Multi-Agent RL", velocity: 2.1, breakthrough: "Q3 2027" },
];

const initialWeights: Weights = { alpha: 35, beta: 30, gamma: 20, delta: 15 };
const BASE_PRICE = 1000;

// ---------- Helpers ----------

function jitter(v: number, pct: number) {
  return v * (1 + (Math.random() - 0.5) * pct);
}

function clampWeights(w: Weights): Weights {
  const total = w.alpha + w.beta + w.gamma + w.delta;
  return {
    alpha: (w.alpha / total) * 100,
    beta: (w.beta / total) * 100,
    gamma: (w.gamma / total) * 100,
    delta: (w.delta / total) * 100,
  };
}

function fmt(v: number, decimals: number) {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const riskColor = (risk: number) =>
  risk >= 66 ? "#EF4444" : risk >= 40 ? "#F59E0B" : "#34D399";

// ---------- Component ----------

export default function HyperMatrix() {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [price, setPrice] = useState(BASE_PRICE);
  const [priceDelta, setPriceDelta] = useState(0);
  const [macro, setMacro] = useState<MacroIndicator[]>(initialMacro);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [tech, setTech] = useState<TechTrend[]>(initialTech);
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const intervalRef = useRef<number | null>(null);

  const heartbeat = useCallback(() => {
    setTick((t) => {
      const next = t + 1;

      // Macro indicators: small fluctuation, occasional direction flip
      setMacro((prev) =>
        prev.map((m) => {
          const nv = jitter(m.value, 0.006);
          const dir: 1 | -1 = nv >= m.value ? 1 : -1;
          return { ...m, value: nv, dir };
        })
      );

      // Materials: price/change/projections wiggle
      setMaterials((prev) =>
        prev.map((mat) => {
          const nv = jitter(mat.price, 0.01);
          const changePct = ((nv - mat.price) / mat.price) * 100 + mat.changePct * 0.4;
          const risk = Math.min(99, Math.max(3, mat.risk + (Math.random() - 0.5) * 4));
          return {
            ...mat,
            price: nv,
            changePct,
            proj30: jitter(mat.proj30, 0.006),
            proj180: jitter(mat.proj180, 0.008),
            risk,
          };
        })
      );

      // Tech velocity: gentle drift
      setTech((prev) =>
        prev.map((t2) => ({ ...t2, velocity: Math.max(0.1, jitter(t2.velocity, 0.02)) }))
      );

      // SDE price walk using current weights
      setPrice((prevPrice) => {
        const macroTerm = (Math.random() - 0.48) * (weights.alpha / 100) * 6;
        const microTerm = (Math.random() - 0.5) * (weights.beta / 100) * 5;
        const regTerm = (Math.random() - 0.5) * (weights.gamma / 100) * 4;
        const sentTerm = (Math.random() - 0.5) * (weights.delta / 100) * 4;
        const noise = (Math.random() - 0.5) * 1.2;
        const delta = macroTerm + microTerm + regTerm + sentTerm + noise;
        setPriceDelta(delta);
        return prevPrice + delta;
      });

      // Self-calibration every ~10 ticks
      if (next % 10 === 0) {
        setWeights((w) =>
          clampWeights({
            alpha: w.alpha + (Math.random() - 0.5) * 4,
            beta: w.beta + (Math.random() - 0.5) * 4,
            gamma: w.gamma + (Math.random() - 0.5) * 3,
            delta: w.delta + (Math.random() - 0.5) * 3,
          })
        );
      }

      return next;
    });
  }, [weights]);

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(heartbeat, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, heartbeat]);

  const toggle = () => setRunning((r) => !r);
  const calibrationProgress = (tick % 10) * 10;

  return (
    <div className="min-h-screen bg-[#060B18] px-6 py-8 text-[#F1F5F9]">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-mono text-2xl font-semibold tracking-tight text-[#F1F5F9]">
              <Activity className="h-6 w-6 text-[#60A5FA]" />
              CHRONOS HYPER-MATRIX
            </h1>
            <p className="mt-1 font-mono text-xs text-[#475569]">
              1Hz self-calibrating global economic simulator — tick #{tick}
            </p>
          </div>
          <button
            onClick={toggle}
            className={clsx(
              "flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-sm font-medium transition-colors",
              running
                ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20"
                : "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] hover:bg-[#34D399]/20"
            )}
          >
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Stop Heartbeat" : "Start Heartbeat"}
            {running && (
              <motion.span
                className="ml-1 h-2 w-2 rounded-full bg-[#EF4444]"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </button>
        </div>

        {/* SDE formula + composite price */}
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-5 backdrop-blur">
          <div className="flex items-center gap-2 text-[#94A3B8]">
            <Radio className="h-4 w-4 text-[#60A5FA]" />
            <span className="font-mono text-xs uppercase tracking-widest">Stochastic Differential Engine</span>
          </div>
          <div className="mt-3 overflow-x-auto rounded-md border border-white/5 bg-black/30 px-4 py-3 font-mono text-sm text-[#60A5FA] sm:text-base">
            P(t+1) = P(t) + α·Macro + β·Micro + γ·Regulation + δ·Sentiment + ε·Noise
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <div className="font-mono text-xs text-[#475569]">COMPOSITE INDEX P(t)</div>
              <div className="font-mono text-3xl font-semibold text-[#F1F5F9]">{fmt(price, 2)}</div>
            </div>
            <div
              className={clsx(
                "flex items-center gap-1 font-mono text-sm",
                priceDelta >= 0 ? "text-[#34D399]" : "text-[#EF4444]"
              )}
            >
              {priceDelta >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {fmt(Math.abs(priceDelta), 3)} / tick
            </div>
          </div>
        </div>

        {/* Calibrating weights */}
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <Gauge className="h-4 w-4 text-[#60A5FA]" />
              <span className="font-mono text-xs uppercase tracking-widest">Self-Calibrating Formula Weights</span>
            </div>
            <span className="font-mono text-xs text-[#475569]">
              next calibration in {10 - (tick % 10)} ticks
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-[#60A5FA]/50 transition-all duration-500"
              style={{ width: `${calibrationProgress}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ["α · Macro", weights.alpha, "#60A5FA"],
                ["β · Micro", weights.beta, "#34D399"],
                ["γ · Regulation", weights.gamma, "#F59E0B"],
                ["δ · Sentiment", weights.delta, "#EF4444"],
              ] as [string, number, string][]
            ).map(([label, val, color]) => (
              <div key={label}>
                <div className="flex justify-between font-mono text-xs text-[#94A3B8]">
                  <span>{label}</span>
                  <span style={{ color }}>{val.toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Macro indicators */}
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#94A3B8]">
            Macro Indicators
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {macro.map((m) => (
              <div
                key={m.label}
                className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#94A3B8]">{m.label}</span>
                  {m.dir === 1 ? (
                    <ArrowUp className="h-3.5 w-3.5 text-[#34D399]" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-[#EF4444]" />
                  )}
                </div>
                <div className="mt-1 font-mono text-xl font-semibold text-[#F1F5F9]">
                  {fmt(m.value, m.decimals)}
                  <span className="ml-1 text-sm font-normal text-[#475569]">{m.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Material matrix */}
        <div>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#94A3B8]">
            Material Price Matrix
          </h2>
          <div className="overflow-x-auto rounded-lg border border-white/5 bg-white/[0.03] backdrop-blur">
            <table className="w-full min-w-[720px] text-left font-mono text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[#475569]">
                  <th className="px-4 py-3 font-normal">Material</th>
                  <th className="px-4 py-3 font-normal">Spot</th>
                  <th className="px-4 py-3 font-normal">Change%</th>
                  <th className="px-4 py-3 font-normal">30d Proj.</th>
                  <th className="px-4 py-3 font-normal">180d Proj.</th>
                  <th className="px-4 py-3 font-normal">Risk</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat) => (
                  <tr key={mat.name} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-[#F1F5F9]">{mat.name}</td>
                    <td className="px-4 py-3 text-[#F1F5F9]">
                      {fmt(mat.price, 2)} <span className="text-[#475569]">{mat.unit}</span>
                    </td>
                    <td
                      className={clsx(
                        "px-4 py-3",
                        mat.changePct >= 0 ? "text-[#34D399]" : "text-[#EF4444]"
                      )}
                    >
                      {mat.changePct >= 0 ? "+" : ""}
                      {fmt(mat.changePct, 2)}%
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{fmt(mat.proj30, 2)}</td>
                    <td className="px-4 py-3 text-[#94A3B8]">{fmt(mat.proj180, 2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${mat.risk}%`,
                              backgroundColor: riskColor(mat.risk),
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: riskColor(mat.risk) }}>
                          {Math.round(mat.risk)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tech velocity tracker */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#94A3B8]">
            <Zap className="h-3.5 w-3.5 text-[#F59E0B]" />
            Tech Velocity Tracker
          </h2>
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-5 backdrop-blur">
            <div className="space-y-4">
              {tech.map((t) => {
                const pct = Math.min(100, (t.velocity / 4) * 100);
                return (
                  <div key={t.name}>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-[#F1F5F9]">{t.name}</span>
                      <span className="text-[#94A3B8]">
                        {t.velocity.toFixed(2)}x
                        <span className="ml-2 text-[#475569]">ETA {t.breakthrough}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#34D399]"
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
