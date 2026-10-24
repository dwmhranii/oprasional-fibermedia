import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ComplaintReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  isLoading?: boolean;
}

export const ComplaintReasonModal: React.FC<ComplaintReasonModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  placeholder = 'Tuliskan alasan secara jelas dan detail...',
  confirmLabel = 'Konfirmasi',
  confirmVariant = 'default',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Alasan wajib diisi.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Alasan minimal 5 karakter agar informatif.');
      return;
    }

    try {
      setError('');
      await onSubmit(trimmed);
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memproses.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-500">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alasan <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder={placeholder}
              rows={4}
              className="w-full text-sm resize-none focus-visible:ring-indigo-500"
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant={confirmVariant}
              disabled={isLoading || !reason.trim()}
              className="w-full sm:w-auto min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
