import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tone?: 'default' | 'error' | 'valid';
  density?: 'comfortable' | 'compact';
  mono?: boolean;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  tone = 'default',
  density = 'comfortable',
  mono = false,
  leftIcon,
  className = '',
  ...rest
}) => {
  const toneClasses = {
    default: 'border-edge-subtle focus-visible:border-edge-focus',
    error: 'border-status-danger-border bg-status-danger-bg/20 focus-visible:ring-status-danger-border',
    valid: 'border-status-safe-border focus-visible:border-status-safe-border',
  };

  const densityClass = density === 'comfortable' ? 'min-h-touch px-3.5 py-2.5 text-sm' : 'h-9 px-3 py-1.5 text-xs';

  return (
    <div className="relative w-full">
      {leftIcon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none">
          {leftIcon}
        </span>
      )}
      <input
        aria-invalid={tone === 'error'}
        className={`w-full rounded-token-md bg-surface-muted text-content-primary placeholder:text-content-muted border transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus disabled:opacity-60 ${
          toneClasses[tone]
        } ${densityClass} ${leftIcon ? 'pl-10' : ''} ${
          mono ? 'font-mono tabular-nums' : 'font-sans'
        } ${className}`}
        {...rest}
      />
    </div>
  );
};
