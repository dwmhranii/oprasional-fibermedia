import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Users,
  FileCheck,
  AlertTriangle,
  Wrench,
  UserCheck,
  UserPlus,
  Send,
  ClipboardList,
  Smartphone,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Clock,
  AlertOctagon,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { PageHeader } from '@shared/ui/PageHeader';
import { StatCards, StatItem } from '@shared/ui/StatCards';
import { EmptyState } from '@shared/ui';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatTime } from '@shared/lib/formatters';

interface AdminOperationalDashboardProps {
  onNavigate?: (path: string) => void;
}

export const AdminOperationalDashboard: React.FC<AdminOperationalDashboardProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const { data, isLoading, isRefetching, isError, refetch } = useDashboardSummary({
    initialPeriod: 'today',
  });

  const activeCustomers = data?.pelanggan?.aktif ?? data?.pelanggan?.total ?? 1552;
  const pendingSubmissions = data?.psb?.menunggu_validasi ?? 0;
  const activeComplaints = (data?.pengaduan?.baru ?? 0) + (data?.pengaduan?.belum_ditugaskan ?? 0) + (data?.pengaduan?.diteruskan_ke_admin ?? 0);
  const activeWorkOrders = (data?.psb?.sedang_dikerjakan ?? 0) + (data?.psb?.belum_ditugaskan ?? 0);
  const readyTeamsCount = data?.tim_hari_ini?.tim_siap_count ?? 0;
  const totalTeamsCount = data?.tim_hari_ini?.total_tim_count ?? 4;

  const statItems: StatItem[] = [
    {
      id: 'active-customers',
      title: 'Pelanggan Aktif',
      value: activeCustomers,
      subtitle: 'Total pelanggan broadband terdaftar',
      icon: Users,
      variant: 'primary',
      onClick: () => handleNav('/customers'),
    },
    {
      id: 'pending-submissions',
      title: 'Pengajuan Pasang Baru',
      value: pendingSubmissions,
      subtitle: pendingSubmissions > 0 ? 'Menunggu verifikasi admin' : 'Semua pengajuan telah diproses',
      icon: FileCheck,
      variant: pendingSubmissions > 0 ? 'warning' : 'neutral',
      onClick: () => handleNav('/customers/submissions?status=pending'),
    },
    {
      id: 'active-complaints',
      title: 'Tiket Pengaduan Aktif',
      value: activeComplaints,
      subtitle: 'Pengaduan kendala operasional',
      icon: AlertTriangle,
      variant: activeComplaints > 0 ? 'warning' : 'neutral',
      onClick: () => handleNav('/complaints'),
    },
    {
      id: 'active-work-orders',
      title: 'Work Order Berjalan',
      value: activeWorkOrders,
      subtitle: 'Instalasi & perbaikan lapangan',
      icon: Wrench,
      variant: 'info',
      onClick: () => handleNav('/work-orders'),
    },
    {
      id: 'team-readiness',
      title: 'Kesiapan Petugas',
      value: `${readyTeamsCount}/${totalTeamsCount} Tim`,
      subtitle: 'Petugas hadir & siap bertugas',
      icon: UserCheck,
      variant: readyTeamsCount > 0 ? 'success' : 'neutral',
      onClick: () => handleNav('/attendance/today'),
    },
  ];

  const urgentItems = data?.perlu_tindakan ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto space-y-6 pb-16"
    >
      {/* Header Operasional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Dashboard Operasional & Layanan Pelanggan"
          description={`Selamat datang, ${user?.name ?? 'Admin'}. Pusat monitoring pelanggan aktif, verifikasi pengajuan pasang baru, dan tiket pengaduan.`}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9 gap-2 text-xs border-border"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>{isRefetching ? 'Memperbarui...' : 'Perbarui Data'}</span>
          </Button>
        </div>
      </div>

      {/* Pemberitahuan Absensi PWA */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-foreground">
        <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Absensi Harian Terintegrasi Lewat PWA</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Untuk melakukan absensi masuk dan pulang kerja, silakan buka aplikasi PWA Fibermedia di ponsel Anda. Rekap kehadiran seluruh personil dapat dipantau langsung melalui menu Absensi.
          </p>
        </div>
      </div>

      {/* Ringkasan Metrik Operasional */}
      <StatCards
        items={statItems}
        columns={3}
        isLoading={isLoading}
      />

      {/* Baris Dua Kolom: Perlu Tindakan & Jalan Pintas Operasional */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2 span): Perlu Tindakan Sekarang */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Perlu Tindakan Sekarang</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Daftar pengajuan atau tiket yang membutuhkan intervensi admin saat ini
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNav('/customers/submissions?status=pending')}
                  className="text-xs text-primary hover:text-primary/80 gap-1 h-8"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="h-14 bg-muted/20 animate-pulse rounded-lg border border-border" />
                  ))}
                </div>
              ) : isError ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-sm text-destructive font-medium">Gagal memuat daftar tindakan mendesak.</p>
                  <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
                    Coba Lagi
                  </Button>
                </div>
              ) : urgentItems.length === 0 ? (
                <div className="py-8 text-center">
                  <EmptyState
                    icon={CalendarCheck}
                    title="Tidak Ada Tindakan Mendesak"
                    description="Seluruh pengajuan pasang baru dan tiket pengaduan telah ditindaklanjuti dengan baik."
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentItems.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.id ?? idx}
                      onClick={() => handleNav(item.action_url ?? '/customers/submissions')}
                      className="group flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                          <AlertOctagon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description || item.subtitle || 'Menunggu tindakan lebih lanjut'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.created_at ? formatTime(item.created_at) : ''}
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan (1 span): Jalan Pintas Operasional */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground">Jalan Pintas Operasional</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Aksi cepat layanan pelanggan dan operasional harian.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/customers?action=create')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>Tambah Pelanggan Baru</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Daftarkan data pelanggan baru langsung ke dalam sistem.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/customers/submissions?status=pending')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                  <span>Validasi Pengajuan PSB</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Tinjau dan setujui pengajuan pasang baru dari Sales.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/complaints/new')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <Send className="w-4 h-4 text-rose-500" />
                  <span>Ajukan Pengaduan Kendala</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Buat tiket kendala koneksi atau teknis yang dialami pelanggan.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/work-orders')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <ClipboardList className="w-4 h-4 text-indigo-500" />
                  <span>Pantau Work Order</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Lihat status pengerjaan penugasan teknisi di lapangan.
                </p>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminOperationalDashboard;

