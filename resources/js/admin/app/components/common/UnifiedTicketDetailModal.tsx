import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import {
  FileText,
  UserCheck,
  Wrench,
  Camera,
  History,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Users,
  ShieldCheck,
  AlertOctagon,
  UserX,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface UnifiedTicketDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketType: 'psb' | 'complaint';
  ticketId: number;
}

export const UnifiedTicketDetailModal: React.FC<UnifiedTicketDetailModalProps> = ({
  open,
  onOpenChange,
  ticketType,
  ticketId,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('summary');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assignReason, setAssignReason] = useState('');

  // Review & Waive Dialog State
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [waiveUserId, setWaiveUserId] = useState('');
  const [waiveReason, setWaiveReason] = useState('');

  // 1. Fetch Unified Detail
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ticketUnifiedDetail', ticketType, ticketId],
    queryFn: async () => {
      const res = await apiClient.get<any>(
        `/admin/dispatch/tickets/${ticketType}/${ticketId}/unified-detail`
      );
      return res?.data;
    },
    enabled: open && !!ticketId,
  });

  // 2. Mutation Dispatch Now
  const dispatchNowMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(
        `/admin/dispatch/tickets/${ticketType}/${ticketId}/dispatch-now`
      );
    },
    onSuccess: (res: any) => {
      if (res?.success) {
        toast.success(res?.message || 'Tiket berhasil dibagikan.');
      } else {
        toast.info(res?.message || 'Tidak ada tim siap saat ini.');
      }
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memproses pembagian tiket.');
    },
  });

  // 3. Mutation Manual Assign
  const manualAssignMutation = useMutation({
    mutationFn: async (payload: { team_id: number; reason: string }) => {
      return await apiClient.post('/admin/dispatch/manual-assign', {
        ticket_type: ticketType,
        ticket_id: ticketId,
        team_id: payload.team_id,
        reason: payload.reason,
      });
    },
    onSuccess: () => {
      toast.success('Tiket berhasil ditugaskan manual.');
      setAssignModalOpen(false);
      setAssignReason('');
      setSelectedTeamId('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menugaskan manual. Alasan wajib diisi.');
    },
  });

  // 4. Mutation Review Approve
  const approveReviewMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(
        `/admin/tickets/${ticketType}/${ticketId}/review/approve`
      );
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Tiket berhasil disetujui.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyetujui tiket. Periksa izin tickets.review.');
    },
  });

  // 5. Mutation Review Rework
  const reworkReviewMutation = useMutation({
    mutationFn: async (payload: { reason: string }) => {
      return await apiClient.post(
        `/admin/tickets/${ticketType}/${ticketId}/review/rework`,
        payload
      );
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Tiket dikembalikan ke tim untuk pengerjaan ulang.');
      setReworkModalOpen(false);
      setReworkReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal meminta rework tiket.');
    },
  });

  // 6. Mutation Review Flag
  const flagReviewMutation = useMutation({
    mutationFn: async (payload: { reason: string }) => {
      return await apiClient.post(
        `/admin/tickets/${ticketType}/${ticketId}/review/flag`,
        payload
      );
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Tiket berhasil ditandai bermasalah.');
      setFlagModalOpen(false);
      setFlagReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menandai tiket.');
    },
  });

  // 7. Mutation Phase 2 Waive Member
  const waiveMemberMutation = useMutation({
    mutationFn: async (payload: { user_id: number; reason: string }) => {
      return await apiClient.post(
        `/admin/tickets/${ticketType}/${ticketId}/phase2/waive`,
        payload
      );
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Teknisi berhasil dibebaskan dari persyaratan absensi.');
      setWaiveModalOpen(false);
      setWaiveReason('');
      setWaiveUserId('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal membebaskan teknisi.');
    },
  });

  const handleManualAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      toast.error('Pilih tim teknisi.');
      return;
    }
    if (!assignReason || assignReason.trim().length < 3) {
      toast.error('Alasan wajib diisi minimal 3 karakter.');
      return;
    }

    manualAssignMutation.mutate({
      team_id: parseInt(selectedTeamId),
      reason: assignReason.trim(),
    });
  };

  const ticket = data?.ticket;
  const currentTeam = data?.current_team;
  const availableTeams = data?.available_teams || [];
  const assignmentLogs = data?.assignment_logs || [];
  const ticketEvents = data?.ticket_events || [];
  const phase1 = data?.phase1;
  const evidence = data?.evidence;
  const attendances = evidence?.attendances || [];
  const phase2Requirements = evidence?.phase2_requirements || [];

  const getGeofenceBadge = (status: string) => {
    switch (status) {
      case 'inside':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Inside (&le;50m)</Badge>;
      case 'outside':
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200">Outside (&gt;50m)</Badge>;
      case 'low_accuracy':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Low Accuracy (&gt;100m)</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400">Unverified</Badge>;
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-600 text-white">Disetujui (Approved)</Badge>;
      case 'rework':
        return <Badge className="bg-amber-600 text-white">Minta Ulang (Rework)</Badge>;
      case 'flagged':
        return <Badge className="bg-rose-600 text-white">Bermasalah (Flagged)</Badge>;
      case 'needs_review':
        return <Badge className="bg-purple-600 text-white animate-pulse">Perlu Ditinjau</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-500">Selesai Normal</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {data?.ticket_number || 'Detail Tiket'}
                    <Badge variant="outline" className="text-xs uppercase font-semibold text-blue-600 border-blue-200">
                      {ticket?.type_label}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Pelanggan: <strong className="text-slate-700 dark:text-slate-300">{ticket?.customer_name}</strong> &bull; Wilayah: {ticket?.area || '-'}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize text-xs px-2.5 py-1">
                  Status: {ticket?.status}
                </Badge>
                {ticket?.review_status && ticket.review_status !== 'none' && (
                  getReviewStatusBadge(ticket.review_status)
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Memuat detail lengkap tiket...
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-5 w-full bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="summary" className="text-xs font-medium">Ringkasan</TabsTrigger>
                <TabsTrigger value="assignment" className="text-xs font-medium">Penugasan</TabsTrigger>
                <TabsTrigger value="work" className="text-xs font-medium flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5" />
                  Pekerjaan
                  {phase1?.has_port_conflict && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="evidence" className="text-xs font-medium flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Bukti
                  {ticket?.review_status === 'needs_review' && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs font-medium">Riwayat</TabsTrigger>
              </TabsList>

              {/* 1. Tab Ringkasan */}
              <TabsContent value="summary" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Info Pelanggan */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Informasi Pelanggan
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400">Nama:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{ticket?.customer_name}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Telepon / WA:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {ticket?.phone || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Alamat:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          {ticket?.address || '-'}
                        </p>
                      </div>
                      {ticket?.coordinates?.lat && ticket?.coordinates?.lng && (
                        <div>
                          <span className="text-slate-400">Titik Koordinat:</span>
                          <p className="font-mono text-[11px] text-blue-600">
                            {ticket.coordinates.lat}, {ticket.coordinates.lng}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info Penugasan & Tim */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status Tim & Operasional
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400">Tim Ditugaskan:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm text-blue-600">
                          {ticket?.assigned_team || 'Belum Ditugaskan'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Waktu Penugasan:</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {ticket?.assigned_at ? new Date(ticket.assigned_at).toLocaleString('id-ID') : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Batas Waktu Respon Tim:</span>
                        <p className="font-semibold text-amber-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {ticket?.response_deadline_at ? new Date(ticket.response_deadline_at).toLocaleString('id-ID') : '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Dibuat Pada:</span>
                        <p className="text-slate-600 dark:text-slate-400">
                          {ticket?.created_at ? new Date(ticket.created_at).toLocaleString('id-ID') : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 2. Tab Penugasan */}
              <TabsContent value="assignment" className="space-y-4 pt-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Tim Saat Ini</span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {currentTeam?.name || 'Belum Ada Tim Ditugaskan'}
                    </h3>
                    {currentTeam?.members && (
                      <p className="text-xs text-slate-500 mt-1">
                        Personil: {currentTeam.members.map((m: any) => m.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => dispatchNowMutation.mutate()}
                      disabled={dispatchNowMutation.isPending}
                      className="text-xs"
                    >
                      <Play className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Jalankan Pembagian Sekarang
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setAssignModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      Tugaskan Manual
                    </Button>
                  </div>
                </div>

                {/* Tabel Riwayat assignment_logs */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Riwayat Pembagian Tiket (Assignment Logs)
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Tim</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Alasan / Keterangan</TableHead>
                        <TableHead>Aktor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                            Belum ada riwayat penugasan untuk tiket ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assignmentLogs.map((log: any) => (
                          <TableRow key={log.id} className="text-xs">
                            <TableCell className="text-slate-500">
                              {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                              {log.team_name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate">
                              {log.reason || '-'}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {log.actor_name}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* 3. Tab Pekerjaan (Fase 1) */}
              <TabsContent value="work" className="space-y-4 pt-4">
                {/* Port Conflict Alert */}
                {phase1?.has_port_conflict && (
                  <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-800 dark:text-rose-200 text-sm">
                        Terdeteksi Konflik Port ODP!
                      </h4>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                        Port ODP {phase1.odp_port} pada ODP #{phase1.odp_id} yang dipilih teknisi telah digunakan oleh pelanggan lain.
                        Tiket tetap disimpan dan foto/bukti aman. Silakan koordinasi dengan tim jaringan untuk verifikasi port.
                      </p>
                    </div>
                  </div>
                )}

                {/* Technical Specifications Grid */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                    Data Teknis Lapangan (Fase 1)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border">
                      <span className="text-slate-400 block mb-1">ODP Terpilih</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                        {phase1?.odp_id ? `ODP #${phase1.odp_id}` : '-'}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border">
                      <span className="text-slate-400 block mb-1">Port ODP</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                        {phase1?.odp_port ? `Port ${phase1.odp_port}` : '-'}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border">
                      <span className="text-slate-400 block mb-1">ONU Index</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                        {phase1?.onu_index || '-'}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border">
                      <span className="text-slate-400 block mb-1">Redaman (OPM)</span>
                      <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                        {phase1?.optical_power ? `${phase1.optical_power} dBm` : '-'}
                      </strong>
                    </div>
                  </div>

                  {phase1?.completion_notes && (
                    <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-800 border text-xs">
                      <span className="text-slate-400 block mb-1">Catatan Pengerjaan:</span>
                      <p className="text-slate-700 dark:text-slate-300">{phase1.completion_notes}</p>
                    </div>
                  )}
                </div>

                {/* Media Foto & Tanda Tangan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Foto Sebelum */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Foto Sebelum Pengerjaan</span>
                    {phase1?.photo_before_url ? (
                      <div className="relative group overflow-hidden rounded-lg border aspect-video bg-slate-100 dark:bg-slate-800">
                        <img
                          src={phase1.photo_before_url}
                          alt="Foto Sebelum"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <a
                          href={phase1.photo_before_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" /> Buka Foto
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-xs">
                        Belum ada foto
                      </div>
                    )}
                  </div>

                  {/* Foto Sesudah */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Foto Sesudah Pengerjaan</span>
                    {phase1?.photo_after_url ? (
                      <div className="relative group overflow-hidden rounded-lg border aspect-video bg-slate-100 dark:bg-slate-800">
                        <img
                          src={phase1.photo_after_url}
                          alt="Foto Sesudah"
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <a
                          href={phase1.photo_after_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" /> Buka Foto
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-xs">
                        Belum ada foto
                      </div>
                    )}
                  </div>

                  {/* Tanda Tangan Pelanggan */}
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Tanda Tangan Pelanggan</span>
                    {phase1?.signature_url ? (
                      <div className="relative group overflow-hidden rounded-lg border aspect-video bg-white flex items-center justify-center p-2">
                        <img
                          src={phase1.signature_url}
                          alt="Tanda Tangan"
                          className="max-h-full max-w-full object-contain"
                        />
                        <a
                          href={phase1.signature_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" /> Buka Berkas
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg border border-dashed flex items-center justify-center text-slate-400 text-xs">
                        Belum ada tanda tangan
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* 4. Tab Bukti (Fase 2 & Review) */}
              <TabsContent value="evidence" className="space-y-4 pt-4">
                {/* Review Action Toolbar */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Status Peninjauan Bukti</span>
                    <div className="flex items-center gap-2 mt-1">
                      {getReviewStatusBadge(ticket?.review_status || 'none')}
                      {ticket?.review_flags && ticket.review_flags.length > 0 && (
                        <span className="text-xs text-slate-500">
                          Penanda: {ticket.review_flags.join(', ')}
                        </span>
                      )}
                    </div>
                    {ticket?.reviewed_by_name && (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Ditinjau oleh <strong className="text-slate-600 dark:text-slate-300">{ticket.reviewed_by_name}</strong> pada {ticket.reviewed_at ? new Date(ticket.reviewed_at).toLocaleString('id-ID') : '-'}
                        {ticket.review_note && ` &bull; "${ticket.review_note}"`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveReviewMutation.mutate()}
                      disabled={approveReviewMutation.isPending || ticket?.review_status === 'approved'}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReworkModalOpen(true)}
                      className="text-amber-600 border-amber-300 hover:bg-amber-50 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Minta Ulang (Rework)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFlagModalOpen(true)}
                      className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs"
                    >
                      <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                      Tandai Bermasalah
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setWaiveModalOpen(true)}
                      className="text-purple-600 text-xs"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Bebaskan Anggota
                    </Button>
                  </div>
                </div>

                {/* Attendances Cards */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Absensi Selfie & GPS Anggota Tim Lapangan (Fase 2)
                  </h4>

                  {attendances.length === 0 ? (
                    <div className="p-8 text-center border rounded-xl text-slate-400 text-xs">
                      Belum ada personil yang melakukan absensi Fase 2 di lokasi.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {attendances.map((att: any) => (
                        <div
                          key={att.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4"
                        >
                          {/* Selfie Image */}
                          <div className="w-20 h-24 rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-800 shrink-0 relative group">
                            {att.selfie_url ? (
                              <img
                                src={att.selfie_url}
                                alt={att.user_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                                No Selfie
                              </div>
                            )}
                          </div>

                          {/* Info Absensi */}
                          <div className="flex-1 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-slate-900 dark:text-slate-100">
                                {att.user_name}
                              </h5>
                              {getGeofenceBadge(att.geofence_status)}
                            </div>

                            <p className="text-slate-500">
                              Waktu Server: <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {att.received_at ? new Date(att.received_at).toLocaleTimeString('id-ID') : '-'}
                              </span>
                            </p>

                            <p className="text-slate-500">
                              Jarak ke Pelanggan: <strong className="text-slate-800 dark:text-slate-200">
                                {att.distance_meters !== null ? `${Math.round(att.distance_meters)} m` : '-'}
                              </strong>
                            </p>

                            <p className="text-slate-400 font-mono text-[10px]">
                              GPS: {att.lat}, {att.lng} (akurasi &plusmn;{att.accuracy ? Math.round(att.accuracy) : 0}m)
                            </p>

                            {att.is_anomaly && att.anomaly_reasons?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {att.anomaly_reasons.map((r: string, idx: number) => (
                                  <Badge key={idx} variant="destructive" className="text-[10px] py-0">
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Persyaratan Fase 2 (Status Kehadiran Tim) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
                    Daftar Teknisi Wajib Fase 2 (Terkunci Hari Ini)
                  </h4>
                  <div className="space-y-1.5">
                    {phase2Requirements.length === 0 ? (
                      <p className="text-xs text-slate-400">Belum ada daftar wajib yang terkunci.</p>
                    ) : (
                      phase2Requirements.map((req: any) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border text-xs"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {req.user_name}
                          </span>
                          <div>
                            {req.completed_at && !req.waived_by_id && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                                Hadir Absen
                              </Badge>
                            )}
                            {req.waived_by_id && (
                              <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">
                                Dibebaskan oleh {req.waived_by_name} ({req.waive_reason})
                              </Badge>
                            )}
                            {!req.completed_at && !req.waived_by_id && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300">
                                Belum Absen
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* 5. Tab Riwayat (ticket_events) */}
              <TabsContent value="history" className="space-y-4 pt-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Jejak Status & Event Tiket
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu Server</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Perubahan Status</TableHead>
                        <TableHead>Aktor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                            Belum ada riwayat jejak status tiket.
                          </TableCell>
                        </TableRow>
                      ) : (
                        ticketEvents.map((ev: any) => (
                          <TableRow key={ev.id} className="text-xs">
                            <TableCell className="text-slate-500">
                              {ev.occurred_at ? new Date(ev.occurred_at).toLocaleString('id-ID') : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                              {ev.event}
                            </TableCell>
                            <TableCell>
                              <span className="text-slate-400">{ev.from_status || 'Awal'}</span>
                              <span className="mx-1.5 text-slate-300">&rarr;</span>
                              <span className="font-medium text-blue-600">{ev.to_status}</span>
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {ev.actor_name}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="border-t pt-4 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Penugasan Manual dengan Alasan Wajib */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleManualAssignSubmit}>
            <DialogHeader>
              <DialogTitle>Tugaskan Manual ke Tim</DialogTitle>
              <DialogDescription className="text-xs">
                Pilih tim teknisi dan sertakan alasan wajib untuk jejak audit sistem.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Tim Teknisi *
                </label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih tim..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} (Urutan {t.order_index})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alasan Penugasan Manual (Wajib, min. 3 karakter) *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Contoh: Tim sedang berada di dekat lokasi pelanggan / prioritas pimpinan"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={manualAssignMutation.isPending}
              >
                {manualAssignMutation.isPending ? 'Menugaskan...' : 'Tugaskan Sekarang'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Minta Ulang (Rework) */}
      <Dialog open={reworkModalOpen} onOpenChange={setReworkModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reworkReason.trim().length < 5) {
                toast.error('Alasan minta ulang minimal 5 karakter.');
                return;
              }
              reworkReviewMutation.mutate({ reason: reworkReason.trim() });
            }}
          >
            <DialogHeader>
              <DialogTitle>Minta Ulang Pengerjaan Tiket (Rework)</DialogTitle>
              <DialogDescription className="text-xs">
                Tiket akan dikembalikan ke tim dengan status Dikerjakan dan teknisi akan menerima notifikasi pengerjaan ulang.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alasan Minta Ulang (Wajib) *
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                placeholder="Contoh: Foto sesudah pengerjaan buram dan redaman belum memenuhi standar (-24 dBm)"
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setReworkModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={reworkReviewMutation.isPending}
              >
                {reworkReviewMutation.isPending ? 'Memproses...' : 'Kirim Perintah Rework'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tandai Bermasalah (Flagged) */}
      <Dialog open={flagModalOpen} onOpenChange={setFlagModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (flagReason.trim().length < 5) {
                toast.error('Alasan penandaan minimal 5 karakter.');
                return;
              }
              flagReviewMutation.mutate({ reason: flagReason.trim() });
            }}
          >
            <DialogHeader>
              <DialogTitle>Tandai Tiket Bermasalah (Flagged)</DialogTitle>
              <DialogDescription className="text-xs">
                Tiket akan ditandai bermasalah untuk audit investigasi lanjutan.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alasan Penandaan Bermasalah (Wajib) *
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={3}
                placeholder="Contoh: Indikasi kecurangan foto selfie atau selisih waktu mencurigakan"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setFlagModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                disabled={flagReviewMutation.isPending}
              >
                {flagReviewMutation.isPending ? 'Memproses...' : 'Tandai Bermasalah'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Bebaskan Anggota Fase 2 */}
      <Dialog open={waiveModalOpen} onOpenChange={setWaiveModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!waiveUserId) {
                toast.error('Pilih teknisi yang akan dibebaskan.');
                return;
              }
              if (waiveReason.trim().length < 5) {
                toast.error('Alasan pembebasan minimal 5 karakter.');
                return;
              }
              waiveMemberMutation.mutate({
                user_id: parseInt(waiveUserId),
                reason: waiveReason.trim(),
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Bebaskan Teknisi dari Absensi Fase 2</DialogTitle>
              <DialogDescription className="text-xs">
                Bebaskan anggota tim yang izin sakit atau urusan darurat agar tiket dapat diselesaikan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Pilih Teknisi *
                </label>
                <Select value={waiveUserId} onValueChange={setWaiveUserId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih teknisi..." />
                  </SelectTrigger>
                  <SelectContent>
                    {phase2Requirements
                      .filter((r: any) => !r.completed_at && !r.waived_by_id)
                      .map((r: any) => (
                        <SelectItem key={r.user_id} value={String(r.user_id)}>
                          {r.user_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alasan Pembebasan (Wajib) *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Contoh: Teknisi dipanggil pimpinan untuk penanganan kabel backbone putus"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setWaiveModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={waiveMemberMutation.isPending}
              >
                {waiveMemberMutation.isPending ? 'Memproses...' : 'Bebaskan Teknisi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
