import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { applyWatermarkAndCompress, ProcessedPhotoResult } from '../utils/watermark';
import {
  Camera,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  FileCheck,
  MapPin,
  Clock,
} from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  photoKind: string;
  facingModeDefault?: 'user' | 'environment';
  onPhotoCaptured: (result: ProcessedPhotoResult) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  title,
  photoKind,
  facingModeDefault = 'environment',
  onPhotoCaptured,
}) => {
  const { currentUser, currentGps } = useApp();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(facingModeDefault);
  const [capturedResult, setCapturedResult] = useState<ProcessedPhotoResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useFallbackSimulation, setUseFallbackSimulation] = useState<boolean>(false);

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedResult(null);
      setCameraError(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'user' | 'environment') => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat tidak mendukung Web Camera langsung.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera stream error, using camera fallback simulator:', err);
      setCameraError(err.message || 'Kamera tidak dapat diakses.');
      setUseFallbackSimulation(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Capture frame from active video element or synthetic simulation canvas
  const handleSnap = async () => {
    setIsProcessing(true);
    try {
      const meta = {
        title,
        photoKind,
        latitude: currentGps.lat,
        longitude: currentGps.lng,
        accuracy: currentGps.accuracy,
        userName: currentUser.name,
        deviceModel: currentUser.device_model,
        deviceUuid: currentUser.device_uuid,
      };

      let sourceCanvas: HTMLCanvasElement;

      if (videoRef.current && !useFallbackSimulation && videoRef.current.videoWidth > 0) {
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = videoRef.current.videoWidth;
        sourceCanvas.height = videoRef.current.videoHeight;
        const ctx = sourceCanvas.getContext('2d')!;
        ctx.drawImage(videoRef.current, 0, 0);
      } else {
        // High fidelity procedural fallback canvas if browser sandbox denies hardware camera
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = 1280;
        sourceCanvas.height = 720;
        const ctx = sourceCanvas.getContext('2d')!;

        // Industrial / field scenery background
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#0284c7');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 1280; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 720);
          ctx.stroke();
        }

        // Draw camera viewfinder reticle
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(340, 160, 600, 400);

        // Subject text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`DOKUMENTASI LAPANGAN: ${photoKind.toUpperCase()}`, 640, 320);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px system-ui';
        ctx.fillText(`Target: ${title} · Petugas: ${currentUser.name}`, 640, 360);
      }

      const processed = await applyWatermarkAndCompress(sourceCanvas, meta, 1280, 0.72);
      setCapturedResult(processed);
    } catch (err: any) {
      alert(`Gagal mengambil foto: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (capturedResult) {
      onPhotoCaptured(capturedResult);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-3">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wide">
              {photoKind}
            </span>
            <h2 className="text-sm font-semibold text-white truncate max-w-[260px]">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder or Preview Area */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[340px]">
          {capturedResult ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img
                src={capturedResult.dataUrl}
                alt="Captured Preview with Watermark"
                className="max-h-[380px] w-auto object-contain rounded-lg"
              />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 text-[11px] text-emerald-400 font-mono">
                <FileCheck className="w-3.5 h-3.5" />
                <span>{capturedResult.sizeKb} KB (Target ≤ 400 KB)</span>
              </div>
            </div>
          ) : (
            <>
              {useFallbackSimulation ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300">
                  <div className="h-16 w-16 rounded-full bg-sky-950 flex items-center justify-center text-sky-400 mb-3 border border-sky-800">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-white">Mode Kamera Lapangan Siap</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    {cameraError ? cameraError : 'Kamera langsung terhubung. Watermark server akan disematkan.'}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-lg">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>GPS: {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)}</span>
                  </div>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />
              )}

              {/* Viewfinder Framing Overlay */}
              <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-4 rounded-xl flex flex-col justify-between p-3">
                <div className="flex justify-between items-center text-[11px] text-white/80 font-mono">
                  <span className="bg-black/40 px-2 py-0.5 rounded">
                    {facingMode === 'user' ? 'KAMERA DEPAN (SELFIE)' : 'KAMERA BELAKANG'}
                  </span>
                  <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded">
                    <Clock className="w-3 h-3 text-sky-400" />
                    WIB SYNC
                  </span>
                </div>
                <div className="text-[11px] text-white/80 font-mono bg-black/50 px-2.5 py-1 rounded self-start">
                  Watermark GPS & Waktu Server Aktif
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          {capturedResult ? (
            <>
              <button
                onClick={() => setCapturedResult(null)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Foto Ulang
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 text-xs font-semibold text-white hover:bg-sky-500 shadow-md transition"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto Ini
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="flex items-center justify-center h-11 w-11 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title="Putar Kamera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSnap}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-500 active:scale-98 transition shadow-lg shadow-sky-600/30"
              >
                <Camera className="w-4 h-4" />
                {isProcessing ? 'Mengompres Foto...' : 'Ambil Foto & Watermark'}
              </button>

              <button
                type="button"
                onClick={() => setUseFallbackSimulation(!useFallbackSimulation)}
                className="text-[11px] text-slate-400 hover:text-slate-200 px-2"
                title="Beralih mode kamera"
              >
                {useFallbackSimulation ? 'Uji Live' : 'Simulasi'}
              </button>
            </>
          )}
        </div>

        {/* Informational banner */}
        <div className="bg-slate-900 px-4 py-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center gap-1.5 justify-center">
          <AlertCircle className="w-3 h-3 text-sky-400 shrink-0" />
          <span>Sesuai PRD: Foto dikompres di HP (target ≤ 400 KB) & waktu dikoreksi server.</span>
        </div>
      </div>
    </div>
  );
};
