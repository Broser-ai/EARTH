import {
  CreditCard,
  Download,
  ArrowUpCircle,
  Building2,
  Users,
  Zap,
  HardDrive,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsageMeter {
  id: string;
  label: string;
  used: number;
  limit: number;
  unit: string;
  icon: typeof Building2;
  format: (n: number) => string;
}

interface Invoice {
  id: string;
  period: string;
  issued: string;
  amount: string;
  status: 'Paid' | 'Pending';
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const PLAN_NAME = 'Enterprise';
const PLAN_PRICE = '€42,000';
const RENEWAL_DATE = '1 September 2026';

const USAGE_METERS: UsageMeter[] = [
  {
    id: 'locations',
    label: 'Locations',
    used: 847,
    limit: 1000,
    unit: '',
    icon: Building2,
    format: (n) => n.toLocaleString(),
  },
  {
    id: 'users',
    label: 'Users',
    used: 24,
    limit: 50,
    unit: '',
    icon: Users,
    format: (n) => n.toString(),
  },
  {
    id: 'api-calls',
    label: 'API calls',
    used: 847000,
    limit: 1000000,
    unit: '',
    icon: Zap,
    format: (n) => `${(n / 1000).toFixed(0)}k`,
  },
  {
    id: 'storage',
    label: 'Storage',
    used: 12.4,
    limit: 20,
    unit: 'GB',
    icon: HardDrive,
    format: (n) => `${n.toFixed(1)} GB`,
  },
];

const INVOICES: Invoice[] = [
  { id: 'INV-2026-07', period: 'July 2026', issued: '2026-07-01', amount: '€42,000.00', status: 'Paid' },
  { id: 'INV-2026-06', period: 'June 2026', issued: '2026-06-01', amount: '€42,000.00', status: 'Paid' },
  { id: 'INV-2026-05', period: 'May 2026', issued: '2026-05-01', amount: '€42,000.00', status: 'Paid' },
  { id: 'INV-2026-04', period: 'April 2026', issued: '2026-04-01', amount: '€39,500.00', status: 'Paid' },
  { id: 'INV-2026-03', period: 'March 2026', issued: '2026-03-01', amount: '€39,500.00', status: 'Paid' },
  { id: 'INV-2026-02', period: 'February 2026', issued: '2026-02-01', amount: '€39,500.00', status: 'Paid' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usageTone(used: number, limit: number): { bar: string; text: string } {
  const pct = (used / limit) * 100;
  if (pct >= 90) return { bar: 'bg-danger', text: 'text-danger' };
  if (pct >= 70) return { bar: 'bg-amber', text: 'text-amber' };
  return { bar: 'bg-accent', text: 'text-accent' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BillingSettings() {
  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            BILLING
          </h1>
          <span className="font-mono text-sm text-text-secondary">
            Subscription &amp; usage management
          </span>
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20">
          <ArrowUpCircle className="h-4 w-4" />
          UPGRADE PLAN
        </button>
      </div>

      {/* Current plan card */}
      <div className="mb-6 rounded-lg border border-accent/20 bg-white/[0.03] p-5 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Current plan</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-bold text-accent">{PLAN_NAME}</span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent">
                ACTIVE
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-text-primary">
              {PLAN_PRICE}
              <span className="text-sm font-medium text-text-secondary"> / month</span>
            </p>
            <p className="text-[11px] text-text-muted">Renews {RENEWAL_DATE}</p>
          </div>
        </div>
      </div>

      {/* Usage meters */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {USAGE_METERS.map((meter) => {
          const Icon = meter.icon;
          const tone = usageTone(meter.used, meter.limit);
          const pct = Math.min(100, (meter.used / meter.limit) * 100);
          return (
            <div key={meter.id} className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  <Icon className="h-3 w-3" />
                  {meter.label}
                </span>
                <span className={clsx('font-mono text-[10px] font-semibold', tone.text)}>
                  {pct.toFixed(0)}%
                </span>
              </div>
              <p className="mb-2 font-mono text-sm font-semibold text-text-primary">
                {meter.format(meter.used)} / {meter.format(meter.limit)}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className={clsx('h-full rounded-full', tone.bar)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Invoice history */}
        <div className="overflow-hidden rounded-lg border border-border bg-white/[0.03] backdrop-blur xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              INVOICE HISTORY
            </span>
            <span className="font-mono text-[10px] text-text-muted">Last 6 months</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Invoice</th>
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium">Issued</th>
                  <th className="px-4 py-2.5 font-medium">Amount</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/60 transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-text-secondary">{inv.id}</td>
                    <td className="px-4 py-3 text-text-primary">{inv.period}</td>
                    <td className="px-4 py-3 font-mono text-text-secondary">{inv.issued}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-text-primary">{inv.amount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide',
                          inv.status === 'Paid' ? 'bg-success/10 text-success' : 'bg-amber/10 text-amber'
                        )}
                      >
                        {inv.status === 'Paid' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 font-mono text-[10px] text-text-secondary transition-all hover:bg-white/[0.06]">
                        <Download className="h-3 w-3" />
                        DOWNLOAD
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment method */}
        <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              PAYMENT METHOD
            </span>
          </div>
          <div className="rounded-md border border-border bg-white/[0.02] px-3 py-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold text-text-primary">•••• •••• •••• 4847</span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-text-secondary">
                VISA
              </span>
            </div>
            <p className="mt-1 text-[11px] text-text-muted">Expires 04/29 · Billing contact: finance@hornbach.de</p>
          </div>
          <button className="mt-3 w-full rounded-md border border-border px-3 py-2 font-mono text-[10px] font-semibold tracking-wide text-text-secondary transition-all hover:bg-white/[0.06]">
            UPDATE PAYMENT METHOD
          </button>
        </div>
      </div>
    </div>
  );
}
