import React from 'react';
import { ShieldCheck, Clock, AlertOctagon, PauseCircle } from 'lucide-react';
import { Badge, BadgeTone } from '../atoms/Badge';

export type SlaState = 'safe' | 'warning' | 'overdue' | 'paused';

export interface SlaBadgeProps {
  state: SlaState;
  remainingText: string;
  size?: 'sm' | 'md';
}

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  state,
  remainingText,
  size = 'sm',
}) => {
  const config: Record<
    SlaState,
    { prefix: string; tone: BadgeTone; icon: React.ReactNode }
  > = {
    safe: {
      prefix: 'SLA Aman',
      tone: 'safe',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    warning: {
      prefix: 'SLA Hampir Lewat',
      tone: 'warning',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    overdue: {
      prefix: 'SLA Lewat Batas',
      tone: 'danger',
      icon: <AlertOctagon className="w-3.5 h-3.5" />,
    },
    paused: {
      prefix: 'SLA Dijeda',
      tone: 'paused',
      icon: <PauseCircle className="w-3.5 h-3.5" />,
    },
  };

  const current = config[state];

  return (
    <Badge tone={current.tone} size={size} icon={current.icon} mono>
      {current.prefix}: {remainingText}
    </Badge>
  );
};
