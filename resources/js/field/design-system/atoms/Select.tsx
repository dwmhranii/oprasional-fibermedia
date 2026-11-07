import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  tone?: 'default' | 'error';
  density?: 'comfortable' | 'compact';
}

export const Select: React.FC<SelectProps> = ({
  options,
  tone = 'default',
  density = 'comfortable',
  className = '',
  ...rest
}) => {
  const densityClass = density === 'comfortable' ? 'min-h-touch px-3.5 py-2.5 text-sm' : 'h-9 px-3 py-1.5 text-xs';
  const toneClass =
    tone === 'error'
      ? 'border-status-danger-border focus-visible:ring-status-danger-border'
      : 'border-edge-subtle focus-visible:border-edge-focus';

  return (
    <select
      aria-invalid={tone === 'error'}
      className={`w-full rounded-token-md bg-surface-muted text-content-primary border transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus disabled:opacity-60 cursor-pointer ${densityClass} ${toneClass} ${className}`}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-surface-card text-content-primary">
          {opt.label}
        </option>
      ))}
    </select>
  );
};
