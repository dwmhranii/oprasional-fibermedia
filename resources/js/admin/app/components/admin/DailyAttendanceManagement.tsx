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
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

interface AttendanceItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  team_name: string;
  status: string;
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
  selfie_url: string | null;
}

interface TeamReadyInfo {
  id: number;
  name: string;
  is_ready: boolean;
  present_count: number;
  min_required: number;
  present_members: Array<{ id: number; name: string }>;
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

  // 1. Fetch Today Attendances & Readiness
  const { data, isLoading, refetch, isRefetching } = useQuery<{ success: boolean; data: TodayAttendanceData }>({
    queryKey: ['dailyAttendances', 'today'],
    queryFn: async () => {
      return await apiClient.get('/admin/attendances/today');
    },
    refetchInterval: 15000,
  });

  // 2. Fetch Users for Manual Input modal
  const { data: usersData } = useQuery<any>({
    queryKey: ['users', 'activeList'],
    queryFn: async () => {
      const res = await apiClient.get('/superadmin/users?per_page=100');
      return res?.data || res || [];
    },
  });

  // 3. Mutation for Manual Input
  const manualMutation = useMutation({
    mutationFn: async (payload: { user_id: number; work_date: string; status: string; reason: string }) => {
      return await apiClient.post('/admin/attendances/manual', payload);
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

  const attendanceData = data?.data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Absensi Harian & Kesiapan Tim
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pantau kehadiran personil hari ini ({attendanceData?.date || workDate}), validasi radius kantor, dan antrean giliran tim.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Input Absen Manual
          </Button>
        </div>
      </div>

      {/* Panel Tim Siap & Antrean Giliran */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Kesiapan Tim */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Panel Kesiapan Tim Operasional
                </CardTitle>
                <CardDescription>
                  Minimal {attendanceData?.team_panel.min_members_present ?? 1} teknisi hadir untuk status SIAP
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                {attendanceData?.team_panel.total_ready_teams ?? 0} Tim Siap
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attendanceData?.team_panel.teams.map((t) => (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    t.is_ready
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
                    {t.is_ready ? (
                      <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">SIAP</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-slate-500">BELUM SIAP</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Hadir: <strong className="text-slate-800 dark:text-slate-200">{t.present_count}</strong> / min. {t.min_required} orang
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {t.present_members.length > 0 ? (
                      <span className="truncate block">
                        Personil: {t.present_members.map((m) => m.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Belum ada anggota hadir</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Giliran Antrean Berikutnya (Round Robin) */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Giliran Antrean Berikutnya
            </CardTitle>
            <CardDescription>
              Berdasarkan pointer round-robin dari tim yang siap
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-xs font-medium uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Antrean PSB (Pemasangan Baru)
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {attendanceData?.next_queue.psb || 'belum tersedia'}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Antrean Gangguan (Komplain)
              </span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                {attendanceData?.next_queue.complaint || 'belum tersedia'}
              </p>
            </div>

            <p className="text-xs text-slate-400 italic">
              *Jika tidak ada tim yang siap hadir di kantor, status otomatis "belum tersedia" dan tiket masuk daftar tunggu.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Absensi Hari Ini */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Daftar Absensi Personil Hari Ini
          </CardTitle>
          <CardDescription>
            Validasi lokasi radius 50m dari titik kantor dan tanda peringatan luar radius
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Personil</TableHead>
                  <TableHead>Tim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Pulang</TableHead>
                  <TableHead>Jarak / Geofence</TableHead>
                  <TableHead>Tipe Absen</TableHead>
                  <TableHead>Catatan / Alasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Memuat data absensi...
                    </TableCell>
                  </TableRow>
                ) : !attendanceData?.attendances || attendanceData.attendances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Belum ada data absensi untuk hari ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData.attendances.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {item.user_name}
                        <div className="text-xs text-slate-400">{item.user_email}</div>
                      </TableCell>
                      <TableCell>{item.team_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'hadir'
                              ? 'default'
                              : item.status === 'izin'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.check_in_at || '-'}</TableCell>
                      <TableCell>{item.check_out_at || '-'}</TableCell>
                      <TableCell>
                        {item.office_distance_meters !== null ? (
                          <div className="flex items-center gap-1.5">
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
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.is_manual ? (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                            Manual Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                            PWA Kamera
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {item.note || '-'}
                        {item.set_by && (
                          <div className="text-[10px] text-slate-400">Oleh: {item.set_by}</div>
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
                    {Array.isArray(usersData) &&
                      usersData.map((u: any) => (
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
                <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Alasan Wajib (min. 5 karakter) *
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
