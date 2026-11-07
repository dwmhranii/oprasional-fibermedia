import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  className = '',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full shrink-0',
    rectangular: 'rounded-lg w-full',
  };

  const style: React.CSSProperties = {
    width,
    height,
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat..."
      style={style}
      className={`animate-pulse bg-muted/60 dark:bg-muted/40 ${variantClasses[variant]} ${className}`}
    />
  );
};

