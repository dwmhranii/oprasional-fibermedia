import React from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ComponentDensity = 'compact' | 'comfortable';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  density?: ComponentDensity;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      density = 'comfortable',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isInteractiveDisabled = disabled || isLoading;

    // Base styles: semantic tokens only, no arbitrary hex or px
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    // Variant classes using semantic CSS tokens
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
        'bg-transparent text-foreground hover:bg-muted text-muted-foreground hover:text-foreground',
    };

    // Sizing conditioned on density (compact for desktop admin tables, comfortable 48px touch target for PWA mobile)
    const sizeClasses: Record<ComponentDensity, Record<ButtonSize, string>> = {
      compact: {
        sm: 'h-7 px-2.5 text-xs gap-1.5',
        md: 'h-8 px-3 text-xs gap-2',
        lg: 'h-9 px-4 text-sm gap-2',
      },
      comfortable: {
        sm: 'min-h-10 px-3.5 text-sm gap-2',
        md: 'min-h-12 px-4 text-sm font-medium gap-2.5', // 48px WCAG mobile touch target
        lg: 'min-h-14 px-6 text-base font-semibold gap-3',
      },
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isInteractiveDisabled}
        aria-busy={isLoading}
        aria-disabled={isInteractiveDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[density][size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <Spinner size={size === 'sm' ? 'sm' : 'md'} className="text-current" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

