export interface PageHeaderAction {
  label: string;
  onClick: () => void;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  primaryAction?: PageHeaderAction;
  secondaryAction?: PageHeaderAction;
}

export default function PageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-[16px] font-medium text-text-primary">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[11px] text-text-secondary">{subtitle}</p>}
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2 shrink-0">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-text-secondary border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-space bg-accent hover:bg-accent-dim transition-colors"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
