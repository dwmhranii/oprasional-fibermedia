import React from 'react';
import { ComponentDensity } from './Button';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  density?: ComponentDensity;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  density = 'comfortable',
  id,
  className = '',
}) => {
  const switchId = id || React.useId();

  const trackSize = density === 'compact' ? 'w-8 h-4' : 'w-11 h-6';
  const knobSize = density === 'compact' ? 'w-3 h-3' : 'w-5 h-5';
  const knobTranslate = density === 'compact' ? 'translate-x-4' : 'translate-x-5';
  const minTouch = density === 'comfortable' ? 'min-h-12' : 'min-h-7';

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex items-center gap-3 cursor-pointer select-none ${minTouch} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative inline-flex items-center">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={`${trackSize} rounded-full transition-colors duration-200 border border-border ${
            checked
              ? 'bg-primary border-primary shadow-[0_0_10px_rgba(6,182,212,0.35)]'
              : 'bg-muted'
          } peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-500 peer-focus-visible:ring-offset-2`}
        >
          <div
            className={`${knobSize} rounded-full bg-white transition-transform duration-200 shadow-sm ${
              checked ? `${knobTranslate}` : 'translate-x-0.5'
            } mt-[1px]`}
          />
        </div>
      </div>
      {label && (
        <span className={`text-foreground font-medium ${density === 'compact' ? 'text-xs' : 'text-sm'}`}>
          {label}
        </span>
      )}
    </label>
  );
};

