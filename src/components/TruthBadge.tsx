import clsx from 'clsx';

export type TruthKind = 'DEVELOPMENT' | 'DEMO' | 'ESTIMATED' | 'INPUT_UNVERIFIED';

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
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
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
