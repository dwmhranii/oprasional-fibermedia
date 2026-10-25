import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import { useTeknisiPhase2Attendance } from '../../hooks/useComplaints';
import { stampWatermarkAndCompress, getCurrentCoordinates, type CoordinatesResult } from '../../lib/cameraHelper';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CameraModal } from '../common/CameraModal';
import type { Complaint } from '../../types/complaint';

interface TeknisiAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onSuccess?: () => void;
}

export const TeknisiAttendanceModal: React.FC<TeknisiAttendanceModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onSuccess,
}) => {
  const { user } = useAuth();

  // States
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessingWatermark, setIsProcessingWatermark] = useState(false);
  const [coords, setCoords] = useState<CoordinatesResult | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const attendanceMutation = useTeknisiPhase2Attendance();

  // Ambil GPS otomatis saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      fetchCoordinates();
    } else {
      // Reset state saat modal ditutup
      setPhoto(null);
      setPreviewUrl(null);
      setIsCameraOpen(false);
      setSubmitError(null);
      setGpsError(null);
    }
  }, [isOpen]);

  const fetchCoordinates = async () => {
    setIsGettingGps(true);
    setGpsError(null);
    try {
      const position = await getCurrentCoordinates();
      setCoords(position);
    } catch (err: any) {
      setGpsError(err?.message || 'Gagal mendeteksi koordinat GPS.');
    } finally {
      setIsGettingGps(false);
    }
  };

  const handleCapturePhoto = async (rawFile: File) => {
    if (!rawFile || !complaint) return;

    setIsProcessingWatermark(true);
    setSubmitError(null);

    try {
      // Pastikan ada koordinat (fallback ke 0,0 jika error)
      const lat = coords?.latitude ?? complaint.customer_lat ?? 0;
      const lng = coords?.longitude ?? complaint.customer_lng ?? 0;
      const techName = user?.name || user?.nama_lengkap || 'Teknisi Fibermedia';

      const watermarkedFile = await stampWatermarkAndCompress(rawFile, {
        ticketNumber: complaint.ticket_number,
        technicianName: techName,
        latitude: lat,
        longitude: lng,
        locationName: complaint.area,
      });

      setPhoto(watermarkedFile);
      const url = URL.createObjectURL(watermarkedFile);
      setPreviewUrl(url);
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal memproses foto selfie & watermark.');
    } finally {
      setIsProcessingWatermark(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;

    if (!photo) {
      setSubmitError('Wajib mengambil foto selfie wajah Anda di lokasi pelanggan.');
      return;
    }

    if (!coords && !complaint.customer_lat) {
      setSubmitError('Koordinat GPS belum terkunci. Klik tombol refresh GPS.');
      return;
    }

    const lat = coords?.latitude ?? complaint.customer_lat ?? 0;
    const lng = coords?.longitude ?? complaint.customer_lng ?? 0;
    const accuracy = coords?.accuracy;

    try {
      setSubmitError(null);
      await attendanceMutation.mutateAsync({
        id: complaint.id,
        payload: {
          selfie_photo: photo,
          latitude: lat,
          longitude: lng,
          accuracy,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Gagal mengirim absensi mandiri.');
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !attendanceMutation.isPending && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-0 overflow-hidden shadow-2xl">
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-teal-600 to-indigo-700 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl ring-2 ring-white/30">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Tahap 2: Absensi Mandiri Teknisi</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-white/90">
                Selfie & Geotagging kehadiran fisik tim di lokasi pelanggan
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Card Info Tiket & Tim */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-slate-400">Nomor Tiket:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {complaint.ticket_number}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-slate-400">Tim Bertugas:</span>
              <span className="font-semibold text-gray-800 dark:text-slate-200">
                {complaint.assigned_team || complaint.current_assignment?.assigned_team || 'Tim Lapangan'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-slate-400">Teknisi (Anda):</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {user?.name || user?.nama_lengkap || 'Teknisi'}
              </span>
            </div>
          </div>

          {/* Status GPS Geolocation */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                Titik Lokasi GPS
              </span>
              <button
                type="button"
                onClick={fetchCoordinates}
                disabled={isGettingGps}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
                {isGettingGps ? 'Mencari...' : 'Refresh GPS'}
              </button>
            </div>

            {isGettingGps ? (
              <div className="flex items-center gap-2 text-gray-500 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Mendeteksi koordinat GPS perangkat Anda...</span>
              </div>
            ) : coords ? (
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded border border-emerald-200 dark:border-emerald-800/60 font-mono text-[11px]">
                <div className="truncate">
                  <span>GPS Terkunci: </span>
                  <strong>{coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}</strong>
                </div>
                <span className="text-[10px] text-emerald-600/80 shrink-0 ml-2">
                  ±{Math.round(coords.accuracy)}m
                </span>
              </div>
            ) : gpsError ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-2 rounded border border-amber-200 dark:border-amber-800/60 text-[11px] space-y-1">
                <p className="font-medium">{gpsError}</p>
                <p className="text-[10px] text-amber-700/80">
                  Pastikan GPS HP aktif & beri izin browser mengakses lokasi Anda.
                </p>
              </div>
            ) : null}
          </div>

          {/* Area Kamera Depan / Selfie */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-800 dark:text-slate-200">
                Foto Selfie di Lokasi <span className="text-red-500">* (Kamera Depan)</span>
              </label>
              {photo && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Watermarked & Kompresi &lt;2MB
                </span>
              )}
            </div>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-md aspect-video bg-black flex items-center justify-center group">
                <img
                  src={previewUrl}
                  alt="Selfie Watermarked"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsCameraOpen(true)}
                    className="text-xs h-8 bg-white/90 text-gray-800"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Ambil Ulang Selfie (Kamera Depan)
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={isProcessingWatermark}
                className="w-full h-44 border-2 border-dashed border-indigo-300 dark:border-indigo-900/60 rounded-xl flex flex-col items-center justify-center p-4 bg-indigo-50/50 dark:bg-slate-800/40 hover:bg-indigo-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
              >
                {isProcessingWatermark ? (
                  <div className="flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-semibold">Memproses Watermark & Kompresi...</span>
                    <span className="text-[11px] text-gray-500">Membubuhkan GPS & No Tiket ke foto</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      Buka Kamera Depan (Selfie Langsung)
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 text-center mt-0.5">
                      Kamera depan otomatis menyala & menyematkan watermark GPS permanen
                    </span>
                  </>
                )}
              </button>
            )}

            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
              • Setiap anggota tim wajib melakukan absensi mandiri di lokasi.
              <br />
              • Tiket akan otomatis berstatus <strong>RESOLVED</strong> setelah Tahap 1 Selesai dan seluruh anggota tim telah selfie.
            </p>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer Actions */}
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={attendanceMutation.isPending}
              className="text-xs h-9 dark:border-slate-700"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={attendanceMutation.isPending || !photo || isProcessingWatermark}
              className="text-xs h-9 bg-teal-600 hover:bg-teal-700 text-white font-medium min-w-[140px]"
            >
              {attendanceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Mengirim Absensi...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Kirim Absensi Saya
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Live Front Camera Stream (Strict Live Camera Only) */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(capturedFile) => {
          setIsCameraOpen(false);
          handleCapturePhoto(capturedFile);
        }}
        facingMode="user"
        title="Selfie Kehadiran Teknisi (Kamera Depan)"
        description="Ambil selfie langsung di lokasi pelanggan. Dilarang memilih dari galeri."
        overlayText="Posisikan wajah Anda di dalam frame kamera depan."
      />
    </Dialog>
  );
};
