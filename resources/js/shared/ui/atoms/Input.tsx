import React from 'react';
import { ComponentDensity } from './Button';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  density?: ComponentDensity;
  isError?: boolean;
  isMonospace?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      density = 'comfortable',
      isError = false,
      isMonospace = false,
      leftIcon,
      rightIcon,
      disabled = false,
      className = '',
      ...rest
    },
    ref
  ) => {
    const densityClasses: Record<ComponentDensity, string> = {
      compact: 'h-8 px-2.5 text-xs',
      comfortable: 'min-h-12 px-3.5 text-sm', // 48px touch target for PWA
    };

    const stateClasses = isError
      ? 'border-destructive text-destructive-foreground focus:ring-rose-500 focus:border-destructive'
      : 'border-border text-foreground focus:ring-cyan-500 focus:border-cyan-500 dark:focus:ring-cyan-400';

    const fontClass = isMonospace ? 'font-mono tracking-tight text-[0.875rem]' : 'font-sans';

    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={isError}
          className={`w-full rounded-lg bg-card border transition-all duration-150 outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            densityClasses[density]
          } ${stateClasses} ${fontClass} ${leftIcon ? (density === 'compact' ? 'pl-8' : 'pl-10') : ''} ${
            rightIcon ? (density === 'compact' ? 'pr-8' : 'pr-10') : ''
          } ${className}`}
          {...rest}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

