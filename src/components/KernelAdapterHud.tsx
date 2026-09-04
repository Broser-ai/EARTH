import clsx from 'clsx';
import { Brain, Eye, FlaskConical } from 'lucide-react';
import {
  adapterLinkTone,
  type AdapterHudStatus,
  type AdapterId,
  type AdapterLink,
} from '../sovereign/adapters/status.ts';
import { assertNever } from '../sovereign/types.ts';

const ICONS = {
  roboflow: Eye,
  inkling: Brain,
  tinker: FlaskConical,
} as const;

export default function KernelAdapterHud({ adapters }: { adapters: AdapterHudStatus[] }) {
  return (
    <div className="mb-6 rounded-lg border border-white/5 bg-white/[0.03] p-4 backdrop-blur">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[11px] font-semibold tracking-widest text-text-secondary">
          KERNEL ADAPTERS
        </h2>
        <p className="font-mono text-[10px] text-text-muted">Roboflow · Inkling · Tinker</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {adapters.map((adapter) => {
          const Icon = iconFor(adapter.id);
          const tone = adapterLinkTone(adapter.link);
          return (
            <div key={adapter.id} className="rounded-md border border-white/5 bg-space-light/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={clsx('h-3.5 w-3.5', toneClass(tone))} />
                  <span className="font-mono text-xs font-semibold tracking-wide">{adapter.product}</span>
                </div>
                <LinkBadge link={adapter.link} />
              </div>
              <p className="mt-2 font-sans text-[11px] leading-snug text-text-secondary">{adapter.role}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
                <Meta label="Trained" value={adapter.trained ? 'yes' : 'no'} warn={!adapter.trained} />
                <Meta label="Credential" value={adapter.hasCredential ? 'set' : 'none'} />
              </div>
              <p className="mt-2 truncate font-mono text-[9px] text-text-muted" title={adapter.detail}>
                {adapter.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function iconFor(id: AdapterId) {
  switch (id) {
    case 'roboflow':
    case 'inkling':
    case 'tinker':
      return ICONS[id];
    default:
      return assertNever(id, 'unhandled adapter id');
  }
}

function LinkBadge({ link }: { link: AdapterLink }) {
  const tone = adapterLinkTone(link);
  return (
    <span className={clsx('font-mono text-[9px] uppercase tracking-wider', toneClass(tone))}>
      {link}
    </span>
  );
}

function Meta({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={clsx('font-mono text-sm font-semibold', warn ? 'text-amber' : 'text-text-primary')}>
        {value}
      </p>
    </div>
  );
}

function toneClass(tone: ReturnType<typeof adapterLinkTone>): string {
  switch (tone) {
    case 'accent':
      return 'text-accent';
    case 'amber':
      return 'text-amber';
    case 'muted':
      return 'text-text-muted';
    default:
      return assertNever(tone, 'unhandled adapter tone');
  }
}
