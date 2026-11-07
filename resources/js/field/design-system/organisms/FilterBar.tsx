import React from 'react';
import { SearchBox } from '../molecules/SearchBox';

export interface FilterTabOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  tabs: FilterTabOption[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  rightSlot?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  tabs,
  activeTabId,
  onTabChange,
  rightSlot,
}) => {
  return (
    <div className="rounded-token-lg bg-surface-card border border-edge-subtle p-3 space-y-2.5 shadow-token-card">
      {typeof searchQuery === 'string' && onSearchChange && (
        <SearchBox
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`min-h-touch px-3 py-1.5 rounded-token-md text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-brand-primary text-brand-on-primary shadow-token-card'
                    : 'bg-surface-muted text-content-secondary hover:text-content-primary border border-edge-subtle'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className="ml-1.5 font-mono tabular-nums opacity-85">
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
};
