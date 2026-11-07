import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ArrowLeft,
  Server,
  User,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle,
  Activity,
  Users,
  CheckCircle2,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { PrintableBastModal } from '../common/PrintableBastModal';
import { useAuth } from '../../context/AuthContext';

export const ProvisioningDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';

  const [showBastModal, setShowBastModal] = useState(false);

  // Dialog action states
  const [isBfassModalOpen, setIsBfassModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{
    type: 'round_robin' | 'manual';
    targetName: string;
    detailText: string;
  } | null>(null);
  const [successTeam, setSuccessTeam] = useState<any>(null);

  // Assignment selection in BFASS modal
  const [assignmentMode, setAssignmentMode] = useState<'round_robin' | 'manual'>('round_robin');
  const [manualTarget, setManualTarget] = useState<'technician' | 'team'>('technician');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  // Reassignment modal states (Superadmin only)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignMode, setReassignMode] = useState<'round_robin' | 'manual'>('round_robin');
  const [reassignTarget, setReassignTarget] = useState<'technician' | 'team'>('technician');
  const [reassignTechnicianId, setReassignTechnicianId] = useState<string>('');
  const [reassignTeam, setReassignTeam] = useState<string>('');

  // Fetch available technicians & teams for Superadmin assignment
  const { data: availableTechs = [] } = useQuery({
    queryKey: ['availableTechnicians'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/teams/available');
      return res.data || res || [];
    },
    enabled: isSuperadmin && (isBfassModalOpen || isReassignModalOpen),
  });

  const { data: availableTeams = [] } = useQuery({
    queryKey: ['availableTeams'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/teams/available');
      return res.data || res || [];
    },
    enabled: isSuperadmin && (isBfassModalOpen || isReassignModalOpen),
  });

  // Manual Prov form
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm({
    defaultValues: {
      bfass_username: '',
      bfass_password: '',
      vlan: '',
      odp: '',
      onu_serial_number: '',
      notes: ''
    }
  });

  // Fetch provisioning detail
  const { data: provisioning, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminProvisionings', 'detail', id],
    queryFn: () => apiClient.get<any>(`/provisionings/${id}`),
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending Queue', color: '#f59e0b' },
      success: { label: 'Active / Synced', color: '#10b981' },
      failed: { label: 'Sync Failed', color: '#ef4444' },
      active: { label: 'Active', color: '#10b981' },
      suspended: { label: 'Suspended', color: '#f59e0b' },
      terminated: { label: 'Terminated', color: '#ef4444' },
    };

    const config = statusConfig[status] || { label: status || 'Unknown', color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </Badge>
    );
  };

  const getBfassBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'BFASS Pending', color: '#f59e0b' },
      success: { label: 'BFASS Synced', color: '#10b981' },
      failed: { label: 'BFASS Error', color: '#ef4444' },
    };

    const config = statusConfig[status] || { label: status || 'Unknown', color: '#6b7280' };

    return (
      <Badge variant="outline" style={{ borderColor: config.color, color: config.color }}>
        {config.label}
      </Badge>
    );
  };

  const openBfassModal = () => {
    if (provisioning) {
      // Try to pre-fill from bfass_response.manual_provisioning if available
      const storedProv = provisioning.bfass_response?.manual_provisioning || {};
      reset({
        bfass_username: storedProv.username || storedProv.pppoe_username || provisioning.bfass_username || '',
        bfass_password: storedProv.password || storedProv.pppoe_password || '',
        vlan: storedProv.vlan || provisioning.vlan || '',
        odp: storedProv.odp || provisioning.odp || '',
        onu_serial_number: storedProv.onu_serial_number || provisioning.onu_serial_number || '',
        notes: storedProv.notes || provisioning.notes || ''
      });
    }
    setAssignmentMode('round_robin');
    setManualTarget('technician');
    setSelectedTechnicianId('');
    setSelectedTeam('');
    setIsBfassModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    if (!id) return;

    setIsSubmitting(true);

    const payload: any = {
      bfass_username: data.bfass_username,
      bfass_password: data.bfass_password,
      vlan: data.vlan,
      odp: data.odp,
      onu_serial_number: data.onu_serial_number,
      notes: data.notes,
    };

    if (isSuperadmin) {
      payload.assignment_mode = assignmentMode;
      if (assignmentMode === 'manual') {
        if (manualTarget === 'technician') {
          if (!selectedTechnicianId) {
            toast.error('Silakan pilih teknisi lapangan.');
            setIsSubmitting(false);
            return;
          }
          payload.technician_id = Number(selectedTechnicianId);
        } else {
          if (!selectedTeam) {
            toast.error('Silakan pilih tim teknisi.');
            setIsSubmitting(false);
            return;
          }
          payload.team = selectedTeam;
        }
      }
    } else {
      payload.assignment_mode = 'round_robin';
    }

    try {
      await apiClient.put<any>(`/provisionings/${id}/bfass-credentials`, payload);
      setIsBfassModalOpen(false);
      
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['adminProvisionings'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Wait for refetch to get the updated resource with tasks loaded
      const { data: updatedProvisioning } = await refetch();

      const primaryTask = updatedProvisioning?.tasks?.[0];
      const teamData = primaryTask?.assigned_team;
      const techUser = primaryTask?.assignments?.[0]?.user;

      if (teamData || techUser) {
        setAssignmentResult({
          type: payload.assignment_mode,
          targetName: techUser?.name 
            ? `${techUser.name} (${teamData?.name || teamData || 'Tim Lapangan'})` 
            : (teamData?.name || teamData || 'Tim Teknisi'),
          detailText: payload.assignment_mode === 'manual'
            ? 'Tugas pemasangan baru (PSB) berhasil dialokasikan secara langsung oleh Superadmin.'
            : 'Seluruh teknisi pada tim tersebut telah menerima penugasan otomatis.',
        });
      } else {
        toast.success('Kredensial BFASS berhasil diperbarui dan tugas teknisi terpicu.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          Object.entries(err.errors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              setError(field as any, { type: 'manual', message: messages[0] });
            }
          });
        } else {
          toast.error(err.getFirstError() || 'Gagal memperbarui kredensial BFASS');
        }
      } else {
        toast.error('Terjadi kesalahan koneksi saat memproses data.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    const primaryTask = provisioning?.tasks?.[0];
    if (!primaryTask?.id) {
      toast.error('Tugas teknisi belum diterbitkan untuk provisi ini.');
      return;
    }

    const payload: any = {
      assignment_mode: reassignMode,
    };

    if (reassignMode === 'manual') {
      if (reassignTarget === 'technician') {
        if (!reassignTechnicianId) {
          toast.error('Silakan tentukan teknisi tujuan.');
          return;
        }
        payload.technician_id = Number(reassignTechnicianId);
      } else {
        if (!reassignTeam) {
          toast.error('Silakan tentukan nama tim tujuan.');
          return;
        }
        payload.team = reassignTeam;
      }
    }

    try {
      setIsReassigning(true);
      await apiClient.patch<any>(`/work-orders/${primaryTask.id}/reassign`, payload);
      toast.success('Tugas teknisi berhasil dialihkan / ditugaskan ulang.');
      setIsReassignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminProvisionings'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      await refetch();
    } catch (err: any) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal mengalihkan tugas');
      } else {
        toast.error('Terjadi kendala saat memproses penugasan ulang.');
      }
    } finally {
      setIsReassigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" style={{ color: '#667eea' }} />
        <p className="text-gray-500 text-sm">Memuat detail provisioning...</p>
      </div>
    );
  }

  if (isError || !provisioning) {
    if (error instanceof ApiError && error.status === 403) {
      return <Navigate to="/403" replace />;
    }
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/psb')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Manajemen Provisi
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Detail</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Nomor provisioning tidak ditemukan atau Anda tidak memiliki akses admin.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fallback checking for full nested vs flattened
  const storedProv = provisioning.bfass_response?.manual_provisioning || {};
  const displayUsername = storedProv.username || storedProv.pppoe_username || provisioning.bfass_username || '-';
  const displayVlan = storedProv.vlan || provisioning.vlan || '-';
  const displayOdp = storedProv.odp || provisioning.odp || '-';
  const displayOnu = storedProv.onu_serial_number || provisioning.onu_serial_number || '-';

  const timelineEvents = (() => {
    if (provisioning?.audit_logs && provisioning.audit_logs.length > 0) {
      return provisioning.audit_logs.map((log: any) => ({
        title: log.description || log.event || 'Aktivitas Provisi',
        timestamp: log.created_at || log.timestamp,
        actor: log.causer?.name || log.user || 'System Admin',
        status: 'completed',
        detail: log.properties ? JSON.stringify(log.properties) : null,
      }));
    }

    const primaryTask = provisioning?.tasks?.[0];

    const isBfassSynced =
      provisioning?.bfass_status === 'success' ||
      provisioning?.bfass_status === 'completed' ||
      provisioning?.bfass_status === 'active' ||
      (provisioning?.bfass_username && provisioning.bfass_username !== '-');

    const assignedTeam =
      primaryTask?.assigned_team?.name ||
      primaryTask?.assigned_team ||
      primaryTask?.teknisi?.name ||
      provisioning?.assigned_team;

    const taskStatusLower = String(primaryTask?.status || '').toLowerCase();
    const provStatusLower = String(provisioning?.status || '').toLowerCase();

    const isTaskCompleted =
      ['completed', 'approved', 'success', 'done'].includes(taskStatusLower) ||
      ['completed', 'success', 'active', 'provisioned'].includes(provStatusLower);

    const isTaskInProgress =
      !isTaskCompleted &&
      (assignedTeam || ['in_progress', 'assigned', 'processing'].includes(taskStatusLower));

    const salesName =
      provisioning?.submission?.sales_name ||
      provisioning?.submission?.sales?.name ||
      provisioning?.submission?.user?.name ||
      'Sales Representative';

    const validatorName =
      provisioning?.submission?.validator?.name ||
      provisioning?.admin?.name ||
      'Admin Operational';

    const technicianActor =
      primaryTask?.assignments?.[0]?.user?.name ||
      (assignedTeam ? `Tim Teknisi (${assignedTeam})` : 'Tim Teknisi Lapangan');

    return [
      {
        title: '1. Pendaftaran Pengajuan Layanan',
        timestamp: provisioning?.submission?.created_at || provisioning?.created_at,
        actor: salesName,
        status: 'completed',
        detail: `Nomor pengajuan ${
          provisioning?.submission?.submission_number || provisioning?.submission_number || '-'
        } terdaftar atas nama ${
          provisioning?.submission?.customer?.name || provisioning?.submission?.customer_name || 'pelanggan'
        }.`,
      },
      {
        title: '2. Validasi & Approval Operational',
        timestamp: provisioning?.submission?.validated_at || provisioning?.created_at,
        actor: validatorName,
        status: 'completed',
        detail: 'Berkas KTP & kelayakan area terverifikasi. Rekam provisi jaringan diterbitkan.',
      },
      {
        title: '3. Konfigurasi Profil FTTH (BFASS)',
        timestamp: provisioning?.updated_at || provisioning?.created_at,
        actor: isBfassSynced ? 'Sistem Auto-Sync (BFASS)' : validatorName,
        status: isBfassSynced ? 'completed' : 'in_progress',
        detail: isBfassSynced
          ? `Kredensial aktif — PPPoE: ${displayUsername} | VLAN: ${displayVlan} | ODP: ${displayOdp}`
          : 'Menunggu pengisian data PPPoE, VLAN, ODP & ONT Serial Number.',
      },
      {
        title: '4. Penugasan & Deployment Teknisi',
        timestamp:
          primaryTask?.completed_at ||
          primaryTask?.updated_at ||
          provisioning?.completed_at ||
          provisioning?.updated_at ||
          provisioning?.created_at,
        actor: technicianActor,
        status: isTaskCompleted ? 'completed' : isTaskInProgress ? 'in_progress' : 'pending',
        detail: isTaskCompleted
          ? 'Instalasi jaringan & pengaktifan modem selesai. Foto lokasi terverifikasi & BAST siap dicetak.'
          : isTaskInProgress
          ? `Tugas penarikan kabel & pengaktifan modem diserahkan ke ${assignedTeam || 'tim teknisi'}.`
          : 'Menunggu penugasan tim teknisi lapangan.',
      },
    ];
  })();

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali
          </Button>
          {provisioning.tasks?.[0]?.id && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/work-orders/${provisioning.tasks[0].id}`)}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center h-9"
            >
              <Users className="w-4 h-4 mr-2" />
              Progress Tim Teknisi
            </Button>
          )}
          {/* BAST Button - ONLY appears if technician validated customer signature */}
          {(() => {
            const hasCustomerSignature = !!(
              provisioning.customer_signature_url ||
              provisioning.evidence?.signature_url ||
              provisioning.evidence?.signature_path ||
              provisioning.tasks?.[0]?.customer_signature_url ||
              provisioning.tasks?.[0]?.current_assignment?.evidence?.signature_url ||
              provisioning.tasks?.[0]?.current_assignment?.evidence?.signature_path ||
              provisioning.signature_url
            );
            const isBastAvailable = hasCustomerSignature || provisioning.status === 'success' || provisioning.status === 'active' || provisioning.status === 'completed';

            if (!isBastAvailable) return null;

            return (
              <Button
                onClick={() => setShowBastModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                Cetak BAST (Serah Terima)
              </Button>
            );
          })()}
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-4 text-right">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: '#1f2937' }}>
                Detail Provisi Jaringan
              </h1>
              {getStatusBadge(provisioning.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              No. Provisi: <span className="font-mono font-semibold text-gray-700">{provisioning.provisioning_number || `PROV-${provisioning.id}`}</span>
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500 text-right">
          <p>Diajukan: <span className="font-medium text-gray-700">{formatDate(provisioning.created_at)}</span></p>
          <p>Terakhir sinkron: <span className="font-medium text-gray-700">{formatDate(provisioning.updated_at)}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* BFASS Account Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                Detail Akun BFASS (FTTH Profile)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">PPPoE Username</p>
                  <p className="font-mono font-medium text-gray-800 text-base">{displayUsername}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">VLAN</p>
                  <p className="font-medium text-gray-800">{displayVlan}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ODP</p>
                  <p className="font-mono font-medium text-gray-800">{displayOdp}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">ONU Serial Number</p>
                  <p className="font-mono font-medium text-gray-800">{displayOnu}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Submission details */}
          {provisioning.submission && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  Detail Pelanggan & Pengajuan Asal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nomor Pengajuan Asal</p>
                    <p className="font-semibold text-gray-800">{provisioning.submission.submission_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nama Pelanggan</p>
                    <p className="font-semibold text-gray-800">{provisioning.submission.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nomor KTP (NIK)</p>
                    <p className="font-mono text-gray-800">{provisioning.submission.nik}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Telepon Pelanggan</p>
                    <p className="text-gray-800">{provisioning.submission.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Alamat Pemasangan</p>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <p className="text-gray-800">{provisioning.submission.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions & Timeline logs */}
        <div className="space-y-6">
          {/* Action controller buttons */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-gray-400" />
                Kontrol Sinkronisasi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="text-gray-500">Status BFASS:</span>
                  {getBfassBadge(provisioning.bfass_status)}
                </div>

                {/* Assigned Team display */}
                {provisioning.tasks?.[0]?.assigned_team && (
                  <div className="flex justify-between items-center text-sm border-b pb-2 mt-2">
                    <span className="text-gray-500">Tim Ditugaskan:</span>
                    <span className="font-semibold text-emerald-700">
                      {provisioning.tasks[0].assigned_team?.name || provisioning.tasks[0].assigned_team}
                    </span>
                  </div>
                )}
                
                <Button
                  onClick={openBfassModal}
                  className="hidden md:flex w-full text-white mt-4"
                  style={{ backgroundColor: '#667eea' }}
                  disabled={isSubmitting}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Data BFASS (Manual)
                </Button>

                {/* Superadmin Task Reassignment button */}
                {isSuperadmin && provisioning.tasks && provisioning.tasks.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReassignMode('round_robin');
                      setReassignTarget('technician');
                      setReassignTechnicianId('');
                      setReassignTeam('');
                      setIsReassignModalOpen(true);
                    }}
                    className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 mt-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Tugaskan Ulang (Reassign Task)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline process logs */}
          <Card className="border-gray-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/60 py-3.5 px-5">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Linimasa Proses & Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {timelineEvents.map((event: any, idx: number) => {
                  const isCompleted = event.status === 'completed';
                  const isInProgress = event.status === 'in_progress';
                  const isLast = idx === timelineEvents.length - 1;

                  return (
                    <div key={idx} className="flex gap-3 text-xs relative">
                      {/* Left icon and line */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] z-10 shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : isInProgress
                              ? 'bg-blue-100 text-blue-700 border border-blue-300 animate-pulse'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : isInProgress ? (
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 grow my-1 ${
                              isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                            }`}
                          ></div>
                        )}
                      </div>

                      {/* Right Details */}
                      <div className="space-y-1 pb-3 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-gray-900">{event.title}</p>
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-1.5 font-bold ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isInProgress
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                            }`}
                          >
                            {isCompleted ? 'Selesai' : isInProgress ? 'Dalam Proses' : 'Menunggu'}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-gray-600 font-medium leading-relaxed">{event.detail}</p>

                        <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {formatDate(event.timestamp)}
                          </span>
                          <span>•</span>
                          <span>Oleh: <strong className="text-gray-600">{event.actor}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur-sm p-4 flex md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Button
          onClick={openBfassModal}
          className="w-full text-white"
          style={{ backgroundColor: '#667eea' }}
          disabled={isSubmitting}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Update Data BFASS (Manual)
        </Button>
      </div>

      {/* Manual BFASS Form Dialog */}
      <Dialog open={isBfassModalOpen} onOpenChange={setIsBfassModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Manual Data BFASS</DialogTitle>
            <DialogDescription>
              Masukkan kredensial FTTH untuk mengaktifkan provisioning ini dan menugaskan tugas ke teknisi secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>PPPoE Username <span className="text-red-500">*</span></Label>
                <Input 
                  {...register('bfass_username', { required: 'PPPoE Username wajib diisi untuk provisioning' })} 
                  disabled={isSubmitting} 
                  placeholder="cth: user123@isp"
                />
                {errors.bfass_username && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.bfass_username.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>PPPoE Password</Label>
                <Input 
                  {...register('bfass_password')} 
                  disabled={isSubmitting} 
                  type="password"
                />
                {errors.bfass_password && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.bfass_password.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>VLAN</Label>
                <Input 
                  {...register('vlan')} 
                  disabled={isSubmitting} 
                  placeholder="cth: 100"
                />
                {errors.vlan && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.vlan.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ODP</Label>
                <Input 
                  {...register('odp')} 
                  disabled={isSubmitting} 
                  placeholder="cth: ODP-JKT-01"
                />
                {errors.odp && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.odp.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>ONU Serial Number</Label>
                <Input 
                  {...register('onu_serial_number')} 
                  disabled={isSubmitting} 
                  placeholder="cth: ZTE12345678"
                />
                {errors.onu_serial_number && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.onu_serial_number.message as string}
                  </p>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Catatan Tambahan Provisioning</Label>
                <Input 
                  {...register('notes')} 
                  disabled={isSubmitting} 
                  placeholder="Catatan instalasi..."
                />
                {errors.notes && (
                  <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-4 h-4" />
                    {errors.notes.message as string}
                  </p>
                )}
              </div>
            </div>

            {/* Assignment Mode Configuration (RBAC Controlled) */}
            <div className="mt-2 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Metode Penugasan Teknisi Lapangan (PSB)
                </Label>
                {isSuperadmin ? (
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-semibold">
                    Superadmin Controls
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 text-[10px]">
                    Auto Round Robin
                  </Badge>
                )}
              </div>

              {isSuperadmin ? (
                <div className="space-y-3">
                  {/* Mode Picker: Round Robin vs Manual */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignmentMode('round_robin')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        assignmentMode === 'round_robin'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                          Otomatis (Round Robin)
                        </span>
                        {assignmentMode === 'round_robin' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Sistem mendistribusikan penugasan ke tim teknisi giliran berikutnya secara seimbang.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignmentMode('manual')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        assignmentMode === 'manual'
                          ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Manual Pilih Teknisi / Tim
                        </span>
                        {assignmentMode === 'manual' && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Tentukan langsung teknisi perorangan atau tim khusus untuk tugas ini.
                      </p>
                    </button>
                  </div>

                  {/* Manual Target Selector */}
                  {assignmentMode === 'manual' && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={manualTarget === 'technician' ? 'default' : 'outline'}
                          onClick={() => setManualTarget('technician')}
                          className={`text-xs h-7 px-3 rounded-lg ${
                            manualTarget === 'technician' ? 'bg-indigo-600 text-white' : ''
                          }`}
                        >
                          Pilih Berdasarkan Teknisi
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={manualTarget === 'team' ? 'default' : 'outline'}
                          onClick={() => setManualTarget('team')}
                          className={`text-xs h-7 px-3 rounded-lg ${
                            manualTarget === 'team' ? 'bg-indigo-600 text-white' : ''
                          }`}
                        >
                          Pilih Berdasarkan Tim
                        </Button>
                      </div>

                      {manualTarget === 'technician' ? (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600 dark:text-slate-300">
                            Pilih Teknisi Lapangan <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedTechnicianId}
                            onValueChange={(val) => setSelectedTechnicianId(val)}
                          >
                            <SelectTrigger className="w-full bg-white dark:bg-slate-900 text-xs">
                              <SelectValue placeholder="-- Pilih Teknisi Lapangan --" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {availableTechs.map((tech: any) => (
                                <SelectItem key={tech.id} value={String(tech.id)} className="text-xs">
                                  <div className="flex items-center justify-between gap-4 w-full">
                                    <span className="font-semibold">{tech.name}</span>
                                    <span className="text-slate-400 text-[11px]">
                                      {tech.team || 'Tanpa Tim'} • {tech.phone || '-'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600 dark:text-slate-300">
                            Pilih Tim Teknisi <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={selectedTeam}
                            onValueChange={(val) => setSelectedTeam(val)}
                          >
                            <SelectTrigger className="w-full bg-white dark:bg-slate-900 text-xs">
                              <SelectValue placeholder="-- Pilih Tim Teknisi --" />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {availableTeams.map((t: any) => {
                                const teamName = t.name || t.team || t;
                                const count = t.member_count ?? t.technicians?.length ?? 0;
                                return (
                                  <SelectItem key={teamName} value={teamName} className="text-xs">
                                    <div className="flex items-center justify-between gap-4 w-full">
                                      <span className="font-semibold">{teamName}</span>
                                      <span className="text-slate-400 text-[11px]">
                                        {count} Teknisi Terdaftar
                                      </span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Regular Admin view: locked to Round Robin policy */
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-300">
                      Penugasan Otomatis (Round Robin) Aktif
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
                      Sebagai Admin Operasional, penugasan akan diberikan ke tim teknisi giliran berikutnya secara otomatis. Opsi manual hanya tersedia untuk Superadmin.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsBfassModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: '#667eea' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan & Aktifkan BFASS'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Assignment Confirmation Dialog */}
      <Dialog 
        open={Boolean(assignmentResult || successTeam)} 
        onOpenChange={() => {
          setAssignmentResult(null);
          setSuccessTeam(null);
        }}
      >
        <DialogContent 
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              {assignmentResult?.type === 'manual'
                ? 'Penugasan Manual Diterbitkan'
                : 'Round Robin Assignment'}
            </DialogTitle>
            <DialogDescription>
              Data BFASS & penugasan pemasangan (PSB) berhasil disimpan.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4 text-center">
            <p className="text-sm text-gray-500">
              {assignmentResult?.type === 'manual'
                ? 'Teknisi / Tim yang ditugaskan:'
                : 'Tim yang dipilih oleh sistem:'}
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h3 className="text-2xl font-bold text-emerald-700">
                {assignmentResult?.targetName || successTeam?.name || successTeam || 'Tim Teknisi'}
              </h3>
            </div>
            <p className="text-sm text-gray-500">
              {assignmentResult?.detailText || 'Seluruh teknisi pada tim tersebut telah menerima penugasan.'}
            </p>
          </div>

          <DialogFooter>
            <Button 
              className="w-full"
              style={{ backgroundColor: '#10b981' }}
              onClick={() => {
                setAssignmentResult(null);
                setSuccessTeam(null);
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Superadmin Task Reassignment Modal */}
      <Dialog open={isReassignModalOpen} onOpenChange={setIsReassignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Tugaskan Ulang (Reassign Task)
            </DialogTitle>
            <DialogDescription>
              Alihkan tugas instalasi lapangan ini ke teknisi lain, tim lain, atau kembalikan ke antrean otomatis (Round Robin).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReassignMode('round_robin')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  reassignMode === 'round_robin'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Otomatis</span>
                  {reassignMode === 'round_robin' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500">Round Robin giliran berikutnya</p>
              </button>

              <button
                type="button"
                onClick={() => setReassignMode('manual')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  reassignMode === 'manual'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Manual</span>
                  {reassignMode === 'manual' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500">Tentukan teknisi / tim pilihan</p>
              </button>
            </div>

            {reassignMode === 'manual' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={reassignTarget === 'technician' ? 'default' : 'outline'}
                    onClick={() => setReassignTarget('technician')}
                    className={`text-xs h-7 px-3 rounded-lg ${
                      reassignTarget === 'technician' ? 'bg-indigo-600 text-white' : ''
                    }`}
                  >
                    Pilih Teknisi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={reassignTarget === 'team' ? 'default' : 'outline'}
                    onClick={() => setReassignTarget('team')}
                    className={`text-xs h-7 px-3 rounded-lg ${
                      reassignTarget === 'team' ? 'bg-indigo-600 text-white' : ''
                    }`}
                  >
                    Pilih Tim
                  </Button>
                </div>

                {reassignTarget === 'technician' ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Teknisi Pengganti</Label>
                    <Select
                      value={reassignTechnicianId}
                      onValueChange={(val) => setReassignTechnicianId(val)}
                    >
                      <SelectTrigger className="w-full bg-white text-xs">
                        <SelectValue placeholder="-- Pilih Teknisi --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {availableTechs.map((tech: any) => (
                          <SelectItem key={tech.id} value={String(tech.id)} className="text-xs">
                            <span className="font-semibold">{tech.name}</span> ({tech.team || 'Tanpa Tim'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">Tim Pengganti</Label>
                    <Select
                      value={reassignTeam}
                      onValueChange={(val) => setReassignTeam(val)}
                    >
                      <SelectTrigger className="w-full bg-white text-xs">
                        <SelectValue placeholder="-- Pilih Tim --" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {availableTeams.map((t: any) => {
                          const name = t.name || t.team || t;
                          return (
                            <SelectItem key={name} value={name} className="text-xs">
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsReassignModalOpen(false)}
              disabled={isReassigning}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleReassign}
              disabled={isReassigning}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
            >
              {isReassigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Mengalihkan...
                </>
              ) : (
                'Simpan Pengalihan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable BAST Modal (Technician Results & Customer Signature) */}
      <PrintableBastModal
        isOpen={showBastModal}
        onClose={() => setShowBastModal(false)}
        submission={provisioning}
      />
    </div>
  );
};
