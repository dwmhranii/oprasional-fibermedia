import React from 'react';
import { Badge, BadgeTone, BadgeSize, Tooltip } from '../atoms';
import { Clock, AlertTriangle, AlertCircle, PauseCircle, CheckCircle2 } from 'lucide-react';

export type SlaStatus = 'safe' | 'warning' | 'breached' | 'paused';

export interface SlaBadgeProps {
  status: SlaStatus;
  timeText: string;
  size?: BadgeSize;
  pauseReason?: string;
  className?: string;
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  status,
  timeText,
  size = 'md',
  pauseReason,
  className = '',
}) => {
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const config: Record<
    SlaStatus,
    { tone: BadgeTone; labelPrefix: string; icon: React.ReactNode }
  > = {
    safe: {
      tone: 'success',
      labelPrefix: 'SLA Aman',
      icon: <CheckCircle2 className={iconSizeClass} />,
    },
    warning: {
      tone: 'warning',
      labelPrefix: 'Mendekati Batas',
      icon: <Clock className={iconSizeClass} />,
    },
    breached: {
      tone: 'danger',
      labelPrefix: 'Lewat Batas',
      icon: <AlertCircle className={iconSizeClass} />,
    },
    paused: {
      tone: 'neutral',
      labelPrefix: 'SLA Dijeda',
      icon: <PauseCircle className={iconSizeClass} />,
    },
  };

  const current = config[status];

  const badgeElement = (
    <Badge
      tone={current.tone}
      size={size}
      icon={current.icon}
      className={`font-mono font-medium tracking-tight ${className}`}
    >
      <span className="font-sans font-normal text-[11px] mr-1 opacity-80">
        {current.labelPrefix}:
      </span>
      <span>{timeText}</span>
    </Badge>
  );

  if (status === 'paused' && pauseReason) {
    return <Tooltip content={`Alasan Jeda: ${pauseReason}`}>{badgeElement}</Tooltip>;
  }

  return badgeElement;
};

