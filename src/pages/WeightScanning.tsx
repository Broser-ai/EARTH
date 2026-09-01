import { useState } from 'react';
import {
  Plus,
  Scale,
  ScanBarcode,
  CheckCircle2,
  XCircle,
  Flag,
  AlertTriangle,
  Wifi,
  WifiOff,
  Wrench,
  PackageSearch,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StationStatus = 'Online' | 'Offline';

interface WeightStation {
  id: string;
  name: string;
  status: StationStatus;
  note?: string;
  lastCalibrated: string; // ISO date
  nextCalibrationDue: string; // ISO date
}

interface Weighing {
  ticket: string;
  timestamp: string;
  station: string;
  material: string;
  gross: number;
  tare: number;
  net: number;
  scanned: boolean;
  verified: boolean;
}

interface Discrepancy {
  ticket: string;
  material: string;
  declared: number;
  measured: number;
  station: string;
}

interface ScannedBarcode {
  code: string;
  timestamp: string;
  product: string;
  category: string;
  matched: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const STATIONS: WeightStation[] = [
  { id: 'ST-01', name: 'Berlin HQ', status: 'Online', lastCalibrated: '2026-06-15', nextCalibrationDue: '2026-09-15' },
  { id: 'ST-02', name: 'München Depot', status: 'Online', lastCalibrated: '2026-06-02', nextCalibrationDue: '2026-09-02' },
  { id: 'ST-03', name: 'Hamburg Terminal', status: 'Online', lastCalibrated: '2026-07-01', nextCalibrationDue: '2026-10-01' },
  { id: 'ST-04', name: 'Köln', status: 'Offline', note: 'Maintenance', lastCalibrated: '2026-05-20', nextCalibrationDue: '2026-08-20' },
];

const INTAKE_SUMMARY = {
  itemsWeighed: 847,
  totalWeightT: 124.7,
  avgWeightKg: 147,
  discrepancies: 12,
};

const WEIGHINGS: Weighing[] = [
  { ticket: '#WT-4847', timestamp: '14:32', station: 'Berlin HQ', material: 'Mixed plastics', gross: 2847, tare: 412, net: 2435, scanned: true, verified: true },
  { ticket: '#WT-4846', timestamp: '14:21', station: 'München Depot', material: 'Cardboard bales', gross: 1904, tare: 380, net: 1524, scanned: true, verified: true },
  { ticket: '#WT-4845', timestamp: '14:08', station: 'Hamburg Terminal', material: 'Scrap steel', gross: 5612, tare: 940, net: 4672, scanned: true, verified: true },
  { ticket: '#WT-4844', timestamp: '13:57', station: 'Berlin HQ', material: 'E-waste (mixed)', gross: 1288, tare: 205, net: 1083, scanned: false, verified: false },
  { ticket: '#WT-4843', timestamp: '13:44', station: 'München Depot', material: 'Glass cullet', gross: 3390, tare: 460, net: 2930, scanned: true, verified: true },
  { ticket: '#WT-4842', timestamp: '13:29', station: 'Hamburg Terminal', material: 'Aluminium cans', gross: 967, tare: 148, net: 819, scanned: true, verified: false },
  { ticket: '#WT-4841', timestamp: '13:15', station: 'Berlin HQ', material: 'Mixed plastics', gross: 2231, tare: 398, net: 1833, scanned: true, verified: true },
  { ticket: '#WT-4840', timestamp: '13:02', station: 'München Depot', material: 'Wood pallets', gross: 4105, tare: 720, net: 3385, scanned: true, verified: true },
  { ticket: '#WT-4839', timestamp: '12:48', station: 'Hamburg Terminal', material: 'Copper wire', gross: 612, tare: 96, net: 516, scanned: true, verified: true },
  { ticket: '#WT-4838', timestamp: '12:31', station: 'Berlin HQ', material: 'Textile scraps', gross: 1876, tare: 310, net: 1566, scanned: false, verified: false },
  { ticket: '#WT-4837', timestamp: '12:19', station: 'München Depot', material: 'Cardboard bales', gross: 2043, tare: 385, net: 1658, scanned: true, verified: true },
  { ticket: '#WT-4836', timestamp: '12:04', station: 'Hamburg Terminal', material: 'Mixed plastics', gross: 3187, tare: 421, net: 2766, scanned: true, verified: true },
];

const DISCREPANCIES: Discrepancy[] = [
  { ticket: '#WT-4844', material: 'E-waste (mixed)', declared: 1450, measured: 1083, station: 'Berlin HQ' },
  { ticket: '#WT-4838', material: 'Textile scraps', declared: 1120, measured: 1566, station: 'Berlin HQ' },
  { ticket: '#WT-4829', material: 'Scrap steel', declared: 5200, measured: 4405, station: 'Hamburg Terminal' },
  { ticket: '#WT-4812', material: 'Glass cullet', declared: 2100, measured: 2610, station: 'München Depot' },
];

const SCANNED_BARCODES: ScannedBarcode[] = [
  { code: '4006381333931', timestamp: '14:32:07', product: 'PP container batch — food-grade', category: 'Plastics', matched: true },
  { code: '4008789012457', timestamp: '14:21:44', product: 'Corrugated cardboard, grade 1.04', category: 'Paper/Cardboard', matched: true },
  { code: '4021900556613', timestamp: '14:08:19', product: 'Unrecognised SKU', category: '—', matched: false },
  { code: '4006381889274', timestamp: '13:57:52', product: 'Mixed WEEE, small appliances', category: 'E-waste', matched: true },
  { code: '4029876655012', timestamp: '13:44:03', product: 'Cullet, green mixed', category: 'Glass', matched: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pctDiff(declared: number, measured: number): number {
  return ((measured - declared) / declared) * 100;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeightScanning() {
  const [manualCode, setManualCode] = useState('');
  const [decisions, setDecisions] = useState<Record<string, 'accepted' | 'rejected' | 'flagged'>>({});

  const onlineCount = STATIONS.filter((s) => s.status === 'Online').length;

  function decide(ticket: string, action: 'accepted' | 'rejected' | 'flagged') {
    setDecisions((prev) => ({ ...prev, [ticket]: action }));
  }

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            WEIGHT &amp; SCANNING
          </h1>
          <span className="font-mono text-sm text-text-secondary">
            {onlineCount}/{STATIONS.length} stations online · field intake verification
          </span>
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20">
          <Plus className="h-4 w-4" />
          NEW WEIGHING
        </button>
      </div>

      {/* Station status */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATIONS.map((s) => {
          const online = s.status === 'Online';
          return (
            <div
              key={s.id}
              className={clsx(
                'rounded-lg border p-4 backdrop-blur',
                online ? 'border-border bg-white/[0.03]' : 'border-danger/30 bg-danger/[0.04]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  {s.id}
                </span>
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide',
                    online ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  )}
                >
                  {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {s.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 font-mono text-sm font-semibold text-text-primary">{s.name}</p>
              {s.note && (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-danger">
                  <Wrench className="h-3 w-3" />
                  {s.note}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[10px] text-text-muted">
                <span>Calibrated {formatDate(s.lastCalibrated)}</span>
                <span>Due {formatDate(s.nextCalibrationDue)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intake summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Items weighed" value={INTAKE_SUMMARY.itemsWeighed.toLocaleString()} icon={Scale} tone="accent" />
        <SummaryCard label="Total weight" value={`${INTAKE_SUMMARY.totalWeightT.toFixed(1)} t`} icon={PackageSearch} tone="default" />
        <SummaryCard label="Avg weight" value={`${INTAKE_SUMMARY.avgWeightKg} kg`} icon={Scale} tone="default" />
        <SummaryCard label="Discrepancies flagged" value={String(INTAKE_SUMMARY.discrepancies)} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Recent weighings table */}
        <div className="overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              RECENT WEIGHINGS
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              Showing {WEIGHINGS.length} of {INTAKE_SUMMARY.itemsWeighed.toLocaleString()} today
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Ticket #</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Station</th>
                  <th className="px-4 py-2.5 font-medium">Material</th>
                  <th className="px-4 py-2.5 font-medium text-right">Gross</th>
                  <th className="px-4 py-2.5 font-medium text-right">Tare</th>
                  <th className="px-4 py-2.5 font-medium text-right">Net</th>
                  <th className="px-4 py-2.5 font-medium">Barcode</th>
                  <th className="px-4 py-2.5 font-medium">Verified</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHINGS.map((w) => (
                  <tr
                    key={w.ticket}
                    className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-accent">{w.ticket}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{w.timestamp}</td>
                    <td className="px-4 py-3 text-text-secondary">{w.station}</td>
                    <td className="px-4 py-3 text-text-primary">{w.material}</td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">
                      {w.gross.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-secondary">
                      {w.tare.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-text-primary">
                      {w.net.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {w.scanned ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                          <CheckCircle2 className="h-3 w-3" /> Scanned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted">
                          <XCircle className="h-3 w-3" /> Missing
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {w.verified ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                          <CheckCircle2 className="h-3 w-3" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber">
                          <AlertTriangle className="h-3 w-3" /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discrepancy alerts */}
        <div className="rounded-lg border border-amber/20 bg-white/[0.03] p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              DISCREPANCY ALERTS
            </span>
            <span className="ml-auto rounded-full bg-amber/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber">
              {DISCREPANCIES.length}
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {DISCREPANCIES.map((d) => {
              const diff = pctDiff(d.declared, d.measured);
              const decision = decisions[d.ticket];
              return (
                <div
                  key={d.ticket}
                  className="rounded-md border border-border bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-accent">{d.ticket}</span>
                    <span
                      className={clsx(
                        'font-mono text-[11px] font-semibold',
                        diff > 0 ? 'text-danger' : 'text-amber'
                      )}
                    >
                      {diff > 0 ? '+' : ''}
                      {diff.toFixed(1)}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-text-secondary">
                    {d.material} · {d.station}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-text-muted">
                    <span>
                      Declared <span className="text-text-secondary">{d.declared.toLocaleString()} kg</span>
                    </span>
                    <span>
                      Measured <span className="text-text-secondary">{d.measured.toLocaleString()} kg</span>
                    </span>
                  </div>

                  {decision ? (
                    <div
                      className={clsx(
                        'mt-2 rounded px-2 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wider',
                        decision === 'accepted' && 'bg-success/10 text-success',
                        decision === 'rejected' && 'bg-danger/10 text-danger',
                        decision === 'flagged' && 'bg-amber/10 text-amber'
                      )}
                    >
                      {decision}
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => decide(d.ticket, 'accepted')}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-success/30 bg-success/10 py-1 font-mono text-[10px] font-semibold text-success transition-colors hover:bg-success/20"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Accept
                      </button>
                      <button
                        onClick={() => decide(d.ticket, 'rejected')}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-danger/30 bg-danger/10 py-1 font-mono text-[10px] font-semibold text-danger transition-colors hover:bg-danger/20"
                      >
                        <XCircle className="h-3 w-3" /> Reject
                      </button>
                      <button
                        onClick={() => decide(d.ticket, 'flagged')}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-amber/30 bg-amber/10 py-1 font-mono text-[10px] font-semibold text-amber transition-colors hover:bg-amber/20"
                      >
                        <Flag className="h-3 w-3" /> Flag
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barcode scanner integration */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur xl:col-span-2">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <ScanBarcode className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              LAST SCANNED BARCODES
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Barcode</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                  <th className="px-4 py-2.5 font-medium">Product lookup</th>
                  <th className="px-4 py-2.5 font-medium">Category</th>
                  <th className="px-4 py-2.5 font-medium">Match</th>
                </tr>
              </thead>
              <tbody>
                {SCANNED_BARCODES.map((b) => (
                  <tr key={b.code} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-text-primary">{b.code}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{b.timestamp}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.product}</td>
                    <td className="px-4 py-3 text-text-secondary">{b.category}</td>
                    <td className="px-4 py-3">
                      {b.matched ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success">
                          <CheckCircle2 className="h-3 w-3" /> Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-danger">
                          <XCircle className="h-3 w-3" /> No match
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Manual entry fallback */}
        <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <ScanBarcode className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              MANUAL ENTRY
            </span>
          </div>
          <p className="mb-3 text-[11px] text-text-muted">
            Fallback for damaged or unreadable barcodes. Enter the code manually to continue intake.
          </p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 4006381333931"
              className="w-full rounded-md border border-border bg-white/[0.03] px-3 py-2 font-mono text-xs text-text-primary placeholder:text-text-muted focus:border-accent/40 focus:outline-none"
            />
            <button
              onClick={() => setManualCode('')}
              className="flex items-center justify-center gap-2 rounded-md border border-accent/30 bg-accent/10 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20"
            >
              <ScanBarcode className="h-3.5 w-3.5" />
              SUBMIT CODE
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3 text-[10px] text-text-muted">
            <Clock className="h-3 w-3" />
            Manual entries are timestamped and flagged for supervisor review.
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Scale;
  tone: 'default' | 'accent' | 'amber' | 'success';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-text-primary',
    accent: 'text-accent',
    amber: 'text-amber',
    success: 'text-success',
  };
  const iconBg: Record<string, string> = {
    default: 'bg-white/[0.04]',
    accent: 'bg-accent/10',
    amber: 'bg-amber/10',
    success: 'bg-success/10',
  };

  return (
    <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
        <div className={clsx('flex h-6 w-6 items-center justify-center rounded-md', iconBg[tone])}>
          <Icon className={clsx('h-3.5 w-3.5', toneClass[tone])} />
        </div>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={clsx('font-mono text-xl font-bold', toneClass[tone])}>{value}</p>
      </div>
    </div>
  );
}
