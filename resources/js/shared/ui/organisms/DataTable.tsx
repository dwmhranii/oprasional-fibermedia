import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ComponentDensity, Skeleton, IconButton } from '../atoms';
import { EmptyState } from '../molecules';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  density?: ComponentDensity;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  density = 'compact',
  isLoading = false,
  emptyTitle = 'Data Belum Tersedia',
  emptyDescription = 'Tidak ada baris data yang cocok dengan kriteria tampilan.',
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 10,
  onPageChange,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  className = '',
}: DataTableProps<T>) {
  const [localSortCol, setLocalSortCol] = useState<string | undefined>(sortColumn);
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>(sortDirection);

  const handleSort = (key: string) => {
    let nextDir: 'asc' | 'desc' = 'asc';
    if (localSortCol === key) {
      nextDir = localSortDir === 'asc' ? 'desc' : 'asc';
    }
    setLocalSortCol(key);
    setLocalSortDir(nextDir);
    if (onSort) onSort(key, nextDir);
  };

  const cellPadding = density === 'compact' ? 'py-2 px-3 text-xs' : 'py-3.5 px-4 text-sm';
  const headerPadding = density === 'compact' ? 'py-2.5 px-3 text-xs' : 'py-3 px-4 text-xs';

  return (
    <div className={`w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 select-none">
              {columns.map((col) => {
                const isSorted = localSortCol === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    className={`${headerPadding} font-semibold uppercase tracking-wider text-muted-foreground ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.sortable ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-muted-foreground/60 shrink-0">
                          {isSorted ? (
                            localSortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-primary" />
                            )
                          ) : (
                            <div className="w-3.5 h-3.5 flex flex-col items-center justify-center opacity-40">
                              <ChevronUp className="w-2.5 h-2.5 -mb-1" />
                              <ChevronDown className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: pageSize > 6 ? 6 : pageSize }).map((_, rIdx) => (
                <tr key={`skel-row-${rIdx}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={`skel-cell-${col.key}`} className={cellPadding}>
                      <Skeleton variant="text" className="h-4 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const rowKey = keyExtractor(row, rIdx);
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-muted/40 transition-colors duration-100"
                  >
                    {columns.map((col) => {
                      const cellValue = col.render
                        ? col.render(row, rIdx)
                        : (row as any)[col.key] ?? '-';
                      return (
                        <td
                          key={`${rowKey}-${col.key}`}
                          className={`${cellPadding} text-foreground ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {cellValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            {totalItems !== undefined ? (
              <span>
                Menampilkan{' '}
                <strong className="text-foreground font-mono">
                  {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, totalItems)}
                </strong>{' '}
                dari <strong className="text-foreground font-mono">{totalItems}</strong> data
              </span>
            ) : (
              <span>
                Halaman <strong className="text-foreground font-mono">{currentPage}</strong> dari{' '}
                <strong className="text-foreground font-mono">{totalPages}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <IconButton
              icon={<ChevronLeft className="w-4 h-4" />}
              ariaLabel="Halaman sebelumnya"
              variant="outline"
              size="sm"
              density="compact"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(currentPage - 1)}
            />
            <span className="px-2 text-xs font-mono font-medium text-foreground">
              {currentPage} / {totalPages}
            </span>
            <IconButton
              icon={<ChevronRight className="w-4 h-4" />}
              ariaLabel="Halaman berikutnya"
              variant="outline"
              size="sm"
              density="compact"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(currentPage + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

