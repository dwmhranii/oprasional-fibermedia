import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  Layers,
  Wrench,
  UserCheck,
  Send,
  RefreshCw,
  Crosshair,
  ShieldAlert,
} from 'lucide-react';
import {
  db,
  LocalOdp,
  getNearestOdps,
  enqueueOfflineRequest,
  captureAndCompressFromVideo,
  getServerTimeIso,
} from '../shared';
import { formatCoordinate, formatDistance } from '@shared/lib/formatters';

interface TicketFieldWorkModalProps {
  open: boolean;
  onClose: () => void;
  ticket: {
    type: 'psb' | 'complaint';
    raw_id: number;
    ticket_number: string;
    customer_name: string;
    customer_address?: string;
  };
  token: string | null;
  currentUser: any;
  currentCoords: { lat: number; lng: number; accuracy?: number } | null;
  onSuccess?: () => void;
}

export const TicketFieldWorkModal: React.FC<TicketFieldWorkModalProps> = ({
  open,
  onClose,
  ticket,
  token,
  currentUser,
  currentCoords,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState<'phase1' | 'phase2'>('phase1');
  const [nearestOdps, setNearestOdps] = useState<(LocalOdp & { distance_meters?: number })[]>([]);
  const [selectedOdpId, setSelectedOdpId] = useState<string>('');
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [onuIndex, setOnuIndex] = useState('1');
  const [redaman, setRedaman] = useState('-19.5');
  const [notes, setNotes] = useState('');

  // Photos
  const [photoBefore, setPhotoBefore] = useState<string | null>(null);
  const [photoAfter, setPhotoAfter] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [selfieData, setSelfieData] = useState<string | null>(null);

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraTarget, setCameraTarget] = useState<'before' | 'after' | 'selfie' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<string | null>(null);

  // Load nearest ODPs from Dexie offline
  useEffect(() => {
    if (open && currentCoords) {
      getNearestOdps(currentCoords.lat, currentCoords.lng, 15).then((odps) => {
        setNearestOdps(odps);
        if (odps.length > 0 && !selectedOdpId) {
          setSelectedOdpId(String(odps[0].id));
        }
      });
    }
  }, [open, currentCoords]);

  // Selected ODP info
  const selectedOdp = nearestOdps.find((o) => String(o.id) === selectedOdpId);
  const usedPorts = selectedOdp?.used_ports || [];
  const capacity = selectedOdp?.port_capacity || 8;

  // Kamera
  const startCamera = async (target: 'before' | 'after' | 'selfie') => {
    setCameraTarget(target);
    setIsCameraActive(true);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: target === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      alert(`Gagal mengakses kamera: ${err.message}`);
      setIsCameraActive(false);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const watermarkText = `GPS: ${currentCoords ? formatCoordinate(currentCoords.lat, currentCoords.lng) : 'N/A'} | ${new Date().toLocaleTimeString('id-ID')} WIB | Tiket: ${ticket.ticket_number}`;
      const compressedBase64 = await captureAndCompressFromVideo(
        videoRef.current,
        400, // max 400 KB
        watermarkText
      );

      if (cameraTarget === 'before') setPhotoBefore(compressedBase64);
      if (cameraTarget === 'after') setPhotoAfter(compressedBase64);
      if (cameraTarget === 'selfie') setSelfieData(compressedBase64);

      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
      setCameraTarget(null);
    } catch (err: any) {
      alert(`Gagal mengambil foto: ${err.message}`);
    }
  };

  // Submit Phase 1
  const handleSubmitPhase1 = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        odp_id: selectedOdpId ? parseInt(selectedOdpId, 10) : null,
        odp: selectedOdp?.code || selectedOdp?.name,
        port: selectedPort,
        onu_index: onuIndex,
        redaman: redaman,
        notes: notes,
        photo_before_base64: photoBefore,
        photo_after_base64: photoAfter,
        signature_base64: signatureData || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
        accuracy: currentCoords?.accuracy,
        captured_at: getServerTimeIso(),
      };

      if (!navigator.onLine) {
        // Simpan offline ke Dexie
        await enqueueOfflineRequest(
          `/api/field/tickets/${ticket.type}/${ticket.raw_id}/phase-1`,
          'POST',
          payload,
          token
        );
        setStatusMessage('Tahap 1: Pengerjaan berhasil disimpan di HP (offline) & masuk antrean sinkronisasi.');
        setActiveStep('phase2');
      } else {
        const res = await fetch(`/api/field/tickets/${ticket.type}/${ticket.raw_id}/phase-1`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setStatusMessage(json.message || 'Tahap 1: Pengerjaan berhasil dikirim!');
          setActiveStep('phase2');
        } else {
          setStatusMessage(json.message || 'Gagal mengirim Tahap 1: Pengerjaan.');
        }
      }
    } catch (err: any) {
      // Fallback offline queue
      await enqueueOfflineRequest(
        `/api/field/tickets/${ticket.type}/${ticket.raw_id}/phase-1`,
        'POST',
        {},
        token
      );
      setStatusMessage('Tahap 1: Pengerjaan tersimpan di antrean offline.');
      setActiveStep('phase2');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Phase 2 Attendance
  const handleSubmitPhase2 = async () => {
    if (!selfieData) {
      alert('Foto selfie di lokasi pelanggan wajib diambil.');
      return;
    }
    if (!currentCoords) {
      alert('Menunggu koordinat GPS perangkat.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        latitude: currentCoords.lat,
        longitude: currentCoords.lng,
        accuracy: currentCoords.accuracy || 15,
        selfie_base64: selfieData,
        captured_at: getServerTimeIso(),
      };

      if (!navigator.onLine) {
        await enqueueOfflineRequest(
          `/api/field/tickets/${ticket.type}/${ticket.raw_id}/phase-2-attendance`,
          'POST',
          payload,
          token
        );
        setStatusMessage('Tahap 2: Absensi di Lokasi tersimpan di antrean offline HP!');
        if (onSuccess) onSuccess();
        setTimeout(onClose, 1500);
      } else {
        const res = await fetch(
          `/api/field/tickets/${ticket.type}/${ticket.raw_id}/phase-2-attendance`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json();
        if (json.success) {
          setStatusMessage(json.message || 'Tahap 2: Absensi di Lokasi berhasil dicatat.');
          setGeofenceResult(json.data?.geofence_status || 'inside');
          if (onSuccess) onSuccess();
          setTimeout(onClose, 1500);
        } else {
          setStatusMessage(json.message || 'Gagal merekam Tahap 2: Absensi di Lokasi.');
        }
      }
    } catch (err: any) {
      alert(`Gagal: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-400" />
              Pengerjaan Tiket #{ticket.ticket_number}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pelanggan: {ticket.customer_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-semibold">
          <button
            onClick={() => setActiveStep('phase1')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeStep === 'phase1'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Tahap 1: Pengerjaan
          </button>
          <button
            onClick={() => setActiveStep('phase2')}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeStep === 'phase2'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Tahap 2: Absensi di Lokasi
          </button>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-xs text-indigo-300">
            {statusMessage}
          </div>
        )}

        {/* Camera Modal Overlay */}
        {isCameraActive && (
          <div className="fixed inset-0 z-60 bg-black flex flex-col items-center justify-between p-4">
            <div className="w-full flex justify-between items-center text-white text-xs">
              <span>Ambil Foto: {cameraTarget}</span>
              <button
                onClick={() => {
                  if (streamRef.current) {
                    streamRef.current.getTracks().forEach((t) => t.stop());
                  }
                  setIsCameraActive(false);
                }}
                className="p-2 bg-slate-800 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full max-w-sm aspect-3/4 rounded-2xl overflow-hidden bg-slate-900 border">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <button
              onClick={takePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-slate-400 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-600" />
            </button>
          </div>
        )}

        {/* STEP 1: Tahap 1 (DATA TEKNIS & ODP) */}
        {activeStep === 'phase1' && (
          <div className="space-y-4 text-xs">
            {/* ODP Selector from Dexie */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300">Pilih ODP Terdekat (Offline Dexie) *</label>
                <span className="text-[11px] text-indigo-400">{nearestOdps.length} ODP terdeteksi</span>
              </div>
              <select
                value={selectedOdpId}
                onChange={(e) => {
                  setSelectedOdpId(e.target.value);
                  setSelectedPort(null);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none focus:border-indigo-500"
              >
                {nearestOdps.length === 0 ? (
                  <option value="">Belum ada data ODP lokal (sinkron dulu)</option>
                ) : (
                  nearestOdps.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.code || o.name} {o.distance_meters ? `(±${o.distance_meters}m)` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Visual Port Occupancy Grid */}
            {selectedOdp && (
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300">Pilih Port (Kapasitas {capacity} Port) *</span>
                  <div className="flex gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded bg-emerald-500" /> Kosong
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded bg-rose-500" /> Terisi
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-1.5">
                  {Array.from({ length: capacity }, (_, i) => i + 1).map((portNum) => {
                    const isOccupied = usedPorts.includes(portNum);
                    const isSelected = selectedPort === portNum;

                    return (
                      <button
                        key={portNum}
                        type="button"
                        onClick={() => setSelectedPort(portNum)}
                        className={`h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                          isSelected
                            ? 'ring-2 ring-white scale-105'
                            : ''
                        } ${
                          isOccupied
                            ? 'bg-rose-500/80 text-white'
                            : 'bg-emerald-500/80 text-white'
                        }`}
                      >
                        {portNum}
                      </button>
                    );
                  })}
                </div>
                {selectedPort && usedPorts.includes(selectedPort) && (
                  <p className="text-[10px] text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    Port #{selectedPort} terisi di database. Jika tetap dipilih, server akan menandai konflik port tanpa menolak kiriman.
                  </p>
                )}
              </div>
            )}

            {/* ONU & Redaman */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">ONU Index</label>
                <input
                  type="text"
                  value={onuIndex}
                  onChange={(e) => setOnuIndex(e.target.value)}
                  placeholder="Mis. 1 atau 2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Redaman (OPM dBm)</label>
                <input
                  type="text"
                  value={redaman}
                  onChange={(e) => setRedaman(e.target.value)}
                  placeholder="Mis. -19.5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-white outline-none"
                />
              </div>
            </div>

            {/* Foto Sebelum & Sesudah */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="block text-[11px] font-semibold text-slate-300 mb-1">Foto Sebelum *</span>
                {photoBefore ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-emerald-500">
                    <img src={photoBefore} alt="Before" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotoBefore(null)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startCamera('before')}
                    className="w-full aspect-video rounded-xl border border-dashed border-slate-600 bg-slate-800/40 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white"
                  >
                    <Camera className="w-5 h-5 text-indigo-400" />
                    <span>Ambil Foto</span>
                  </button>
                )}
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-300 mb-1">Foto Sesudah *</span>
                {photoAfter ? (
                  <div className="relative rounded-xl overflow-hidden aspect-video border border-emerald-500">
                    <img src={photoAfter} alt="After" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotoAfter(null)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startCamera('after')}
                    className="w-full aspect-video rounded-xl border border-dashed border-slate-600 bg-slate-800/40 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-white"
                  >
                    <Camera className="w-5 h-5 text-indigo-400" />
                    <span>Ambil Foto</span>
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitPhase1}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Kirim Bukti Tahap 1 &amp; Lanjut Absensi
            </button>
          </div>
        )}

        {/* STEP 2: TAHAP 2 (ABSENSI TIM DI LOKASI) */}
        {activeStep === 'phase2' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300">
              <span className="font-bold block mb-1">Tahap 2: Absensi di Lokasi</span>
              Setiap personil yang hadir di lokasi wajib mengambil foto selfie dengan koordinat GPS. Geofence hanya menandai posisi tanpa menolak kiriman.
            </div>

            {/* Selfie Preview / Camera Trigger */}
            <div className="space-y-2">
              <label className="font-semibold text-slate-300 block">Foto Selfie di Lokasi Pelanggan *</label>
              {selfieData ? (
                <div className="relative w-40 h-52 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                  <img src={selfieData} alt="Selfie" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setSelfieData(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startCamera('selfie')}
                  className="w-full py-8 rounded-2xl border border-dashed border-indigo-500/50 bg-indigo-950/20 flex flex-col items-center justify-center gap-2 text-indigo-300 hover:bg-indigo-950/40"
                >
                  <Camera className="w-8 h-8 text-indigo-400" />
                  <span className="font-bold">Buka Kamera Selfie Langsung</span>
                  <span className="text-[10px] text-slate-400">Watermark GPS &amp; waktu server otomatis disertakan</span>
                </button>
              )}
            </div>

            {/* Current GPS Coordinates */}
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Lokasi GPS Terdeteksi</span>
              <p className="font-mono text-emerald-400">
                {currentCoords
                  ? `${formatCoordinate(currentCoords.lat, currentCoords.lng)} (akurasi ±${formatDistance(Math.round(currentCoords.accuracy || 0))})`
                  : 'Mencari sinyal GPS...'}
              </p>
            </div>

            <button
              type="button"
              disabled={isSubmitting || !selfieData}
              onClick={handleSubmitPhase2}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Kirim Absensi Selfie &amp; Selesaikan Tiket
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
