import React from 'react';

export interface SkeletonProps {
  lines?: number;
  variant?: 'row' | 'card' | 'metric';
}

export const Skeleton: React.FC<SkeletonProps> = ({ lines = 1, variant = 'row' }) => {
  if (variant === 'metric') {
    return (
      <div
        role="status"
        aria-label="Memuat metrik"
        className="rounded-token-lg bg-surface-card border border-edge-subtle p-4 space-y-2 animate-pulse"
      >
        <div className="h-3 w-1/2 rounded-token-sm bg-surface-muted" />
        <div className="h-6 w-2/3 rounded-token-sm bg-surface-muted" />
      </div>
    );
  }

  return (
    <div role="status" aria-label="Memuat data" className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full rounded-token-md bg-surface-muted ${
            variant === 'card' ? 'h-20' : 'h-10'
          }`}
        />
      ))}
    </div>
  );
};
