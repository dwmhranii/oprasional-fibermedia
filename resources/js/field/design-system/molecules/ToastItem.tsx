import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export interface ToastItemProps {
  message: string;
  tone?: 'safe' | 'warning' | 'danger' | 'info';
}

export const ToastItem: React.FC<ToastItemProps> = ({ message, tone = 'info' }) => {
  const iconMap = {
    safe: <CheckCircle2 className="w-4 h-4 text-status-safe-fg shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-status-warning-fg shrink-0" />,
    danger: <AlertTriangle className="w-4 h-4 text-status-danger-fg shrink-0" />,
    info: <Info className="w-4 h-4 text-brand-accent shrink-0" />,
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed top-16 left-4 right-4 z-50 max-w-sm mx-auto"
    >
      <div className="flex items-center gap-2.5 rounded-token-lg bg-surface-card text-content-primary p-3.5 shadow-token-elevated border border-edge-focus text-xs">
        {iconMap[tone]}
        <span className="font-semibold flex-1">{message}</span>
      </div>
    </aside>
  );
};
