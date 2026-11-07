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
  CheckCircle2,
  Clock,
  MessageCircle,
  RefreshCw,
  Scale,
  Settings2,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { 
  PageHeader, 
  StatCards, 
  showToast 
} from '@shared/ui';
import { ACTIONS, TERMS, MESSAGES } from '@shared/i18n/id';
import { formatNumber } from '@shared/lib/formatters';
import { useAuth } from '../../context/AuthContext';

interface KpiDashboardProps {
  defaultTab?: 'teams' | 'sales' | 'settings';
  initialRatingOpen?: boolean;
}

export const KpiDashboard: React.FC<KpiDashboardProps> = ({ defaultTab = 'teams', initialRatingOpen = false }) => {
  const queryClient = useQueryClient();
  const { can, isSuperadmin } = useAuth();
  const canManageKpi = isSuperadmin || can('kpi.manage');

  // Period state in YYYY-MM
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const [period, setPeriod] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<'teams' | 'sales' | 'settings'>(defaultTab);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(initialRatingOpen);
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
      const res = await apiClient.get<any>(`/kpi/overview?period=${period}`);
      return res?.data ?? res;
    },
  });

  // 2. Fetch KPI Settings
  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['kpiSettings'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/kpi/settings');
      return res?.data ?? res;
    },
  });

  // 3. Mutation: Calculate / Recalculate Monthly Snapshot
  const calculateSnapshotMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<any>('/kpi/snapshot', { period });
      return res?.data ?? res;
    },
    onSuccess: (data) => {
      showToast.success('Snapshot KPI Berhasil Dihitung!', `Berhasil menghitung skor untuk ${data?.teams_count ?? 0} tim dan ${data?.sales_count ?? 0} sales.`);
      queryClient.invalidateQueries({ queryKey: ['kpiOverview', period] });
    },
    onError: (err: any) => {
      showToast.error('Gagal Menghitung Snapshot', err?.message || 'Terjadi kesalahan sistem.');
    },
  });

  // 4. Mutation: Submit WhatsApp Rating
  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        rating: ratingScore,
        notes: ratingNote,
      };
      if (ratingTicketType === 'complaint') {
        payload.complaint_id = Number(ratingTicketId);
      } else {
        payload.task_id = Number(ratingTicketId);
      }
      const res = await apiClient.post<any>('/kpi/rating', payload);
      return res?.data ?? res;
    },
    onSuccess: () => {
      showToast.success('Rating Berhasil Disimpan', 'Rating WhatsApp pelanggan berhasil dicatat ke sistem.');
      setIsRatingModalOpen(false);
      setRatingTicketId('');
      setRatingNote('');
      setWaLinkData(null);
      queryClient.invalidateQueries({ queryKey: ['kpiOverview', period] });
    },
    onError: (err: any) => {
      showToast.error('Gagal Menyimpan Rating', err?.message || 'Pastikan ID tiket valid.');
    },
  });

  // 5. Mutation: Update KPI Weights Settings
  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category: settingsCategory,
        weights: settingsCategory === 'team' ? teamWeights : salesWeights,
        notes: settingsNotes || `Pembaruan bobot ${settingsCategory} oleh admin`,
      };
      const res = await apiClient.put<any>('/kpi/settings', payload);
      return res?.data ?? res;
    },
    onSuccess: (data) => {
      showToast.success('Bobot Berhasil Diperbarui', `Bobot baru tersimpan sebagai versi v${data?.version || 'baru'}.`);
      setIsSettingsModalOpen(false);
      setSettingsNotes('');
      refetchSettings();
    },
    onError: (err: any) => {
      showToast.error('Gagal Menyimpan Bobot', err?.message || 'Total persentase bobot harus 100% (1.00).');
    },
  });

  const handleGenerateWaLink = async () => {
    if (!ratingTicketId) {
      showToast.warning('Isi ID Tiket', 'Masukkan ID pengaduan atau tugas terlebih dahulu.');
      return;
    }
    try {
      const typeParam = ratingTicketType === 'complaint' ? 'complaint' : 'psb';
      const res = await apiClient.get<any>(`/kpi/whatsapp-link?ticket_type=${typeParam}&ticket_id=${ratingTicketId}`);
      const data = res?.data ?? res;
      setWaLinkData(data);
      showToast.success('Tautan WhatsApp Siap', 'Tautan wa.me berhasil dibuat dengan nomor pelanggan.');
    } catch (err: any) {
      showToast.error('Gagal Membuat Tautan', err?.message || 'Data tiket tidak ditemukan.');
    }
  };

  const overview = overviewData ?? {};
  const teamsList: any[] = overview.teams ?? [];
  const salesList: any[] = overview.sales ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Standard Page Header */}
      <PageHeader
        title="Dasbor Evaluasi Kinerja (KPI)"
        description="Kalkulasi performa bulanan terpadu untuk tim lapangan dan sales dengan audit trail snapshot tersimpan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-xs rounded-lg border border-border bg-card text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />

            {canManageKpi && (
              <Button
                onClick={() => calculateSnapshotMutation.mutate()}
                disabled={calculateSnapshotMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${calculateSnapshotMutation.isPending ? 'animate-spin' : ''}`} />
                Hitung Snapshot KPI
              </Button>
            )}

            <Button
              onClick={() => setIsRatingModalOpen(true)}
              variant="outline"
              className="text-xs text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Rating WhatsApp
            </Button>

            {canManageKpi && (
              <Button
                onClick={() => setIsSettingsModalOpen(true)}
                variant="outline"
                className="text-xs"
              >
                <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                Pengaturan Bobot
              </Button>
            )}
          </div>
        }
      />

      {/* Snapshot Lock Banner */}
      {overview.is_locked && (
        <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-xs font-bold">Snapshot Periode Terkunci</AlertTitle>
          <AlertDescription className="text-xs">
            Evaluasi periode {period} telah dikunci secara permanen. Angka metrik di bawah bersifat historis dan tidak dapat diubah lagi.
          </AlertDescription>
        </Alert>
      )}

      {/* Top 4 Stat Cards */}
      <StatCards
        isLoading={isOverviewLoading}
        columns={4}
        items={[
          {
            title: 'Kepatuhan SLA',
            value: overview.summary?.sla_compliance_rate !== undefined
              ? `${overview.summary.sla_compliance_rate}%`
              : '—',
            subtitle: 'Target kepatuhan >= 90%',
            variant: (overview.summary?.sla_compliance_rate ?? 0) >= 90 ? 'success' : 'warning',
            icon: Zap,
          },
          {
            title: 'Kecepatan Terima Rata-rata',
            value: overview.summary?.avg_acceptance_minutes !== undefined
              ? `${overview.summary.avg_acceptance_minutes} mnt`
              : '—',
            subtitle: 'Maksimal 15 menit',
            variant: 'info',
            icon: Clock,
          },
          {
            title: `Rating ${TERMS.customer} (WhatsApp)`,
            value: overview.summary?.avg_rating !== undefined ? overview.summary.avg_rating : '—',
            subtitle: 'Skala 1.00 - 5.00 bintang',
            variant: 'warning',
            icon: Star,
          },
          {
            title: 'Total Tiket Selesai',
            value: formatNumber(overview.summary?.total_completed_tickets ?? 0),
            subtitle: `${TERMS.psb} + ${TERMS.complaint}`,
            variant: 'success',
            icon: Award,
          },
        ]}
      />

      {/* Tabs Navigation */}
      <div className="flex border-b border-border bg-card rounded-t-xl px-4 pt-2 gap-3 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Kinerja {TERMS.team} Lapangan ({teamsList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Kinerja Sales ({salesList.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scale className="w-4 h-4" />
          Riwayat Bobot & Versi
        </button>
      </div>

      {/* TAB 1: Kinerja Tim Lapangan */}
      {activeTab === 'teams' && (
        <Card className="border-t-0 rounded-t-none shadow-xs border-border bg-card">
          <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Peringkat & Rincian Metrik {TERMS.team} Lapangan
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Bobot: SLA (25%), Terima (15%), Produktivitas (15%), Bukti (15%), Rating (15%), Absensi (15%) - Penalti Repeat Trouble.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {teamsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-xs italic">
                Belum ada data evaluasi tim untuk periode {period}. Klik "Hitung Snapshot KPI" di atas untuk kalkulasi.
              </p>
            ) : (
              <table className="w-full text-xs text-left text-foreground">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4">{TERMS.team} & {TERMS.members}</th>
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
                <tbody className="divide-y divide-border/60">
                  {teamsList.map((t, idx) => {
                    const m = t.metrics || {};
                    return (
                      <tr key={t.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm">{t.name}</p>
                              <p className="text-[10px] text-muted-foreground font-normal">
                                Versi Pengaturan: v{t.settings_version || 1}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold">{m.acceptance_speed_minutes ?? '—'} mnt</span>
                          <span className="block text-[10px] text-muted-foreground">Skor: {m.acceptance_speed_score ?? 0}%</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{m.on_time_tickets ?? 0} On-Time</span>
                          <span className="block text-[10px] text-rose-500 font-medium">{m.total_breaches ?? 0} Breach ({m.sla_compliance_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3 font-semibold">
                          {m.completed_tickets ?? 0} Tiket
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {m.completed_tasks ?? 0} PSB / {m.resolved_complaints ?? 0} Pengaduan
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`font-semibold ${Number(m.repeat_trouble_count) > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                            {m.repeat_trouble_count ?? 0} kasus
                          </span>
                          <span className="block text-[10px] text-muted-foreground">({m.repeat_trouble_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold">{m.evidence_completeness_rate ?? 0}%</span>
                          <span className="block text-[10px] text-muted-foreground">Anomali: {m.total_anomalies ?? 0}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold">{m.attendance_rate ?? 0}%</span>
                          <span className="block text-[10px] text-muted-foreground">{m.total_present_days ?? 0} kehadiran</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            {m.average_rating ?? '—'}
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          </span>
                          <span className="block text-[10px] text-muted-foreground">{m.rating_count ?? 0} ulasan</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-black text-primary">
                            {typeof t.score === 'number' ? formatNumber(t.score, 2) : t.score}
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
        <Card className="border-t-0 rounded-t-none shadow-xs border-border bg-card">
          <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Evaluasi Kinerja Tenaga Sales
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Bobot: Tervalidasi (30%), Terpasang (30%), Kualitas Data (30%), Kehadiran (10%). Sistem murni tanpa komisi keuangan.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {salesList.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-xs italic">
                Belum ada data evaluasi sales untuk periode {period}. Klik "Hitung Snapshot KPI" di atas untuk kalkulasi.
              </p>
            ) : (
              <table className="w-full text-xs text-left text-foreground">
                <thead className="bg-muted/40 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider border-b border-border">
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
                <tbody className="divide-y divide-border/60">
                  {salesList.map((s, idx) => {
                    const sm = s.metrics || {};
                    return (
                      <tr key={s.id || idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-black text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground font-normal">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-semibold">
                          {sm.total_submissions ?? 0} berkas
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{sm.approved_submissions ?? 0} berkas</span>
                          <span className="block text-[10px] text-muted-foreground">({sm.validation_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{sm.installed_submissions ?? 0} terpasang</span>
                          <span className="block text-[10px] text-muted-foreground">({sm.installation_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold">{sm.clean_submissions ?? 0} bersih</span>
                          <span className="block text-[10px] text-muted-foreground">({sm.data_quality_rate ?? 0}%)</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold">{sm.attendance_rate ?? 0}%</span>
                          <span className="block text-[10px] text-muted-foreground">{sm.present_days ?? 0} hari</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Tanpa Komisi
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-black text-blue-600 dark:text-blue-400">
                            {typeof s.score === 'number' ? formatNumber(s.score, 2) : s.score}
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
        <Card className="border-t-0 rounded-t-none shadow-xs border-border bg-card">
          <CardHeader className="p-5 border-b border-border">
            <CardTitle className="text-base font-bold text-foreground">
              Pengaturan Bobot Aktif & Riwayat Versi
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Setiap kali bobot diubah, sistem membuat nomor versi baru. Snapshot bulan terdahulu tetap mengunci versi lamanya sehingga riwayat historis terjamin integritasnya.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Team Settings */}
              <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    Bobot {TERMS.team} Lapangan (Versi Aktif: v{settingsData?.active?.team?.version || 1})
                  </h4>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Aktif</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(settingsData?.active?.team?.weights || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-border/60">
                      <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-foreground">{(val * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Sales Settings */}
              <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Bobot Sales (Versi Aktif: v{settingsData?.active?.sales?.version || 1})
                  </h4>
                  <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px]">Aktif</Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(settingsData?.active?.sales?.weights || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex justify-between py-1 border-b border-border/60">
                      <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-foreground">{(val * 100).toFixed(0)}%</span>
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
              Catat Rating WhatsApp {TERMS.customer}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Admin menghubungi {TERMS.customer.toLowerCase()} via WhatsApp untuk mengonfirmasi kepuasan pengerjaan teknisi (skala 1-5 bintang).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Tipe Tiket</label>
              <Select
                value={ratingTicketType}
                onValueChange={(val: any) => setRatingTicketType(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">{TERMS.complaintTicket}</SelectItem>
                  <SelectItem value="psb">{TERMS.psb}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">ID Tiket</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Contoh: 1, 2, 3..."
                  value={ratingTicketId}
                  onChange={(e) => setRatingTicketId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background text-foreground px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
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
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Tautan WhatsApp Siap Dikirim:
                </p>
                <p className="text-[10px] text-muted-foreground italic break-all">
                  "{waLinkData.message}"
                </p>
                <a
                  href={waLinkData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Buka Chat WhatsApp
                </a>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Rating {TERMS.customer} (1 - 5 Bintang)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingScore(star)}
                    className={`p-2 rounded-xl border flex-1 flex justify-center items-center gap-1 transition-all ${
                      ratingScore >= star
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 font-bold'
                        : 'bg-muted/40 border-border text-muted-foreground'
                    }`}
                  >
                    <span>{star}</span>
                    <Star className={`w-3.5 h-3.5 ${ratingScore >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Catatan Respon {TERMS.customer}</label>
              <textarea
                rows={2}
                placeholder="Pelanggan merasa puas, internet menyala stabil..."
                value={ratingNote}
                onChange={(e) => setRatingNote(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background text-foreground p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRatingModalOpen(false)} className="text-xs">
              {ACTIONS.cancel}
            </Button>
            <Button
              onClick={() => submitRatingMutation.mutate()}
              disabled={submitRatingMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {submitRatingMutation.isPending ? MESSAGES.saving : ACTIONS.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Pengaturan Bobot KPI */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Perbarui Bobot Evaluasi KPI
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Total persentase bobot wajib berjumlah 100% (1.00). Setiap perubahan otomatis mengunci nomor versi baru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Kategori Evaluasi</label>
              <Select
                value={settingsCategory}
                onValueChange={(val: any) => setSettingsCategory(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">{TERMS.team} Lapangan</SelectItem>
                  <SelectItem value="sales">Tenaga Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settingsCategory === 'team' ? (
              <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                <p className="text-[11px] font-bold text-foreground">
                  Alokasi Bobot Tim (Harus Berjumlah 100%):
                </p>
                {Object.entries(teamWeights).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs gap-3">
                    <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={val}
                      onChange={(e) =>
                        setTeamWeights({ ...teamWeights, [key]: parseFloat(e.target.value) || 0 })
                      }
                      className="w-20 text-xs rounded border border-border bg-background text-foreground px-2 py-1 text-right"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20">
                <p className="text-[11px] font-bold text-foreground">
                  Alokasi Bobot Sales (Harus Berjumlah 100%):
                </p>
                {Object.entries(salesWeights).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs gap-3">
                    <span className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={val}
                      onChange={(e) =>
                        setSalesWeights({ ...salesWeights, [key]: parseFloat(e.target.value) || 0 })
                      }
                      className="w-20 text-xs rounded border border-border bg-background text-foreground px-2 py-1 text-right"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Catatan Kebijakan Bobot Baru</label>
              <textarea
                rows={2}
                placeholder="Alasan penyesuaian bobot evaluasi..."
                value={settingsNotes}
                onChange={(e) => setSettingsNotes(e.target.value)}
                className="w-full text-xs rounded-lg border border-border bg-background text-foreground p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSettingsModalOpen(false)} className="text-xs">
              {ACTIONS.cancel}
            </Button>
            <Button
              onClick={() => updateSettingsMutation.mutate()}
              disabled={updateSettingsMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              {updateSettingsMutation.isPending ? MESSAGES.saving : ACTIONS.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KpiDashboard;
