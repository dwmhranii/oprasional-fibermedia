import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ComponentDensity } from '../atoms';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  helperText?: string;
  errorMessage?: string;
  id?: string;
  density?: ComponentDensity;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  helperText,
  errorMessage,
  id,
  density = 'comfortable',
  children,
  className = '',
}) => {
  const isError = Boolean(errorMessage);
  const helperId = id ? `${id}-helper` : undefined;
  const errorId = id ? `${id}-error` : undefined;

  return (
    <div className={`flex flex-col ${density === 'compact' ? 'gap-1' : 'gap-1.5'} w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className={`font-medium text-foreground select-none flex items-center gap-1 ${
            density === 'compact' ? 'text-xs' : 'text-sm'
          }`}
        >
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      <div className="w-full">{children}</div>

      {isError && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-rose-500 text-xs font-medium mt-0.5"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isError && helperText && (
        <p id={helperId} className="text-muted-foreground text-xs mt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
};

