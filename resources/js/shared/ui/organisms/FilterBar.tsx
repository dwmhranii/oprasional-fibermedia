import React from 'react';
import { SearchBox } from '../molecules';
import { Select, Button, ComponentDensity } from '../atoms';
import { RotateCcw } from 'lucide-react';
import { ACTIONS } from '../../i18n/id';

export interface FilterItem {
  id: string;
  label?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  placeholder?: string;
}

export interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterItem[];
  onReset?: () => void;
  actions?: React.ReactNode;
  density?: ComponentDensity;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  filters = [],
  onReset,
  actions,
  density = 'compact',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs ${className}`}
    >
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="w-full sm:max-w-xs">
          <SearchBox
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            density={density}
          />
        </div>

        {filters.map((filter) => (
          <div key={filter.id} className="w-full sm:w-44">
            <Select
              options={filter.options}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              placeholder={filter.placeholder}
              density={density}
            />
          </div>
        ))}

        {onReset && (searchQuery || filters.some((f) => f.value !== '' && f.value !== 'all')) && (
          <Button
            variant="ghost"
            size="sm"
            density={density}
            onClick={onReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {ACTIONS.reset}
          </Button>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

