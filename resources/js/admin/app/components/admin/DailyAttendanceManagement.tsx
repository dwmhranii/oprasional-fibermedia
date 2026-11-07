import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  RefreshCw,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
  Eye,
  Check,
  X,
  ExternalLink,
  Smartphone,
  Building2,
  Navigation,
} from 'lucide-react';

export interface AttendanceItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  team_name: string;
  track: 'office' | 'field' | string;
  status: string;
  review_status: 'pending_review' | 'approved' | 'rejected' | null;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  client_ip: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  office_name: string | null;
  office_distance_meters: number | null;
  is_outside_radius: boolean;
  is_manual: boolean;
  note: string | null;
  set_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  selfie_url: string | null;
  check_in_selfie_url?: string | null;
  check_out_selfie_url?: string | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  check_out_accuracy?: number | null;
}

interface TeamReadyInfo {
  id: number;
  name: string;
  is_ready: boolean;
  present_count: number;
  attended_count?: number;
  checked_out_count?: number;
  min_required: number;
  present_members: Array<{ id: number; name: string }>;
  checked_out_members?: Array<{ id: number; name: string }>;
}

interface OfficeItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  valid_wifi_ips: string[] | string | null;
  wifi_incident_active: boolean;
  is_active: boolean;
}

interface TodayAttendanceData {
  date: string;
  attendances: AttendanceItem[];
  team_panel: {
    min_members_present: number;
    total_ready_teams: number;
    teams: TeamReadyInfo[];
  };
  next_queue: {
    psb: string;
    complaint: string;
  };
}

export const DailyAttendanceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [status, setStatus] = useState('hadir');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  // Filter tab state
  const [activeTab, setActiveTab] = useState<'all' | 'office' | 'field' | 'pending' | 'suspicious'>('all');

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedItemForReview, setSelectedItemForReview] = useState<AttendanceItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  // Photo viewer modal state
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);

  // 1. Fetch Today Attendances & Readiness
  const { data, isLoading, refetch, isRefetching } = useQuery<{ success: boolean; data: TodayAttendanceData }>({
    queryKey: ['dailyAttendances', 'today'],
    queryFn: async () => {
      return await apiClient.get('/attendances/today');
    },
    refetchInterval: 15000,
  });

  // 2. Fetch Office Locations (for Wi-Fi incident bypass toggle)
  const { data: officesData, refetch: refetchOffices } = useQuery<{ success: boolean; data: OfficeItem[] }>({
    queryKey: ['officeLocations'],
    queryFn: async () => {
      const res = await apiClient.get('/office-locations');
      return res?.data ? res : { success: true, data: Array.isArray(res) ? res : [] };
    },
  });

  // 3. Fetch Users for Manual Input modal
  const { data: usersData } = useQuery<any>({
    queryKey: ['users', 'activeList'],
    queryFn: async () => {
      const res = await apiClient.get('/users?per_page=100');
      return res?.data || res || [];
    },
  });

  // 4. Mutation for Manual Input
  const manualMutation = useMutation({
    mutationFn: async (payload: { user_id: number; work_date: string; status: string; reason: string }) => {
      return await apiClient.post('/attendances/manual', payload);
    },
    onSuccess: () => {
      toast.success('Absensi manual berhasil disimpan.');
      setModalOpen(false);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['dailyAttendances'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan absensi manual. Alasan wajib diisi.');
    },
  });

  // 5. Mutation for Field Attendance Review (Approve/Reject)
  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes }: { id: number; action: 'approve' | 'reject'; notes?: string }) => {
      return await apiClient.post(`/attendances/${id}/review`, { action, notes });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Tinjauan absensi berhasil disimpan.');
      setReviewModalOpen(false);
      setSelectedItemForReview(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['dailyAttendances'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memproses tinjauan absensi.');
    },
  });

  // 6. Mutation for Wi-Fi Incident Toggle
  const toggleWifiIncidentMutation = useMutation({
    mutationFn: async (officeId: number) => {
      return await apiClient.post(`/office-locations/${officeId}/toggle-incident`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Status insiden Wi-Fi berhasil diperbarui.');
      refetchOffices();
      queryClient.invalidateQueries({ queryKey: ['dailyAttendances'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengubah status insiden Wi-Fi.');
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Pilih pengguna terlebih dahulu.');
      return;
    }
    if (!reason || reason.trim().length < 5) {
      toast.error('Alasan wajib diisi minimal 5 karakter.');
      return;
    }

    manualMutation.mutate({
      user_id: parseInt(selectedUserId),
      work_date: workDate,
      status,
      reason: reason.trim(),
    });
  };

  const handleOpenReview = (item: AttendanceItem) => {
    setSelectedItemForReview(item);
    setReviewAction('approve');
    setReviewNotes('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForReview) return;

    if (reviewAction === 'reject' && (!reviewNotes || reviewNotes.trim().length === 0)) {
      toast.error('Catatan alasan penolakan absensi wajib diisi.');
      return;
    }

    reviewMutation.mutate({
      id: selectedItemForReview.id,
      action: reviewAction,
      notes: reviewNotes.trim() || undefined,
    });
  };

  const attendanceData: TodayAttendanceData | undefined =
    (data as any)?.attendances !== undefined
      ? (data as unknown as TodayAttendanceData)
      : (data as any)?.data;
  const rawAttendances = attendanceData?.attendances || [];

  // Filter attendances based on activeTab
  const filteredAttendances = rawAttendances.filter((item) => {
    if (activeTab === 'office') return (item.track || 'office') === 'office';
    if (activeTab === 'field') return item.track === 'field';
    if (activeTab === 'pending') return item.review_status === 'pending_review';
    if (activeTab === 'suspicious') return item.is_suspicious;
    return true;
  });

  const pendingReviewCount = rawAttendances.filter((i) => i.review_status === 'pending_review').length;
  const suspiciousGpsCount = rawAttendances.filter((i) => i.is_suspicious).length;
  const officeTrackCount = rawAttendances.filter((i) => (i.track || 'office') === 'office').length;
  const fieldTrackCount = rawAttendances.filter((i) => i.track === 'field').length;

  const officesList = Array.isArray(officesData)
    ? officesData
    : (officesData as any)?.data || [];

  const rawUsersList = Array.isArray(usersData)
    ? usersData
    : Array.isArray((usersData as any)?.data)
    ? (usersData as any).data
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Absensi Harian & Kesiapan Tim
          </h1>
          <p className="text-sm text-muted-foreground">
            Pantau kehadiran personil hari ini ({attendanceData?.date || workDate}), validasi jalur kantor & lapangan, dan antrean giliran tim.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchOffices();
            }}
            disabled={isRefetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <PlusCircle className="w-4 h-4" />
            Input Absen Manual
          </Button>
        </div>
      </div>

      {/* Wi-Fi Emergency Mode Bypass Banner / Widget (PRD Final v1.2 Bagian 6) */}
      {officesList.length > 0 && (
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="py-3 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Status Validasi Wi-Fi Kantor (Bypass Darurat)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Jika koneksi Wi-Fi kantor padam, aktifkan toggle bypass agar teknisi tetap dapat absen via geofence 50m.
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-3 px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {officesList.map((office) => (
                <div
                  key={office.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    office.wifi_incident_active
                      ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20'
                      : 'border-border bg-muted/40'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {office.name}
                    </p>
                    <div className="text-[11px] mt-0.5">
                      {office.wifi_incident_active ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <WifiOff className="w-3 h-3" />
                          Insiden Wi-Fi Aktif (Bypass)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Normal (Wajib Wi-Fi Sah)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={office.wifi_incident_active ? 'destructive' : 'outline'}
                    className="text-xs h-7 px-2.5 shrink-0"
                    disabled={toggleWifiIncidentMutation.isPending}
                    onClick={() => toggleWifiIncidentMutation.mutate(office.id)}
                  >
                    {office.wifi_incident_active ? 'Matikan Bypass' : 'Aktifkan Bypass'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panel Tim Siap & Antrean Giliran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Kesiapan Tim */}
        <Card className="lg:col-span-2 border-border bg-card shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Panel Kesiapan Tim Operasional
                </CardTitle>
                <CardDescription>
                  Minimal {attendanceData?.team_panel.min_members_present ?? 1} teknisi hadir di kantor untuk status SIAP
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm font-semibold bg-primary/10 text-primary border-primary/30">
                {attendanceData?.team_panel.total_ready_teams ?? 0} Tim Siap
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attendanceData?.team_panel.teams.map((t) => {
                const attendedCount = t.attended_count ?? t.present_count;
                const checkedOutCount = t.checked_out_count ?? 0;
                const isShiftEnded = !t.is_ready && attendedCount > 0;

                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      t.is_ready
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : isShiftEnded
                        ? 'border-blue-500/30 bg-blue-500/5'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-foreground">{t.name}</span>
                      {t.is_ready ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">SIAP</Badge>
                      ) : isShiftEnded ? (
                        <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10">SELESAI SHIFT</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">BELUM SIAP</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {t.is_ready ? (
                        <>Hadir Aktif: <strong className="text-emerald-500 font-semibold">{t.present_count}</strong> / min. {t.min_required} orang</>
                      ) : isShiftEnded ? (
                        <>Hadir Hari Ini: <strong className="text-foreground">{attendedCount} orang</strong> ({checkedOutCount} sudah pulang)</>
                      ) : (
                        <>Hadir: <strong className="text-foreground">{t.present_count}</strong> / min. {t.min_required} orang</>
                      )}
                    </div>
                    <div className="text-xs text-foreground/80">
                      {t.present_members.length > 0 ? (
                        <span className="truncate block text-emerald-600 dark:text-emerald-400 font-medium">
                          Personil Aktif: {t.present_members.map((m) => m.name).join(', ')}
                        </span>
                      ) : (t.checked_out_members && t.checked_out_members.length > 0) ? (
                        <span className="truncate block text-blue-500/90 font-medium">
                          Sudah Pulang: {t.checked_out_members.map((m) => m.name).join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Belum ada anggota hadir</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Giliran Antrean Berikutnya (Round Robin) */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Giliran Antrean Berikutnya
            </CardTitle>
            <CardDescription>
              Berdasarkan pointer round-robin dari tim yang siap
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <span className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Antrean PSB (Pemasangan Baru)
              </span>
              <p className="text-lg font-bold text-foreground mt-1">
                {attendanceData?.next_queue.psb || 'belum tersedia'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Antrean Gangguan (Pengaduan)
              </span>
              <p className="text-lg font-bold text-foreground mt-1">
                {attendanceData?.next_queue.complaint || 'belum tersedia'}
              </p>
            </div>

            <p className="text-xs text-muted-foreground italic">
              *Jika tidak ada tim yang siap hadir di kantor, status otomatis &quot;belum tersedia&quot; dan tiket masuk antrean tunggu.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Absensi Hari Ini dengan Tab Filter Dua Jalur */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Daftar Absensi Personil Hari Ini
              </CardTitle>
              <CardDescription>
                Validasi kehadiran dua jalur: Kantor (radius 50m & Wi-Fi) dan Lapangan (swafoto & verifikasi admin).
              </CardDescription>
            </div>
          </div>

          {/* Tab Filter Button Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              Semua ({rawAttendances.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('office')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'office'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Jalur Kantor ({officeTrackCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('field')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'field'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Jalur Lapangan ({fieldTrackCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Perlu Ditinjau
              {pendingReviewCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200">
                  {pendingReviewCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suspicious')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'suspicious'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Anomali GPS
              {suspiciousGpsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-200">
                  {suspiciousGpsCount}
                </span>
              )}
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Personil</TableHead>
                  <TableHead>Jalur</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tinjauan Admin</TableHead>
                  <TableHead>Jam Masuk / Pulang</TableHead>
                  <TableHead>Lokasi & GPS</TableHead>
                  <TableHead>Bukti Swafoto</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Memuat data absensi...
                    </TableCell>
                  </TableRow>
                ) : filteredAttendances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Tidak ada data absensi untuk filter ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendances.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      {/* 1. Personil & Tim */}
                      <TableCell className="font-medium text-foreground">
                        <div>{item.user_name}</div>
                        <div className="text-xs text-muted-foreground">{item.user_email}</div>
                        <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                          Tim: <span className="font-medium text-foreground">{item.team_name}</span>
                        </div>
                      </TableCell>

                      {/* 2. Jalur Absensi */}
                      <TableCell>
                        {item.track === 'field' ? (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs flex items-center gap-1 w-fit">
                            <Smartphone className="w-3 h-3" />
                            Lapangan
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs flex items-center gap-1 w-fit">
                            <Building2 className="w-3 h-3" />
                            Kantor
                          </Badge>
                        )}
                        {item.is_manual && (
                          <Badge variant="outline" className="mt-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] w-fit">
                            Manual Admin
                          </Badge>
                        )}
                      </TableCell>

                      {/* 3. Status Kehadiran */}
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'hadir'
                              ? 'default'
                              : item.status === 'field_checkin'
                              ? 'secondary'
                              : item.status === 'izin'
                              ? 'outline'
                              : 'destructive'
                          }
                          className="capitalize text-xs font-semibold"
                        >
                          {item.status === 'field_checkin' ? 'Absen Lapangan' : item.status}
                        </Badge>
                      </TableCell>

                      {/* 4. Status Tinjauan Admin */}
                      <TableCell>
                        {item.review_status === 'pending_review' ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Perlu Ditinjau
                          </Badge>
                        ) : item.review_status === 'approved' ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Disetujui
                          </Badge>
                        ) : item.review_status === 'rejected' ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Ditolak (Alpa)
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                        {item.reviewed_by && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Oleh: {item.reviewed_by}
                          </div>
                        )}
                      </TableCell>

                      {/* 5. Jam Masuk / Pulang */}
                      <TableCell className="text-xs font-mono">
                        <div>
                          Masuk: <span className="font-semibold text-foreground">{item.check_in_at || '-'}</span>
                        </div>
                        <div>
                          Pulang: <span className="text-muted-foreground">{item.check_out_at || '-'}</span>
                        </div>
                      </TableCell>

                      {/* 6. Lokasi & GPS */}
                      <TableCell className="text-xs">
                        {item.is_suspicious && (
                          <div className="mb-1">
                            <Badge variant="destructive" className="flex items-center gap-1 text-[11px] py-0 px-1.5 font-semibold">
                              <ShieldAlert className="w-3 h-3" />
                              Anomali GPS
                            </Badge>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 block mt-0.5 max-w-[180px] leading-tight">
                              {item.suspicious_reason}
                            </span>
                          </div>
                        )}

                        {item.track === 'office' ? (
                          item.office_distance_meters !== null ? (
                            <div className="flex items-center gap-1">
                              {item.is_outside_radius ? (
                                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  {item.office_distance_meters} m (Luar Radius)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs text-emerald-600 border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {item.office_distance_meters} m
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )
                        ) : (
                          <div>
                            {item.latitude && item.longitude ? (
                              <div className="font-mono text-[11px] text-muted-foreground">
                                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                                {item.accuracy && (
                                  <span className="block text-[10px] text-muted-foreground">
                                    ±{Math.round(item.accuracy)}m
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        )}

                        {item.client_ip && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            IP: {item.client_ip}
                          </div>
                        )}
                      </TableCell>

                      {/* 7. Swafoto */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {/* Foto Masuk */}
                          {item.check_in_selfie_url || item.selfie_url ? (
                            <button
                              type="button"
                              onClick={() => setPhotoViewerUrl(item.check_in_selfie_url || item.selfie_url)}
                              className="relative group w-11 h-11 rounded-lg overflow-hidden border border-emerald-500/30 bg-muted flex items-center justify-center shrink-0 hover:ring-2 hover:ring-emerald-500 transition-all shadow-xs"
                              title="Swafoto Masuk (Klik untuk perbesar)"
                            >
                              <img
                                src={item.check_in_selfie_url || item.selfie_url || ''}
                                alt="Swafoto Masuk"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8.5px] text-emerald-300 font-semibold text-center leading-tight py-0.5">
                                Masuk
                              </span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">-</span>
                          )}

                          {/* Foto Pulang */}
                          {item.check_out_selfie_url ? (
                            <button
                              type="button"
                              onClick={() => setPhotoViewerUrl(item.check_out_selfie_url!)}
                              className="relative group w-11 h-11 rounded-lg overflow-hidden border border-blue-500/40 bg-muted flex items-center justify-center shrink-0 hover:ring-2 hover:ring-blue-500 transition-all shadow-xs"
                              title="Swafoto Pulang (Klik untuk perbesar)"
                            >
                              <img
                                src={item.check_out_selfie_url}
                                alt="Swafoto Pulang"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8.5px] text-blue-300 font-semibold text-center leading-tight py-0.5">
                                Pulang
                              </span>
                            </button>
                          ) : item.check_out_at ? (
                            <span className="text-[10px] text-muted-foreground italic py-1 px-1 rounded bg-muted/40 border border-border/50 text-center leading-tight" title="Absen pulang tanpa swafoto">
                              Tanpa foto
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* 8. Aksi */}
                      <TableCell className="text-right">
                        {item.review_status === 'pending_review' || item.is_suspicious ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold"
                            onClick={() => handleOpenReview(item)}
                          >
                            Tinjau
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-8 px-2.5 text-muted-foreground"
                            onClick={() => handleOpenReview(item)}
                          >
                            Detail
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Review Absensi Lapangan (PRD Final v1.2 Bagian 6) */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          {selectedItemForReview && (
            <form onSubmit={handleSubmitReview}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Tinjauan Absensi Personil Lapangan
                </DialogTitle>
                <DialogDescription>
                  Verifikasi bukti swafoto, titik GPS, dan integritas kehadiran staf sebelum menyetujui.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4 text-xs">
                {/* Personil & Jalur info */}
                <div className="p-3 rounded-xl border border-border bg-muted/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Nama Personil:</span>
                    <span className="font-bold text-foreground">{selectedItemForReview.user_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Jalur Absensi:</span>
                    <Badge variant="outline" className="capitalize text-[11px]">
                      {selectedItemForReview.track === 'field' ? 'Jalur Lapangan (Sales/Kolektor)' : 'Jalur Kantor'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Waktu Absen:</span>
                    <span className="font-mono text-foreground">{selectedItemForReview.check_in_at || '-'} WIB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Koordinat GPS:</span>
                    <span className="font-mono text-foreground">
                      {selectedItemForReview.latitude?.toFixed(5)}, {selectedItemForReview.longitude?.toFixed(5)}
                      {selectedItemForReview.accuracy && ` (±${Math.round(selectedItemForReview.accuracy)}m)`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">IP Jaringan:</span>
                    <span className="font-mono text-foreground">{selectedItemForReview.client_ip || '-'}</span>
                  </div>
                </div>

                {/* Indikator Anomali jika ada */}
                {selectedItemForReview.is_suspicious && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Peringatan Anomali GPS (Anti-Fake GPS)
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {selectedItemForReview.suspicious_reason}
                    </p>
                  </div>
                )}

                {/* Swafoto Preview: Masuk & Pulang */}
                <div className="space-y-2">
                  <label className="font-semibold text-foreground block text-xs">Bukti Swafoto Kehadiran:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Swafoto Masuk */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-medium text-emerald-500">● Swafoto Masuk</span>
                        <span>{selectedItemForReview.check_in_at || '-'}</span>
                      </div>
                      <div className="aspect-square rounded-xl overflow-hidden border border-emerald-500/30 bg-slate-950 flex items-center justify-center relative group">
                        {selectedItemForReview.check_in_selfie_url || selectedItemForReview.selfie_url ? (
                          <>
                            <img
                              src={selectedItemForReview.check_in_selfie_url || selectedItemForReview.selfie_url || ''}
                              alt="Swafoto Masuk"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoViewerUrl(selectedItemForReview.check_in_selfie_url || selectedItemForReview.selfie_url)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Tidak ada foto</span>
                        )}
                      </div>
                    </div>

                    {/* Swafoto Pulang */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-medium text-blue-500">● Swafoto Pulang</span>
                        <span>{selectedItemForReview.check_out_at || 'Belum pulang'}</span>
                      </div>
                      <div className="aspect-square rounded-xl overflow-hidden border border-blue-500/30 bg-slate-950 flex items-center justify-center relative group">
                        {selectedItemForReview.check_out_selfie_url ? (
                          <>
                            <img
                              src={selectedItemForReview.check_out_selfie_url}
                              alt="Swafoto Pulang"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoViewerUrl(selectedItemForReview.check_out_selfie_url!)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {selectedItemForReview.check_out_at ? 'Tanpa foto pulang' : 'Belum absen pulang'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tindakan Tinjauan: Setujui vs Tolak */}
                <div className="space-y-2">
                  <label className="font-semibold text-foreground block">Keputusan Admin *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewAction('approve')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        reviewAction === 'approve'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Setujui (Status: Hadir)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('reject')}
                      className={`p-3 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        reviewAction === 'reject'
                          ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/30'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Tolak (Status: Alpa)
                    </button>
                  </div>
                </div>

                {/* Catatan / Alasan Tinjauan */}
                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">
                    Catatan Tinjauan {reviewAction === 'reject' && <span className="text-rose-500">* (Wajib jika ditolak)</span>}
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-transparent text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={
                      reviewAction === 'reject'
                        ? 'Contoh: Swafoto buram tidak menampilkan wajah staf / GPS terdeteksi anomali palsu.'
                        : 'Catatan tambahan (opsional)...'
                    }
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    required={reviewAction === 'reject'}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setReviewModalOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={
                    reviewAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }
                >
                  {reviewMutation.isPending ? 'Menyimpan...' : 'Simpan Keputusan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Zoom Foto Swafoto */}
      <Dialog open={Boolean(photoViewerUrl)} onOpenChange={() => setPhotoViewerUrl(null)}>
        <DialogContent className="sm:max-w-[420px] p-2 bg-slate-950 border-slate-800">
          {photoViewerUrl && (
            <div className="relative">
              <img
                src={photoViewerUrl}
                alt="Zoom Swafoto"
                className="w-full h-auto rounded-lg object-contain max-h-[80vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Input Absen Manual */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleManualSubmit}>
            <DialogHeader>
              <DialogTitle>Input Absen Manual Admin</DialogTitle>
              <DialogDescription>
                Penyesuaian status absensi dengan alasan wajib untuk audit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Pilih Personil *</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rawUsersList.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tanggal *</label>
                  <Input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Status *</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hadir">Hadir</SelectItem>
                      <SelectItem value="izin">Izin</SelectItem>
                      <SelectItem value="sakit">Sakit</SelectItem>
                      <SelectItem value="alpa">Alpa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Alasan Wajib (min. 5 karakter) *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border border-border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Contoh: Dispensasi dinas luar kota / kendala sinyal GPS saat di kantor"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={manualMutation.isPending}
              >
                {manualMutation.isPending ? 'Menyimpan...' : 'Simpan Absensi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
