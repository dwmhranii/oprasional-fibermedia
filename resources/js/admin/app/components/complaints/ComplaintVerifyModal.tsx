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
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import type { Complaint } from '../../types/complaint';

interface ComplaintVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onVerifyClose: (notes?: string) => Promise<void> | void;
  isLoading?: boolean;
}

export const ComplaintVerifyModal: React.FC<ComplaintVerifyModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onVerifyClose,
  isLoading = false,
}) => {
  const [isEvidenceChecked, setIsEvidenceChecked] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const photoCount = complaint?.current_assignment?.evidence?.photos?.length || 0;

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      setIsEvidenceChecked(false);
      setNotes('');
      setError('');
      onClose();
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEvidenceChecked) {
      setError('Anda wajib mengonfirmasi bahwa bukti foto teknisi telah diperiksa.');
      return;
    }

    try {
      setError('');
      await onVerifyClose(notes.trim() || undefined);
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal memverifikasi dan menutup tiket.');
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Verifikasi Bukti & Tutup Tiket
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Tiket: <strong>{complaint.ticket_number}</strong> • Pelanggan: <strong>{complaint.customer_name}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          {/* Info Card on Evidence status */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Bukti Lapangan Teknisi:</span>
              <span className="font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px]">
                {photoCount} Foto Tersedia
              </span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Teknisi <strong>{complaint.current_assignment?.technician_name || 'Lapangan'}</strong> telah mengunggah bukti pengerjaan. Pastikan foto redaman, perangkat, dan kondisi instalasi sudah valid.
            </p>
          </div>

          {/* Mandatory Checkbox */}
          <div className="flex items-start space-x-2.5 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
            <Checkbox
              id="confirm-evidence"
              checked={isEvidenceChecked}
              onCheckedChange={(checked) => {
                setIsEvidenceChecked(!!checked);
                if (error) setError('');
              }}
              className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
            />
            <Label
              htmlFor="confirm-evidence"
              className="text-xs font-medium text-emerald-950 leading-relaxed cursor-pointer"
            >
              Saya telah memeriksa bukti foto dan pengerjaan teknisi. Masalah pengaduan telah diselesaikan dengan benar. <span className="text-red-500">*</span>
            </Label>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Catatan Verifikasi Admin <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Bukti redaman -19 dBm valid, modem online."
              rows={2}
              className="w-full text-xs resize-none"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isEvidenceChecked}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                '✓ Verifikasi & Tutup Tiket'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
