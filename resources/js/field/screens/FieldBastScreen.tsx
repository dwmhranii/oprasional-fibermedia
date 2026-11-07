import React, { useState } from 'react';
import {
  SignaturePad,
  Button,
  Input,
  FormField,
  Checkbox,
  SignalIndicator,
} from '@shared/ui';
import { CheckCircle2, ArrowLeft, FileCheck, ShieldCheck } from 'lucide-react';

export interface FieldBastScreenProps {
  ticketNumber?: string;
  customerName?: string;
  onBack: () => void;
  onBastSubmitted: (bastData: any) => void;
}

export const FieldBastScreen: React.FC<FieldBastScreenProps> = ({
  ticketNumber = 'TKT-2026-0914',
  customerName = 'Bambang Sudiro',
  onBack,
  onBastSubmitted,
}) => {
  const [onuSerial, setOnuSerial] = useState('ZTEG-F670-8812');
  const [opticalDbm, setOpticalDbm] = useState(-19.8);
  const [dropcoreMeters, setDropcoreMeters] = useState('45');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSubmitBast = () => {
    if (!signatureData || !isAgreementChecked) return;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsCompleted(true);
      onBastSubmitted({
        ticketNumber,
        customerName,
        onuSerial,
        opticalDbm,
        dropcoreMeters,
        signatureData,
        submittedAt: '09:45 WIB',
      });
    }, 600);
  };

  if (isCompleted) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-in zoom-in-95">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            BAST Berhasil Disimpan!
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Berita Acara Serah Terima telah ditandatangani dan diarsipkan ke server Fibermedia.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs text-left font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">No. Tiket:</span>
            <span className="font-bold text-foreground">#{ticketNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">Pelanggan:</span>
            <span className="text-foreground">{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">Serial ONU:</span>
            <span className="text-foreground">{onuSerial}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">Redaman Akhir:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {opticalDbm} dBm (Optimal)
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          density="comfortable"
          className="w-full min-h-12"
          onClick={onBack}
        >
          Kembali ke Daftar Tugas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          density="comfortable"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali
        </Button>

        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
          BAST #{ticketNumber}
        </span>
      </div>

      {/* Header Card */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1">
        <h3 className="text-base font-bold text-foreground">
          Berita Acara Serah Terima (BAST)
        </h3>
        <p className="text-xs text-muted-foreground">
          Konfirmasi penyelesaian pekerjaan FTTH bersama pelanggan {customerName}.
        </p>
      </div>

      {/* Form Details: Hardware & Material */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Verifikasi Perangkat &amp; Material
        </h4>

        <FormField label="Nomor Serial Modem / ONU" required density="comfortable">
          <Input
            isMonospace
            value={onuSerial}
            onChange={(e) => setOnuSerial(e.target.value)}
            density="comfortable"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kabel Dropcore (m)" required density="comfortable">
            <Input
              isMonospace
              type="number"
              value={dropcoreMeters}
              onChange={(e) => setDropcoreMeters(e.target.value)}
              density="comfortable"
            />
          </FormField>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground text-sm">Hasil Redaman</label>
            <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between min-h-12">
              <SignalIndicator dbm={opticalDbm} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Signature Pad */}
      <SignaturePad
        signerName={customerName}
        signerRole="Pelanggan FTTH"
        density="comfortable"
        onSave={(dataUrl) => setSignatureData(dataUrl)}
        onClear={() => setSignatureData(null)}
      />

      {/* Agreement Checkbox */}
      <div className="p-3.5 rounded-xl border border-border bg-muted/30">
        <Checkbox
          label="Pernyataan Pelanggan"
          description="Saya menyatakan bahwa instalasi/perbaikan jaringan internet telah selesai diuji dan berfungsi normal."
          checked={isAgreementChecked}
          onChange={(e) => setIsAgreementChecked(e.target.checked)}
          density="comfortable"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="lg"
          density="comfortable"
          isLoading={isLoading}
          disabled={!signatureData || !isAgreementChecked}
          onClick={handleSubmitBast}
          className="w-full min-h-12 text-base font-semibold shadow-md shadow-cyan-500/25"
          leftIcon={<FileCheck className="w-5 h-5" />}
        >
          Kirim &amp; Selesaikan BAST
        </Button>
      </div>
    </div>
  );
};

