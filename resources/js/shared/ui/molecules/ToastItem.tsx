import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { IconButton } from '../atoms';

export interface ToastItemProps {
  id: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
  className?: string;
}

export const ToastItem: React.FC<ToastItemProps> = ({
  id,
  type = 'info',
  title,
  message,
  duration = 4000,
  onDismiss,
  className = '',
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  const config = {
    success: {
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
      bg: 'bg-card',
    },
    error: {
      border: 'border-rose-500/30',
      icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
      bg: 'bg-card',
    },
    warning: {
      border: 'border-amber-500/30',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
      bg: 'bg-card',
    },
    info: {
      border: 'border-cyan-500/30',
      icon: <Info className="w-5 h-5 text-cyan-500 shrink-0" />,
      bg: 'bg-card',
    },
  }[type];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${config.border} ${config.bg} shadow-lg backdrop-blur-md max-w-sm w-full transition-all duration-200 animate-in fade-in-0 slide-in-from-top-2 ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <h5 className="text-xs font-semibold text-foreground mb-0.5">{title}</h5>}
        <p className="text-xs text-muted-foreground leading-relaxed break-words">{message}</p>
      </div>
      <IconButton
        icon={<X className="w-3.5 h-3.5" />}
        ariaLabel="Tutup pemberitahuan"
        variant="ghost"
        size="sm"
        density="compact"
        onClick={() => onDismiss(id)}
      />
    </div>
  );
};

