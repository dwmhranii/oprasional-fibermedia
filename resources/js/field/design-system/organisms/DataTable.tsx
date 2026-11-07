import React from 'react';
import { EmptyState } from '../molecules/EmptyState';
import { Skeleton } from '../atoms/Skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  density?: 'comfortable' | 'compact';
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  density = 'comfortable',
  loading = false,
  emptyTitle = 'Belum Ada Data',
  emptyDescription = 'Data yang Anda cari belum tersedia.',
}: DataTableProps<T>) {
  if (loading) {
    return <Skeleton lines={4} variant="row" />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const cellPad = density === 'compact' ? 'px-3 py-2 text-xs' : 'px-3.5 py-3 text-xs';

  return (
    <div className="w-full overflow-x-auto rounded-token-lg border border-edge-subtle bg-surface-card shadow-token-card">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-muted border-b border-edge-subtle text-content-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`${cellPad} font-bold whitespace-nowrap ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge-subtle">
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className="hover:bg-surface-elevated transition duration-150"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${cellPad} text-content-primary ${
                    col.mono ? 'font-mono tabular-nums' : ''
                  } ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
