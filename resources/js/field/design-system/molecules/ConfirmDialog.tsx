import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  tone = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 bg-brand-navy/80 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm rounded-token-lg bg-surface-card border border-edge-strong p-4 shadow-token-elevated space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-token-md bg-status-warning-bg text-status-warning-fg border border-status-warning-border flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-content-primary">
              {title}
            </h3>
            <p className="text-xs text-content-secondary leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel} fullWidth>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            fullWidth
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
