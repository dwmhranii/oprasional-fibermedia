import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  MessageCircle,
  RefreshCw,
  Scale,
  Settings2,
  ShieldAlert,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

export const KpiDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // Period state in YYYY-MM
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [period, setPeriod] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<'teams' | 'sales' | 'settings'>('teams');

  // WhatsApp Rating Modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [ratingTicketType, setRatingTicketType] = useState<'psb' | 'complaint'>('complaint');
  const [ratingTicketId, setRatingTicketId] = useState<string>('');
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingNote, setRatingNote] = useState<string>('');
  const [waLinkData, setWaLinkData] = useState<{ url: string; phone: string; message: string } | null>(null);

  // Settings Edit Modal state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState<'team' | 'sales'>('team');
  const [teamWeights, setTeamWeights] = useState({
    sla_compliance: 0.25,
    acceptance_speed: 0.15,
    productivity: 0.15,
    evidence_quality: 0.15,
    customer_rating: 0.15,
    attendance: 0.15,
  });
  const [salesWeights, setSalesWeights] = useState({
    validation_rate: 0.30,
    installation_rate: 0.30,
    data_quality: 0.30,
    attendance: 0.10,
  });
  const [settingsNotes, setSettingsNotes] = useState<string>('');

  // 1. Fetch KPI Monthly Overview
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['kpiOverview', period],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/admin/kpi/overview?period=${period}`);
      return res?.data ?? res;
    },
  });

  // 2. Fetch KPI Settings
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['kpiSettings'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/admin/kpi/settings');
      return res?.data ?? res;
    },
  });

  // Trigger Snapshot Mutation
  const snapshotMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post<any>('/admin/kpi/snapshot', { period });
    },
    onSuccess: () => {
      toast.success(`Snapshot KPI periode ${period} berhasil dihitung dan disimpan!`);
      queryClient.invalidateQueries({ queryKey: ['kpiOverview', period] });
    },
    onError: (err: any) => {
      toast.error('Gagal menghitung snapshot: ' + (err.message || 'Error'));
    },
  });

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.put<any>('/admin/kpi/settings', payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Pengaturan bobot berhasil diperbarui ke versi baru!');
      setIsSettingsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['kpiSettings'] });
      queryClient.invalidateQueries({ queryKey: ['kpiOverview', period] });
    },
    onError: (err: any) => {
      toast.error('Gagal memperbarui pengaturan: ' + (err.message || 'Error'));
    },
  });

  // Record Rating Mutation
  const recordRatingMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiClient.post<any>('/admin/kpi/rating', payload);
    },
    onSuccess: () => {
      toast.success('Rating pelanggan berhasil dicatat!');
      setIsRatingModalOpen(false);
      setRatingTicketId('');
      setRatingNote('');
      setWaLinkData(null);
      queryClient.invalidateQueries({ queryKey: ['kpiOverview', period] });
    },
    onError: (err: any) => {
      toast.error('Gagal mencatat rating: ' + (err.message || 'Error'));
    },
  });

  // Export CSV handler
  const handleExportCsv = () => {
    const rawUrl = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const token = localStorage.getItem('auth_token');
    window.open(`${baseUrl}/api/admin/kpi/export?period=${period}&token=${token}`, '_blank');
  };

  // WhatsApp link generator
  const handleGenerateWaLink = async () => {
    if (!ratingTicketId) {
      toast.error('ID Tiket wajib diisi');
      return;
    }
    try {
      const res = await apiClient.get<any>(
        `/admin/kpi/whatsapp-link?ticket_type=${ratingTicketType}&ticket_id=${ratingTicketId}`
      );
      if (res?.data) {
        setWaLinkData(res.data);
      }
    } catch (e: any) {
      toast.error('Gagal mendapatkan tautan WhatsApp: ' + (e.message || 'Error'));
    }
  };

  const overview = overviewData?.data || overviewData || {};
  const teamsList: any[] = overview.teams || [];
  const salesList: any[] = overview.sales || [];
  const isReadOnly = Boolean(overview.is_read_only);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-900/40 text-white shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight">Kinerja & KPI Bulanan</h1>
            {isReadOnly ? (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                Mode Hanya-Lihat / Uji Coba
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Penilaian Resmi
              </Badge>
            )}
          </div>
          <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
            Metrik operasional terpadu: waktu terima, SLA kepatuhan (config/sla.php), repeat trouble, kelengkapan bukti, absensi 100%, rating pelanggan WhatsApp, dan produktivitas sales tanpa komisi.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs">
            <Calendar className="w-3.5 h-3.5 text-indigo-300" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            />
          </div>

          <Button
            onClick={() => snapshotMutation.mutate()}
            disabled={snapshotMutation.isPending}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${snapshotMutation.isPending ? 'animate-spin' : ''}`} />
            Hitung Snapshot
          </Button>

          <Button
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 shadow-md flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Ekspor Laporan (.csv)
          </Button>

          <Button
            onClick={() => setIsRatingModalOpen(true)}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-9 shadow-md flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4" />
            Input Rating WA
          </Button>

          <Button
            onClick={() => {
              const activeTeam = settingsData?.active?.team;
              if (activeTeam?.weights) setTeamWeights(activeTeam.weights);
              const activeSales = settingsData?.active?.sales;
              if (activeSales?.weights) setSalesWeights(activeSales.weights);
              setIsSettingsModalOpen(true);
            }}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1" />
            Bobot
          </Button>
        </div>
      </div>

      {/* Mode Hanya-Lihat Notice Banner if active */}
      {isReadOnly && (
        <Alert className="border-amber-300 bg-amber-50/90 text-amber-900 shadow-sm">
          <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <AlertTitle className="text-sm font-bold text-amber-800">
            Periode Berada dalam Jendela Transisi Mode Hanya-Lihat (Trial)
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-700 mt-1">
            Sesuai aturan bisnis, evaluasi KPI dijalankan dalam mode hanya-lihat selama 1 bulan sebelum diberlakukan sebagai penilaian kinerja resmi. Hasil pada periode ini ditujukan untuk kalibrasi target dan pengenalan bagi tim lapangan serta sales.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Metric Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Kepatuhan SLA Rata-rata</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {overview.summary?.avg_sla_compliance !== undefined
                  ? `${overview.summary.avg_sla_compliance}%`
                  : '—'}
              </h3>
              <p className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Target 24j PSB / 2-12j Gangguan
              </p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Kecepatan Terima Rata-rata</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {overview.summary?.avg_acceptance_minutes !== undefined
                  ? `${overview.summary.avg_acceptance_minutes} mnt`
                  : '—'}
              </h3>
              <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Maksimal 15 menit
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Rating Pelanggan (WhatsApp)</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 flex items-center gap-1">
                {overview.summary?.avg_rating !== undefined ? overview.summary.avg_rating : '—'}
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Skala 1.00 - 5.00 bintang</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Star className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Tiket Selesai</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {overview.summary?.total_completed_tickets ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">PSB terpasang + Komplain teratasi</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-3 shadow-sm">
        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Kinerja Tim Lapangan ({teamsList.length})
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Kinerja Sales ({salesList.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          Riwayat Bobot & Versi
        </button>
      </div>

      {/* TAB 1: Kinerja Tim Lapangan */}
      {activeTab === 'teams' && (
        <Card className="border-t-0 rounded-t-none shadow-sm">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Peringkat & Rincian Metrik Tim Lapangan
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Bobot: SLA (25%), Terima (15%), Produktivitas (15%), Bukti (15%), Rating (15%), Absensi (15%) - Penalti Repeat Trouble.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {teamsList.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-xs italic">
                Belum ada data evaluasi tim untuk periode {period}. Klik "Hitung Snapshot" di atas untuk kalkulasi.
              </p>
            ) : (
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tim & Anggota</th>
                    <th className="py-3 px-3">Kecepatan Terima</th>
                    <th className="py-3 px-3">SLA Met / Breach</th>
                    <th className="py-3 px-3">Tiket Selesai</th>
                    <th className="py-3 px-3">Repeat Trouble</th>
                    <th className="py-3 px-3">Kelengkapan Bukti</th>
                    <th className="py-3 px-3">Kehadiran Tim</th>
                    <th className="py-3 px-3">Rating WA</th>
                    <th className="py-3 px-4 text-right">Skor KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamsList.map((t, idx) => {
                    const m = t.metrics || {};
                    return (
                      <tr key={t.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm">{t.name}</p>
                              <p className="text-[10px] text-slate-400 font-normal">
                                Versi Pengaturan: v{t.settings_version || 1}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{m.acceptance_speed_minutes ?? '—'} mnt</span>
                          <span className="block text-[10px] text-slate-400">Skor: {m.acceptance_speed_score ?? 0}%</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-emerald-700">{m.on_time_tickets ?? 0} On-Time</span>
                          <span className="block text-[10px] text-rose-500 font-medium">{m.total_breaches ?? 0} Breach ({m.sla_compliance_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800">
                          {m.completed_tickets ?? 0} Tiket
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {m.completed_tasks ?? 0} PSB / {m.resolved_complaints ?? 0} CMP
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`font-semibold ${Number(m.repeat_trouble_count) > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {m.repeat_trouble_count ?? 0} kasus
                          </span>
                          <span className="block text-[10px] text-slate-400">({m.repeat_trouble_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{m.evidence_completeness_rate ?? 0}%</span>
                          <span className="block text-[10px] text-slate-400">Anomali: {m.total_anomalies ?? 0}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{m.attendance_rate ?? 0}%</span>
                          <span className="block text-[10px] text-slate-400">{m.total_present_days ?? 0} hari-orang</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-amber-600 flex items-center gap-1">
                            {m.average_rating ?? '—'}
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          </span>
                          <span className="block text-[10px] text-slate-400">{m.rating_count ?? 0} ulasan</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-black text-indigo-600">
                            {typeof t.score === 'number' ? t.score.toFixed(2) : t.score}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: Kinerja Sales */}
      {activeTab === 'sales' && (
        <Card className="border-t-0 rounded-t-none shadow-sm">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Evaluasi Kinerja Tenaga Sales
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Bobot: Tervalidasi (30%), Terpasang (30%), Kualitas Data (30%), Kehadiran (10%). Sistem murni tanpa komisi keuangan.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {salesList.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-xs italic">
                Belum ada data evaluasi sales untuk periode {period}. Klik "Hitung Snapshot" di atas untuk kalkulasi.
              </p>
            ) : (
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Sales</th>
                    <th className="py-3 px-3">Total Pengajuan</th>
                    <th className="py-3 px-3">Tervalidasi (30%)</th>
                    <th className="py-3 px-3">Terpasang (30%)</th>
                    <th className="py-3 px-3">Kualitas Data (30%)</th>
                    <th className="py-3 px-3">Kehadiran (10%)</th>
                    <th className="py-3 px-3">Status Komisi</th>
                    <th className="py-3 px-4 text-right">Skor KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesList.map((s, idx) => {
                    const sm = s.metrics || {};
                    return (
                      <tr key={s.id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm">{s.name}</p>
                              <p className="text-[10px] text-slate-400 font-normal">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-slate-800">
                          {sm.total_submissions ?? 0} berkas
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-emerald-700">{sm.approved_submissions ?? 0} berkas</span>
                          <span className="block text-[10px] text-slate-400">({sm.validation_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-blue-700">{sm.installed_submissions ?? 0} terpasang</span>
                          <span className="block text-[10px] text-slate-400">({sm.installation_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{sm.clean_submissions ?? 0} bersih</span>
                          <span className="block text-[10px] text-slate-400">({sm.data_quality_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{sm.attendance_rate ?? 0}%</span>
                          <span className="block text-[10px] text-slate-400">{sm.present_days ?? 0} hari</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
                            Tanpa Komisi
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-black text-sky-600">
                            {typeof s.score === 'number' ? s.score.toFixed(2) : s.score}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: Riwayat Bobot & Versi */}
      {activeTab === 'settings' && (
        <Card className="border-t-0 rounded-t-none shadow-sm">
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Pengaturan Bobot Aktif & Riwayat Versi (Immutability Guarantee)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Setiap kali bobot diubah, sistem membuat nomor versi baru. Snapshot bulan terdahulu tetap mengunci versi lamanya sehingga nilai masa lalu tidak pernah berubah diam-diam.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Team Settings */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Bobot Tim Lapangan (Versi Aktif: v{settingsData?.active?.team?.version || 1})
                  </h4>
                  <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">Aktif</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(settingsData?.active?.team?.weights || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="capitalize text-slate-600">{key.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900">{(val * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Sales Settings */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    Bobot Sales (Versi Aktif: v{settingsData?.active?.sales?.version || 1})
                  </h4>
                  <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">Aktif</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(settingsData?.active?.sales?.weights || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="capitalize text-slate-600">{key.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-slate-900">{(val * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Input Rating Pelanggan WhatsApp */}
      <Dialog open={isRatingModalOpen} onOpenChange={setIsRatingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Catat Rating WhatsApp Pelanggan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Admin menghubungi pelanggan via WhatsApp untuk mengonfirmasi kepuasan pengerjaan teknisi (skala 1-5 bintang).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Tipe Tiket</label>
              <Select
                value={ratingTicketType}
                onValueChange={(val: any) => setRatingTicketType(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Pengaduan Gangguan (Complaint)</SelectItem>
                  <SelectItem value="psb">Pemasangan Baru (PSB Task)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">ID Tiket</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Contoh: 1, 2, 3..."
                  value={ratingTicketId}
                  onChange={(e) => setRatingTicketId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Button
                  type="button"
                  onClick={handleGenerateWaLink}
                  variant="outline"
                  className="text-xs shrink-0"
                >
                  Buat Tautan WA
                </Button>
              </div>
            </div>

            {/* Generated WhatsApp Link Preview */}
            {waLinkData && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-800">
                  Tautan WhatsApp Siap Dikirim:
                </p>
                <p className="text-[10px] text-slate-600 italic break-all">
                  "{waLinkData.message}"
                </p>
                <a
                  href={waLinkData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Buka Chat WhatsApp (wa.me)
                </a>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Rating Pelanggan (1 - 5 Bintang)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingScore(star)}
                    className={`p-2 rounded-xl border flex-1 flex justify-center items-center gap-1 transition-all ${
                      ratingScore >= star
                        ? 'bg-amber-50 border-amber-300 text-amber-600 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>{star}</span>
                    <Star className={`w-3.5 h-3.5 ${ratingScore >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Respon Pelanggan</label>
              <textarea
                rows={2}
                placeholder="Pelanggan merasa puas, internet menyala stabil..."
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRatingModalOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              onClick={() => {
                if (!ratingTicketId) {
                  toast.error('ID Tiket wajib diisi');
                  return;
                }
                recordRatingMutation.mutate({
                  ticket_type: ratingTicketType,
                  ticket_id: parseInt(ratingTicketId, 10),
                  rating: ratingScore,
                  note: ratingNote,
                });
              }}
              disabled={recordRatingMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Simpan Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Ubah Bobot Pengaturan KPI */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              Perbarui Bobot KPI (Versi Baru)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Total seluruh bobot harus tepat berjumlah 100% (1.00). Perubahan akan otomatis disimpan sebagai nomor versi baru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori</label>
              <Select
                value={settingsCategory}
                onValueChange={(val: any) => setSettingsCategory(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Tim Lapangan & Teknisi</SelectItem>
                  <SelectItem value="sales">Tenaga Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settingsCategory === 'team' ? (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">Rincian Bobot Tim (%):</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">SLA Compliance</span>
                    <input
                      type="number"
                      step="5"
                      value={teamWeights.sla_compliance * 100}
                      onChange={(e) => setTeamWeights({ ...teamWeights, sla_compliance: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kecepatan Terima</span>
                    <input
                      type="number"
                      step="5"
                      value={teamWeights.acceptance_speed * 100}
                      onChange={(e) => setTeamWeights({ ...teamWeights, acceptance_speed: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Produktivitas Tiket</span>
                    <input
                      type="number"
                      step="5"
                      value={teamWeights.productivity * 100}
                      onChange={(e) => setTeamWeights({ ...teamWeights, productivity: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kualitas Bukti</span>
                    <input
                      type="number"
                      step="5"
                      value={teamWeights.evidence_quality * 100}
                      onChange={(e) => setTeamWeights({ ...teamWeights, evidence_quality: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Rating Pelanggan</span>
                    <input
                      type="number"
                      step="5"
                      value={teamWeights.customer_rating * 100}
                      onChange={(e) => setTeamWeights({ ...teamWeights, customer_rating: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kehadiran Tim</span>
                    <input
                      type="number"
                      step="5"
                      value={teamWeights.attendance * 100}
                      onChange={(e) => setTeamWeights({ ...teamWeights, attendance: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-700">Rincian Bobot Sales (%):</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Tervalidasi (30%)</span>
                    <input
                      type="number"
                      step="5"
                      value={salesWeights.validation_rate * 100}
                      onChange={(e) => setSalesWeights({ ...salesWeights, validation_rate: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Jadi Terpasang (30%)</span>
                    <input
                      type="number"
                      step="5"
                      value={salesWeights.installation_rate * 100}
                      onChange={(e) => setSalesWeights({ ...salesWeights, installation_rate: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kualitas Data (30%)</span>
                    <input
                      type="number"
                      step="5"
                      value={salesWeights.data_quality * 100}
                      onChange={(e) => setSalesWeights({ ...salesWeights, data_quality: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Kehadiran (10%)</span>
                    <input
                      type="number"
                      step="5"
                      value={salesWeights.attendance * 100}
                      onChange={(e) => setSalesWeights({ ...salesWeights, attendance: parseFloat(e.target.value) / 100 })}
                      className="w-full border rounded p-1.5 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Perubahan Versi</label>
              <input
                type="text"
                placeholder="Contoh: Penyesuaian bobot SLA Q4 2026..."
                value={settingsNotes}
                onChange={(e) => setSettingsNotes(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)} className="text-xs">
              Batal
            </Button>
            <Button
              onClick={() => {
                saveSettingsMutation.mutate({
                  category: settingsCategory,
                  weights: settingsCategory === 'team' ? teamWeights : salesWeights,
                  notes: settingsNotes || `Pembaruan bobot ${settingsCategory}`,
                });
              }}
              disabled={saveSettingsMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              Simpan Versi Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiDashboard;
