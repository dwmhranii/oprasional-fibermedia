import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../atoms/Input';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  density?: 'comfortable' | 'compact';
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  value,
  onChange,
  placeholder = 'Cari ID tiket, nama pelanggan, atau ODP...',
  density = 'comfortable',
}) => {
  return (
    <div className="relative w-full">
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        density={density}
        leftIcon={<Search className="w-4 h-4" />}
        className={value ? 'pr-10' : ''}
      />
      {value && (
        <button
          type="button"
          aria-label="Bersihkan pencarian"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-token-sm text-content-muted hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
