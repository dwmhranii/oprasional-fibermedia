import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-3 min-h-touch p-3 rounded-token-md bg-surface-muted border border-edge-subtle">
      <div className="text-xs">
        <p className="font-bold text-content-primary">{label}</p>
        {description && <p className="text-content-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-token-lg border transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus cursor-pointer ${
          checked
            ? 'bg-brand-primary border-edge-focus'
            : 'bg-surface-card border-edge-strong'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-token-sm bg-surface-card shadow-token-card transition-transform duration-150 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
