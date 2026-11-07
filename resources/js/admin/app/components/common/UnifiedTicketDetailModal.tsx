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
  Copy,
  Check,
  Zap,
  Maximize2,
  Navigation,
  Info,
  Calendar,
  Signal,
  CheckCircle,
  XCircle,
  X,
  PauseCircle,
} from 'lucide-react';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';

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

  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: '',
    title: '',
  });

  // Copied state
  const [copied, setCopied] = useState(false);

  // Review & Waive Dialog State
  const [reworkModalOpen, setReworkModalOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [waiveUserId, setWaiveUserId] = useState('');
  const [waiveReason, setWaiveReason] = useState('');

  // Pause SLA State (PRD v1.2: 5 standard pause reasons)
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseReasonId, setPauseReasonId] = useState('');
  const [pauseNotes, setPauseNotes] = useState('');

  // Reopen State (PRD v1.2: max 72 calendar hours)
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenPriority, setReopenPriority] = useState<'critical' | 'high' | 'medium'>('medium');
  const [reopenReason, setReopenReason] = useState('');

  // 1. Fetch Unified Detail
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ticketUnifiedDetail', ticketType, ticketId],
    queryFn: async () => {
      const res = await apiClient.get<any>(
        `/dispatch/tickets/${ticketType}/${ticketId}/unified-detail`
      );
      return res?.data?.ticket ? res.data : (res?.ticket ? res : res?.data || res);
    },
    enabled: open && !!ticketId,
  });

  // Fetch 5 standard pause reasons
  const { data: pauseReasonsResponse } = useQuery({
    queryKey: ['pauseReasonsList'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/pause-reasons/list');
      return Array.isArray(res) ? res : (res?.data || []);
    },
    staleTime: 300000,
  });
  const pauseReasons = Array.isArray(pauseReasonsResponse) ? pauseReasonsResponse : [];

  // 2. Mutation Dispatch Now
  const dispatchNowMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(
        `/dispatch/tickets/${ticketType}/${ticketId}/dispatch-now`
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
      return await apiClient.post('/dispatch/manual-assign', {
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
        `/work-orders/${ticketType}/${ticketId}/review/approve`
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
        `/work-orders/${ticketType}/${ticketId}/review/rework`,
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
      toast.error(err?.message || 'Gagal meminta pengerjaan ulang tiket.');
    },
  });

  // 6. Mutation Review Flag
  const flagReviewMutation = useMutation({
    mutationFn: async (payload: { reason: string }) => {
      return await apiClient.post(
        `/work-orders/${ticketType}/${ticketId}/review/flag`,
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
        `/work-orders/${ticketType}/${ticketId}/phase-2/waive`,
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

  // 8. Mutation Pause SLA
  const pauseSlaMutation = useMutation({
    mutationFn: async (payload: { pause_reason_id: number; notes: string }) => {
      return await apiClient.post(`/complaints/${ticketId}/pause`, payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'SLA tiket berhasil dijeda.');
      setPauseModalOpen(false);
      setPauseReasonId('');
      setPauseNotes('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menjeda SLA tiket.');
    },
  });

  // 9. Mutation Resume SLA
  const resumeSlaMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post(`/complaints/${ticketId}/resume`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'SLA tiket berhasil dilanjutkan.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal melanjutkan SLA tiket.');
    },
  });

  // 10. Mutation Reopen Ticket
  const reopenTicketMutation = useMutation({
    mutationFn: async (payload: { reason: string; priority?: string }) => {
      return await apiClient.post(`/complaints/${ticketId}/reopen`, payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Tiket berhasil dibuka kembali. SLA dihitung ulang.');
      setReopenModalOpen(false);
      setReopenReason('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal membuka kembali tiket. Maksimal 3 x 24 jam setelah tiket selesai.');
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

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Nomor tiket berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
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
        return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-300">Radius Aman (&le;50m)</Badge>;
      case 'outside':
        return <Badge className="bg-rose-500/10 text-rose-600 border border-rose-300">Di Luar Titik (&gt;50m)</Badge>;
      case 'low_accuracy':
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-300">Akurasi Rendah (&gt;100m)</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Belum Terverifikasi</Badge>;
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-600 text-white font-medium">Disetujui</Badge>;
      case 'rework':
        return <Badge className="bg-amber-600 text-white font-medium">Minta Ulang (Rework)</Badge>;
      case 'flagged':
        return <Badge className="bg-rose-600 text-white font-medium">Bermasalah (Flagged)</Badge>;
      case 'needs_review':
        return <Badge className="bg-purple-600 text-white animate-pulse font-medium">Perlu Ditinjau</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Selesai Normal</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'unassigned':
      case 'belum_ditugaskan':
      case 'belum ditugaskan':
        return <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Belum Ditugaskan</Badge>;
      case 'assigned':
      case 'ditugaskan':
        return <Badge className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Ditugaskan</Badge>;
      case 'in_progress':
      case 'dikerjakan':
        return <Badge className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Dikerjakan</Badge>;
      case 'completed':
      case 'selesai':
        return <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Selesai</Badge>;
      case 'cancelled':
      case 'batal':
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status || 'Draft'}</Badge>;
    }
  };

  const ticketNumber = data?.ticket_number || ticket?.number || ticket?.ticket_number || ticket?.task_number || `WO-#${ticketId}`;
  const isPsb = ticketType === 'psb' || ticket?.type === 'psb';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent hideCloseButton className="w-[96vw] max-w-5xl sm:max-w-5xl md:max-w-5xl lg:max-w-6xl xl:max-w-6xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl min-w-0">
          
          {/* 1. FIXED HEADER */}
          <div className="shrink-0 px-6 py-4 border-b border-border bg-card/95 backdrop-blur flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`p-2.5 rounded-xl shrink-0 ${isPsb ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'}`}>
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold font-mono text-foreground flex items-center gap-1.5 tracking-tight">
                    {ticketNumber}
                    <button
                      type="button"
                      onClick={() => handleCopy(ticketNumber)}
                      className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                      title="Salin nomor tiket"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </DialogTitle>

                  <Badge
                    variant="outline"
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isPsb
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {ticket?.type_label || (isPsb ? 'Pasang Baru (PSB)' : 'Gangguan (Komplain)')}
                  </Badge>

                  {getStatusBadge(ticket?.status)}

                  {ticket?.review_status && ticket.review_status !== 'none' && (
                    getReviewStatusBadge(ticket.review_status)
                  )}

                  {phase1?.has_port_conflict && (
                    <Badge variant="destructive" className="text-[11px] flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> Konflik Port ODP
                    </Badge>
                  )}
                </div>

                <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    Pelanggan: <strong className="text-foreground font-semibold">{ticket?.customer_name || '-'}</strong>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    Wilayah: <span className="text-foreground">{ticket?.area || '-'}</span>
                  </span>
                  {ticket?.phone && (
                    <>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        {ticket.phone}
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. FIXED TABS BAR */}
          <div className="shrink-0 px-6 pt-3 pb-0 border-b border-border bg-muted/30">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-5 gap-1.5 bg-muted/60 p-1.5 rounded-xl">
                <TabsTrigger value="summary" className="text-xs font-medium py-2">
                  <Info className="w-3.5 h-3.5 mr-1" />
                  Ringkasan
                </TabsTrigger>

                <TabsTrigger value="assignment" className="text-xs font-medium py-2 relative">
                  <Users className="w-3.5 h-3.5 mr-1" />
                  Penugasan Tim
                  {!currentTeam && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 ml-1.5 animate-pulse" title="Belum ditugaskan" />
                  )}
                </TabsTrigger>

                <TabsTrigger value="work" className="text-xs font-medium py-2 relative">
                  <Wrench className="w-3.5 h-3.5 mr-1" />
                  Pekerjaan
                  {phase1?.has_port_conflict && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 ml-1.5 animate-ping" title="Konflik Port" />
                  )}
                </TabsTrigger>

                <TabsTrigger value="evidence" className="text-xs font-medium py-2 relative">
                  <Camera className="w-3.5 h-3.5 mr-1" />
                  Bukti & Absensi
                  {ticket?.review_status === 'needs_review' && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 ml-1.5 animate-pulse" title="Perlu Ditinjau" />
                  )}
                </TabsTrigger>

                <TabsTrigger value="history" className="text-xs font-medium py-2">
                  <History className="w-3.5 h-3.5 mr-1" />
                  Riwayat
                  {assignmentLogs.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] rounded-full bg-muted-foreground/20 text-muted-foreground font-mono">
                      {assignmentLogs.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 3. SCROLLABLE TAB CONTENT BODY */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-medium text-foreground">Memuat detail lengkap tiket...</p>
                <p className="text-xs text-muted-foreground mt-1">Mengambil data pelanggan, riwayat penugasan, dan bukti pengerjaan.</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                
                {/* TAB 1: RINGKASAN */}
                <TabsContent value="summary" className="space-y-4 m-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Info Pelanggan Card */}
                    <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-primary" />
                          Informasi Pelanggan
                        </h4>
                        <span className="text-[11px] text-muted-foreground font-mono">ID: #{ticket?.id}</span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-muted-foreground text-[11px] block mb-0.5">Nama Lengkap</span>
                          <p className="text-sm font-semibold text-foreground">{ticket?.customer_name || '-'}</p>
                        </div>

                        <div>
                          <span className="text-muted-foreground text-[11px] block mb-0.5">Kontak Telepon / WhatsApp</span>
                          {ticket?.phone ? (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground font-mono flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                {ticket.phone}
                              </p>
                              <a
                                href={`https://wa.me/${ticket.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-emerald-600 hover:text-emerald-700 underline font-medium"
                              >
                                Buka Chat WA &rarr;
                              </a>
                            </div>
                          ) : (
                            <p className="text-muted-foreground">-</p>
                          )}
                        </div>

                        <div>
                          <span className="text-muted-foreground text-[11px] block mb-0.5">Alamat Lengkap</span>
                          <p className="font-medium text-foreground flex items-start gap-1.5 leading-relaxed">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                            {ticket?.address || '-'}
                          </p>
                        </div>

                        {ticket?.coordinates?.lat && ticket?.coordinates?.lng && (
                          <div className="pt-2 border-t border-border">
                            <span className="text-muted-foreground text-[11px] block mb-1">Titik Koordinat Lokasi</span>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border">
                              <p className="font-mono text-xs text-foreground font-medium">
                                {ticket.coordinates.lat}, {ticket.coordinates.lng}
                              </p>
                              <a
                                href={`https://www.google.com/maps?q=${ticket.coordinates.lat},${ticket.coordinates.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                              >
                                <Navigation className="w-3 h-3" />
                                Buka Google Maps
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info Operasional Tiket & Waktu */}
                    <div className="p-5 rounded-2xl border border-border bg-card/60 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          Operasional & Parameter SLA
                        </h4>
                        <span className="text-[11px] text-muted-foreground font-mono">Wilayah: {ticket?.area || '-'}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="text-muted-foreground text-[11px] block mb-1">Tim Ditugaskan</span>
                          <strong className="text-sm font-semibold text-foreground block truncate">
                            {ticket?.assigned_team || currentTeam?.name || 'Belum Ditugaskan'}
                          </strong>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="text-muted-foreground text-[11px] block mb-1">Status Pengerjaan</span>
                          <div className="mt-0.5">{getStatusBadge(ticket?.status)}</div>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="text-muted-foreground text-[11px] block mb-1">Prioritas & Target SLA</span>
                          <p className="font-bold text-foreground capitalize flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              ticket?.priority === 'critical' ? 'bg-rose-500 animate-pulse' :
                              ticket?.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            {ticket?.priority || 'Medium'} ({ticket?.sla_target_minutes ? `${Math.round(ticket.sla_target_minutes / 60)} Jam Operasional` : '24 Jam'})
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="text-muted-foreground text-[11px] block mb-1">Jendela Operasional SLA</span>
                          <p className="font-medium text-foreground text-[11px]">
                            Senin–Sabtu 08.00–20.00 WIB
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="text-muted-foreground text-[11px] block mb-1">Waktu Dibuat</span>
                          <p className="font-medium text-foreground">
                            {ticket?.created_at ? new Date(ticket.created_at).toLocaleString('id-ID') : '-'}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-muted/40 border border-border">
                          <span className="text-muted-foreground text-[11px] block mb-1">Waktu Penugasan</span>
                          <p className="font-medium text-foreground">
                            {ticket?.assigned_at ? new Date(ticket.assigned_at).toLocaleString('id-ID') : '-'}
                          </p>
                        </div>

                        {ticket?.sla_progress && (
                          <div className={`col-span-2 p-3 rounded-xl border ${
                            ticket.sla_progress.is_paused ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700' :
                            ticket.sla_progress.is_breached ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900' :
                            ticket.sla_progress.is_warning ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900' :
                            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {ticket.sla_progress.is_paused ? 'SLA Dijeda (Pause)' :
                                 ticket.sla_progress.is_breached ? 'SLA Terlampaui (Breached)' :
                                 ticket.sla_progress.is_warning ? 'SLA Mendekati Batas (Warning)' : 'SLA Berjalan Normal'}
                              </span>
                              <span className="font-mono font-bold text-xs">
                                {ticket.sla_progress.percentage}% ({ticket.sla_progress.remaining_minutes} mnt tersisa)
                              </span>
                            </div>
                            <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  ticket.sla_progress.is_paused ? 'bg-slate-500' :
                                  ticket.sla_progress.is_breached ? 'bg-rose-600' :
                                  ticket.sla_progress.is_warning ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, ticket.sla_progress.percentage)}%` }}
                              />
                            </div>
                            {ticket.pause_reason && (
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                Alasan Jeda: <strong className="text-foreground">{ticket.pause_reason}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Kontrol Aksi SLA & Reopen PRD v1.2 */}
                        <div className="col-span-2 pt-2 border-t border-border flex items-center justify-between flex-wrap gap-2">
                          {(ticket?.status === 'in_progress' || ticket?.status === 'assigned') && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setPauseModalOpen(true)}
                              className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 text-xs h-8"
                            >
                              <PauseCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                              Jeda SLA (Pause)
                            </Button>
                          )}

                          {ticket?.status === 'pending_customer' && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => resumeSlaMutation.mutate()}
                              disabled={resumeSlaMutation.isPending}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                            >
                              <Play className="w-3.5 h-3.5 mr-1" />
                              {resumeSlaMutation.isPending ? 'Melanjutkan...' : 'Lanjutkan SLA (Resume)'}
                            </Button>
                          )}

                          {(ticket?.status === 'resolved' || ticket?.status === 'closed' || ticket?.status === 'completed') && (
                            ticket?.can_reopen !== false ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setReopenModalOpen(true)}
                                className="text-indigo-700 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-50 text-xs h-8"
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                Buka Kembali Tiket (&le;72 Jam)
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg border border-border">
                                Batas waktu buka kembali (3 &times; 24 jam kalender) telah berakhir. Wajib buat tiket baru.
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: PENUGASAN (ASSIGNMENT) */}
                <TabsContent value="assignment" className="space-y-5 m-0">
                  {/* Status Tim Card */}
                  <div className="p-5 rounded-2xl border border-border bg-card/60 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`p-3 rounded-2xl shrink-0 ${currentTeam ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600'}`}>
                          {currentTeam ? <Users className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              Status Tim Teknisi
                            </span>
                            {currentTeam ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-300 text-[11px]">
                                Aktif Bertugas
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-600 border border-amber-300 text-[11px]">
                                Belum Ada Tim
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-lg font-bold text-foreground mt-1">
                            {currentTeam?.name || 'Belum Ada Tim Ditugaskan'}
                          </h3>

                          {currentTeam?.members && currentTeam.members.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              <span className="text-xs text-muted-foreground">Personil Lapangan:</span>
                              {currentTeam.members.map((m: any) => (
                                <Badge key={m.id} variant="secondary" className="text-xs font-normal">
                                  {m.name} {m.phone ? `(${m.phone})` : ''}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              Tiket ini membutuhkan penugasan ke tim teknisi lapangan agar segera ditindaklanjuti.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dispatchNowMutation.mutate()}
                          disabled={dispatchNowMutation.isPending}
                          className="text-xs h-9"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          {dispatchNowMutation.isPending ? 'Membagikan...' : 'Jalankan Pembagian Otomatis'}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => setAssignModalOpen(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
                        >
                          <Users className="w-3.5 h-3.5 mr-1.5" />
                          {currentTeam ? 'Ganti Tim (Reassign)' : 'Tugaskan Tim Manual'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Riwayat Pembagian Tiket (Assignment Logs) */}
                  <div className="rounded-2xl border border-border bg-card/60 shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Jejak Pembagian & Penugasan Tim
                        </h4>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        Total {assignmentLogs.length} Riwayat
                      </span>
                    </div>

                    <div className="w-full overflow-x-auto">
                      <Table className="w-full min-w-[640px]">
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead className="w-[140px] text-xs">Waktu Catatan</TableHead>
                            <TableHead className="w-[150px] text-xs">Tim Teknisi</TableHead>
                            <TableHead className="w-[110px] text-xs">Jenis Aksi</TableHead>
                            <TableHead className="text-xs">Alasan / Catatan</TableHead>
                            <TableHead className="w-[120px] text-xs">Aktor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignmentLogs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                                <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                                Belum ada riwayat pembagian penugasan untuk tiket ini.
                              </TableCell>
                            </TableRow>
                          ) : (
                            assignmentLogs.map((log: any) => (
                              <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                                <TableCell className="font-mono text-muted-foreground text-[11px] truncate" title={log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}>
                                  {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground truncate" title={log.team_name}>
                                  {log.team_name}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-foreground text-xs break-words" title={log.reason || '-'}>
                                  {log.reason || '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs truncate" title={log.actor_name}>
                                  {log.actor_name}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: PEKERJAAN (TAHAP 1) */}
                <TabsContent value="work" className="space-y-5 m-0">
                  {/* Port Conflict Alert */}
                  {phase1?.has_port_conflict && (
                    <div className="p-4 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-rose-900 dark:text-rose-200 text-sm">
                          Terdeteksi Konflik Port ODP!
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                          Port ODP {phase1.odp_port} pada ODP #{phase1.odp_id} yang dipilih teknisi telah digunakan oleh pelanggan lain.
                          Data pengerjaan dan bukti foto tetap tersimpan aman. Segera koordinasi dengan tim jaringan untuk verifikasi port.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Technical Specifications Grid */}
                  <div className="p-5 rounded-2xl border border-border bg-card/60 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-primary" />
                      Data Parameter Teknis Lapangan (Tahap 1)
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground text-[11px] block mb-1">ODP Terpilih</span>
                        <strong className="text-sm font-bold text-foreground">
                          {phase1?.odp_id ? `ODP #${phase1.odp_id}` : '-'}
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground text-[11px] block mb-1">Port ODP</span>
                        <strong className="text-sm font-bold text-foreground">
                          {phase1?.odp_port ? `Port ${phase1.odp_port}` : '-'}
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground text-[11px] block mb-1">ONU Index / Serial</span>
                        <strong className="text-sm font-mono font-bold text-foreground">
                          {phase1?.onu_index || '-'}
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                        <span className="text-muted-foreground text-[11px] block mb-1">Redaman Optik (OPM)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Signal className="w-4 h-4 text-primary" />
                          <strong className="text-sm font-mono font-bold text-foreground">
                            {phase1?.optical_power ? `${phase1.optical_power} dBm` : '-'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {phase1?.completion_notes && (
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                        <span className="text-muted-foreground text-[11px] font-semibold block mb-1">
                          Catatan Penyelesaian Teknisi:
                        </span>
                        <p className="text-foreground leading-relaxed">{phase1.completion_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Foto Sebelum, Sesudah & Tanda Tangan BAST */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Foto Sebelum */}
                    <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-xs text-center space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Foto Sebelum Pengerjaan
                      </span>
                      {phase1?.photo_before_url ? (
                        <div className="relative group overflow-hidden rounded-xl border border-border aspect-4/3 bg-muted/30">
                          <img
                            src={phase1.photo_before_url}
                            alt="Foto Sebelum Pengerjaan"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-8"
                              onClick={() => setPreviewImage({ open: true, url: phase1.photo_before_url, title: 'Foto Sebelum Pengerjaan' })}
                            >
                              <Maximize2 className="w-3.5 h-3.5 mr-1" /> Perbesar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-4/3 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs bg-muted/20">
                          Belum ada foto
                        </div>
                      )}
                    </div>

                    {/* Foto Sesudah */}
                    <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-xs text-center space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Foto Sesudah Pengerjaan
                      </span>
                      {phase1?.photo_after_url ? (
                        <div className="relative group overflow-hidden rounded-xl border border-border aspect-4/3 bg-muted/30">
                          <img
                            src={phase1.photo_after_url}
                            alt="Foto Sesudah Pengerjaan"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-8"
                              onClick={() => setPreviewImage({ open: true, url: phase1.photo_after_url, title: 'Foto Sesudah Pengerjaan' })}
                            >
                              <Maximize2 className="w-3.5 h-3.5 mr-1" /> Perbesar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-4/3 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs bg-muted/20">
                          Belum ada foto
                        </div>
                      )}
                    </div>

                    {/* Tanda Tangan Pelanggan */}
                    <div className="p-4 rounded-2xl border border-border bg-card/60 shadow-xs text-center space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Tanda Tangan Digital BAST
                      </span>
                      {phase1?.signature_url ? (
                        <div className="relative group overflow-hidden rounded-xl border border-border aspect-4/3 bg-white dark:bg-slate-900 flex items-center justify-center p-3">
                          <img
                            src={phase1.signature_url}
                            alt="Tanda Tangan Digital Pelanggan"
                            className="max-h-full max-w-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs h-8"
                              onClick={() => setPreviewImage({ open: true, url: phase1.signature_url, title: 'Tanda Tangan Digital Pelanggan' })}
                            >
                              <Maximize2 className="w-3.5 h-3.5 mr-1" /> Perbesar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-4/3 rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs bg-muted/20">
                          Belum ada tanda tangan
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 4: BUKTI & ABSENSI (TAHAP 2 & REVIEW) */}
                <TabsContent value="evidence" className="space-y-5 m-0">
                  {/* Review Action Toolbar */}
                  <div className="p-5 rounded-2xl border border-border bg-card/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                        Status Peninjauan Bukti & Hasil
                      </span>
                      <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                        {getReviewStatusBadge(ticket?.review_status || 'none')}
                        {ticket?.review_flags && ticket.review_flags.length > 0 && (
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                            Penanda: {ticket.review_flags.join(', ')}
                          </span>
                        )}
                      </div>
                      {ticket?.reviewed_by_name && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Ditinjau oleh <strong className="text-foreground">{ticket.reviewed_by_name}</strong> pada{' '}
                          {ticket.reviewed_at ? new Date(ticket.reviewed_at).toLocaleString('id-ID') : '-'}
                          {ticket.review_note && ` &bull; "${ticket.review_note}"`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center flex-wrap gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => approveReviewMutation.mutate()}
                        disabled={approveReviewMutation.isPending || ticket?.review_status === 'approved'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        Setujui Hasil
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReworkModalOpen(true)}
                        className="text-amber-600 border-amber-300 hover:bg-amber-50 text-xs h-9"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                        Minta Ulang (Rework)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFlagModalOpen(true)}
                        className="text-rose-600 border-rose-300 hover:bg-rose-50 text-xs h-9"
                      >
                        <AlertOctagon className="w-3.5 h-3.5 mr-1.5" />
                        Tandai Bermasalah
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setWaiveModalOpen(true)}
                        className="text-purple-600 text-xs h-9"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1.5" />
                        Bebaskan Anggota
                      </Button>
                    </div>
                  </div>

                  {/* Attendances Cards (Absensi Selfie & GPS di Lokasi) */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      Absensi Selfie & Verifikasi GPS Anggota Tim Lapangan (Tahap 2)
                    </h4>

                    {attendances.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-border rounded-2xl text-muted-foreground text-xs bg-muted/20">
                        Belum ada personil yang melakukan absensi Tahap 2 di lokasi pengerjaan.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attendances.map((att: any) => (
                          <div
                            key={att.id}
                            className="p-4 rounded-2xl border border-border bg-card/60 shadow-xs flex gap-4"
                          >
                            {/* Selfie Image */}
                            <div className="w-20 h-24 rounded-xl overflow-hidden border border-border bg-muted/40 shrink-0 relative group">
                              {att.selfie_url ? (
                                <>
                                  <img
                                    src={att.selfie_url}
                                    alt={att.user_name}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ open: true, url: att.selfie_url, title: `Selfie Absensi - ${att.user_name}` })}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] transition-opacity"
                                  >
                                    <Maximize2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                                  No Selfie
                                </div>
                              )}
                            </div>

                            {/* Info Absensi */}
                            <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <h5 className="font-bold text-foreground truncate">
                                  {att.user_name}
                                </h5>
                                {getGeofenceBadge(att.geofence_status)}
                              </div>

                              <p className="text-muted-foreground">
                                Waktu Server: <span className="text-foreground font-medium">
                                  {att.received_at ? new Date(att.received_at).toLocaleTimeString('id-ID') : '-'}
                                </span>
                              </p>

                              <p className="text-muted-foreground">
                                Jarak ke Pelanggan: <strong className="text-foreground">
                                  {att.distance_meters !== null ? `${Math.round(att.distance_meters)} meter` : '-'}
                                </strong>
                              </p>

                              <p className="text-muted-foreground font-mono text-[11px] truncate">
                                GPS: {att.lat}, {att.lng} (&plusmn;{att.accuracy ? Math.round(att.accuracy) : 0}m)
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

                  {/* Persyaratan Tahap 2 (Status Kehadiran Tim) */}
                  <div className="p-5 rounded-2xl border border-border bg-card/60 shadow-xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Daftar Teknisi Wajib Absensi Tahap 2 (Terkunci Hari Ini)
                    </h4>
                    <div className="space-y-2">
                      {phase2Requirements.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Belum ada daftar teknisi wajib yang terkunci.</p>
                      ) : (
                        phase2Requirements.map((req: any) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border text-xs"
                          >
                            <span className="font-semibold text-foreground">
                              {req.user_name}
                            </span>
                            <div>
                              {req.completed_at && !req.waived_by_id && (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-300">
                                  Hadir Absen
                                </Badge>
                              )}
                              {req.waived_by_id && (
                                <Badge className="bg-purple-500/10 text-purple-600 border border-purple-300">
                                  Dibebaskan oleh {req.waived_by_name} ({req.waive_reason})
                                </Badge>
                              )}
                              {!req.completed_at && !req.waived_by_id && (
                                <Badge variant="outline" className="text-amber-600 border border-amber-300">
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

                {/* TAB 5: RIWAYAT (TICKET EVENTS) */}
                <TabsContent value="history" className="space-y-4 m-0">
                  <div className="rounded-2xl border border-border bg-card/60 shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Jejak Perubahan Status & Riwayat Event
                        </h4>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        Total {ticketEvents.length} Event
                      </span>
                    </div>

                    <div className="w-full overflow-x-auto">
                      <Table className="w-full min-w-[640px]">
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead className="w-[150px] text-xs">Waktu Server</TableHead>
                            <TableHead className="w-[180px] text-xs">Nama Event</TableHead>
                            <TableHead className="text-xs">Perubahan Status</TableHead>
                            <TableHead className="w-[140px] text-xs">Aktor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ticketEvents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-xs">
                                <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                                Belum ada riwayat jejak status untuk tiket ini.
                              </TableCell>
                            </TableRow>
                          ) : (
                            ticketEvents.map((ev: any) => (
                              <TableRow key={ev.id} className="text-xs hover:bg-muted/30">
                                <TableCell className="font-mono text-muted-foreground text-[11px] truncate" title={ev.occurred_at ? new Date(ev.occurred_at).toLocaleString('id-ID') : '-'}>
                                  {ev.occurred_at ? new Date(ev.occurred_at).toLocaleString('id-ID') : '-'}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground truncate" title={ev.event}>
                                  {ev.event}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-muted-foreground text-xs truncate">{ev.from_status || 'Awal'}</span>
                                    <span className="text-muted-foreground text-xs">&rarr;</span>
                                    <span className="font-semibold text-primary text-xs truncate">{ev.to_status}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs truncate" title={ev.actor_name}>
                                  {ev.actor_name}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* 4. FIXED FOOTER */}
          <div className="shrink-0 px-6 py-3.5 border-t border-border bg-card/95 backdrop-blur flex items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>ID Tiket: #{ticket?.id || ticketId}</span>
              <span>&bull;</span>
              <span>Terakhir diperbarui: {ticket?.updated_at ? new Date(ticket.updated_at).toLocaleTimeString('id-ID') : '-'}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 px-4"
            >
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Penugasan Manual dengan Alasan Wajib */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <form onSubmit={handleManualAssignSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Tugaskan Tim Manual</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pilih tim teknisi dan sertakan alasan wajib untuk jejak audit operasional sistem.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Pilih Tim Teknisi *
                </label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih tim teknisi..." />
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
                <label className="text-xs font-semibold text-foreground">
                  Alasan Penugasan Manual (Wajib, min. 3 karakter) *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                  placeholder="Contoh: Tim sedang berada di dekat lokasi pelanggan / instruksi khusus pimpinan"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reworkReason.trim().length < 5) {
                toast.error('Alasan minta ulang minimal 5 karakter.');
                return;
              }
              reworkReviewMutation.mutate({ reason: reworkReason.trim() });
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Minta Ulang Pengerjaan Tiket (Rework)</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tiket akan dikembalikan ke tim dengan status Dikerjakan dan teknisi akan menerima instruksi perbaikan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              <label className="text-xs font-semibold text-foreground">
                Alasan Minta Ulang (Wajib) *
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
                placeholder="Contoh: Foto sesudah pengerjaan buram dan redaman belum memenuhi standar (-24 dBm)"
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="gap-2">
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
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (flagReason.trim().length < 5) {
                toast.error('Alasan penandaan minimal 5 karakter.');
                return;
              }
              flagReviewMutation.mutate({ reason: flagReason.trim() });
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Tandai Tiket Bermasalah (Flagged)</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tiket akan ditandai bermasalah untuk audit investigasi lanjutan oleh supervisor.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              <label className="text-xs font-semibold text-foreground">
                Alasan Penandaan Bermasalah (Wajib) *
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={3}
                placeholder="Contoh: Indikasi ketidaksesuaian foto selfie atau selisih jarak GPS mencurigakan"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="gap-2">
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

      {/* Modal Bebaskan Anggota Tahap 2 */}
      <Dialog open={waiveModalOpen} onOpenChange={setWaiveModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
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
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">Bebaskan Teknisi dari Syarat Absensi</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Teknisi terpilih akan dibebaskan dari syarat absensi lokasi Tahap 2 dengan alasan resmi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Pilih Teknisi Lapangan *
                </label>
                <Select value={waiveUserId} onValueChange={setWaiveUserId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih anggota tim..." />
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
                <label className="text-xs font-semibold text-foreground">
                  Alasan Pembebasan (Wajib, min. 5 karakter) *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Contoh: Teknisi mengalami kendala perangkat HP di lokasi / bertugas mengambil material tambahan di gudang"
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
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

      {/* Modal Jeda SLA (Pause) - PRD v1.2: 5 Alasan Baku */}
      <Dialog open={pauseModalOpen} onOpenChange={setPauseModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!pauseReasonId) {
                toast.error('Pilih salah satu dari 5 alasan baku jeda SLA.');
                return;
              }
              if (!pauseNotes.trim() || pauseNotes.trim().length < 5) {
                toast.error('Catatan alasan jeda minimal 5 karakter.');
                return;
              }
              pauseSlaMutation.mutate({
                pause_reason_id: parseInt(pauseReasonId),
                notes: pauseNotes.trim(),
              });
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-600" />
                Jeda Waktu SLA Tiket
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Timer SLA akan dihentikan sementara hingga kendala lapangan terselesaikan. Pilih alasan baku sesuai PRD v1.2.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alasan Baku Jeda SLA *
                </label>
                <Select value={pauseReasonId} onValueChange={setPauseReasonId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih alasan baku jeda SLA..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pauseReasons.map((pr: any) => (
                      <SelectItem key={pr.id} value={String(pr.id)}>
                        {pr.reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Catatan Keterangan Lapangan *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  placeholder="Jelaskan detail kendala (misal: rumah terkunci, pelanggan meminta kunjungan diundur besok)..."
                  value={pauseNotes}
                  onChange={(e) => setPauseNotes(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPauseModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={pauseSlaMutation.isPending}
              >
                {pauseSlaMutation.isPending ? 'Menjeda...' : 'Konfirmasi Jeda SLA'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Buka Kembali Tiket (Reopen) - PRD v1.2: Batas 72 Jam */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!reopenReason.trim() || reopenReason.trim().length < 5) {
                toast.error('Alasan pembukaan kembali tiket minimal 5 karakter.');
                return;
              }
              reopenTicketMutation.mutate({
                reason: reopenReason.trim(),
                priority: reopenPriority,
              });
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
                Buka Kembali Tiket (Reopen)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Maksimal 3 &times; 24 jam kalender sejak tiket diselesaikan. Timer SLA akan dihitung ulang dari awal menggunakan prioritas baru.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Prioritas Penanganan Ulang *
                </label>
                <Select value={reopenPriority} onValueChange={(val: any) => setReopenPriority(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih prioritas..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Kritis (3 Jam Operasional)</SelectItem>
                    <SelectItem value="high">Tinggi (6 Jam Operasional)</SelectItem>
                    <SelectItem value="medium">Sedang (24 Jam Operasional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Alasan Buka Kembali Tiket *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Jelaskan alasan pelanggan komplain kembali atau kendala yang belum tuntas..."
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReopenModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={reopenTicketMutation.isPending}
              >
                {reopenTicketMutation.isPending ? 'Membuka...' : 'Buka Kembali Tiket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={previewImage.open}
        onClose={() => setPreviewImage({ open: false, url: '', title: '' })}
        imageUrl={previewImage.url}
        title={previewImage.title}
      />
    </>
  );
};
