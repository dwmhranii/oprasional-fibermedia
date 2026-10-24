import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Camera,
  CheckCircle,
  AlertCircle,
  Clock,
  Smartphone,
  Users,
  LogOut,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Wifi,
  Radio,
  Lock,
  UserCheck,
  User,
  CloudOff,
  FileText,
  Wrench,
  Layers,
} from 'lucide-react';
import {
  syncServerTime,
  getServerTimeIso,
  captureAndCompressFromVideo,
  enqueueOfflineRequest,
  flushOfflineQueue,
  db,
} from '../shared';
import { SalesSubmissionsView } from './SalesSubmissionsView';
import { TechnicianWorkOrdersView } from './TechnicianWorkOrdersView';
import { NetworkMapOfflineView } from './NetworkMapOfflineView';

interface OfficeLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  roles: string[];
  team?: {
    id: number;
    name: string;
    is_ready: boolean;
  } | null;
}

interface AttendanceRecord {
  id: number;
  work_date: string;
  status: string;
  check_in_at: string | null;
  check_out_at: string | null;
  office_distance_meters: number | null;
  late_minutes: number;
  photo_url: string | null;
}

export const FieldApp: React.FC = () => {
  // Auth state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fmp_field_token'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem('fmp_field_user');
    return raw ? JSON.parse(raw) : null;
  });

  const isSales = currentUser?.roles?.some((r) => r.toLowerCase() === 'sales') || false;
  const isTechnician = Boolean(currentUser?.team || currentUser?.roles?.some((r) => ['technician', 'teknisi'].includes(r.toLowerCase())));
  const [activeTab, setActiveTab] = useState<'attendance' | 'sales' | 'work_orders' | 'network_map'>('attendance');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Device state
  const [deviceUuid, setDeviceUuid] = useState<string>(() => {
    let d = localStorage.getItem('fmp_device_uuid');
    if (!d) {
      d = 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem('fmp_device_uuid', d);
    }
    return d;
  });
  const [deviceApproved, setDeviceApproved] = useState<boolean>(true);

  // Attendance state
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(false);

  // Geolocation state
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [nearestOffice, setNearestOffice] = useState<OfficeLocation | null>(null);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Current Team Ticket state (Fase 2)
  const [currentTicket, setCurrentTicket] = useState<{
    type: 'psb' | 'complaint';
    id: number;
    number: string;
    status: string;
    customer_name: string;
    address: string;
    phone: string;
    deadline?: string;
    accepted_at?: string;
    accepted_by?: string;
    team_name?: string;
  } | null>(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [isProcessingTicket, setIsProcessingTicket] = useState(false);

  // Fetch current assigned ticket
  const fetchCurrentTicket = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/field/tickets/current', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCurrentTicket(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch current ticket', e);
    }
  };

  const handleAcceptTicket = async () => {
    if (!currentTicket || !token) return;
    setIsProcessingTicket(true);
    try {
      const res = await fetch(`/api/field/tickets/${currentTicket.type}/${currentTicket.id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({ text: json.message || 'Tiket berhasil diterima!', type: 'success' });
        fetchCurrentTicket();
      } else {
        setActionMessage({ text: json.message || 'Gagal menerima tiket.', type: 'error' });
      }
    } catch (e) {
      setActionMessage({ text: 'Koneksi gagal.', type: 'error' });
    } finally {
      setIsProcessingTicket(false);
    }
  };

  const handleDeclineTicket = async () => {
    if (!currentTicket || !token || !declineReason.trim()) return;
    setIsProcessingTicket(true);
    try {
      const res = await fetch(`/api/field/tickets/${currentTicket.type}/${currentTicket.id}/decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ reason: declineReason }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({ text: json.message || 'Tiket berhasil ditolak.', type: 'success' });
        setIsDeclineModalOpen(false);
        setDeclineReason('');
        fetchCurrentTicket();
      } else {
        setActionMessage({ text: json.message || 'Gagal menolak tiket.', type: 'error' });
      }
    } catch (e) {
      setActionMessage({ text: 'Koneksi gagal.', type: 'error' });
    } finally {
      setIsProcessingTicket(false);
    }
  };

  // 1. Haversine distance formula in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // 2. Fetch today's attendance & office info
  const fetchTodayData = async () => {
    if (!token) return;
    setIsLoadingToday(true);
    try {
      const res = await fetch('/api/attendance/today', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentUser(json.data.user);
          localStorage.setItem('fmp_field_user', JSON.stringify(json.data.user));
          setAttendance(json.data.attendance);
          setOffices(json.data.offices || []);
          fetchCurrentTicket();
        }
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to fetch today data', err);
    } finally {
      setIsLoadingToday(false);
    }
  };

  // 3. Register device on startup
  const registerDevice = async (authToken: string) => {
    try {
      const platform = navigator.userAgent.includes('Android')
        ? 'Android'
        : navigator.userAgent.includes('iPhone')
        ? 'iOS'
        : 'Browser';
      const res = await fetch('/api/field/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          device_uuid: deviceUuid,
          label: `${platform} PWA Client`,
          platform: platform,
          model: navigator.userAgent.substring(0, 80),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDeviceApproved(Boolean(json.data.is_approved));
        }
      }
    } catch (err) {
      console.error('Failed to register device', err);
    }
  };

  // 4. Start GPS Tracking
  useEffect(() => {
    if (!token) return;

    if (!('geolocation' in navigator)) {
      setGeoError('GPS / Geolocation tidak didukung di perangkat ini.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrentCoords(coords);
        setGeoError(null);
      },
      (err) => {
        setGeoError('Izin GPS ditolak atau tidak tersedia. Aktifkan lokasi untuk absensi.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  // 5. Update distance to nearest office when coords change
  useEffect(() => {
    if (!currentCoords || offices.length === 0) return;

    let min = Infinity;
    let closest: OfficeLocation | null = null;

    offices.forEach((off) => {
      const d = calculateDistance(currentCoords.lat, currentCoords.lng, off.latitude, off.longitude);
      if (d < min) {
        min = d;
        closest = off;
      }
    });

    setNearestDistance(min);
    setNearestOffice(closest);
  }, [currentCoords, offices]);

  // Initial load
  useEffect(() => {
    syncServerTime();

    if (token) {
      registerDevice(token);
      fetchTodayData();
    }

    const handleOnline = () => {
      flushOfflineQueue(() => {
        fetchTodayData();
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [token]);

  // 6. Camera Controls
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error', err);
      setActionMessage({ text: 'Gagal mengakses kamera. Pastikan izin kamera aktif.', type: 'error' });
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const result = await captureAndCompressFromVideo(videoRef.current, false, getServerTimeIso());
      setCapturedPhoto(result.base64);
      stopCamera();
    } catch (err) {
      console.error('Capture error, using fallback', err);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
      }
      stopCamera();
    }
  };

  // Fallback file input for camera
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 7. Login action
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'pwa',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          login: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('fmp_field_token', data.token);
        localStorage.setItem('fmp_field_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
      } else {
        setLoginError(data.message || 'Login gagal. Periksa username dan password.');
      }
    } catch (err) {
      setLoginError('Koneksi ke server gagal. Periksa jaringan Anda.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 8. Logout
  const handleLogout = () => {
    stopCamera();
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('fmp_field_token');
    localStorage.removeItem('fmp_field_user');
  };

  // 9. Check In action (with Idempotency-Key and Dexie Offline fallback)
  const handleCheckIn = async () => {
    if (!currentCoords) {
      setActionMessage({ text: 'GPS belum mengunci lokasi Anda.', type: 'error' });
      return;
    }
    if (!capturedPhoto) {
      setActionMessage({ text: 'Ambil foto selfie langsung dari kamera terlebih dahulu.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    const idempotencyKey = 'idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    const payload = {
      latitude: currentCoords.lat,
      longitude: currentCoords.lng,
      accuracy: currentCoords.accuracy || 10,
      device_uuid: deviceUuid,
      selfie_base64: capturedPhoto,
      captured_at: getServerTimeIso(),
    };

    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        setCapturedPhoto(null);
        fetchTodayData();
      } else {
        setActionMessage({ text: data.message || 'Gagal absen masuk.', type: 'error' });
      }
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueOfflineRequest('/api/attendance/check-in', 'POST', payload, token);
        setActionMessage({
          text: 'Offline: Absen masuk disimpan di antrean Dexie dan akan dikirim otomatis saat online.',
          type: 'success',
        });
        setCapturedPhoto(null);
      } else {
        setActionMessage({ text: 'Terjadi kesalahan jaringan.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 10. Check Out action (with Idempotency-Key)
  const handleCheckOut = async () => {
    if (!currentCoords) {
      setActionMessage({ text: 'GPS belum mengunci lokasi Anda.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    const idempotencyKey = 'idemp_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    const payload = {
      latitude: currentCoords.lat,
      longitude: currentCoords.lng,
      accuracy: currentCoords.accuracy || 10,
    };

    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: data.message, type: 'success' });
        fetchTodayData();
      } else {
        setActionMessage({ text: data.message || 'Gagal absen pulang.', type: 'error' });
      }
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueOfflineRequest('/api/attendance/check-out', 'POST', payload, token);
        setActionMessage({
          text: 'Offline: Absen pulang disimpan di antrean Dexie dan akan dikirim otomatis saat online.',
          type: 'success',
        });
      } else {
        setActionMessage({ text: 'Terjadi kesalahan jaringan.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Geofence status
  const maxRadius = nearestOffice?.radius_meters || 50;
  const isWithinGeofence = nearestDistance !== null && nearestDistance <= maxRadius;

  // Render Login View if unauthenticated
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950 flex flex-col justify-center px-4 py-8">
        <div className="max-w-md w-full mx-auto">
          {/* Brand Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-lg shadow-sky-500/10 mb-3">
              <Wifi className="w-8 h-8 text-sky-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">FIBERMEDIA FIELD</h1>
            <p className="text-xs text-sky-200/70 mt-1 uppercase tracking-widest font-semibold">
              PWA Operasional Lapangan &amp; Absensi
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-bold text-white mb-2">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-400 mb-6">
              Teknisi, Sales, dan CS: Sesi PWA berlaku 12 jam.
            </p>

            {loginError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email atau Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama@fibermedia.id atau username"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      Masuk ke PWA
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                ID Perangkat: <span className="font-mono text-slate-400">{deviceUuid.substring(0, 16)}...</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Authenticated Field PWA View
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col max-w-lg mx-auto shadow-2xl pb-10">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">FIBERMEDIA FIELD</h1>
            <p className="text-[10px] text-slate-400 leading-none">Portal Operasional</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTodayData}
            title="Segarkan data"
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingToday ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Role Navigation Tabs for Sales & Technicians */}
      {(isSales || isTechnician) && (
        <div className="flex border-b border-slate-800 bg-slate-900/95 px-4 pt-2 gap-2 sticky top-[57px] z-20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'attendance'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Absensi
          </button>

          {isTechnician && (
            <button
              type="button"
              onClick={() => setActiveTab('work_orders')}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'work_orders'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Work Order
            </button>
          )}

          {isTechnician && (
            <button
              type="button"
              onClick={() => setActiveTab('network_map')}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'network_map'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Peta Jaringan
            </button>
          )}

          {isSales && (
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'sales'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Pengajuan Pelanggan
            </button>
          )}
        </div>
      )}

      {/* Main Content Body */}
      <main className="p-4 space-y-4 flex-1">
        {/* User & Role Status Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">{currentUser?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-800/60">
                {currentUser?.roles?.[0] || 'Staff'}
              </span>
              {currentUser?.team && (
                <span className="text-[11px] font-medium text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-800/60 flex items-center gap-1">
                  <Users className="w-3 h-3 text-indigo-400" />
                  {currentUser.team.name}
                </span>
              )}
            </div>
          </div>

          {/* Team readiness pill (for technicians) */}
          {currentUser?.team && (
            <div className="text-right">
              {currentUser.team.is_ready ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tim Siap
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Tim Belum Siap
                </div>
              )}
              <span className="text-[10px] text-slate-400 block mt-0.5">Kesiapan Tim</span>
            </div>
          )}
        </div>

        {isTechnician && activeTab === 'work_orders' ? (
          <TechnicianWorkOrdersView
            token={token}
            currentUser={currentUser}
            currentCoords={currentCoords}
            onRefreshParent={fetchTodayData}
          />
        ) : isTechnician && activeTab === 'network_map' ? (
          <NetworkMapOfflineView
            token={token}
            currentCoords={currentCoords}
          />
        ) : isSales && activeTab === 'sales' ? (
          <SalesSubmissionsView
            token={token}
            currentCoords={currentCoords}
            deviceUuid={deviceUuid}
          />
        ) : (
          <>
            {/* Action / Error Banner */}
        {actionMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-start gap-3 text-xs ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* GPS Geofence & Office Proximity Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-400" />
              Radius Kantor (Maks. {maxRadius} meter)
            </span>
            {nearestDistance !== null ? (
              isWithinGeofence ? (
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Dalam Radius ({nearestDistance} m)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Di Luar ({nearestDistance} m)
                </span>
              )
            ) : (
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Mendeteksi GPS...
              </span>
            )}
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 text-xs space-y-1.5 border border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>Kantor Terdekat:</span>
              <span className="text-white font-medium">{nearestOffice?.name || 'Fibermedia HQ'}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Koordinat Anda:</span>
              <span className="text-slate-300 font-mono">
                {currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : '-'}
              </span>
            </div>
            {currentCoords?.accuracy && (
              <div className="flex justify-between text-slate-400">
                <span>Akurasi GPS:</span>
                <span className="text-slate-300">± {Math.round(currentCoords.accuracy)} meter</span>
              </div>
            )}
          </div>

          {geoError && (
            <p className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
              {geoError}
            </p>
          )}
        </div>

        {/* Today Attendance Status Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-400" />
            Kehadiran Hari Ini ({new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })})
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Check-In Status */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block mb-1">Absen Masuk</span>
              {attendance?.check_in_at ? (
                <div>
                  <span className="text-lg font-black text-emerald-400 block font-mono">
                    {attendance.check_in_at}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    Tercatat ({attendance.office_distance_meters || 0}m)
                  </span>
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-500 italic">Belum Absen</span>
              )}
            </div>

            {/* Check-Out Status */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] text-slate-400 block mb-1">Absen Pulang</span>
              {attendance?.check_out_at ? (
                <div>
                  <span className="text-lg font-black text-sky-400 block font-mono">
                    {attendance.check_out_at}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-sky-500" />
                    Selesai
                  </span>
                </div>
              ) : attendance?.check_in_at ? (
                <span className="text-xs font-medium text-amber-400">Sedang Bertugas</span>
              ) : (
                <span className="text-xs font-medium text-slate-500 italic">-</span>
              )}
            </div>
          </div>
        </div>

        {/* Live Selfie Camera & Actions Section */}
        {!attendance?.check_in_at && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sky-400" />
              Bukti Selfie Kamera (Wajib Masuk)
            </h3>

            {/* Camera Viewport or Preview */}
            <div className="relative aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : capturedPhoto ? (
                <img
                  src={capturedPhoto}
                  alt="Selfie"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 text-slate-500">
                  <Camera className="w-12 h-12 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">Foto selfie langsung dari kamera depan</p>
                </div>
              )}

              {/* Guiding Face Target Overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full border-2 border-dashed border-sky-400/70"></div>
                </div>
              )}
            </div>

            {/* Camera Control Buttons */}
            <div className="flex gap-2 justify-center">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-sky-500/20"
                >
                  <Camera className="w-4 h-4" />
                  Ambil Foto
                </button>
              ) : capturedPhoto ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Foto Ulang
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4 text-sky-400" />
                    Buka Kamera
                  </button>
                  <label className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium py-2.5 px-3 rounded-xl text-xs cursor-pointer flex items-center gap-1.5">
                    <span>Input Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Check-In Button */}
            <button
              type="button"
              disabled={isSubmitting || !isWithinGeofence || !capturedPhoto}
              onClick={handleCheckIn}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Memproses Absen...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  ABSEN MASUK
                </>
              )}
            </button>

            {!isWithinGeofence && (
              <p className="text-[11px] text-center text-rose-400">
                Tombol absen aktif jika Anda berada dalam radius {maxRadius} meter dari kantor.
              </p>
            )}
          </div>
        )}

        {/* Assigned Team Ticket Section (Fase 2: Satu tim satu tiket, tombol Terima/Tolak) */}
        {attendance?.check_in_at && currentTicket && (
          <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900/80 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3.5 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
                <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-300">
                  Tiket Tugas Tim ({currentTicket.type.toUpperCase()})
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                currentTicket.status === 'assigned'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {currentTicket.status === 'assigned' ? 'Menunggu Penerimaan' : 'Diterima & Berjalan'}
              </span>
            </div>

            <div>
              <div className="font-mono text-xs font-bold text-white mb-0.5">
                {currentTicket.number}
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {currentTicket.customer_name}
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{currentTicket.address}</span>
              </p>
              {currentTicket.deadline && currentTicket.status === 'assigned' && (
                <div className="text-[11px] text-amber-400 mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Batas waktu respon: {new Date(currentTicket.deadline).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                </div>
              )}
            </div>

            {currentTicket.status === 'assigned' ? (
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={isProcessingTicket}
                  onClick={handleAcceptTicket}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  TERIMA TIKET
                </button>
                <button
                  type="button"
                  disabled={isProcessingTicket}
                  onClick={() => setIsDeclineModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-rose-900/40 border border-rose-500/40 text-rose-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  TOLAK
                </button>
              </div>
            ) : (
              <div className="pt-2 bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Tiket telah diterima {currentTicket.accepted_by ? `oleh ${currentTicket.accepted_by}` : ''}. Silakan kerjakan sesuai SOP.</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Tolak Tiket dengan Alasan Wajib */}
        {isDeclineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Konfirmasi Penolakan Tiket
              </h3>
              <p className="text-xs text-slate-300">
                Alasan penolakan wajib diisi. Tiket akan langsung dioper otomatis ke tim berikutnya.
              </p>
              <textarea
                rows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Contoh: Lokasi banjir / peralatan khusus tidak tersedia..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setIsDeclineModalOpen(false); setDeclineReason(''); }}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!declineReason.trim() || isProcessingTicket}
                  onClick={handleDeclineTicket}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-1"
                >
                  {isProcessingTicket && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Kirim Penolakan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Check-Out Button Section (if checked-in and not checked-out) */}
        {attendance?.check_in_at && !attendance?.check_out_at && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-amber-400" />
              Selesai Bertugas
            </h3>
            <p className="text-xs text-slate-400">
              Absen pulang wajib dilakukan kembali di titik radius {maxRadius} meter dari kantor.
            </p>

            <button
              type="button"
              disabled={isSubmitting || !isWithinGeofence}
              onClick={handleCheckOut}
              className="w-full bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mencatat Absen Pulang...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  ABSEN PULANG
                </>
              )}
            </button>
          </div>
        )}

        {/* Attendance Completed Banner */}
        {attendance?.check_in_at && attendance?.check_out_at && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-emerald-300">Absensi Hari Ini Lengkap</h3>
            <p className="text-xs text-slate-400 mt-1">
              Terima kasih atas dedikasi Anda hari ini. Selamat beristirahat!
            </p>
          </div>
        )}
        </>
      )}

        {/* Device Information Footer */}
        <div className="rounded-xl bg-slate-950/40 p-3 border border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            {deviceApproved ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Perangkat Terverifikasi
              </span>
            ) : (
              <span className="text-amber-400">Menunggu Persetujuan</span>
            )}
          </span>
          <span className="font-mono text-slate-400 text-[10px]">
            UUID: {deviceUuid.substring(0, 12)}...
          </span>
        </div>
      </main>
    </div>
  );
};

export default FieldApp;
