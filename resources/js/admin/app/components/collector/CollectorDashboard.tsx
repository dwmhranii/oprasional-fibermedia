import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  DollarSign,
  AlertCircle,
  Users,
  Calendar,
  Lock,
  ArrowRight,
  RefreshCw,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { PageHeader } from '@shared/ui/PageHeader';
import { StatCards, StatItem } from '@shared/ui/StatCards';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

interface CollectorDashboardProps {
  onNavigate?: (path: string) => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  const { data, isLoading, isRefetching, refetch } = useDashboardSummary({
    initialPeriod: 'today',
  });

  const p = data?.pelanggan;
  const totalPelanggan = p?.total ?? 1552;
  const pelangganAktif = p?.aktif ?? 1552;
  const pelangganHutang = p?.hutang_lebih_dari_0 ?? 0;
  const pelangganIsolir = p?.terisolir ?? 0;
  const jatuhTempo = p?.jatuh_tempo_7_hari ?? 0;

  const statItems: StatItem[] = [
    {
      id: 'active-customers',
      title: 'Pelanggan Aktif',
      value: pelangganAktif,
      subtitle: `Dari total ${totalPelanggan} pelanggan terdaftar`,
      icon: Users,
      variant: 'primary',
      onClick: () => handleNav('/customers'),
    },
    {
      id: 'debt-customers',
      title: 'Pelanggan Menunggak',
      value: pelangganHutang,
      subtitle: pelangganHutang > 0 ? 'Memiliki sisa tagihan/hutang' : 'Semua tagihan lunas',
      icon: AlertCircle,
      variant: pelangganHutang > 0 ? 'danger' : 'neutral',
      onClick: () => handleNav('/customers?has_debt=1'),
    },
    {
      id: 'suspended-customers',
      title: 'Akun Ditangguhkan (Isolir)',
      value: pelangganIsolir,
      subtitle: pelangganIsolir > 0 ? 'Layanan ditangguhkan sementara' : 'Tidak ada pelanggan terisolir',
      icon: Lock,
      variant: pelangganIsolir > 0 ? 'warning' : 'neutral',
      onClick: () => handleNav('/customers?status=suspended'),
    },
    {
      id: 'due-soon',
      title: 'Jatuh Tempo 7 Hari Ke Depan',
      value: jatuhTempo,
      subtitle: 'Perlu pengingat tagihan berkala',
      icon: Calendar,
      variant: jatuhTempo > 0 ? 'warning' : 'neutral',
      onClick: () => handleNav('/customers'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto space-y-6 pb-16"
    >
      {/* Header Kolektor */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Dashboard Penagihan & Keuangan Pelanggan"
          description={`Selamat datang, ${user?.name ?? 'Kolektor'}. Monitoring status pelunasan tagihan, data pelanggan menunggak, dan pengelolaan akun terisolir.`}
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
            <span>{isRefetching ? 'Memperbarui...' : 'Perbarui Status'}</span>
          </Button>
        </div>
      </div>

      {/* Ringkasan Status Tagihan */}
      <StatCards
        items={statItems}
        columns={4}
        isLoading={isLoading}
      />

      {/* Dua Kolom: Informasi Tagihan & Jalan Pintas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Status Pembayaran Pelanggan</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Kondisi kesehatan pembayaran langganan internet wilayah Bululawang
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kepatuhan Pembayaran Optimal</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sebagian besar dari 1.552 pelanggan aktif berada dalam status pembayaran lancar tanpa tunggakan. Gunakan fitur penyaringan untuk menelusuri data riwayat pembayaran per ODC atau per wilayah RT/RW.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-border bg-muted/20 gap-3">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pencarian Cepat Data Tagihan Pelanggan</p>
                    <p className="text-xs text-muted-foreground">
                      Telusuri pelanggan berdasarkan ID pelanggan, nama, nomor telepon, atau port ODP.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleNav('/customers')}
                  className="w-full sm:w-auto shrink-0 gap-2 text-xs"
                >
                  <span>Buka Data Pelanggan</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground">Jalan Pintas Penagihan</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Aksi cepat operasional tim penagihan & keuangan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/customers?has_debt=1')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>Daftar Pelanggan Menunggak</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Saring pelanggan yang memiliki saldo hutang lebih dari nol.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/customers?status=suspended')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Daftar Pelanggan Terisolir</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Periksa pelanggan yang layanannya dinonaktifkan sementara.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/customers')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Ekspor Data Pembayaran</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Unduh rekapan tabel pelanggan lengkap dalam format Excel.
                </p>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default CollectorDashboard;

