import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ComponentDensity = 'comfortable' | 'compact';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  density?: ComponentDensity;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  density = 'comfortable',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  ...rest
}) => {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-brand-primary text-brand-on-primary hover:opacity-95 shadow-token-card border border-edge-focus',
    secondary:
      'bg-surface-elevated text-content-primary hover:bg-surface-muted border border-edge-subtle',
    outline:
      'bg-transparent text-content-primary hover:bg-surface-muted border border-edge-strong',
    ghost:
      'bg-transparent text-content-secondary hover:bg-surface-muted hover:text-content-primary border border-transparent',
    danger:
      'bg-status-danger-bg text-status-danger-fg hover:opacity-90 border border-status-danger-border',
  };

  // PWA comfortable enforces min-h-touch (48px)
  const sizeClasses: Record<ButtonSize, string> = {
    sm: density === 'comfortable' ? 'min-h-touch px-3.5 py-2 text-xs' : 'h-9 px-3 py-1.5 text-xs',
    md: density === 'comfortable' ? 'min-h-touch px-4 py-2.5 text-sm' : 'h-10 px-4 py-2 text-xs',
    lg: 'min-h-touch px-5 py-3 text-sm',
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-token-md font-bold transition duration-150 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span>{children}</span>
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
