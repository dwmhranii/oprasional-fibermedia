import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  change,
  trend,
  icon: Icon,
  color = '#667eea',
}) => {
  const getTrendColor = () => {
    if (trend === 'up') return '#10b981';
    if (trend === 'down') return '#ef4444';
    return '#6b7280';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm mb-1" style={{ color: '#6b7280' }}>
              {label}
            </p>
            <h3 className="text-3xl mb-2" style={{ color: '#1f2937' }}>
              {value}
            </h3>
            {change && (
              <div className="flex items-center space-x-1">
                {trend === 'up' && <TrendingUp className="w-4 h-4" style={{ color: getTrendColor() }} />}
                {trend === 'down' && <TrendingDown className="w-4 h-4" style={{ color: getTrendColor() }} />}
                <span className="text-sm" style={{ color: getTrendColor() }}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
