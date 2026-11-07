import React from 'react';
import { getStatusSemanticVariant, TOKENS } from '../tokens';
import { STATUS_LABELS } from '../i18n/id';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Clock, 
  Activity, 
  HelpCircle,
  ShieldAlert,
  MapPin,
  RefreshCw,
  LucideIcon
} from 'lucide-react';

export type StatusCategory = 
  | 'customer' 
  | 'network' 
  | 'ticket' 
  | 'review' 
  | 'geofence' 
  | 'attendance' 
  | 'provisioning' 
  | 'submission' 
  | 'priority' 
  | 'general';

interface StatusBadgeProps {
  status: string | null | undefined;
  type?: StatusCategory;
  label?: string; // Optional custom label override
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

function getIconForStatus(status: string | null | undefined): LucideIcon {
  if (!status) return HelpCircle;
  const s = status.toLowerCase();

  if (['active', 'normal', 'resolved', 'completed', 'approved', 'hadir', 'inside', 'success', 'online'].includes(s)) {
    return CheckCircle2;
  }
  if (['pending', 'unassigned', 'assigned', 'phase_1_completed', 'phase_1_submitted', 'need_info', 'ready'].includes(s)) {
    return Clock;
  }
  if (['in_progress', 'on_the_way', 'processing'].includes(s)) {
    return Activity;
  }
  if (['rework', 'low_accuracy', 'warning'].includes(s)) {
    return RefreshCw;
  }
  if (['suspended', 'terminated', 'cut', 'disrupted', 'rejected', 'failed', 'cancelled', 'outside', 'alpa'].includes(s)) {
    return XCircle;
  }
  if (['flagged', 'critical'].includes(s)) {
    return ShieldAlert;
  }
  if (['geofence'].includes(s)) {
    return MapPin;
  }

  return AlertCircle;
}

export function getLabelForStatus(status: string | null | undefined, type: StatusCategory = 'general'): string {
  if (!status) return '-';
  const s = status.toLowerCase();

  if (type !== 'general' && STATUS_LABELS[type]) {
    const dict = STATUS_LABELS[type] as Record<string, string>;
    if (dict[s]) return dict[s];
  }

  // Fallback search across all status dictionaries
  for (const cat of Object.values(STATUS_LABELS)) {
    const dict = cat as Record<string, string>;
    if (dict[s]) return dict[s];
  }

  // Capitalize raw status if not found in dictionary
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'general',
  label,
  showIcon = true,
  className = '',
  size = 'md',
}) => {
  if (!status) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const variant = getStatusSemanticVariant(status);
  const colorStyles = (variant && variant in TOKENS.semantic) ? TOKENS.semantic[variant] : TOKENS.semantic.neutral;
  const displayLabel = label || getLabelForStatus(status, type);
  const Icon = getIconForStatus(status);

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5 gap-1' 
    : 'text-xs px-2.5 py-1 gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${colorStyles.badge} ${sizeClasses} ${className}`}
      title={displayLabel}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
