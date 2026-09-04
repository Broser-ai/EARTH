import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Play, RefreshCw, AlertTriangle } from 'lucide-react';
import TruthBadge from '../components/TruthBadge';
import {
  DEFAULT_START_BODY,
  DEV_ORG_ID,
  DEV_USER_ID,
  IntakeApiError,
  runNext,
  startMaterialOpportunity,
  type SessionEnvelope,
  type StartOpportunityBody,
  type TaskView,
} from '../intake/client';

function taskTone(state: string): string {
  switch (state) {
    case 'COMPLETED':
      return 'text-[#34D399]';
    case 'PARTIAL':
    case 'NOT_CONFIGURED':
    case 'BLOCKED':
      return 'text-amber';
    case 'FAILED':
    case 'CANCELLED':
      return 'text-[#EF4444]';
    case 'RUNNING':
      return 'text-accent';
    default:
      return 'text-text-secondary';
  }
}

function formatOutput(task: TaskView): string {
  if (!task.output) {
    return '—';
  }
  return JSON.stringify(task.output);
}

export default function MaterialOpportunityIntake() {
  const [idempotencyKey, setIdempotencyKey] = useState(DEFAULT_START_BODY.idempotencyKey);
  const [materialClass, setMaterialClass] = useState(DEFAULT_START_BODY.materialBatch.materialClass ?? '');
  const [quantityKg, setQuantityKg] = useState(String(DEFAULT_START_BODY.materialBatch.quantityKg ?? ''));
  const [facilityName, setFacilityName] = useState(DEFAULT_START_BODY.materialBatch.facilityName ?? '');
  const [disposalCostDkk, setDisposalCostDkk] = useState(
    String(DEFAULT_START_BODY.baseline.disposalCostDkk),
  );
  const [co2eKg, setCo2eKg] = useState(String(DEFAULT_START_BODY.baseline.co2eKg));
  const [extractionRequested, setExtractionRequested] = useState(false);
  const [busy, setBusy] = useState<'start' | 'next' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<SessionEnvelope | null>(null);

  const payload: StartOpportunityBody = useMemo(
    () => ({
      ...DEFAULT_START_BODY,
      idempotencyKey: idempotencyKey.trim() || DEFAULT_START_BODY.idempotencyKey,
      materialBatch: {
        ...DEFAULT_START_BODY.materialBatch,
        materialClass,
        quantityKg: Number(quantityKg),
        facilityName,
      },
      baseline: {
        disposalCostDkk: Number(disposalCostDkk),
        co2eKg: Number(co2eKg),
      },
      evidence: {
        documentIds: [],
        extractionRequested,
      },
    }),
    [
      co2eKg,
      disposalCostDkk,
      extractionRequested,
      facilityName,
      idempotencyKey,
      materialClass,
      quantityKg,
    ],
  );

  async function onStart(): Promise<void> {
    setBusy('start');
    setError(null);
    try {
      const next = await startMaterialOpportunity(payload);
      setEnvelope(next);
    } catch (caught) {
      setEnvelope(null);
      setError(describeFailure(caught));
    } finally {
      setBusy(null);
    }
  }

  async function onRunNext(): Promise<void> {
    if (!envelope?.session.id) {
      return;
    }
    setBusy('next');
    setError(null);
    try {
      const next = await runNext(envelope.session.id);
      setEnvelope(next);
    } catch (caught) {
      setError(describeFailure(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-medium text-text-primary">Material Opportunity Intake</h1>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            First durable workflow. Posts to <span className="font-mono">POST /v1/material-opportunities/start</span>{' '}
            with DEVELOPMENT identity headers. Envelope mode is{' '}
            <span className="font-mono">DEVELOPMENT_ONLY</span>. Deterministic stubs only — no LLM,
            recycler, ERP, SKAT, or SAP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TruthBadge kind="DEVELOPMENT" />
          <TruthBadge kind="DEMO" />
        </div>
      </div>

      <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-3">
        <p className="text-[11px] font-medium text-amber">DEVELOPMENT identity — not authentication</p>
        <p className="mt-1 font-mono text-[10px] text-text-secondary">
          x-earth-org-id: {DEV_ORG_ID}
          <br />
          x-earth-user-id: {DEV_USER_ID}
          <br />
          x-earth-user-role: OWNER
        </p>
        <p className="mt-1 text-[10px] text-text-secondary">
          These are the Compose seed rows. Anyone who can reach the process can send them. Vite
          proxies `/v1` to `127.0.0.1:3001` during `npm run dev`.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
        <form
          className="space-y-3 rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            void onStart();
          }}
        >
          <h2 className="text-[11px] font-medium text-text-primary">Start session</h2>
          <label className="block space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
              Idempotency key
            </span>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-text-primary"
              value={idempotencyKey}
              onChange={(event) => setIdempotencyKey(event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
              Material class
            </span>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-text-primary"
              value={materialClass}
              onChange={(event) => setMaterialClass(event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
              Quantity kg
            </span>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-text-primary"
              value={quantityKg}
              onChange={(event) => setQuantityKg(event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
              Facility
            </span>
            <input
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-text-primary"
              value={facilityName}
              onChange={(event) => setFacilityName(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
                Disposal cost DKK
              </span>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-text-primary"
                value={disposalCostDkk}
                onChange={(event) => setDisposalCostDkk(event.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
                CO₂e kg
              </span>
              <input
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[11px] text-text-primary"
                value={co2eKg}
                onChange={(event) => setCo2eKg(event.target.value)}
              />
            </label>
          </div>
          <p className="text-[10px] text-text-secondary">
            Baseline values are submitted as <TruthBadge kind="INPUT_UNVERIFIED" className="align-middle" /> user
            input. They are not measured inventory.
          </p>
          <label className="flex items-center gap-2 text-[11px] text-text-secondary">
            <input
              type="checkbox"
              checked={extractionRequested}
              onChange={(event) => setExtractionRequested(event.target.checked)}
            />
            Request NanoChat extract (stays NOT_CONFIGURED)
          </label>
          <button
            type="submit"
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[11px] font-medium text-space disabled:opacity-50"
          >
            <Play size={12} />
            {busy === 'start' ? 'Starting…' : 'Start intake'}
          </button>
        </form>

        <div className="space-y-3">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber/30 bg-amber/5 px-3 py-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber" />
              <p className="font-mono text-[11px] text-amber">{error}</p>
            </div>
          )}

          {envelope ? (
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[10px] text-text-muted">{envelope.session.id}</p>
                  <p className="mt-1 text-[12px] text-text-primary">
                    {envelope.session.workflowType} {envelope.session.workflowVersion}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-accent">{envelope.session.state}</span>
              </div>
              <p className="mt-2 text-[10px] text-text-secondary">
                mode {envelope.mode} · next {envelope.nextRecommendedAction}
              </p>
              <p className="mt-1 font-mono text-[10px] text-text-secondary">
                reasonCodes: {envelope.session.reasonCodes.join(', ') || '—'}
              </p>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  void onRunNext();
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-text-primary disabled:opacity-50"
              >
                <RefreshCw size={12} />
                {busy === 'next' ? 'Running…' : 'Run next task'}
              </button>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Task', 'State', 'Req', 'Error', 'Output'].map((heading) => (
                        <th
                          key={heading}
                          className="px-2 py-1.5 text-left font-mono text-[9px] uppercase tracking-wider text-text-muted"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {envelope.tasks.map((task) => (
                      <tr key={task.id} className="border-b border-white/[0.04]">
                        <td className="px-2 py-1.5 font-mono text-[11px] text-text-primary">
                          {task.taskType}
                        </td>
                        <td className={clsx('px-2 py-1.5 font-mono text-[11px]', taskTone(task.state))}>
                          {task.state}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-text-secondary">
                          {task.required ? 'yes' : 'no'}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-amber">
                          {task.errorCode ?? '—'}
                        </td>
                        <td className="max-w-[280px] truncate px-2 py-1.5 font-mono text-[10px] text-text-secondary">
                          {formatOutput(task)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/5 bg-white/[0.03] px-4 py-8 text-center text-[11px] text-text-secondary">
              No session yet. Start intake against the local API (`npm run api:dev` + `npm run db:migrate`).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function describeFailure(caught: unknown): string {
  if (caught instanceof IntakeApiError) {
    return `${caught.status} ${caught.code}: ${caught.message}`;
  }
  if (caught instanceof TypeError) {
    return 'API not reachable. Start `npm run api:dev` on :3001 (Vite proxies /v1 in npm run dev).';
  }
  if (caught instanceof Error) {
    return caught.message;
  }
  return 'unknown error';
}
