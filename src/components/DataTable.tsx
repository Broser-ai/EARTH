import clsx from 'clsx';

export interface DataTableColumn {
  key: string;
  label: string;
  mono?: boolean;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps {
  columns: DataTableColumn[];
  data: Array<Record<string, any>>;
  onRowClick?: (row: any) => void;
}

const alignClass = (align?: 'left' | 'right' | 'center') => {
  switch (align) {
    case 'right':
      return 'text-right';
    case 'center':
      return 'text-center';
    default:
      return 'text-left';
  }
};

export default function DataTable({ columns, data, onRowClick }: DataTableProps) {
  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/[0.06] overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  'px-3 py-2 text-[9px] uppercase tracking-wider text-text-muted font-medium whitespace-nowrap',
                  alignClass(col.align)
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={row.id ?? rowIndex}
              onClick={() => onRowClick?.(row)}
              className={clsx(
                'border-b border-white/[0.06] last:border-b-0 transition-colors',
                'hover:bg-white/[0.02]',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    'px-3 py-2 text-[11px] text-text-primary whitespace-nowrap',
                    alignClass(col.align),
                    col.mono && 'font-mono'
                  )}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-[11px] text-text-muted"
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
