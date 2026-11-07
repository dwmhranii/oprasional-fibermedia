import React from 'react';
import { Check } from 'lucide-react';
import { ComponentDensity } from './Button';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  density?: ComponentDensity;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      density = 'comfortable',
      disabled = false,
      checked,
      className = '',
      id,
      ...rest
    },
    ref
  ) => {
    const inputId = id || React.useId();

    const boxSize = density === 'compact' ? 'w-4 h-4' : 'w-5 h-5';
    const minTouch = density === 'comfortable' ? 'min-h-12' : 'min-h-7';

    return (
      <label
        htmlFor={inputId}
        className={`inline-flex items-start gap-3 cursor-pointer select-none ${minTouch} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          <div
            className={`${boxSize} rounded border border-border bg-card transition-all duration-150 peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500 peer-focus-visible:ring-offset-2 flex items-center justify-center`}
          >
            <Check
              className={`text-primary-foreground transition-transform duration-150 ${
                boxSize === 'w-4 h-4' ? 'w-3 h-3' : 'w-3.5 h-3.5'
              } ${checked ? 'scale-100' : 'scale-0'}`}
              strokeWidth={3}
            />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className={`text-foreground font-medium ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>
                {label}
              </span>
            )}
            {description && (
              <span className={`text-muted-foreground ${density === 'compact' ? 'text-[11px]' : 'text-xs'}`}>
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

