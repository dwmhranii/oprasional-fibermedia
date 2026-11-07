import React from 'react';
import { Skeleton } from '../atoms/Skeleton';

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  tone?: 'default' | 'brand' | 'safe' | 'warning' | 'danger';
  icon?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtitle,
  tone = 'default',
  icon,
  loading = false,
  onClick,
}) => {
  if (loading) {
    return <Skeleton variant="metric" />;
  }

  const valueToneClass = {
    default: 'text-content-primary',
    brand: 'text-brand-accent',
    safe: 'text-status-safe-fg',
    warning: 'text-status-warning-fg',
    danger: 'text-status-danger-fg',
  }[tone];

  return (
    <div
      onClick={onClick}
      className={`rounded-token-lg bg-surface-card border border-edge-subtle p-4 shadow-token-card transition ${
        onClick
          ? 'cursor-pointer hover:border-edge-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-content-secondary">{label}</span>
        {icon && <span className="text-brand-accent shrink-0">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-xl font-extrabold font-mono tabular-nums ${valueToneClass}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-content-muted">{unit}</span>}
      </div>
      {subtitle && <p className="mt-1 text-xs text-content-muted">{subtitle}</p>}
    </div>
  );
};
