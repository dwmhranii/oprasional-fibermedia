import React from 'react';
import { Search, X } from 'lucide-react';
import { ComponentDensity } from '../atoms';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  density?: ComponentDensity;
  onClear?: () => void;
  onSubmit?: () => void;
  className?: string;
  autoFocus?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Cari data...',
  density = 'comfortable',
  onClear,
  onSubmit,
  className = '',
  autoFocus = false,
}) => {
  const densityClasses: Record<ComponentDensity, string> = {
    compact: 'h-8 text-xs pl-8 pr-7',
    comfortable: 'min-h-12 text-sm pl-10 pr-9', // 48px touch target
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
        <Search className={density === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full rounded-lg bg-card border border-border text-foreground transition-all duration-150 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:focus:ring-cyan-400 ${densityClasses[density]}`}
      />
      {value && (
        <button
          type="button"
          aria-label="Bersihkan pencarian"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          className="absolute right-2.5 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className={density === 'compact' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </div>
  );
};

