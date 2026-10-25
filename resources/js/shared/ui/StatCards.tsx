import React, { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { SemanticVariant, TOKENS } from '../tokens';

export interface StatItem {
  id?: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: SemanticVariant;
  trend?: {
    value: string | number;
    isUp: boolean;
    label?: string;
  };
  onClick?: () => void;
}

interface StatCardsProps {
  items: StatItem[];
  columns?: 2 | 3 | 4;
  isLoading?: boolean;
  className?: string;
}

export const StatCards: React.FC<StatCardsProps> = ({
  items,
  columns = 4,
  isLoading = false,
  className = '',
}) => {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns];

  if (isLoading) {
    return (
      <div className={`grid ${colClass} gap-4 mb-6 ${className}`}>
        {[...Array(columns)].map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl border border-border bg-card animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-8 w-8 bg-muted rounded-lg" />
            </div>
            <div className="h-7 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`grid ${colClass} gap-4 mb-6 ${className}`}>
      {items.map((item, idx) => {
        const variant = item.variant || 'neutral';
        const styles = TOKENS.semantic[variant];
        const Icon = item.icon;

        return (
          <div
            key={item.id || idx}
            onClick={item.onClick}
            className={`p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all ${
              item.onClick ? 'cursor-pointer hover:border-primary/50' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground line-clamp-1">
                {item.title}
              </span>
              {Icon && (
                <div className={`p-2 rounded-lg border ${styles.bg} ${styles.border} ${styles.text}`}>
                  <Icon className="w-4 h-4" />
                </div>
              )}
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <div className="text-2xl font-bold tracking-tight text-foreground truncate">
                {item.value}
              </div>
              {item.trend && (
                <div
                  className={`flex items-center text-xs font-medium ${
                    item.trend.isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {item.trend.isUp ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  <span>{item.trend.value}</span>
                </div>
              )}
            </div>

            {item.subtitle && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                {item.subtitle}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatCards;
