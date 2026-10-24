import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, ShieldAlert, CameraOff, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  description?: string;
  facingMode?: 'user' | 'environment';
  overlayText?: string;
}

export const checkCameraAvailability = async (): Promise<{
  available: boolean;
  permissionGranted: boolean;
  error?: string;
}> => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { available: false, permissionGranted: false, error: 'NOT_SUPPORTED' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    });
    stream.getTracks().forEach(track => track.stop());
    return { available: true, permissionGranted: true };
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { available: true, permissionGranted: false, error: 'PERMISSION_DENIED' };
    }
    return { available: false, permissionGranted: false, error: 'NO_CAMERA' };
  }
};

type CameraState = 'requesting' | 'loading' | 'ready' | 'captured' | 'denied' | 'unavailable';

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto Kamera Langsung',
  description = 'Gunakan kamera perangkat Anda untuk mengambil foto langsung di lokasi.',
  facingMode = 'environment',
  overlayText,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('loading');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedBlob(null);
      setIsVideoPlaying(false);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraState('requesting');
    setIsVideoPlaying(false);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
      } catch {
        // Fallback jika ideal constraints tidak didukung browser
        stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
      }
      streamRef.current = stream;
      setCameraState('ready');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
      } else {
        setCameraState('unavailable');
      }
    }
  };

  useEffect(() => {
    const attachStream = async () => {
      if (cameraState === 'ready' && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.error("Failed to play video stream:", e);
        }
      }
    };
    attachStream();
  }, [cameraState]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedImage(url);
          setCapturedBlob(blob);
          setCameraState('captured');
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    setIsVideoPlaying(false);
    startCamera();
  };

  const handleSave = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
      onClose();
    }
  };

  useEffect(() => {
    return () => {
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-w-[95vw] sm:w-full h-[85vh] sm:h-auto flex flex-col p-5 md:p-6 rounded-2xl md:rounded-3xl gap-4 bg-white shadow-xl">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-0.5">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Camera Preview Area (Enlarged to 70-80% height on mobile) */}
        <div className="flex-1 min-h-[300px] md:min-h-[380px] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 flex flex-col items-center justify-center relative">
          
          {cameraState === 'requesting' && (
            <div className="flex flex-col items-center justify-center text-neutral-400 p-8 space-y-4 text-center">
              <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 animate-pulse">
                <ShieldAlert className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-white font-semibold text-base">Mengajukan Izin Akses</h3>
              <p className="text-xs max-w-xs text-neutral-500">
                Mohon klik "Izinkan" jika muncul permintaan akses kamera pada browser Anda.
              </p>
            </div>
          )}



          {cameraState === 'denied' && (
            <div className="flex flex-col items-center justify-center text-neutral-400 p-8 space-y-4 text-center">
              <div className="w-16 h-16 bg-red-950/30 rounded-full flex items-center justify-center border border-red-900/30">
                <ShieldAlert className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-white font-semibold text-base">Akses Kamera Ditolak</h3>
              <p className="text-xs max-w-xs text-neutral-500">
                Silakan izinkan akses kamera pada pengaturan browser Anda lalu coba kembali.
              </p>
            </div>
          )}

          {cameraState === 'unavailable' && (
            <div className="flex flex-col items-center justify-center text-neutral-400 p-8 space-y-4 text-center">
              <div className="w-16 h-16 bg-yellow-950/30 rounded-full flex items-center justify-center border border-yellow-900/30">
                <CameraOff className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-white font-semibold text-base">Kamera Tidak Tersedia</h3>
              <p className="text-xs max-w-xs text-neutral-500">
                Kamera tidak terdeteksi atau peranti media tidak mendukung penangkapan video.
              </p>
            </div>
          )}

          {(cameraState === 'ready' || cameraState === 'captured') && (
            <>
              {cameraState === 'ready' && !isVideoPlaying && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 p-8 space-y-4 text-center bg-neutral-950 z-10 rounded-2xl">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                  <p className="text-xs font-medium text-neutral-400">Menyalakan kamera...</p>
                </div>
              )}
              {cameraState === 'captured' && capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  onPlaying={() => setIsVideoPlaying(true)}
                  className="w-full h-full object-cover" 
                />
              )}
              
              {/* Guidance Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-md text-white text-[11px] md:text-xs py-2 px-3 rounded-xl text-center border border-white/10 font-medium tracking-wide">
                {cameraState === 'captured'
                  ? "Periksa hasil foto sebelum digunakan."
                  : (overlayText || (facingMode === 'user' ? "Posisikan wajah Anda di dalam frame kamera depan." : "Posisikan objek/bukti fisik di dalam frame kamera."))}
              </div>
            </>
          )}
        </div>

        {/* Buttons Section with custom hierarchy */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-3">
          {cameraState === 'captured' ? (
            <div className="w-full flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button 
                variant="ghost" 
                onClick={onClose} 
                className="w-full sm:w-auto order-3 sm:order-1 text-gray-500 h-11 sm:h-10 text-sm"
              >
                Batal
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRetake} 
                className="w-full sm:w-auto order-2 sm:order-2 border-gray-200 h-11 sm:h-10 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Ambil Ulang
              </Button>
              <Button 
                onClick={handleSave} 
                className="w-full sm:w-auto order-1 sm:order-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11 sm:h-10 text-sm"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Gunakan Foto
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full sm:w-auto order-2 sm:order-1 border-gray-200 h-11 sm:h-10 text-sm font-medium"
              >
                Batal
              </Button>
              <Button 
                onClick={handleCapture} 
                disabled={cameraState !== 'ready'} 
                className="w-full sm:w-auto order-1 sm:order-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm h-11 sm:h-10 text-sm"
              >
                <Camera className="w-4 h-4 mr-2" />
                Ambil Foto
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
