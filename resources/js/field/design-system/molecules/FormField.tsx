import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  helperText?: string;
  errorText?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  helperText,
  errorText,
  rightSlot,
  children,
}) => {
  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-content-primary">
          {label}
          {required && <span className="text-status-danger-fg ml-1">*</span>}
        </label>
        {rightSlot && <div className="text-xs">{rightSlot}</div>}
      </div>
      {children}
      {errorText ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-status-danger-fg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorText}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-content-muted">{helperText}</p>
      ) : null}
    </div>
  );
};
