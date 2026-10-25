import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';
import { ACTIONS, MESSAGES } from '../i18n/id';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = ACTIONS.confirm,
  cancelLabel = ACTIONS.cancel,
  variant = 'primary',
  requireReason = false,
  reasonPlaceholder = 'Masukkan alasan tindakan...',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setReasonError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setReasonError(MESSAGES.reasonRequired);
      return;
    }
    onConfirm(requireReason ? reason.trim() : undefined);
  };

  const buttonVariantStyles = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500/20',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500/20',
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary/20',
  }[variant];

  const Icon = variant === 'danger' ? AlertCircle : AlertTriangle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in zoom-in-95">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              variant === 'danger'
                ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
            }`}
          >
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Reason input when required */}
        {requireReason && (
          <div className="mt-4 space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Alasan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError('');
              }}
              placeholder={reasonPlaceholder}
              className={`w-full text-sm rounded-lg border p-2.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
                reasonError
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-border focus:ring-primary/20 focus:border-primary'
              }`}
            />
            {reasonError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {reasonError}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons (Fixed Bottom Right) */}
        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 ${buttonVariantStyles} disabled:opacity-50`}
          >
            {isLoading ? MESSAGES.loading : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
