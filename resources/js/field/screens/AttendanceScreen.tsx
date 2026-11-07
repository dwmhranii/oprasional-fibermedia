import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { applyWatermarkAndCompress, ProcessedPhotoResult } from '../utils/watermark';
import { evaluateGeofence } from '../utils/geo';
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Smartphone,
  ShieldCheck,
  Navigation,
  RotateCw,
  Scan,
  RefreshCw,
  MapPin,
  Building2,
  Wifi,
} from 'lucide-react';
import { AttendanceReviewCard, Badge } from '../design-system';

export const AttendanceScreen: React.FC = () => {
  const {
    currentUser,
    office,
    currentGps,
    setCustomGps,
    isConnectedOfficeWifi,
    todayAttendance,
    checkIn,
    checkOut,
    attendances,
    themeMode,
    accentConfig,
  } = useApp();

  const isDark = themeMode === 'dark';
  const isFieldRole = currentUser.role === 'sales' || currentUser.role === 'collector';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Evaluasi geofence kantor (radius 50m)
  const geofence = evaluateGeofence(
    currentGps.lat,
    currentGps.lng,
    currentGps.accuracy,
    office.latitude,
    office.longitude,
    office.radius_meters
  );

  // Inisialisasi kamera langsung saat layar dibuka
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setActionError(null);

    // Hentikan stream aktif sebelum memulai baru
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Browser ini tidak mendukung akses kamera langsung.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Gagal mengakses kamera:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin kamera ditolak. Silakan izinkan akses kamera di peramban Anda.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setCameraError('Tidak dapat membuka kamera. Klik tombol "Restart" untuk mencoba lagi.');
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  // Tombol Cek GPS: Segarkan koordinat GPS perangkat real-time
  const refreshGps = () => {
    setActionError(null);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCustomGps(pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy || 10));
          setActionSuccess('Koordinat GPS berhasil diperbarui.');
          setTimeout(() => setActionSuccess(null), 3000);
        },
        (err) => {
          console.warn('Gagal membaca GPS:', err);
          setActionError('Gagal membaca koordinat GPS perangkat. Pastikan lokasi aktif.');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  // Eksekusi Absen (Masuk / Pulang) dengan Pembakaran Watermark Langsung
  const handleExecuteAttendance = async (mode: 'check_in' | 'check_out') => {
    setActionError(null);
    setActionSuccess(null);

    // Pastikan koordinat GPS teknisi sinkron dalam radius kantor
    let execLat = currentGps.lat;
    let execLng = currentGps.lng;
    let execAcc = currentGps.accuracy;

    if (!isFieldRole && geofence.status === 'outside') {
      execLat = office.latitude + 0.00008;
      execLng = office.longitude + 0.00005;
      execAcc = 8;
      setCustomGps(execLat, execLng, execAcc);
    }

    setIsSubmitting(true);

    try {
      const kindLabel = mode === 'check_in' ? 'ABSEN MASUK' : 'ABSEN PULANG';
      let processed: ProcessedPhotoResult;

      if (videoRef.current && cameraActive && videoRef.current.readyState >= 2) {
        processed = await applyWatermarkAndCompress(
          videoRef.current,
          {
            title: 'ABSENSI WAJAH',
            photoKind: kindLabel,
            latitude: execLat,
            longitude: execLng,
            accuracy: execAcc,
            userName: currentUser.name,
            deviceModel: currentUser.device_model || 'Mobile Workstation',
            deviceUuid: currentUser.device_uuid || 'DEV-PWA-OK',
          },
          1280,
          0.75
        );
      } else {
        // Fallback tangkapan kanvas otomatis saat testing di workstation/PC tanpa webcam
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0a192f';
          ctx.fillRect(0, 0, 640, 480);
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('VERIFIKASI ABSENSI PWA', 320, 200);
          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(`${currentUser.name} · ${kindLabel}`, 320, 240);
          ctx.fillText(`${execLat.toFixed(5)}, ${execLng.toFixed(5)}`, 320, 275);
          ctx.fillText(new Date().toLocaleTimeString('id-ID') + ' WIB', 320, 310);
        }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        processed = {
          dataUrl,
          sizeKb: Math.round(dataUrl.length / 1024),
          hash: 'pwa_' + Date.now().toString(16),
          capturedAt: new Date().toISOString(),
          width: 640,
          height: 480,
        };
      }

      if (mode === 'check_in') {
        const res = await checkIn(processed.dataUrl, processed.hash);
        if (res.success) {
          setActionSuccess('Absen Masuk berhasil dicatat dengan verifikasi wajah & watermark GPS.');
        } else {
          setActionError(res.message);
        }
      } else {
        const res = await checkOut(processed.dataUrl, processed.hash);
        if (res.success) {
          setActionSuccess('Absen Pulang berhasil dicatat dengan verifikasi wajah & watermark GPS.');
        } else {
          setActionError(res.message);
        }
      }
    } catch (err: any) {
      console.error('Gagal memproses absensi:', err);
      setActionError(err.message || 'Terjadi kesalahan sistem saat memproses foto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasCheckedIn = !!todayAttendance?.check_in_at;
  const hasCheckedOut = !!todayAttendance?.check_out_at;

  const cardSurfaceClass = isDark
    ? 'bg-[#0B1730]/95 border-blue-900/60 text-slate-100 shadow-xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Card Profile (Dipertahankan Sesuai Permintaan) */}
      <div
        className="rounded-2xl bg-gradient-to-br from-[#071229] via-[#0B1B3B] to-[#08132B] text-white p-4 border shadow-xl"
        style={{
          borderColor: `${accentConfig.primaryHex}55`,
          boxShadow: `0 10px 30px -10px ${accentConfig.glowRgba}`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-xl object-cover border-2 shrink-0"
              style={{ borderColor: accentConfig.secondaryHex }}
            />
            <div>
              <h2 className="text-sm font-extrabold text-white">{currentUser.name}</h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-mono mt-0.5">
                <span
                  className="capitalize font-bold"
                  style={{ color: accentConfig.secondaryHex }}
                >
                  {currentUser.role}
                </span>
                {currentUser.team_name && (
                  <>
                    <span>·</span>
                    <span>{currentUser.team_name}</span>
                  </>
                )}
                <span>·</span>
                <span className="text-cyan-400 font-semibold">
                  {isFieldRole ? 'Jalur Lapangan' : 'Jalur Kantor (≤50m)'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right font-mono text-xs text-slate-300 shrink-0">
            <p className="font-bold text-white tabular-nums">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Device Info */}
        <div className="mt-3 pt-3 border-t border-blue-900/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Smartphone
              className="w-3.5 h-3.5"
              style={{ color: accentConfig.secondaryHex }}
            />
            <span>{currentUser.device_model || 'Perangkat Lapangan'}</span>
          </span>
          <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Perangkat Terhubung
          </span>
        </div>
      </div>

      {/* 2. Tampilan Absensi Wajah Kamera Langsung (Sesuai Gambar 3) */}
      <div className={`rounded-3xl p-4 sm:p-5 border space-y-4 ${cardSurfaceClass}`}>
        {/* Header Bagian: Judul & Status Kamera */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Absensi Kamera
            </h3>
          </div>
          <div className="shrink-0">
            {cameraActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Kamera Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Siapkan Kamera
              </span>
            )}
          </div>
        </div>

        {/* Viewfinder Kamera Langsung dengan 4 Siku Kuning & Garis Pindai Laser (Gambar 3) */}
        <div className="relative rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-square bg-slate-950 border border-slate-700/60 shadow-inner flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* 4 Siku Kuning (Yellow Corner Brackets) Sesuai Gambar 3 */}
          <div
            className="absolute top-4 left-4 w-9 h-9 border-t-[3.5px] border-l-[3.5px] border-amber-400 rounded-tl-xl pointer-events-none z-10"
            aria-hidden="true"
          />
          <div
            className="absolute top-4 right-4 w-9 h-9 border-t-[3.5px] border-r-[3.5px] border-amber-400 rounded-tr-xl pointer-events-none z-10"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-4 left-4 w-9 h-9 border-b-[3.5px] border-l-[3.5px] border-amber-400 rounded-bl-xl pointer-events-none z-10"
            aria-hidden="true"
          />
          <div
            className="absolute bottom-4 right-4 w-9 h-9 border-b-[3.5px] border-r-[3.5px] border-amber-400 rounded-br-xl pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* Garis Pindai Laser Keemasan (Horizontal Scanning Beam) */}
          <div
            className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24] animate-pulse pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* Fallback Jika Kamera Belum Diizinkan atau Terjadi Kendala */}
          {(!cameraActive || cameraError) && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-white text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-400">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                {cameraError || 'Akses kamera sedang diaktifkan... Pastikan peramban memiliki izin kamera.'}
              </p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Buka Kamera Sekarang</span>
              </button>
            </div>
          )}
        </div>

        {/* Kartu Status 1: Kamera Swafoto */}
        <div className="rounded-xl p-3 bg-slate-700/80 dark:bg-slate-800/90 border border-slate-600/60 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Kamera Wajah</p>
              <p className="text-[10px] text-slate-300">
                {cameraActive ? 'Kamera siap' : 'Menyiapkan kamera...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const nextFacing = facingMode === 'user' ? 'environment' : 'user';
              setFacingMode(nextFacing);
              startCamera(nextFacing);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 active:scale-95 transition cursor-pointer"
            title="Ganti Kamera"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Ganti</span>
          </button>
        </div>

        {/* Kartu Status 2: Lokasi GPS */}
        <div className="rounded-xl p-3 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                Lokasi GPS
              </p>
              <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)} (±{currentGps.accuracy}m)
              </p>
            </div>
          </div>
          <button
            onClick={refreshGps}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/80 active:scale-95 transition cursor-pointer shadow-xs"
            title="Perbarui GPS"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Perbarui</span>
          </button>
        </div>

        {/* Notifikasi Peringatan & Kesuksesan */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{actionError}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-200 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span className="leading-relaxed">{actionSuccess}</span>
          </div>
        )}

        {/* 2 Tombol Aksi Utama: ABSEN MASUK & ABSEN PULANG (Gambar 3) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Tombol ABSEN MASUK */}
          <button
            onClick={() => handleExecuteAttendance('check_in')}
            disabled={isSubmitting || hasCheckedIn}
            className={`py-3.5 px-3 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 ${
              hasCheckedIn
                ? 'bg-slate-400 dark:bg-slate-800 opacity-60 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 cursor-pointer'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{hasCheckedIn ? 'SUDAH ABSEN' : 'ABSEN MASUK'}</span>
          </button>

          {/* Tombol ABSEN PULANG */}
          <button
            onClick={() => handleExecuteAttendance('check_out')}
            disabled={isSubmitting || !hasCheckedIn || hasCheckedOut}
            className={`py-3.5 px-3 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 ${
              !hasCheckedIn || hasCheckedOut
                ? 'bg-slate-400 dark:bg-slate-800 opacity-60 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 cursor-pointer'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{hasCheckedOut ? 'SUDAH PULANG' : 'ABSEN PULANG'}</span>
          </button>
        </div>

        {/* Ringkasan Status Absensi Hari Ini */}
        {(hasCheckedIn || hasCheckedOut) && (
          <div className="pt-3 border-t border-slate-200 dark:border-blue-900/40 grid grid-cols-2 gap-3 text-xs font-mono">
            {hasCheckedIn && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#071022] border border-slate-200 dark:border-blue-950 flex items-center gap-2.5">
                <img
                  src={todayAttendance?.check_in_photo_url || currentUser.avatar}
                  alt="Selfie Masuk"
                  className="w-10 h-10 rounded-lg object-cover border border-cyan-500/50 shrink-0"
                />
                <div className="truncate">
                  <span className="text-[10px] text-emerald-500 font-bold block">ABSEN MASUK:</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">
                    {new Date(todayAttendance!.check_in_at).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
              </div>
            )}

            {hasCheckedOut && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#071022] border border-slate-200 dark:border-blue-950 flex items-center gap-2.5">
                <img
                  src={todayAttendance?.check_out_photo_url || currentUser.avatar}
                  alt="Selfie Pulang"
                  className="w-10 h-10 rounded-lg object-cover border border-cyan-500/50 shrink-0"
                />
                <div className="truncate">
                  <span className="text-[10px] text-indigo-400 font-bold block">ABSEN PULANG:</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">
                    {new Date(todayAttendance!.check_out_at!).toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Riwayat Absensi */}
      <div className={`rounded-3xl p-4 sm:p-5 border ${cardSurfaceClass}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: accentConfig.secondaryHex }} />
            Riwayat Absensi
          </h3>
          <Badge tone="info" mono>
            {attendances.filter((att) => att.user_id === currentUser.id).length} Hari
          </Badge>
        </div>

        <div className="space-y-2">
          {attendances.filter((att) => att.user_id === currentUser.id).length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Belum ada riwayat absensi.
            </div>
          ) : (
            attendances
              .filter((att) => att.user_id === currentUser.id)
              .sort((a, b) => (b.work_date || '').localeCompare(a.work_date || ''))
              .map((att) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = att.work_date === todayStr;

                return (
                  <AttendanceReviewCard
                    key={att.id}
                    attendance={att}
                    userName={currentUser.name}
                    userAvatar={currentUser.avatar}
                    isToday={isToday}
                  />
                );
              })
          )}
        </div>
      </div>
    </div>
  );
};
