import React, { ReactNode } from 'react';
import { ACTIONS, MESSAGES } from '../i18n/id';
import { AlertCircle } from 'lucide-react';

export interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`p-5 sm:p-6 rounded-xl border border-border bg-card shadow-xs space-y-4 ${className}`}>
      <div className="border-b border-border pb-3">
        <h3 className="text-base font-semibold text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

interface FormLayoutProps {
  title?: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  errors?: Record<string, string[] | string> | null;
  children: ReactNode;
  className?: string;
}

export const FormLayout: React.FC<FormLayoutProps> = ({
  title,
  description,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = ACTIONS.save,
  cancelLabel = ACTIONS.cancel,
  errors = null,
  children,
  className = '',
}) => {
  // Aggregate error messages
  const hasErrors = errors && Object.keys(errors).length > 0;

  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-bold text-foreground">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}

      {/* Global Validation Error Alert */}
      {hasErrors && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-800 dark:text-rose-300">
            <p className="font-semibold mb-1">Harap periksa kembali isian formulir:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {Object.entries(errors!).map(([field, err]) => {
                const msg = Array.isArray(err) ? err[0] : err;
                return (
                  <li key={field}>
                    <span className="capitalize font-medium">{field.replace(/_/g, ' ')}</span>: {msg}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Form Body (Sections) */}
      <div className="space-y-6">{children}</div>

      {/* Fixed Sticky Action Bar at Bottom Right */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 bg-card/95 backdrop-blur-xs border-t border-border flex items-center justify-end space-x-3 shadow-lg">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
          >
            {cancelLabel}
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        >
          {isLoading ? MESSAGES.saving : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default FormLayout;
