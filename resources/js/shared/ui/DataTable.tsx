import React, { useState, ReactNode } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  RotateCcw, 
  AlertCircle 
} from 'lucide-react';
import { ACTIONS, MESSAGES } from '../i18n/id';
import { EmptyState } from './EmptyState';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  defaultVisible?: boolean;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  error?: string | null;
  onReload?: () => void;
  pagination?: PaginationState;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  enableColumnPicker?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  error = null,
  onReload,
  pagination,
  sortColumn,
  sortDirection,
  onSort,
  enableColumnPicker = true,
  emptyTitle = MESSAGES.emptyData,
  emptyDescription,
  className = '',
}: DataTableProps<T>) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    columns.forEach((c) => {
      initial[c.key] = c.defaultVisible !== false;
    });
    return initial;
  });

  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const activeColumns = columns.filter((c) => visibleColumns[c.key] !== false);

  // Error State
  if (error) {
    return (
      <div className="p-8 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h4 className="text-base font-semibold text-rose-900 dark:text-rose-200">
          Terjadi Gangguan Saat Memuat Data
        </h4>
        <p className="text-sm text-rose-700 dark:text-rose-400 max-w-md mx-auto">
          {error}
        </p>
        {onReload && (
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center px-3.5 py-2 text-sm font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm focus:outline-none"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {ACTIONS.reload}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Table Toolbar (Column Picker) */}
      {enableColumnPicker && (
        <div className="flex justify-end relative">
          <button
            type="button"
            onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            Pilih Kolom ({activeColumns.length}/{columns.length})
          </button>

          {isColumnPickerOpen && (
            <div className="absolute right-0 top-9 z-20 w-56 p-2 rounded-xl border border-border bg-card shadow-lg animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
                Tampilkan Kolom
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 p-1">
                {columns.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center px-2 py-1.5 text-xs rounded-md hover:bg-muted cursor-pointer text-foreground select-none"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[c.key] !== false}
                      onChange={() => toggleColumn(c.key)}
                      disabled={visibleColumns[c.key] && activeColumns.length <= 1}
                      className="mr-2 rounded border-border text-primary focus:ring-primary/20"
                    />
                    <span className="truncate">{c.header}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Table Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {activeColumns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => col.sortable && onSort?.(col.key)}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.sortable ? 'cursor-pointer select-none hover:text-foreground' : ''} ${col.className || ''}`}
                    >
                      <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-muted-foreground/60">
                            {isSorted ? (
                              sortDirection === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-primary" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-primary" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                // Loading Skeleton Rows
                [...Array(5)].map((_, rIdx) => (
                  <tr key={rIdx} className="animate-pulse">
                    {activeColumns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty State inside table
                <tr>
                  <td colSpan={activeColumns.length} className="px-4 py-12">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                    />
                  </td>
                </tr>
              ) : (
                // Data Rows
                data.map((row, rIdx) => (
                  <tr
                    key={keyExtractor(row, rIdx)}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {activeColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-foreground ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.render
                          ? col.render(row, rIdx)
                          : (row as any)[col.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Menampilkan{' '}
              <span className="font-semibold text-foreground">
                {Math.min((pagination.currentPage - 1) * pagination.perPage + 1, pagination.totalItems)}
              </span>
              -
              <span className="font-semibold text-foreground">
                {Math.min(pagination.currentPage * pagination.perPage, pagination.totalItems)}
              </span>{' '}
              dari <span className="font-semibold text-foreground">{pagination.totalItems}</span> data
            </div>

            <div className="flex items-center space-x-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 py-1 font-medium text-foreground">
                {pagination.currentPage} / {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages || isLoading}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
