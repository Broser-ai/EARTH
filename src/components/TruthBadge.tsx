import clsx from 'clsx';
import { assertNever, type HonestyLabel } from '../contracts';

export type TruthKind = HonestyLabel | 'DEVELOPMENT';

interface TruthBadgeProps {
  kind: TruthKind;
  className?: string;
}

function classesFor(kind: TruthKind): string {
  switch (kind) {
    case 'DEVELOPMENT':
      return 'border-amber/40 text-amber';
    case 'DEMO':
      return 'border-amber/40 text-amber';
    case 'ESTIMATED':
      return 'border-amber/30 text-amber';
    case 'INPUT_UNVERIFIED':
      return 'border-white/15 text-text-secondary';
    case 'NOT_CONFIGURED':
      return 'border-amber/40 text-amber';
    case 'NOT_CONNECTED':
      return 'border-amber/40 text-amber';
    default:
      return assertNever(kind);
  }
}

export default function TruthBadge({ kind, className }: TruthBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider',
        classesFor(kind),
        className,
      )}
    >
      {kind}
    </span>
  );
}
