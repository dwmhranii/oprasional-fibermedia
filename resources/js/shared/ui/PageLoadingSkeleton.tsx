import React from 'react';

export const PageLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Memuat konten halaman...">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded-md w-48 sm:w-64" />
          <div className="h-4 bg-muted/60 rounded w-64 sm:w-80" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 bg-muted rounded-lg w-28" />
          <div className="h-9 bg-muted rounded-lg w-24" />
        </div>
      </div>

      {/* Stat Cards Skeleton (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border bg-card shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-muted rounded w-24" />
              <div className="w-8 h-8 rounded-lg bg-muted/70" />
            </div>
            <div className="h-7 bg-muted rounded w-16" />
            <div className="h-3 bg-muted/50 rounded w-32" />
          </div>
        ))}
      </div>

      {/* Filter Bar & Content Skeleton */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="h-9 bg-muted rounded-lg w-full sm:w-72" />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="h-9 bg-muted rounded-lg w-24" />
            <div className="h-9 bg-muted rounded-lg w-24" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="h-12 bg-muted/40 rounded-lg flex items-center justify-between px-4 border border-border/50"
            >
              <div className="flex items-center space-x-3 w-1/3">
                <div className="w-6 h-6 rounded-full bg-muted" />
                <div className="h-4 bg-muted rounded w-32" />
              </div>
              <div className="h-4 bg-muted rounded w-24 hidden sm:block" />
              <div className="h-4 bg-muted rounded w-20 hidden md:block" />
              <div className="h-6 bg-muted rounded-full w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageLoadingSkeleton;
