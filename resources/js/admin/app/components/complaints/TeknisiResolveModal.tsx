import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../context/AuthContext';
import { stampWatermarkAndCompress, getCurrentCoordinates, type CoordinatesResult } from '../../lib/cameraHelper';
import {
  CheckCircle2,
  Wrench,
  AlertCircle,
  Loader2,
  Camera,
  X,
  ShieldCheck,
  Radio,
  FileText,
  MapPin,
} from 'lucide-react';
import { CameraModal } from '../common/CameraModal';
import type { Complaint, ResolutionCategory } from '../../types/complaint';

interface TeknisiResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onSubmit: (payload: {
    resolution_category: ResolutionCategory;
    description: string;
    photos: File[];
    opm_redaman?: string;
  }) => Promise<void> | void;
  isLoading?: boolean;
}

export const TeknisiResolveModal: React.FC<TeknisiResolveModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onSubmit,
  isLoading = false,
}) => {
  const { user } = useAuth();
  const [resolutionCategory, setResolutionCategory] = useState<ResolutionCategory>('cable_broken');
  const [description, setDescription] = useState('');
  const [opmRedaman, setOpmRedaman] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [coords, setCoords] = useState<CoordinatesResult | null>(null);

  // Ambil koordinat GPS perangkat di background saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      getCurrentCoordinates()
        .then((pos) => setCoords(pos))
        .catch(() => {
          // Fallback ke 0,0 atau titik pelanggan tanpa memblokir teknisi
        });
    } else {
      setResolutionCategory('cable_broken');
      setDescription('');
      setOpmRedaman('');
      setPhotos([]);
      setPreviewUrls([]);
      setIsCameraOpen(false);
      setError('');
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading && !isWatermarking) {
      onClose();
    }
  };

  const handleCapturePhoto = async (capturedFile: File) => {
    if (!complaint) return;

    setIsWatermarking(true);
    setError('');

    const techName = user?.name || user?.nama_lengkap || 'Teknisi Fibermedia';
    const lat = coords?.latitude ?? complaint.customer_lat ?? 0;
    const lng = coords?.longitude ?? complaint.customer_lng ?? 0;

    try {
      const watermarked = await stampWatermarkAndCompress(capturedFile, {
        ticketNumber: complaint.ticket_number,
        technicianName: techName,
        latitude: lat,
        longitude: lng,
        locationName: complaint.area,
      });

      setPhotos((prev) => [...prev, watermarked].slice(0, 5));
      setPreviewUrls((prev) => [...prev, URL.createObjectURL(watermarked)].slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Gagal memproses foto bukti & watermark.');
    } finally {
      setIsWatermarking(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      setError('Wajib mengunggah minimal 1 foto bukti fisik pengerjaan lapangan.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError('Catatan pekerjaan lapangan wajib diisi minimal 10 karakter.');
      return;
    }

    try {
      setError('');
      await onSubmit({
        resolution_category: resolutionCategory,
        description: description.trim(),
        photos,
        opm_redaman: opmRedaman.trim() || undefined,
      });
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirimkan bukti penyelesaian.');
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Header Gradient */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl ring-2 ring-white/30">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Tahap 1: Selesaikan Pengerjaan Teknis</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-white/90">
                Tiket: <strong className="font-mono text-white bg-black/20 px-1.5 py-0.5 rounded">{complaint.ticket_number}</strong> • {complaint.customer_name}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Resolution Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 dark:text-slate-200 mb-1">
              Penyebab & Solusi Kendala <span className="text-red-500">*</span>
            </label>
            <select
              value={resolutionCategory}
              onChange={(e) => setResolutionCategory(e.target.value as ResolutionCategory)}
              className="w-full text-xs h-9 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-gray-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-none"
              required
            >
              <option value="cable_broken">Kabel Dropcore Putus / Tertekuk (Tarik Baru/Splicing)</option>
              <option value="ont_faulty">Perangkat ONT Rusak (Ganti Perangkat Baru)</option>
              <option value="ont_reset">Reset & Rekonfigurasi Router/ONT</option>
              <option value="splitter_odp_issue">Kendala ODP / Port Splitter Penuh/Rusak</option>
              <option value="config_issue">Perbaikan Konfigurasi VLAN / PPPoE</option>
              <option value="customer_side">Kendala di Sisi Pelanggan (Device / LAN Pribadi)</option>
              <option value="other">Penyelesaian Teknis Lainnya</option>
            </select>
          </div>

          {/* OPM Redaman (Optional but Recommended) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-800 dark:text-slate-200">
                Pengukuran Redaman Optik (OPM)
              </label>
              <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">Opsional / Disarankan</span>
            </div>
            <div className="relative">
              <Radio className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <Input
                value={opmRedaman}
                onChange={(e) => setOpmRedaman(e.target.value)}
                placeholder="Contoh: -18.5 dBm (standar normal: -15 s/d -22 dBm)"
                className="text-xs pl-8 h-9 font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 dark:text-slate-200 mb-1">
              Catatan Tindakan Teknis Lapangan <span className="text-red-500">* (Min 10 Karakter)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tindakan teknis yang diambil (contoh: Pengecekan redaman awal -29 dBm karena kabel terjepit, dilakukan splicing ulang di tiang, redaman akhir normal -18 dBm, tes speedtest 50 Mbps lancar)..."
              rows={3}
              className="w-full text-xs resize-none dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              required
            />
          </div>

          {/* Photos Upload (Mandatory with Camera & Watermark) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-800 dark:text-slate-200">
                Foto Bukti Fisik Lapangan <span className="text-red-500">* (1 s/d 5 Foto)</span>
              </label>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium">
                {photos.length}/5 foto
              </span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
              Gunakan kamera belakang untuk memfoto redaman OPM, lampu ONT menyala, atau sambungan kabel. Foto akan <strong>otomatis dibubuhi watermark GPS & dikompres (&lt;2MB)</strong>.
            </p>

            {/* Photo Previews */}
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-900 group shadow-2xs"
                >
                  <img src={url} alt={`Bukti ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-emerald-400 px-1 py-0.5 truncate flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                    <span>Watermarked</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={isWatermarking}
                  className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-indigo-200 dark:border-slate-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 transition-all"
                >
                  {isWatermarking ? (
                    <div className="flex flex-col items-center p-2 text-center text-indigo-600 dark:text-indigo-400">
                      <Loader2 className="w-5 h-5 animate-spin mb-1" />
                      <span className="text-[9px] font-semibold">Watermarking...</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                      <span className="text-[10px] text-gray-700 dark:text-slate-300 font-semibold">+ Kamera</span>
                      <span className="text-[9px] text-gray-400">(Belakang)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading || isWatermarking}
              className="text-xs h-9 dark:border-slate-700"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || isWatermarking || photos.length === 0}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px] font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengunggah Bukti...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Simpan Bukti (Tahap 1)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Live Rear Camera Viewfinder (Anti-Galeri) */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(capturedFile) => {
          setIsCameraOpen(false);
          handleCapturePhoto(capturedFile);
        }}
        facingMode="environment"
        title="Foto Bukti Fisik Lapangan (Kamera Belakang)"
        description="Ambil foto langsung redaman OPM, lampu ONT, atau perbaikan kabel. Dilarang dari galeri."
        overlayText="Arahkan kamera ke perangkat atau bukti fisik yang diperbaiki."
      />
    </Dialog>
  );
};
