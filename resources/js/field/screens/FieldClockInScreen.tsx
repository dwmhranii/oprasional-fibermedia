import React, { useState } from 'react';
import {
  Button,
  Badge,
  IconButton,
  StatCard,
} from '@shared/ui';
import {
  Camera,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { formatCoordinate, formatDistance } from '@shared/lib/formatters';

export interface FieldClockInScreenProps {
  officeLocation?: { name: string; lat: number; lng: number; radiusMeters: number };
  onClockInSuccess?: (record: any) => void;
}

export const FieldClockInScreen: React.FC<FieldClockInScreenProps> = ({
  officeLocation = {
    name: 'Kantor Operasional Kepanjen',
    lat: -8.1132,
    lng: 112.6415,
    radiusMeters: 50,
  },
  onClockInSuccess,
}) => {
  const [currentLat, setCurrentLat] = useState(-8.11322);
  const [currentLng, setCurrentLng] = useState(112.64154);
  const [distanceMeters, setDistanceMeters] = useState(18);
  const [accuracyMeters, setAccuracyMeters] = useState(3.5);
  const [photoCaptured, setPhotoCaptured] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isInsideRadius = distanceMeters <= officeLocation.radiusMeters;

  const handleSimulateCapture = () => {
    // Simulated realistic photo capture
    setPhotoCaptured('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80');
  };

  const handleClockIn = () => {
    if (!photoCaptured) return;
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      if (onClockInSuccess) {
        onClockInSuccess({
          clockInTime: '08:02 WIB',
          distanceMeters,
          isInsideRadius,
          photoUrl: photoCaptured,
        });
      }
    }, 700);
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] animate-in zoom-in-95">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Absen Masuk Berhasil!
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Waktu kehadiran dan koordinat GPS telah tercatat di server Fibermedia.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs text-left font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">Waktu Absen:</span>
            <span className="font-bold text-foreground">08:02:15 WIB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">Jarak Kantor:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">18 m (Valid)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-sans">Lokasi:</span>
            <span className="text-foreground">{officeLocation.name}</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          density="comfortable"
          className="w-full min-h-12"
          onClick={() => setIsSuccess(false)}
        >
          Selesai &amp; Lihat Daftar Tugas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Geofence Status Card */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Status Geofence Kantor</h4>
              <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                {officeLocation.name}
              </p>
            </div>
          </div>

          <Badge
            tone={isInsideRadius ? 'success' : 'danger'}
            size="sm"
            icon={isInsideRadius ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          >
            {isInsideRadius ? 'Di dalam radius' : 'Di luar radius'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-muted/30 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Jarak dari Kantor:</span>
            <span className="font-mono font-bold text-foreground text-sm">
              {formatDistance(distanceMeters)}
            </span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              (Maks. {officeLocation.radiusMeters} m)
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Akurasi GPS:</span>
            <span className="font-mono font-bold text-foreground text-sm">
              ±{accuracyMeters.toFixed(1)} m
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
              Sinyal GPS Akurat
            </span>
          </div>
        </div>
      </div>

      {/* Selfie Photo Preview / Capture Canvas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Swafoto Wajah (Wajib)
          </span>
          {photoCaptured && (
            <button
              type="button"
              onClick={() => setPhotoCaptured(null)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Foto Ulang</span>
            </button>
          )}
        </div>

        <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center">
          {photoCaptured ? (
            <img
              src={photoCaptured}
              alt="Swafoto Absen Masuk"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Posisikan wajah di dalam bingkai dengan pencahayaan yang cukup.
              </p>
              <Button
                variant="outline"
                size="md"
                density="comfortable"
                className="min-h-12"
                onClick={handleSimulateCapture}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Ambil Swafoto
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Primary Action Button (Target sentuh min 48px) */}
      <div className="pt-2">
        <Button
          variant="primary"
          size="lg"
          density="comfortable"
          isLoading={isLoading}
          disabled={!photoCaptured}
          onClick={handleClockIn}
          className="w-full min-h-12 text-base font-semibold shadow-md shadow-cyan-500/25"
          leftIcon={<Clock className="w-5 h-5" />}
        >
          Konfirmasi Absen Masuk
        </Button>
      </div>
    </div>
  );
};

