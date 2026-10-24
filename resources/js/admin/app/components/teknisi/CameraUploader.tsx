import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, X, Loader2, Image as ImageIcon, MapPin, ShieldCheck, ZoomIn } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { CameraModal, checkCameraAvailability } from '../common/CameraModal';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';
import { stampWatermarkAndCompress, getCurrentCoordinates, type CoordinatesResult } from '../../lib/cameraHelper';
import { toast } from 'sonner';

export type PsbPhotoType = 'before' | 'after' | 'modem' | 'cabling' | 'speedtest' | 'selfie' | 'attendance';

interface CameraUploaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  photoType: PsbPhotoType;
  disabled?: boolean;
  onUploadSuccess: (file: File) => void;
  onRemove?: () => void;
  uploadHandler: (file: File, coords?: { latitude?: number; longitude?: number; accuracy?: number }) => Promise<any>;
  taskNumber?: string;
  customerName?: string;
  technicianName?: string;
  initialPreviewUrl?: string;
}

export const CameraUploader: React.FC<CameraUploaderProps> = ({
  title,
  description,
  icon,
  photoType,
  disabled = false,
  onUploadSuccess,
  onRemove,
  uploadHandler,
  taskNumber = 'PSB',
  customerName = 'Rumah Pelanggan',
  technicianName = 'Teknisi PSB',
  initialPreviewUrl,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl || null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'failed'>(initialPreviewUrl ? 'success' : 'idle');
  const [progress, setProgress] = useState(initialPreviewUrl ? 100 : 0);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [coords, setCoords] = useState<CoordinatesResult | null>(null);
  const [processStep, setProcessStep] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFrontCamera = photoType === 'selfie' || photoType === 'attendance';

  const processAndUpload = async (rawFile: File) => {
    try {
      setStatus('uploading');
      setProgress(15);
      setProcessStep('Mencari sinyal GPS...');

      // 1. Ambil koordinat GPS Real-Time saat foto diambil
      let capturedCoords: CoordinatesResult = { latitude: 0, longitude: 0, accuracy: 0 };
      try {
        capturedCoords = await getCurrentCoordinates();
        setCoords(capturedCoords);
      } catch (gpsErr: any) {
        console.warn('GPS capture warning:', gpsErr?.message);
        // Tetap lanjutkan upload walau GPS offline
      }

      setProgress(40);
      setProcessStep('Membubuhkan Watermark & Kompresi <2MB...');

      // 2. Beri Watermark Permanen & Kompresi Adaptif (< 2.0 MB)
      const watermarkedFile = await stampWatermarkAndCompress(rawFile, {
        ticketNumber: taskNumber,
        technicianName: technicianName,
        latitude: capturedCoords.latitude,
        longitude: capturedCoords.longitude,
        locationName: customerName,
      });

      // Update preview lokal dengan foto ber-watermark
      const url = URL.createObjectURL(watermarkedFile);
      setPreviewUrl(url);
      setFile(watermarkedFile);

      setProgress(75);
      setProcessStep('Mengunggah ke server...');

      // 3. Upload via multipart form data
      await uploadHandler(watermarkedFile, {
        latitude: capturedCoords.latitude || undefined,
        longitude: capturedCoords.longitude || undefined,
        accuracy: capturedCoords.accuracy || undefined,
      });

      setProgress(100);
      setStatus('success');
      setProcessStep('');
      onUploadSuccess(watermarkedFile);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setStatus('failed');
      setProgress(0);
      setProcessStep('');
      toast.error(err?.message || 'Gagal mengunggah foto instalasi.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setStatus('idle');
    setProgress(0);

    await processAndUpload(selectedFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRetry = () => {
    if (file) {
      processAndUpload(file);
    }
  };

  const handleRemove = () => {
    setFile(null);
    if (previewUrl && !initialPreviewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setCoords(null);
    setProcessStep('');
    if (onRemove) onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraClick = () => {
    setIsCameraModalOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="mb-1">
        <label className="flex items-center text-sm font-bold text-gray-800 dark:text-slate-100">
          {icon && <span className="mr-2 text-indigo-500">{icon}</span>}
          {title}
        </label>
        {description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>

      {status === 'idle' && !file && !previewUrl && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleCameraClick}
          className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl border border-dashed border-indigo-200 dark:border-slate-700 bg-indigo-50/30 hover:bg-indigo-50/70 dark:bg-slate-800/50 hover:border-indigo-400 transition-all text-left active:scale-[0.99] disabled:opacity-50 group"
        >
          <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-2xs">
            <Camera className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-gray-800 dark:text-slate-100">Ambil {title}</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-400 truncate">
              {isFrontCamera ? 'Kamera Depan (Selfie)' : 'Kamera Belakang'} • Watermark Otomatis
            </p>
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-slate-700 shrink-0">
            Buka Kamera
          </span>
        </button>
      )}

      {(file || previewUrl) && (
        <div
          className={`border rounded-xl p-3 bg-white dark:bg-slate-900 shadow-2xs transition-all ${
            status === 'success'
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20'
              : status === 'failed'
              ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20'
              : 'border-gray-200 dark:border-slate-700'
          }`}
        >
          <div className="flex gap-3.5 items-center">
            {/* Thumbnail Preview */}
            <div 
              onClick={() => previewUrl && setIsPreviewModalOpen(true)}
              className="relative w-20 h-20 bg-gray-900 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-slate-700 shadow-2xs cursor-pointer group"
              title="Klik untuk memperbesar foto"
            >
              {previewUrl && (
                <img src={previewUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ZoomIn className="w-5 h-5 drop-shadow" />
              </div>
              {status === 'success' && (
                <div className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[9px] px-1 py-0.5 text-center font-bold">
                  ✓ TERUNGGAH
                </div>
              )}
            </div>

            {/* Info & Progress */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {file?.name || title}
                </p>
                {status === 'success' && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3" /> Watermarked (&lt;2MB)
                  </span>
                )}
              </div>

              {coords && coords.latitude !== 0 && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 font-mono">
                  <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                  <span>
                    GPS: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)} (±{Math.round(coords.accuracy)}m)
                  </span>
                </div>
              )}

              {status === 'uploading' && (
                <div className="space-y-1 pt-1">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>{processStep || 'Sedang memproses...'}</span>
                  </p>
                </div>
              )}

              {status === 'success' && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Foto berhasil diunggah
                </p>
              )}

              {status === 'failed' && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Gagal upload
                  </p>
                  <Button
                    type="button"
                    onClick={handleRetry}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-indigo-600 border-indigo-200"
                    disabled={disabled}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Coba Lagi
                  </Button>
                </div>
              )}
            </div>

            {status !== 'uploading' && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                className="text-gray-400 hover:text-rose-500 h-8 w-8 shrink-0 self-start"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Live Camera Modal (Anti-Galeri) */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={async (capturedFile) => {
          setIsCameraModalOpen(false);
          await processAndUpload(capturedFile);
        }}
        facingMode={isFrontCamera ? 'user' : 'environment'}
        title={`Foto ${title} (${isFrontCamera ? 'Kamera Depan' : 'Kamera Belakang'})`}
        description={`Ambil foto ${title} langsung menggunakan kamera perangkat. Dilarang memilih dari galeri.`}
      />

      {/* Enlarged Photo Preview Modal */}
      {previewUrl && isPreviewModalOpen && (
        <ImagePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          imageUrl={previewUrl}
          title={`Pratinjau Foto ${title}`}
        />
      )}
    </div>
  );
};
