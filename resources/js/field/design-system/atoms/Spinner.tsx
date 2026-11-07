import React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label = 'Memuat...' }) => {
  const sizeClass =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 className={`${sizeClass} animate-spin text-brand-accent shrink-0`} />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
};
