import React from 'react';
import { Badge, BadgeTone, BadgeSize } from '../atoms';
import { STATUS_LABELS } from '../../i18n/id';
import { CheckCircle2, Clock, XCircle, PauseCircle, Wrench, ArrowRightCircle, ShieldAlert, Activity, HelpCircle } from 'lucide-react';

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

export interface StatusBadgeProps {
  status: string | null | undefined;
  category?: StatusCategory;
  type?: StatusCategory; // alias for category
  label?: string; // alias for labelOverride
  labelOverride?: string;
  showIcon?: boolean;
  size?: BadgeSize;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  category,
  type = 'ticket',
  label,
  labelOverride,
  showIcon = true,
  size = 'md',
  className = '',
}) => {
  const activeCategory = category || type || 'ticket';
  const normStatus = (status || '').toLowerCase().trim();

  // Resolve human label in Indonesian
  let resolvedLabel = label || labelOverride;
  if (!resolvedLabel) {
    if (activeCategory === 'customer' && (STATUS_LABELS.customer as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.customer as any)[normStatus];
    } else if (activeCategory === 'ticket' && (STATUS_LABELS.ticket as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.ticket as any)[normStatus];
    } else if (activeCategory === 'attendance' && (STATUS_LABELS.attendance as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.attendance as any)[normStatus];
    } else if (activeCategory === 'priority' && (STATUS_LABELS.priority as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.priority as any)[normStatus];
    } else if (activeCategory === 'network' && (STATUS_LABELS.network as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.network as any)[normStatus];
    } else if (activeCategory === 'review' && (STATUS_LABELS.review as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.review as any)[normStatus];
    } else if (activeCategory === 'geofence' && (STATUS_LABELS.geofence as any)[normStatus]) {
      resolvedLabel = (STATUS_LABELS.geofence as any)[normStatus];
    } else {
      resolvedLabel = status || '-';
    }
  }

  // Determine tone & icon
  let tone: BadgeTone = 'neutral';
  let iconNode: React.ReactNode = null;
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (['active', 'resolved', 'completed', 'normal', 'hadir', 'inside', 'success', 'approved', 'online'].includes(normStatus)) {
    tone = 'success';
    iconNode = <CheckCircle2 className={iconSizeClass} />;
  } else if (['pending', 'unassigned', 'assigned', 'phase_1_completed', 'phase_1_submitted', 'need_info', 'ready', 'izin', 'warning'].includes(normStatus)) {
    tone = 'warning';
    iconNode = <Clock className={iconSizeClass} />;
  } else if (['suspended', 'terminated', 'cut', 'disrupted', 'rejected', 'failed', 'cancelled', 'outside', 'alpa', 'critical', 'high', 'danger'].includes(normStatus)) {
    tone = 'danger';
    iconNode = <XCircle className={iconSizeClass} />;
  } else if (['in_progress', 'on_the_way', 'processing'].includes(normStatus)) {
    tone = 'info';
    iconNode = normStatus === 'on_the_way' ? <ArrowRightCircle className={iconSizeClass} /> : <Wrench className={iconSizeClass} />;
  } else if (['paused', 'dijeda', 'sakit'].includes(normStatus)) {
    tone = 'neutral';
    iconNode = <PauseCircle className={iconSizeClass} />;
  }

  return (
    <Badge
      tone={tone}
      size={size}
      dot={!showIcon}
      icon={showIcon ? iconNode : undefined}
      className={className}
    >
      {resolvedLabel}
    </Badge>
  );
};
