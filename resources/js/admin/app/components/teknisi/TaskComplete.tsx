import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { TaskChecklist } from './TaskChecklist';
import { CustomerSignature } from './CustomerSignature';
import { GpsCapture, GpsData } from './GpsCapture';
import { CameraUploader } from './CameraUploader';
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Camera,
  FileSignature,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Wifi,
  Layers,
  ClipboardList,
  Send,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { TaskSkeleton } from '../ui/SkeletonLoaders';

// Quick template notes for field technicians
const QUICK_NOTES = [
  '⚡ Instalasi selesai, modem aktif & sinyal optimal',
  '📡 Redaman optik -18.5 dBm (Sangat Baik)',
  '📶 WiFi & internet telah diuji bersama pelanggan',
  '🛠️ Kabel drop core terpasang rapi & kokoh',
  '🤝 Pelanggan puas & serah terima selesai',
];

export const TaskComplete: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch task detail with auto polling for team sync
  const { data: task, isLoading: isTaskLoading, isError, error, refetch } = useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: () => apiClient.get<any>(`/teknisi/tasks/${id}`),
    enabled: !!id,
    staleTime: 1000 * 5,
    refetchInterval: 5000,
  });

  const isReturned = task?.current_assignment?.status === 'returned' || task?.status === 'returned';
  const step = isReturned ? 2 : (task?.shared_verification?.current_step || (task?.shared_verification?.completed ? 2 : 1));
  const existingEvidence = task?.current_assignment?.evidence || {};
  const existingSignature = task?.customer_signature_url || existingEvidence.signature_url || existingEvidence.signature_path;

  const initialGpsData: GpsData | undefined = existingEvidence.latitude && existingEvidence.longitude ? {
    latitude: Number(existingEvidence.latitude),
    longitude: Number(existingEvidence.longitude),
    accuracy: existingEvidence.accuracy ? Number(existingEvidence.accuracy) : undefined,
    captured_at: existingEvidence.captured_at || task?.current_assignment?.updated_at || new Date().toISOString()
  } : undefined;

  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingPhase1, setIsSubmittingPhase1] = useState(false);
  const [isSuccessSummary, setIsSuccessSummary] = useState(false);

  // Optional sections toggles
  const [showOptionalPhotos, setShowOptionalPhotos] = useState(false);
  const [showSopChecklist, setShowSopChecklist] = useState(false);

  const hasBefore = !!task?.photos?.before || !!existingEvidence.photo_before;
  const hasAfter = !!task?.photos?.after || !!existingEvidence.photo_after;

  // Sync initial GPS data
  useEffect(() => {
    if (initialGpsData && !gpsData) {
      setGpsData(initialGpsData);
    }
  }, [initialGpsData, gpsData]);

  // Coordinates of customer
  const customerLat = Number(task?.customer?.lat || task?.customer?.latitude || task?.submission?.lat || 0);
  const customerLng = Number(task?.customer?.lng || task?.customer?.longitude || task?.submission?.lng || 0);
  const hasCustomerLocation = customerLat !== 0 && customerLng !== 0;

  // Haversine formula for geofence validation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const currentDistance =
    hasCustomerLocation && gpsData
      ? calculateDistance(customerLat, customerLng, gpsData.latitude, gpsData.longitude)
      : null;

  const uploadPhoto = async (
    file: File,
    photoType: string,
    coords?: { latitude?: number; longitude?: number; accuracy?: number }
  ) => {
    const formData = new FormData();
    formData.append('photo_type', photoType);
    formData.append('photo', file);
    if (coords?.latitude !== undefined && coords.latitude !== 0) {
      formData.append('latitude', String(coords.latitude));
    }
    if (coords?.longitude !== undefined && coords.longitude !== 0) {
      formData.append('longitude', String(coords.longitude));
    }
    if (coords?.accuracy !== undefined && coords.accuracy !== 0) {
      formData.append('accuracy', String(coords.accuracy));
    }
    return apiClient.upload<any>(`/teknisi/tasks/${id}/upload-photo`, formData);
  };

  const handleSharedUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', id] });
  };

  const handleQuickNoteClick = (snippet: string) => {
    setNotes((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet)) return trimmed;
      return `${trimmed}\n${snippet}`;
    });
  };

  // Phase 1 Submission
  const handleStep1Submit = async () => {
    setIsSubmittingPhase1(true);
    try {
      await apiClient.post(`/teknisi/tasks/${id}/phase-1`);
      toast.success('Verifikasi bersama berhasil disubmit (Tahap 1 Selesai)!');
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', id] });
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal submit Tahap 1.');
      } else {
        toast.error('Terjadi kesalahan koneksi.');
      }
    } finally {
      setIsSubmittingPhase1(false);
    }
  };

  // Phase 2 Submission
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gpsData) {
      toast.error('Lokasi GPS wajib direkam.');
      return;
    }
    if (!notes.trim()) {
      toast.error('Catatan penyelesaian wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/teknisi/tasks/${id}/phase-2`, {
        completion_notes: notes.trim(),
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        accuracy: gpsData.accuracy,
      });

      toast.success('Laporan kehadiran dan penyelesaian tugas berhasil dikirim!');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsSuccessSummary(true);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menyimpan laporan penyelesaian.');
      } else {
        toast.error('Terjadi kesalahan koneksi saat mengirim laporan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isTaskLoading) {
    return <TaskSkeleton />;
  }

  if (isError || !task) {
    if (error instanceof ApiError && error.status === 403) {
      return <Navigate to="/403" replace />;
    }
    return (
      <div className="space-y-6 max-w-xl mx-auto py-8 px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teknisi/tasks')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar Tugas
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Gagal mengambil data penugasan dari server.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Success View
  if (isSuccessSummary) {
    const now = new Date();
    const submitDate = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    const submitTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
        <div className="w-full max-w-md space-y-5">
          <Card className="border-emerald-200 shadow-xl overflow-hidden bg-white relative">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-50">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Laporan Berhasil Dikirim!</h2>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 mb-4 px-3 py-1 font-semibold">
                ⏳ Menunggu Persetujuan Admin
              </Badge>
              
              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-6">
                Seluruh foto dokumentasi, tanda tangan pelanggan, dan absensi GPS Anda telah tersimpan di sistem.
              </p>

              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6 text-left space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-gray-500">No. SPK</span>
                  <span className="font-mono font-bold text-indigo-700">{task.task_number || `TSK-${task.id}`}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-gray-500">Pelanggan</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[180px]">{task.customer?.name}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">Waktu Kirim</span>
                  <span className="font-medium text-gray-800">{submitDate}, {submitTime}</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5">
                <Button 
                  onClick={() => navigate('/teknisi/tasks')} 
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Daftar Tugas
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/teknisi/tasks/${task.id}`)} 
                  className="w-full h-11 text-gray-700 text-sm hover:bg-gray-50"
                >
                  Lihat Detail Tugas Ini
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Phase 1 Requirements Calculation
  const isPhase1Ready = hasBefore && hasAfter && !!existingSignature;
  const phase1MissingList = [
    !hasBefore && 'Foto Sebelum',
    !hasAfter && 'Foto Sesudah',
    !existingSignature && 'Tanda Tangan Pelanggan',
  ].filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12 px-3 sm:px-4">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate(`/teknisi/tasks/${task.id}`)} 
          disabled={isSubmitting || isSubmittingPhase1} 
          className="h-10 w-10 shrink-0 rounded-xl border-gray-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
              {task.task_number || `TSK-${task.id}`}
            </span>
            {task.service_package && (
              <span className="text-xs text-gray-500 truncate">• {task.service_package}</span>
            )}
          </div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate mt-0.5">
            Penyelesaian: {task.customer?.name}
          </h1>
        </div>
      </div>

      {/* Admin Revision Alert (If Returned) */}
      {isReturned && (
        <Alert className="bg-rose-50 border-rose-300 text-rose-950 p-3.5 sm:p-4 rounded-xl">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <AlertTitle className="font-bold text-rose-900 text-sm">
              Perlu Perbaikan (Tugas Dikembalikan Admin)
            </AlertTitle>
            <AlertDescription className="text-rose-800 text-xs sm:text-sm leading-relaxed">
              Catatan: <strong className="italic font-bold">"{task.current_assignment?.notes || task.submission?.rejection_reason || existingEvidence.notes || 'Harap perbaiki dan foto ulang bukti pemasangan.'}"</strong>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Clean Segmented Stepper */}
      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
        <div className={`flex-1 py-2 px-2 text-center rounded-lg transition-all ${
          step === 1 ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-500'
        }`}>
          {step === 2 || task?.shared_verification?.completed ? '✓ ' : ''}1. Bukti Lapangan (Tim)
        </div>
        <div className={`flex-1 py-2 px-2 text-center rounded-lg transition-all ${
          step === 2 ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-400'
        }`}>
          2. Absensi & Laporan (Anda)
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAHAP 1: VERIFIKASI BERSAMA TIM (STREAMLINED FLOW)                        */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-4">
          {/* 1. Foto Pemasangan Card */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                1. Foto Hasil Pemasangan (Wajib)
              </CardTitle>
              {hasBefore && hasAfter ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 2 Foto Lengkap
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Wajib 2 Foto
                </span>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <CameraUploader
                title="Foto Sebelum (Wajib)"
                description="Area ODP / dinding rumah sebelum pemasangan"
                icon={<Camera className="w-3.5 h-3.5" />}
                photoType="before"
                taskNumber={task.task_number || `TSK-${task.id}`}
                customerName={task.customer?.name}
                technicianName={user?.name || user?.nama_lengkap || 'Teknisi PSB'}
                disabled={isSubmitting || isSubmittingPhase1}
                uploadHandler={(f, c) => uploadPhoto(f, 'before', c)}
                onUploadSuccess={handleSharedUploadSuccess}
                initialPreviewUrl={task?.photos?.before || existingEvidence.photo_before}
              />

              <CameraUploader
                title="Foto Sesudah (Wajib)"
                description="Modem menyala normal & lampu PON hijau"
                icon={<Camera className="w-3.5 h-3.5" />}
                photoType="after"
                taskNumber={task.task_number || `TSK-${task.id}`}
                customerName={task.customer?.name}
                technicianName={user?.name || user?.nama_lengkap || 'Teknisi PSB'}
                disabled={isSubmitting || isSubmittingPhase1}
                uploadHandler={(f, c) => uploadPhoto(f, 'after', c)}
                onUploadSuccess={handleSharedUploadSuccess}
                initialPreviewUrl={task?.photos?.after || existingEvidence.photo_after}
              />

              {/* Collapsible Optional Photos */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowOptionalPhotos(!showOptionalPhotos)}
                  className="w-full flex items-center justify-between py-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    Foto Tambahan (Modem, Kabel, Speedtest)
                  </span>
                  <span className="text-indigo-600 text-[11px] flex items-center">
                    {showOptionalPhotos ? <ChevronUp className="w-4 h-4 ml-0.5" /> : <ChevronDown className="w-4 h-4 ml-0.5" />}
                  </span>
                </button>

                {showOptionalPhotos && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                    <CameraUploader
                      title="Foto Modem ONT"
                      description="Barcode SN & MAC"
                      icon={<Wifi className="w-3.5 h-3.5" />}
                      photoType="modem"
                      taskNumber={task.task_number || `TSK-${task.id}`}
                      customerName={task.customer?.name}
                      technicianName={user?.name || user?.nama_lengkap || 'Teknisi PSB'}
                      disabled={isSubmitting || isSubmittingPhase1}
                      uploadHandler={(f, c) => uploadPhoto(f, 'modem', c)}
                      onUploadSuccess={handleSharedUploadSuccess}
                      initialPreviewUrl={task?.photos?.modem || existingEvidence.photo_modem}
                    />

                    <CameraUploader
                      title="Foto Jalur Kabel"
                      description="Kerapian drop core"
                      icon={<Camera className="w-3.5 h-3.5" />}
                      photoType="cabling"
                      taskNumber={task.task_number || `TSK-${task.id}`}
                      customerName={task.customer?.name}
                      technicianName={user?.name || user?.nama_lengkap || 'Teknisi PSB'}
                      disabled={isSubmitting || isSubmittingPhase1}
                      uploadHandler={(f, c) => uploadPhoto(f, 'cabling', c)}
                      onUploadSuccess={handleSharedUploadSuccess}
                      initialPreviewUrl={task?.photos?.cabling || existingEvidence.photo_cabling}
                    />

                    <CameraUploader
                      title="Hasil Speedtest"
                      description="Bukti kecepatan"
                      icon={<Camera className="w-3.5 h-3.5" />}
                      photoType="speedtest"
                      taskNumber={task.task_number || `TSK-${task.id}`}
                      customerName={task.customer?.name}
                      technicianName={user?.name || user?.nama_lengkap || 'Teknisi PSB'}
                      disabled={isSubmitting || isSubmittingPhase1}
                      uploadHandler={(f, c) => uploadPhoto(f, 'speedtest', c)}
                      onUploadSuccess={handleSharedUploadSuccess}
                      initialPreviewUrl={task?.photos?.speedtest || existingEvidence.photo_speedtest}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Tanda Tangan Pelanggan Card */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-indigo-600" />
                2. Tanda Tangan Digital Pelanggan (Wajib)
              </CardTitle>
              {existingSignature ? (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Belum Ditandatangani
                </span>
              )}
            </CardHeader>
            <CardContent className="p-4">
              <CustomerSignature 
                taskId={task.id} 
                existingSignatureUrl={existingSignature ? String(existingSignature) : undefined}
                disabled={isSubmitting || isSubmittingPhase1} 
              />
            </CardContent>
          </Card>

          {/* 3. SOP Checklist (Collapsible) */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 py-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setShowSopChecklist(!showSopChecklist)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-bold text-gray-800">3. Pemeriksaan SOP Teknis</span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                  <span>{showSopChecklist ? 'Sembunyikan' : 'Buka Checklist'}</span>
                  {showSopChecklist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
            </CardHeader>
            {showSopChecklist && (
              <CardContent className="p-4 animate-in fade-in-50 duration-200">
                <TaskChecklist taskId={task.id} task={task} disabled={isSubmitting || isSubmittingPhase1} />
              </CardContent>
            )}
          </Card>

          {/* Bottom Action Card for Phase 1 */}
          <div className="mt-6 p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-auto text-center sm:text-left">
              {isPhase1Ready ? (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Semua syarat Tahap 1 lengkap! Siap kirim.</span>
                </div>
              ) : (
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Lengkapi: <strong>{phase1MissingList.join(', ')}</strong></span>
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleStep1Submit}
              disabled={!isPhase1Ready || isSubmittingPhase1}
              className="w-full sm:w-auto min-h-[46px] px-6 font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:bg-gray-200 disabled:text-gray-500"
            >
              {isSubmittingPhase1 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan Tahap 1...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Kirim Verifikasi Lapangan (Lanjut ke Tahap 2) →</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAHAP 2: ABSENSI & LAPORAN AKHIR INDIVIDU (GPS, SELFIE, CATATAN CEPAT)      */}
      {/* ========================================================================= */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-emerald-900">Verifikasi Lapangan Selesai ✓</p>
              <p className="text-emerald-700 mt-0.5">
                Silakan rekam <strong>kehadiran GPS & catatan individu Anda</strong> untuk menyelesaikan tugas.
              </p>
            </div>
          </div>

          {/* 1. Rekam Lokasi GPS */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-gray-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                1. Rekam Lokasi GPS & Geofence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <GpsCapture onCapture={setGpsData} disabled={isSubmitting} initialData={initialGpsData} />

              {currentDistance !== null && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    currentDistance <= 500
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {currentDistance <= 500 ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {currentDistance <= 500
                        ? `✓ Posisi Valid: Berjarak ${Math.round(currentDistance)}m dari rumah pelanggan`
                        : `⚠️ Perhatian: Berjarak ${Math.round(currentDistance)}m dari titik pelanggan`}
                    </p>
                    <p className="text-[11px] opacity-85">
                      {currentDistance <= 500
                        ? 'Posisi Anda memenuhi batas radius geofence maksimal 500 meter.'
                        : 'Pastikan Anda berada di sekitar lokasi pemasangan saat merekam koordinat.'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Selfie Kehadiran */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-gray-100">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                2. Foto Selfie Kehadiran Teknisi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <CameraUploader
                title="Foto Selfie Kehadiran"
                description="Gunakan kamera depan HP di lokasi pelanggan"
                photoType="selfie"
                taskNumber={task.task_number || `TSK-${task.id}`}
                customerName={task.customer?.name}
                technicianName={user?.name || user?.nama_lengkap || 'Teknisi PSB'}
                disabled={isSubmitting}
                uploadHandler={(f, c) => uploadPhoto(f, 'selfie', c)}
                onUploadSuccess={handleSharedUploadSuccess}
                initialPreviewUrl={task?.photos?.selfie || existingEvidence.photo_selfie}
              />
            </CardContent>
          </Card>

          {/* 3. Catatan Pengerjaan */}
          <Card className="border-gray-200 shadow-xs">
            <CardHeader className="p-4 pb-2 border-b border-gray-100 flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                3. Catatan Pengerjaan (Wajib)
              </CardTitle>
              <span className="text-[11px] text-gray-500 font-medium">Klik template untuk isi cepat</span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((snippet, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickNoteClick(snippet)}
                    className="text-[11px] font-medium py-1.5 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-800 hover:bg-indigo-100 active:scale-95 transition-all text-left"
                  >
                    + {snippet}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">
                  Detail Tindakan & Laporan Lapangan:
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Ketik catatan atau klik tombol template di atas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  className="text-xs sm:text-sm min-h-[90px] rounded-xl focus:border-indigo-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Card for Phase 2 */}
          <div className="mt-6 p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${gpsData ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                {gpsData ? '✓ GPS Terbaca' : '✗ Belum GPS'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${notes.trim() ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                {notes.trim() ? '✓ Catatan Terisi' : '✗ Catatan Kosong'}
              </span>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/teknisi/tasks/${task.id}`)} 
                disabled={isSubmitting} 
                className="w-1/3 sm:w-auto min-h-[46px] rounded-xl text-xs sm:text-sm font-medium"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !gpsData || !notes.trim()}
                className="w-2/3 sm:w-auto min-h-[46px] px-8 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:bg-gray-200 disabled:text-gray-500"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sedang Mengirim...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Selesaikan & Kirim Laporan</>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
