import clsx from 'clsx';
import { GitBranch } from 'lucide-react';
import type { EarthGraphState } from '../sovereign/graph/state.ts';
import type { PolicySnapshot } from '../sovereign/types.ts';
import { assertNever } from '../sovereign/types.ts';

function nodeTone(node: EarthGraphState['node']): string {
  switch (node) {
    case 'idle':
      return 'text-text-muted';
    case 'prime':
    case 'h_agent':
    case 's_agent':
    case 'vision':
    case 'inkling':
    case 'tinker':
      return 'text-accent';
    case 'compass':
      return 'text-amber';
    case 'ledger':
      return 'text-success';
    default:
      return assertNever(node, 'unhandled graph node');
  }
}

export default function GraphHud({
  graph,
  policy,
}: {
  graph: EarthGraphState | null;
  policy: PolicySnapshot;
}) {
  const ticks = graph?.ticks.slice(-8) ?? [];
  const probs = Object.entries(policy.probabilities).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <GitBranch className="h-3.5 w-3.5 text-accent" />
          <h2 className="font-mono text-[11px] font-semibold tracking-widest text-text-secondary">
            LANGGRAPH
          </h2>
          <span className={clsx('ml-auto font-mono text-[10px] tracking-wider', nodeTone(graph?.node ?? 'idle'))}>
            {(graph?.node ?? 'idle').toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b border-white/5 pb-3">
          <Meta label="Mission" value={graph?.mission?.id ?? '—'} />
          <Meta
            label="Verdict"
            value={graph?.verdict ? (graph.verdict.allow ? 'ALLOW' : 'DENY') : '—'}
            warn={graph?.verdict?.allow === false}
          />
          <Meta label="Reward" value={graph?.trajectory ? String(graph.trajectory.reward) : '—'} />
        </div>
        <div className="mt-3 max-h-36 space-y-1 overflow-y-auto font-mono text-[10px] leading-relaxed">
          {ticks.length === 0 && <p className="text-text-muted">No graph ticks yet. Run a mission.</p>}
          {ticks.map((tick, index) => (
            <p key={`${tick.ts}-${tick.node}-${index}`} className="text-text-secondary">
              <span className="text-accent">{tick.node}</span> · {tick.summary}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="font-mono text-[11px] font-semibold tracking-widest text-text-secondary">
            PRIME POLICY
          </h2>
          <span className="font-mono text-[10px] tracking-wider text-accent">
            trained={policy.trainedLabel} · ep {policy.episodes}
          </span>
        </div>
        <div className="space-y-2">
          {probs.length === 0 && <p className="font-mono text-[10px] text-text-muted">No catalog logits.</p>}
          {probs.map(([id, p]) => (
            <div key={id}>
              <div className="mb-0.5 flex justify-between font-mono text-[10px] text-text-muted">
                <span>{id.replace('mission-', '')}</span>
                <span>{(p * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-accent/80" style={{ width: `${Math.max(2, p * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={clsx('truncate font-mono text-sm font-semibold', warn ? 'text-amber' : 'text-text-primary')}>
        {value}
      </p>
    </div>
  );
}
