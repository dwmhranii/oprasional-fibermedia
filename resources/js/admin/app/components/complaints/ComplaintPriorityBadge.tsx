import React from 'react';
import { AlertCircle, AlertTriangle, Flame, Info } from 'lucide-react';
import type { ComplaintPriority } from '../../types/complaint';

interface ComplaintPriorityBadgeProps {
  priority: ComplaintPriority;
  className?: string;
  showIcon?: boolean;
}

export const COMPLAINT_PRIORITY_CONFIG: Record<
  ComplaintPriority,
  { label: string; bg: string; text: string; border: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  low: {
    label: 'Rendah (Low)',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    icon: Info,
  },
  medium: {
    label: 'Sedang (Medium)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    icon: AlertCircle,
  },
  high: {
    label: 'Tinggi (High)',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Kritis (Critical)',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-600 animate-ping',
    icon: Flame,
  },
};

export const ComplaintPriorityBadge: React.FC<ComplaintPriorityBadgeProps> = ({
  priority,
  className = '',
  showIcon = true,
}) => {
  const config = COMPLAINT_PRIORITY_CONFIG[priority] || COMPLAINT_PRIORITY_CONFIG.medium;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {priority === 'critical' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`}></span>
      </span>
      {showIcon && <Icon className="w-3 h-3 flex-shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
