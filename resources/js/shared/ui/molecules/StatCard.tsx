import React from 'react';
import { Skeleton, ComponentDensity } from '../atoms';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  tone?: StatTone;
  density?: ComponentDensity;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: IconComponent,
  trend,
  tone = 'default',
  density = 'comfortable',
  isLoading = false,
  className = '',
  onClick,
}) => {
  const toneClasses: Record<StatTone, { border: string; iconBg: string; iconColor: string }> = {
    default: {
      border: 'border-border hover:border-cyan-500/40',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    success: {
      border: 'border-border hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
      border: 'border-border hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    danger: {
      border: 'border-border hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    info: {
      border: 'border-border hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
  };

  const cardPadding = density === 'compact' ? 'p-3' : 'p-4 sm:p-5';

  if (isLoading) {
    return (
      <div className={`rounded-xl bg-card border border-border ${cardPadding} shadow-sm space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="w-24 h-4" />
          <Skeleton variant="circular" className="w-8 h-8" />
        </div>
        <Skeleton variant="text" className="w-32 h-7" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-card border transition-all duration-150 ${cardPadding} shadow-sm ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''
      } ${toneClasses[tone].border} ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
          {title}
        </span>
        {IconComponent && (
          <div className={`p-2 rounded-lg shrink-0 ${toneClasses[tone].iconBg} ${toneClasses[tone].iconColor}`}>
            <IconComponent className="w-4 h-4" strokeWidth={1.75} />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground truncate">{subtext}</p>
      )}
    </div>
  );
};

