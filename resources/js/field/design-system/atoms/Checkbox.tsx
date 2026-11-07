import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  return (
    <label
      className={`flex items-center gap-3 min-h-touch p-3 rounded-token-md border transition duration-150 cursor-pointer select-none ${
        checked
          ? 'bg-status-safe-bg border-status-safe-border text-content-primary'
          : 'bg-surface-muted border-edge-subtle text-content-secondary hover:border-edge-strong'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex items-center justify-center w-5 h-5 rounded-token-sm border transition shrink-0 ${
          checked
            ? 'bg-brand-primary border-edge-focus text-brand-on-primary'
            : 'bg-surface-card border-edge-strong'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </span>
      <span className="flex-1 text-xs">
        <span className="font-bold block text-content-primary">{label}</span>
        {description && <span className="text-content-muted block mt-0.5">{description}</span>}
      </span>
    </label>
  );
};
