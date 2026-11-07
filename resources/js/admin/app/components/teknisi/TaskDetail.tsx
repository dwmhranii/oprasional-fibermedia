import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CustomerMap } from '../maps/CustomerMap';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../ui/tabs';
import {
  ArrowLeft,
  User,
  MapPin,
  Wifi,
  Clock,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Navigation,
  Play,
  XCircle,
  Phone,
  Compass,
  FileText,
  AlertCircle,
  RefreshCw,
  Users,
  Server,
  CheckCircle,
  Eye,
  EyeOff,
  FileCheck,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/formatters';
import { TaskSkeleton } from '../ui/SkeletonLoaders';
import { PrintableBastModal } from '../common/PrintableBastModal';
import { reportService } from '../../lib/reportService';

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showBastModal, setShowBastModal] = useState(false);
  const [isExportingSpk, setIsExportingSpk] = useState(false);
  const { user } = useAuth();

  const handleExportSpk = async () => {
    const subId =
      task?.provisioning?.submission_id ||
      task?.provisioning?.submission?.id ||
      task?.submission_id ||
      task?.submission?.id;
    if (!subId) {
      toast.error('Data pengajuan tidak ditemukan untuk mencetak Work Order.');
      return;
    }
    setIsExportingSpk(true);
    try {
      toast.info('Mengunduh dokumen Work Order PDF...');
      await reportService.exportSubmissionPdf(subId);
      toast.success('Work Order PDF berhasil diunduh!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunduh Work Order PDF');
    } finally {
      setIsExportingSpk(false);
    }
  };

  const [transitionType, setTransitionType] = useState<'on_the_way' | 'in_progress' | 'failed' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch task detail using only the user context isolation
  const { data: task, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tasks', 'detail', id, user?.id],
    queryFn: () => apiClient.get<any>(`/tasks/${id}`),
    enabled: !!id,
    staleTime: 1000 * 5, // 5 seconds
    refetchInterval: 5000, // React Query polling for team sync
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      assigned: { label: 'Assigned', color: '#3b82f6' },
      on_the_way: { label: 'On The Way', color: '#8b5cf6' },
      in_progress: { label: 'In Progress', color: '#f59e0b' },
      phase_1_submitted: { label: 'Phase 1 Submitted', color: '#0ea5e9' },
      phase_2_complete: { label: 'Phase 2 Complete', color: '#0ea5e9' },
      submitted: { label: 'Menunggu Verifikasi Admin', color: '#6366f1' },
      approved: { label: 'Approved', color: '#10b981' },
      completed: { label: 'Completed', color: '#10b981' },
      failed: { label: 'Failed', color: '#ef4444' },
      returned: { label: 'Returned (Revisi)', color: '#ef4444' },
      escalated: { label: 'Escalated', color: '#ef4444' },
    };

    const config = statusConfig[status] || { label: status || 'Unknown', color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }} className="font-semibold text-xs border-0">
        {config.label}
      </Badge>
    );
  };

  const handleCopy = (text: string, label: string) => {
    if (!text || text === '-') return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} disalin ke clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleActionClick = (type: 'on_the_way' | 'in_progress' | 'failed') => {
    setTransitionType(type);
  };

  const handleConfirmTransition = async () => {
    if (!id || !transitionType) return;
    setIsSubmitting(true);

    try {
      await apiClient.put(`/tasks/${id}/status`, { status: transitionType });
      toast.success(`Status penugasan berhasil diubah ke: ${transitionType.toUpperCase().replace(/_/g, ' ')}`);
      
      setTransitionType(null);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal mengubah status penugasan.');
      } else {
        toast.error('Terjadi kesalahan koneksi saat memperbarui data.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <TaskSkeleton />;
  }

  if (isError || !task) {
    if (error instanceof ApiError && error.status === 403) {
      return <Navigate to="/403" replace />;
    }
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/work-orders')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Work Order
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Detail</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Tugas tidak ditemukan atau Anda tidak memiliki akses teknisi.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Technician status variables
  const currentStatus = task.current_assignment?.status || task.status;
  const globalStatus = task.status;

  // Package specs
  const packageName = task.package?.name || task.package_name || task.provisioning?.submission?.package_name || task.submission?.package_name || 'Home Speed';
  const packageSpeed = task.package?.speed || task.package_speed || task.provisioning?.submission?.package_speed || task.submission?.package_speed || '-';
  const packagePrice = task.package?.price || task.package_price || task.provisioning?.submission?.package_price || task.submission?.package_price || 0;

  // Map Coordinates
  const lat = Number(task.customer_location?.latitude) || undefined;
  const lng = Number(task.customer_location?.longitude) || undefined;

  // Clean Phone for WhatsApp
  const rawPhone = task.customer?.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '').replace(/^0/, '62');

  // Provisioning Variables
  const provData = task.provisioning || {};
  const provPppoeUsername = provData.bfass_username || '-';
  const provPppoePassword = provData.bfass_password || '-';
  const provServiceName = provData.service_type || '-';
  const provInternetProfile = provData.bandwidth_profile || '-';
  const provVlan = provData.vlan || '-';
  const provOlt = provData.olt || '-';
  const provPon = provData.pon || '-';
  const provPort = provData.odp || '-';
  const provOnuSn = provData.onu_serial_number || '-';
  const provOnuModel = provData.onu_model || '-';
  const provIpAddress = provData.ip_address || '-';

  // Check if BAST is available
  const hasCustomerSignature = !!(
    task.customer_signature_url ||
    task.evidence?.signature_url ||
    task.evidence?.signature_path ||
    task.current_assignment?.evidence?.signature_url ||
    task.current_assignment?.evidence?.signature_path ||
    task.signature_url
  );
  const isBastAvailable = hasCustomerSignature || task.status === 'completed' || task.status === 'verified' || task.status === 'approved';

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Returned Admin Notes Notice */}
      {task.current_assignment?.status === 'returned' && task.current_assignment?.notes && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <div className="ml-2">
            <AlertTitle className="text-red-800 font-bold">Tugas Dikembalikan oleh Admin (Perlu Revisi)</AlertTitle>
            <AlertDescription className="text-red-700 mt-1 font-medium text-xs leading-relaxed">
              "{task.current_assignment.notes}"
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* 1. HERO QUICK ACTION CARD (Sticky & Zero-Scroll Control) */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/work-orders')}
                className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-indigo-300 font-semibold">
                    {task.task_number || `TSK-${task.id}`}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-[11px] text-slate-300 truncate">
                    {task.assigned_team?.name || 'Reguler'}
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-white truncate">
                  {task.customer?.name || 'Pelanggan'}
                </h1>
              </div>
            </div>

            <div className="shrink-0 text-right">
              {getStatusBadge(currentStatus)}
            </div>
          </div>

          {/* Primary Action Button (Atas - Langsung Eksekusi Tanpa Scroll) */}
          <div className="mt-4 pt-3 border-t border-white/10">
            {task.status === 'assigned' && (
              <Button
                onClick={() => handleActionClick('on_the_way')}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                <Navigation className="w-4 h-4" />
                Mulai Berangkat (On The Way)
              </Button>
            )}

            {task.status === 'on_the_way' && (
              <Button
                onClick={() => handleActionClick('in_progress')}
                className="w-full h-11 bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                <Play className="w-4 h-4 fill-white" />
                Tiba di Lokasi & Mulai Pengerjaan
              </Button>
            )}

            {(task.status === 'in_progress' || task.status === 'phase_1_submitted') &&
              (task.current_assignment?.status === 'assigned' || task.current_assignment?.status === 'returned' || task.current_assignment?.status === 'in_progress' || task.current_assignment?.status === 'on_the_way') && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate(`/work-orders/${task.id}`)}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Selesai & Upload Bukti (Tahap 1 & 2)
                </Button>
                <Button
                  onClick={() => handleActionClick('failed')}
                  variant="outline"
                  className="h-11 px-3 border-rose-300 bg-rose-500/20 text-rose-200 hover:bg-rose-500/40 rounded-xl shrink-0"
                  title="Laporkan Pemasangan Gagal"
                  disabled={isSubmitting}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}

            {(task.status === 'returned' || task.current_assignment?.status === 'returned') && (
              <Button
                onClick={() => navigate(`/work-orders/${task.id}`)}
                className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                <RefreshCw className="w-4 h-4" />
                Kirim Ulang Bukti Revisi (Phase 2)
              </Button>
            )}

            {task.status !== 'assigned' && task.status !== 'on_the_way' && task.status !== 'in_progress' && task.status !== 'phase_1_submitted' && task.status !== 'returned' && task.current_assignment?.status !== 'returned' && (
              <div className="text-center py-2 px-3 bg-white/10 rounded-xl text-xs text-indigo-200 font-medium flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Pemasangan telah selesai dilaporkan / menunggu verifikasi admin.
              </div>
            )}
          </div>
        </div>

        {/* 2. ONE-TAP CONTACT & NAVIGATION BAR */}
        <div className="grid grid-cols-4 sm:grid-cols-5 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          {/* Telepon */}
          {task.customer?.phone ? (
            <a
              href={`tel:${task.customer.phone}`}
              className="flex flex-col items-center justify-center py-2.5 px-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Phone className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[11px] font-semibold">Telepon</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 text-slate-400 opacity-50">
              <Phone className="w-4 h-4 mb-1" />
              <span className="text-[11px]">Telepon</span>
            </div>
          )}

          {/* WhatsApp */}
          {cleanPhone ? (
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 px-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-green-600 mb-1" />
              <span className="text-[11px] font-semibold">WhatsApp</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 text-slate-400 opacity-50">
              <MessageSquare className="w-4 h-4 mb-1" />
              <span className="text-[11px]">WhatsApp</span>
            </div>
          )}

          {/* Google Maps Route */}
          {lat && lng ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 px-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Compass className="w-4 h-4 text-indigo-600 mb-1" />
              <span className="text-[11px] font-semibold">Rute Maps</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center py-2.5 px-2 text-slate-400 opacity-50">
              <Compass className="w-4 h-4 mb-1" />
              <span className="text-[11px]">Maps</span>
            </div>
          )}

          {/* Cetak Work Order (.pdf) */}
          <button
            type="button"
            onClick={handleExportSpk}
            disabled={isExportingSpk}
            className="flex flex-col items-center justify-center py-2.5 px-2 text-indigo-700 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isExportingSpk ? (
              <Loader2 className="w-4 h-4 mb-1 animate-spin text-indigo-600" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-600 mb-1" />
            )}
            <span className="text-[11px] font-semibold">Cetak Work Order</span>
          </button>

          {/* Cetak BAST */}
          <button
            type="button"
            onClick={() => setShowBastModal(true)}
            className="flex flex-col items-center justify-center py-2.5 px-2 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
          >
            <FileCheck className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-[11px] font-bold">Cetak BAST</span>
          </button>
        </div>
      </Card>

      {/* 3. SEGMENTED TABS (MENGHILANGKAN SCROLL PANJANG) */}
      <Tabs defaultValue="pelanggan" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl h-11">
          <TabsTrigger
            value="pelanggan"
            className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Pelanggan</span>
          </TabsTrigger>

          <TabsTrigger
            value="teknis"
            className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <Server className="w-3.5 h-3.5" />
            <span>Teknis</span>
          </TabsTrigger>

          <TabsTrigger
            value="tim"
            className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tim</span>
          </TabsTrigger>

          <TabsTrigger
            value="dokumen"
            className="flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Dokumen</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB CONTENT 1: PELANGGAN & LOKASI */}
        <TabsContent value="pelanggan" className="space-y-4 focus-visible:outline-none">
          {/* Paket Layanan */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Paket Pemasangan</p>
                  <p className="font-extrabold text-base text-slate-800 dark:text-slate-100">{packageName}</p>
                  <p className="text-xs text-indigo-600 font-semibold">{packageSpeed} Mbps Internet</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Biaya Instalasi</p>
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {packagePrice > 0 ? `Rp ${Number(packagePrice).toLocaleString('id-ID')}` : 'Gratis / Termasuk'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alamat & Peta */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Alamat Lokasi Pemasangan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                {task.customer?.address || 'Tidak ada alamat lengkap.'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Kelurahan</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {task.customer?.sub_district || task.customer?.subdistrict || task.customer?.kelurahan || '-'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Kecamatan</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {task.customer?.district || '-'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Kota / Kabupaten</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {task.customer?.city || '-'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Kode Pos</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {task.customer?.postal_code || task.customer?.postalcode || '-'}
                  </span>
                </div>
              </div>

              {/* Map Preview */}
              {lat && lng && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs h-48 mt-2">
                  <CustomerMap
                    lat={lat}
                    lng={lng}
                    customerName={task.customer?.name}
                    address={task.customer?.address}
                    interactive={false}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Catatan Pelanggan / Validasi */}
          {(task.submission?.notes || task.submission?.validation_notes) && (
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="py-2.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Catatan Pemasangan
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2 text-xs">
                {task.submission?.notes && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Catatan Sales:</span>
                    <p className="italic text-slate-700 dark:text-slate-300 mt-0.5">"{task.submission.notes}"</p>
                  </div>
                )}
                {task.submission?.validation_notes && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-indigo-500 block">Instruksi Admin Validasi:</span>
                    <p className="italic text-slate-700 dark:text-slate-300 mt-0.5">"{task.submission.validation_notes}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB CONTENT 2: DATA TEKNIS & PPPoE */}
        <TabsContent value="teknis" className="space-y-4 focus-visible:outline-none">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  Kredensial Modem & PPPoE
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold text-indigo-600 border-indigo-200">
                  1-Tap Salin
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* PPPoE Username */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">PPPoE Username</span>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 truncate block">
                    {provPppoeUsername}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(provPppoeUsername, 'PPPoE Username')}
                  className="h-8 px-2.5 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0 text-xs gap-1"
                >
                  {copiedKey === 'PPPoE Username' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </Button>
              </div>

              {/* PPPoE Password */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">PPPoE Password</span>
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100 truncate block">
                    {showPassword ? provPppoePassword : '••••••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800"
                    title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(provPppoePassword, 'PPPoE Password')}
                    className="h-8 px-2.5 rounded-lg border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs gap-1"
                  >
                    {copiedKey === 'PPPoE Password' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Disalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Grid Data Jaringan FTTH */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Port / ODP</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{provPort}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">VLAN</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{provVlan}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">OLT</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{provOlt}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">PON</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{provPon}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">SN ONT (Modem)</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{provOnuSn}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Model ONU</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{provOnuModel}</span>
                </div>
              </div>

              {provData.notes && (
                <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <span className="text-[10px] text-indigo-500 font-bold block">Catatan Konfigurasi:</span>
                  <p className="text-indigo-900 dark:text-indigo-300 mt-0.5">{provData.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CONTENT 3: TIM & STATUS */}
        <TabsContent value="tim" className="space-y-4 focus-visible:outline-none">
          {/* Status Verifikasi Bersama Tim */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Verifikasi Tim (Tahap 1)
                </span>
                {task.shared_verification?.completed ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">Selesai</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Menunggu</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                {task.shared_verification?.completed ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {task.shared_verification?.completed
                      ? 'Dokumentasi tim telah diunggah.'
                      : 'Memerlukan foto lokasi & tanda tangan digital pelanggan.'}
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    Tahap 1 dikerjakan bersama tim instalasi sebelum setiap teknisi mengirim laporan absensi individu (Tahap 2).
                  </p>
                </div>
              </div>

              {/* Progress Anggota */}
              {task.all_assignments && task.all_assignments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Status Teknisi dalam Tim:
                  </span>
                  <div className="space-y-1.5">
                    {task.all_assignments.map((assignment: any) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {assignment.user?.name || `Teknisi ${assignment.user_id}`} {assignment.user_id === user?.id ? '(Anda)' : ''}
                        </span>
                        <div>{getStatusBadge(assignment.status)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Structured Assignment Timeline */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Linimasa Aktivitas Pengerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4 text-xs text-slate-500 relative">
                <div className="absolute left-2.5 top-2 bottom-4 w-px bg-slate-200 dark:bg-slate-700"></div>

                {/* 1. Task Assigned */}
                {task.current_assignment?.assigned_at && (
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Task Assigned</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(task.current_assignment.assigned_at)}</p>
                    </div>
                  </div>
                )}

                {/* 2. On The Way */}
                {task.current_assignment?.started_at && (
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Menuju Lokasi Pelanggan (OTW)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(task.current_assignment.started_at)}</p>
                    </div>
                  </div>
                )}

                {/* 3. Submitted */}
                {task.current_assignment?.submitted_at && (
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">Laporan Selesai Dikirim</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(task.current_assignment.submitted_at)}</p>
                    </div>
                  </div>
                )}

                {/* 4. Approved */}
                {task.status === 'approved' && (
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white dark:border-slate-900 mt-1 shrink-0"></div>
                    <div>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">Tugas Disetujui Admin</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(task.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB CONTENT 4: DOKUMEN WORK ORDER & BAST */}
        <TabsContent value="dokumen" className="space-y-4 focus-visible:outline-none">
          {/* Card Work Order */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-850 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Work Order
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border-indigo-200">
                {task.task_number || `TSK-${task.id}`}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Dokumen resmi penugasan instalasi lapangan dari admin untuk tim teknisi.
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-1.5 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pelanggan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{task.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paket Layanan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{packageName} ({packageSpeed} Mbps)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Penugasan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatDate(task.created_at)}</span>
                </div>
              </div>
              <Button
                type="button"
                onClick={handleExportSpk}
                disabled={isExportingSpk}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
              >
                {isExportingSpk ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengunduh Work Order...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" /> Unduh Dokumen Work Order (.pdf)</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Card BAST */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-slate-50/70 dark:bg-slate-850 p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Berita Acara Serah Terima (BAST)
                </CardTitle>
              </div>
              {hasCustomerSignature || isBastAvailable ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  ✓ Siap Dicetak
                </Badge>
              ) : (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                  Menunggu Tanda Tangan
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Berita acara serah terima pekerjaan instalasi dan perangkat ONT ke pelanggan.
              </p>

              {hasCustomerSignature || isBastAvailable ? (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 border border-emerald-200/60 text-emerald-900 dark:text-emerald-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tanda Tangan Pelanggan Tersedia
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    BAST resmi sudah mencantumkan foto sebelum, sesudah, modem ONT, dan tanda tangan digital pelanggan.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200/60 text-amber-900 dark:text-amber-300 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Tanda Tangan Belum Diisi
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Untuk melengkapi BAST, klik tombol hijau <strong>"Selesai & Upload Bukti"</strong> di atas untuk meminta tanda tangan digital pelanggan.
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={() => setShowBastModal(true)}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                {hasCustomerSignature || isBastAvailable ? 'Cetak / Unduh BAST' : 'Pratinjau Dokumen BAST'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Actions Dialog Modal */}
      <Dialog open={!!transitionType} onOpenChange={() => setTransitionType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transitionType === 'on_the_way' && 'Mulai Perjalanan Ke Pelanggan'}
              {transitionType === 'in_progress' && 'Mulai Pemasangan Modem'}
              {transitionType === 'failed' && 'Laporkan Pemasangan Gagal'}
            </DialogTitle>
            <DialogDescription>
              {transitionType === 'on_the_way' && 'Apakah Anda yakin ingin mengganti status penugasan menjadi "On The Way"?'}
              {transitionType === 'in_progress' && 'Apakah Anda yakin ingin mengganti status penugasan menjadi "In Progress" dan mulai memasang kabel & modem?'}
              {transitionType === 'failed' && 'Apakah Anda yakin ingin melaporkan bahwa pemasangan sambungan baru ini gagal dilakukan?'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setTransitionType(null)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmTransition}
              className="text-white font-semibold"
              style={{
                backgroundColor:
                  transitionType === 'on_the_way' ? '#4f46e5' :
                  transitionType === 'in_progress' ? '#f59e0b' : '#ef4444'
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Konfirmasi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable BAST Modal (Technician Results & Customer Signature) */}
      <PrintableBastModal
        isOpen={showBastModal}
        onClose={() => setShowBastModal(false)}
        submission={task}
      />
    </div>
  );
};
