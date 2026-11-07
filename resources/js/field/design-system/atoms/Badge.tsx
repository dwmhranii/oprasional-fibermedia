import React from 'react';

export type BadgeTone = 'safe' | 'warning' | 'danger' | 'paused' | 'info' | 'brand';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  mono?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'info',
  size = 'sm',
  icon,
  mono = false,
}) => {
  const toneClasses: Record<BadgeTone, string> = {
    safe: 'bg-status-safe-bg text-status-safe-fg border-status-safe-border',
    warning: 'bg-status-warning-bg text-status-warning-fg border-status-warning-border',
    danger: 'bg-status-danger-bg text-status-danger-fg border-status-danger-border',
    paused: 'bg-status-paused-bg text-status-paused-fg border-status-paused-border',
    info: 'bg-status-info-bg text-status-info-fg border-status-info-border',
    brand: 'bg-brand-primary text-brand-on-primary border-edge-focus',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-token-sm border font-semibold whitespace-nowrap shrink-0 ${sizeClass} ${
        toneClasses[tone]
      } ${mono ? 'font-mono tabular-nums' : ''}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
