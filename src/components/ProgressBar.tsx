import clsx from 'clsx';

export interface ProgressBarProps {
  value: number;
  color?: string;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ value, color = '#60A5FA', size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={clsx(
        'w-full rounded-full overflow-hidden bg-white/[0.06]',
        size === 'sm' ? 'h-1' : 'h-1.5'
      )}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
