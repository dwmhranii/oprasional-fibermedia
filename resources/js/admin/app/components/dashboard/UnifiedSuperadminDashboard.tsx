import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { DashboardHeader } from './DashboardHeader';
import { DashboardGamificationRow } from './DashboardGamificationRow';
import { DashboardStatCardsRow } from './DashboardStatCardsRow';
import { DashboardUrgentActions } from './DashboardUrgentActions';
import { DashboardAttendanceToday } from './DashboardAttendanceToday';
import { DashboardTrendCharts } from './DashboardTrendCharts';
import { Card, CardContent } from '../ui/card';
import {
  Users,
  Shield,
  FileText,
  UsersRound,
  ArrowRight,
} from 'lucide-react';

export const UnifiedSuperadminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperadmin =
    user?.role?.toLowerCase() === 'superadmin' ||
    user?.roles?.some((r: any) => (typeof r === 'string' ? r : r.name)?.toLowerCase() === 'superadmin');

  const {
    data,
    isLoading,
    isRefetching,
    isError,
    refetch,
    period,
    setPeriod,
    isLiveConnected,
  } = useDashboardSummary({ initialPeriod: 'today' });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto space-y-6 pb-16"
    >
      {/* 1. PageHeader: Judul, Waktu Pembaruan, Periode, Muat Ulang, Status Reverb/Polling */}
      <DashboardHeader
        lastUpdated={data?.last_updated}
        period={period}
        onPeriodChange={setPeriod}
        onReload={refetch}
        isReloading={isRefetching}
        isLiveConnected={isLiveConnected}
      />

      {/* 2. Gamifikasi Operasional & Skor Kesiapan Tim */}
      <DashboardGamificationRow
        data={data}
        isLoading={isLoading}
      />

      {/* 3. Baris Kartu Ringkasan (StatCards): Pengaduan, Pelanggan, PSB, Tim, Jaringan */}
      <DashboardStatCardsRow
        data={data}
        period={period}
        isLoading={isLoading}
      />

      {/* 4. Panel "Perlu Tindakan Sekarang" (Top 10 Teratas & Tombol Aksi Langsung) */}
      <DashboardUrgentActions
        items={data?.perlu_tindakan}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
      />

      {/* 5. Panel "Absensi Hari Ini" (Belum Absen, Luar Radius, Tim Belum Siap) */}
      {data?.absensi_hari_ini != null && !isError && (
        <DashboardAttendanceToday
          data={data?.absensi_hari_ini}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
        />
      )}

      {/* 6. Tren (Grafik Masuk vs Selesai, dan Rata-rata Durasi vs Target SLA) */}
      {data?.tren != null && !isError && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          aria-labelledby="heading-tren"
        >
          <div className="flex items-center justify-between mb-2.5">
            <h2 id="heading-tren" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tren Operasional ({data?.period_label || 'Hari Ini'})
            </h2>
          </div>
          <DashboardTrendCharts
            tren={data?.tren}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </motion.section>
      )}

      {/* 7. Pintasan Cepat Administrasi Sistem (Khusus Superadmin) */}
      {isSuperadmin && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          aria-labelledby="heading-admin-shortcuts"
          className="pt-2"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 id="heading-admin-shortcuts" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pintasan Administrasi Sistem
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card
                onClick={() => navigate('/superadmin/users')}
                className="hover:border-primary/50 transition-all cursor-pointer bg-card hover:shadow-xs group h-full"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 group-hover:scale-105 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Kelola Pengguna</h3>
                      <p className="text-xs text-muted-foreground">Daftar staf, teknisi, & sales</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card
                onClick={() => navigate('/superadmin/teams')}
                className="hover:border-primary/50 transition-all cursor-pointer bg-card hover:shadow-xs group h-full"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                      <UsersRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Kelola Tim</h3>
                      <p className="text-xs text-muted-foreground">Struktur tim & anggota</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card
                onClick={() => navigate('/superadmin/roles')}
                className="hover:border-primary/50 transition-all cursor-pointer bg-card hover:shadow-xs group h-full"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 group-hover:scale-105 transition-transform">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Peran & Izin</h3>
                      <p className="text-xs text-muted-foreground">Matriks akses RBAC</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
              <Card
                onClick={() => navigate('/superadmin/audit-logs')}
                className="hover:border-primary/50 transition-all cursor-pointer bg-card hover:shadow-xs group h-full"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Log Audit</h3>
                      <p className="text-xs text-muted-foreground">Riwayat aktivitas sistem</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};
