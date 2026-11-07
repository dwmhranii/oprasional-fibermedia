import React from 'react';
import { Spinner } from './Spinner';
import { ButtonVariant, ButtonSize, ComponentDensity } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  ariaLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  density?: ComponentDensity;
  isLoading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      ariaLabel,
      variant = 'ghost',
      size = 'md',
      density = 'comfortable',
      isLoading = false,
      disabled = false,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isInteractiveDisabled = disabled || isLoading;

    const baseClasses =
      'inline-flex items-center justify-center rounded-lg transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-primary-foreground hover:bg-cyan-700 dark:hover:bg-cyan-600 shadow-sm shadow-cyan-500/20',
      secondary:
        'bg-secondary text-secondary-foreground hover:bg-accent border border-border',
      outline:
        'border border-border bg-transparent text-foreground hover:bg-muted/80',
      danger:
        'bg-destructive text-destructive-foreground hover:bg-rose-700 dark:hover:bg-rose-600 shadow-sm',
      ghost:
        'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
    };

    const sizeClasses: Record<ComponentDensity, Record<ButtonSize, string>> = {
      compact: {
        sm: 'h-7 w-7 text-xs',
        md: 'h-8 w-8 text-sm',
        lg: 'h-9 w-9 text-base',
      },
      comfortable: {
        sm: 'min-h-10 min-w-10 text-sm',
        md: 'min-h-12 min-w-12 text-base', // 48px touch target
        lg: 'min-h-14 min-w-14 text-lg',
      },
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractiveDisabled}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        aria-disabled={isInteractiveDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[density][size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <Spinner size={size === 'sm' ? 'xs' : 'sm'} className="text-current" />
        ) : (
          <span className="inline-flex shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

