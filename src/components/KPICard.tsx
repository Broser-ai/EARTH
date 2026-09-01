import clsx from 'clsx';

export type KPIDeltaColor = 'green' | 'amber' | 'red' | 'muted';

export interface KPICardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: KPIDeltaColor;
}

const DELTA_COLOR_CLASSES: Record<KPIDeltaColor, string> = {
  green: 'text-success',
  amber: 'text-amber',
  red: 'text-danger',
  muted: 'text-text-muted',
};

export default function KPICard({ label, value, delta, deltaColor = 'muted' }: KPICardProps) {
  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/[0.06] p-3">
      <div className="text-[9px] uppercase tracking-wider text-text-muted font-medium">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-mono text-text-primary leading-tight">
        {value}
      </div>
      {delta && (
        <div className={clsx('mt-1 text-[9px]', DELTA_COLOR_CLASSES[deltaColor])}>
          {delta}
        </div>
      )}
    </div>
  );
}
