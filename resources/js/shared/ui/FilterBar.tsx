import React, { ReactNode } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { ACTIONS } from '../i18n/id';

interface FilterBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  onReset?: () => void;
  onApply?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  showReset?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = `${ACTIONS.search}...`,
  onReset,
  onApply,
  actions,
  children,
  className = '',
  showReset = true,
}) => {
  return (
    <div className={`p-4 rounded-xl border border-border bg-card shadow-sm mb-4 space-y-3 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search bar & Filter controls */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {onSearchChange && (
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          )}

          {children}

          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              {ACTIONS.applyFilter}
            </button>
          )}

          {showReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
              title={ACTIONS.reset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {ACTIONS.reset}
            </button>
          )}
        </div>

        {/* Action buttons (e.g. Export, Import, Tambah) */}
        {actions && (
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
