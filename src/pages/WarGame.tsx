import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  FileCheck2,
  Swords,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { useEarthRuntime } from '../sovereign/runtime/EarthRuntimeContext.tsx';
import { WARGAME_ALTERNATE, WARGAME_BLOCKED } from '../sovereign/missions/catalog.ts';
import { issueDid } from '../sovereign/identity/did.ts';
import type { CompassVerdict } from '../sovereign/types.ts';

interface TimelineRow {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: 'crisis' | 'warning' | 'resolution';
}

const TONE: Record<TimelineRow['tone'], { text: string; bg: string; border: string }> = {
  crisis: { text: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/30' },
  warning: { text: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/30' },
  resolution: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
};

export default function WarGame() {
  const { runtime, generation } = useEarthRuntime();
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [running, setRunning] = useState(false);
  const [blockedVerdict, setBlockedVerdict] = useState<CompassVerdict | null>(null);
  const [allowedVerdict, setAllowedVerdict] = useState<CompassVerdict | null>(null);
  const [did, setDid] = useState<string | null>(null);
  void generation;

  async function triggerCrisis() {
    if (running) return;
    setRunning(true);
    setRows([]);
    setDid(null);
    runtime.boot();

    const blocked = await runtime.compass.evaluate(WARGAME_BLOCKED, runtime.ctx);
    setBlockedVerdict(blocked);
    runtime.bus.emit({
      type: 'compass.verdict',
      source: 'war-game',
      message: blocked.allow ? 'unexpected allow' : 'COMPASS BLOCK on SUP-BR-001',
      payload: { actionId: WARGAME_BLOCKED.id, allow: blocked.allow, digest: blocked.digest },
    });
    setRows([
      {
        id: 'scan',
        label: 'HORIZON SCAN',
        title: 'EUDR shock',
        detail: 'Deforestation index 0.082 on SUP-BR-001',
        tone: 'crisis',
      },
      {
        id: 'block',
        label: 'COMPASS BLOCK',
        title: blocked.allow ? 'Unexpected allow' : 'Batch MB-2026-0451 refused',
        detail: blocked.conflicts[0] ?? 'floor breach',
        tone: 'crisis',
      },
    ]);

    const allowed = await runtime.compass.evaluate(WARGAME_ALTERNATE, runtime.ctx);
    setAllowedVerdict(allowed);
    runtime.bus.emit({
      type: 'compass.verdict',
      source: 'war-game',
      message: allowed.allow ? 'COMPASS ALLOW SUP-DE-044' : 'alternate blocked',
      payload: { actionId: WARGAME_ALTERNATE.id, allow: allowed.allow, digest: allowed.digest },
    });

    const next: TimelineRow[] = [
      {
        id: 'alt',
        label: 'ALTERNATE',
        title: 'SUP-DE-044 proposed',
        detail: '15.2t rPET, labor fairness 0.86, EUDR 0.01',
        tone: 'warning',
      },
    ];

    if (allowed.allow) {
      const entry = await runtime.ledger.append({
        kind: 'wargame.settlement',
        supplier: 'SUP-DE-044',
        tonnes: 15.2,
        compassDigest: allowed.digest,
      });
      const credential = issueDid('batch-mb-2026-0451');
      setDid(credential.id);
      next.push(
        {
          id: 'deal',
          label: 'DEAL SETTLED',
          title: 'SUP-DE-044 accepted',
          detail: `ledger ${entry.id} · digest ${allowed.digest.slice(0, 8)}…`,
          tone: 'resolution',
        },
        {
          id: 'did',
          label: 'DID ISSUED',
          title: credential.id,
          detail: 'Interface DID — not a live W3C registrar',
          tone: 'resolution',
        },
      );
    }

    setRows((prev) => [...prev, ...next]);
    setRunning(false);
  }

  function resetSim() {
    setRows([]);
    setBlockedVerdict(null);
    setAllowedVerdict(null);
    setDid(null);
  }

  const compassScore = allowedVerdict?.opinions.ethics.score;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="rounded-lg border border-danger/20 bg-danger/[0.04] p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-danger/10">
            <Swords className="h-4 w-4 text-danger" />
          </div>
          <div>
            <span className="font-mono text-[11px] font-bold tracking-widest text-danger">
              SCENARIO: EUDR SHOCK
            </span>
            <p className="mt-1 text-sm text-text-secondary">
              COMPASS evaluates the blocked Brazilian batch, then the German alternate, against the
              live gate — not a hardcoded score.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            void triggerCrisis();
          }}
          disabled={running}
          className={clsx(
            'flex items-center gap-2 rounded-md border px-5 py-2.5 font-mono text-xs font-bold tracking-widest',
            running
              ? 'cursor-not-allowed border-white/5 bg-white/[0.02] text-text-muted'
              : 'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20',
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {running ? 'EVALUATING…' : 'TRIGGER CRISIS'}
        </button>
        {rows.length > 0 && (
          <button
            onClick={resetSim}
            className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.03] px-4 py-2.5 font-mono text-[11px] text-text-secondary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            RESET
          </button>
        )}
      </div>

      <div className="min-h-[120px] rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
        {rows.length === 0 && (
          <div className="flex h-24 items-center justify-center font-mono text-xs text-text-muted">
            AWAITING TRIGGER — COMPASS idle
          </div>
        )}
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {rows.map((row) => {
              const tone = TONE[row.tone];
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={clsx('flex items-center gap-3 rounded-md border px-3 py-2.5', tone.bg, tone.border)}
                >
                  {row.tone === 'crisis' ? (
                    <Ban className={clsx('h-4 w-4', tone.text)} />
                  ) : row.tone === 'resolution' ? (
                    <CheckCircle2 className={clsx('h-4 w-4', tone.text)} />
                  ) : (
                    <FileCheck2 className={clsx('h-4 w-4', tone.text)} />
                  )}
                  <span className={clsx('font-mono text-[11px] font-bold tracking-wider', tone.text)}>
                    {row.label}
                  </span>
                  <span className="text-sm text-text-primary">{row.title}</span>
                  <span className="text-xs text-text-secondary">{row.detail}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {(blockedVerdict || allowedVerdict) && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi
            label="BLOCK ALLOW"
            value={blockedVerdict?.allow ? 'YES' : 'NO'}
            accent={blockedVerdict?.allow ? 'text-success' : 'text-danger'}
          />
          <Kpi
            label="ALT ALLOW"
            value={allowedVerdict?.allow ? 'YES' : 'NO'}
            accent={allowedVerdict?.allow ? 'text-success' : 'text-danger'}
          />
          <Kpi
            label="ETHICS (ALT)"
            value={compassScore !== undefined ? compassScore.toFixed(2) : '—'}
            accent="text-accent"
          />
          <Kpi label="DID" value={did ? 'issued' : '—'} accent="text-accent" />
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <div className="mb-1.5 font-mono text-[10px] tracking-widest text-text-muted">{label}</div>
      <div className={clsx('font-mono text-2xl font-bold', accent)}>{value}</div>
    </div>
  );
}
