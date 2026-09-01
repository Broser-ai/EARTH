import clsx from 'clsx';

export type StatusBadgeVariant =
  | 'green'
  | 'amber'
  | 'red'
  | 'blue'
  | 'purple'
  | 'teal'
  | 'pink'
  | 'gray';

export interface StatusBadgeProps {
  status: string;
  variant?: StatusBadgeVariant;
}

const GREEN_STATUSES = ['active', 'completed', 'verified', 'success', 'healthy', 'online', 'approved'];
const AMBER_STATUSES = ['pending', 'scheduled', 'partial', 'warning', 'review', 'draft'];
const RED_STATUSES = ['overdue', 'missing', 'failed', 'error', 'critical', 'rejected', 'offline'];
const BLUE_STATUSES = ['in transit', 'processing', 'in progress', 'running', 'syncing'];

function inferVariant(status: string): StatusBadgeVariant {
  const normalized = status.trim().toLowerCase();

  if (GREEN_STATUSES.some((s) => normalized.includes(s))) return 'green';
  if (AMBER_STATUSES.some((s) => normalized.includes(s))) return 'amber';
  if (RED_STATUSES.some((s) => normalized.includes(s))) return 'red';
  if (BLUE_STATUSES.some((s) => normalized.includes(s))) return 'blue';

  return 'gray';
}

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  green: 'bg-success/15 text-success',
  amber: 'bg-amber/15 text-amber',
  red: 'bg-danger/15 text-danger',
  blue: 'bg-accent/15 text-accent',
  purple: 'bg-purple-400/15 text-purple-300',
  teal: 'bg-teal-400/15 text-teal-300',
  pink: 'bg-pink-400/15 text-pink-300',
  gray: 'bg-white/[0.08] text-text-secondary',
};

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolvedVariant = variant ?? inferVariant(status);

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide whitespace-nowrap',
        VARIANT_CLASSES[resolvedVariant]
      )}
    >
      {status}
    </span>
  );
}
