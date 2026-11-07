import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ComponentDensity } from './Button';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  density?: ComponentDensity;
  isError?: boolean;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      density = 'comfortable',
      isError = false,
      placeholder,
      disabled = false,
      className = '',
      ...rest
    },
    ref
  ) => {
    const densityClasses: Record<ComponentDensity, string> = {
      compact: 'h-8 pl-2.5 pr-8 text-xs',
      comfortable: 'min-h-12 pl-3.5 pr-10 text-sm',
    };

    const stateClasses = isError
      ? 'border-destructive focus:ring-rose-500 focus:border-destructive'
      : 'border-border focus:ring-cyan-500 focus:border-cyan-500 dark:focus:ring-cyan-400';

    return (
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          disabled={disabled}
          aria-invalid={isError}
          className={`w-full appearance-none rounded-lg bg-card border text-foreground transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed ${
            densityClasses[density]
          } ${stateClasses} ${className}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 flex items-center pointer-events-none text-muted-foreground">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

