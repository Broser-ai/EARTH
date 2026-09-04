import { useState } from 'react';
import {
  Database,
  Cloud,
  Building2,
  FileSpreadsheet,
  Boxes,
  MessageSquare,
  CheckCircle2,
  Plug,
  KeyRound,
  Copy,
  Webhook,
  RefreshCw,
  Clock,
} from 'lucide-react';
import TruthBadge from '../components/TruthBadge';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: typeof Database;
  connected: boolean;
  demo: boolean;
  detail: string;
  meta?: string;
}

interface ApiKey {
  id: string;
  label: string;
  masked: string;
  created: string;
  lastUsed: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const INTEGRATIONS: Integration[] = [
  {
    id: 'sap',
    name: 'SAP S/4HANA',
    description: 'ERP core — material movements & finance postings',
    icon: Database,
    connected: false,
    demo: true,
    detail: 'DEMO catalog — not connected',
  },
  {
    id: 'netsuite',
    name: 'Oracle NetSuite',
    description: 'Order management & inventory sync',
    icon: Cloud,
    connected: false,
    demo: true,
    detail: 'DEMO catalog — not connected',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM sync for take-back program leads',
    icon: Building2,
    connected: false,
    demo: true,
    detail: 'DEMO catalog — not connected',
  },
  {
    id: 'datev',
    name: 'DATEV',
    description: 'Financial reporting & tax export',
    icon: FileSpreadsheet,
    connected: false,
    demo: true,
    detail: 'DEMO catalog — not connected',
  },
  {
    id: 'm365',
    name: 'Microsoft 365',
    description: 'Single sign-on & directory sync',
    icon: Boxes,
    connected: false,
    demo: true,
    detail: 'DEMO catalog — not connected',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Operational alerts & maintenance notices',
    icon: MessageSquare,
    connected: false,
    demo: true,
    detail: 'DEMO catalog — not connected',
  },
];

const API_KEYS: ApiKey[] = [
  { id: 'key-prod', label: 'DEMO API key (placeholder)', masked: 'sk_demo_••••••••••••xxxx', created: '—', lastUsed: 'never' },
  { id: 'key-sandbox', label: 'DEMO sandbox key (placeholder)', masked: 'sk_demo_••••••••••••xxxx', created: '—', lastUsed: 'never' },
  { id: 'key-webhook', label: 'DEMO webhook secret (placeholder)', masked: 'whsec_••••••••••••xxxx', created: '—', lastUsed: 'never' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function IntegrationsSettings() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const connectedCount = INTEGRATIONS.filter((i) => i.connected).length;

  function handleCopy(id: string) {
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  }

  return (
    <div className="min-h-screen w-full bg-space px-6 py-6 text-text-primary">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-lg font-bold tracking-widest text-text-primary">
            INTEGRATIONS
          </h1>
          <span className="font-mono text-sm text-text-secondary">
            {connectedCount} of {INTEGRATIONS.length} systems connected
          </span>
          <TruthBadge kind="DEMO" />
        </div>

        <button className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-accent transition-all hover:bg-accent/20">
          <Plug className="h-4 w-4" />
          BROWSE CONNECTORS
        </button>
      </div>

      {/* Connected systems grid */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          return (
            <div
              key={integration.id}
              className={clsx(
                'rounded-lg border p-4 backdrop-blur',
                integration.connected ? 'border-border bg-white/[0.03]' : 'border-dashed border-border bg-white/[0.015]'
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-md',
                      integration.connected ? 'bg-accent/10' : 'bg-white/[0.05]'
                    )}
                  >
                    <Icon className={clsx('h-4 w-4', integration.connected ? 'text-accent' : 'text-text-muted')} />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-semibold text-text-primary">{integration.name}</p>
                    <p className="text-[10px] text-text-muted">{integration.description}</p>
                  </div>
                </div>
              </div>

              {integration.connected ? (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-success">
                    <CheckCircle2 className="h-3 w-3" />
                    CONNECTED
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] text-text-secondary">{integration.detail}</p>
                    {integration.meta && (
                      <p className="font-mono text-[10px] text-text-muted">{integration.meta}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber">
                    DEMO — NOT CONNECTED
                  </span>
                  <p className="text-[10px] text-text-muted">{integration.detail}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* API keys */}
        <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              API KEYS
            </span>
            <TruthBadge kind="DEMO" className="ml-1" />
          </div>
          <div className="flex flex-col gap-2.5">
            {API_KEYS.map((key) => (
              <div key={key.id} className="rounded-md border border-border bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">{key.label}</span>
                  <button
                    onClick={() => handleCopy(key.id)}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] text-text-secondary transition-all hover:bg-white/[0.06]"
                  >
                    <Copy className="h-3 w-3" />
                    {copiedId === key.id ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <p className="mt-1 font-mono text-[11px] text-text-muted">{key.masked}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-text-muted">
                  <span>Created {key.created}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Last used {key.lastUsed}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook configuration */}
        <div className="rounded-lg border border-border bg-white/[0.03] p-4 backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <Webhook className="h-3.5 w-3.5 text-accent" />
            <span className="font-mono text-[11px] font-semibold tracking-wider text-text-primary">
              WEBHOOK CONFIGURATION
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
                Endpoint URL
              </label>
              <input
                type="text"
                readOnly
                value="https://example.invalid/demo/webhooks (not a live endpoint)"
                className="w-full rounded-md border border-border bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-text-secondary focus:border-accent/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
                Subscribed events
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['container.threshold', 'pickup.completed', 'invoice.generated', 'sync.failed'].map((evt) => (
                  <span
                    key={evt}
                    className="rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] text-text-secondary"
                  >
                    {evt}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-white/[0.02] px-3 py-2.5">
              <span className="flex items-center gap-2 text-[11px] text-text-secondary">
                <RefreshCw className="h-3 w-3 text-amber" />
                Delivery status: DEMO — no webhook listener
              </span>
              <button className="rounded-md border border-border px-2.5 py-1 font-mono text-[10px] text-text-secondary transition-all hover:bg-white/[0.06]">
                SEND TEST
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
