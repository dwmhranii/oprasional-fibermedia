import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  Server,
  Box,
  Radio,
  Cable,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  GitBranch,
  Sliders,
  Cpu,
  Layers,
  Map,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { PageHeader } from '@shared/ui/PageHeader';
import { StatCards, StatItem } from '@shared/ui/StatCards';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';

interface NocDashboardProps {
  onNavigate?: (path: string) => void;
}

export const NocDashboard: React.FC<NocDashboardProps> = ({ onNavigate }) => {
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

  const j = data?.jaringan;
  const kabelBermasalah = j?.kabel_bermasalah ?? 0;
  const perubahanMenunggu = j?.perubahan_menunggu ?? 0;
  const gangguanMassal = j?.gangguan_massal_aktif ?? 0;
  const odpBermasalah = j?.odp_bermasalah ?? 0;

  const statItems: StatItem[] = [
    {
      id: 'olt-status',
      title: 'OLT Utama Bululawang',
      value: '1 Unit',
      subtitle: 'Online & Beroperasi Normal',
      icon: Server,
      variant: 'success',
      onClick: () => handleNav('/network/odp'),
    },
    {
      id: 'odc-count',
      title: 'Optical Distribution Cabinet (ODC)',
      value: '19 Titik',
      subtitle: 'Area Bululawang',
      icon: Box,
      variant: 'primary',
      onClick: () => handleNav('/network/odp'),
    },
    {
      id: 'odp-count',
      title: 'Optical Distribution Point (ODP)',
      value: '139 Titik',
      subtitle: odpBermasalah > 0 ? `${odpBermasalah} butuh penanganan` : 'Semua port normal',
      icon: Radio,
      variant: odpBermasalah > 0 ? 'warning' : 'neutral',
      onClick: () => handleNav('/network/odp'),
    },
    {
      id: 'cable-tracks',
      title: 'Jalur Kabel Fiber Optik',
      value: '157 Jalur',
      subtitle: kabelBermasalah > 0 ? `${kabelBermasalah} jalur kabel putus/redaman` : 'Semua jalur kabel terpeta',
      icon: Cable,
      variant: kabelBermasalah > 0 ? 'danger' : 'neutral',
      onClick: () => handleNav('/network/map'),
    },
    {
      id: 'network-approvals',
      title: 'Usulan Relokasi ODP',
      value: perubahanMenunggu,
      subtitle: perubahanMenunggu > 0 ? 'Menunggu persetujuan NOC' : 'Tidak ada usulan relokasi',
      icon: GitBranch,
      variant: perubahanMenunggu > 0 ? 'warning' : 'neutral',
      onClick: () => handleNav('/network/approvals'),
    },
    {
      id: 'mass-outage',
      title: 'Insiden Gangguan Massal',
      value: gangguanMassal,
      subtitle: gangguanMassal > 0 ? 'Insiden aktif dalam penanganan' : 'Jaringan aman dan stabil',
      icon: AlertTriangle,
      variant: gangguanMassal > 0 ? 'danger' : 'success',
      onClick: () => handleNav('/complaints'),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto space-y-6 pb-16"
    >
      {/* Header NOC */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Dashboard Network Operations Center (NOC)"
          description={`Selamat datang, ${user?.name ?? 'Dispatcher'}. Pemantauan real-time topologi fiber optik FTTH Bululawang, kesehatan simpul jaringan, dan penugasan tiket lapangan.`}
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

      {/* Ringkasan Status Simpul & Jaringan */}
      <StatCards
        items={statItems}
        columns={3}
        isLoading={isLoading}
      />

      {/* Banner Topologi & Navigasi Interaktif */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Peta & Gambaran Topologi FTTH */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Map className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">Topologi FTTH Area Bululawang</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Peta digital GIS pemetaan simpul OLT, ODC, ODP, kabel distribusi, dan titik drop core pelanggan
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs font-mono">
                  SINKRON GIS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground">Sentral OLT</p>
                  <p className="text-lg font-bold text-foreground mt-1">1 Unit</p>
                  <p className="text-[11px] text-emerald-500 font-medium">Bululawang</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground">Titik ODC</p>
                  <p className="text-lg font-bold text-foreground mt-1">19 Titik</p>
                  <p className="text-[11px] text-primary font-medium">100% Aktif</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground">Titik ODP</p>
                  <p className="text-lg font-bold text-foreground mt-1">139 Titik</p>
                  <p className="text-[11px] text-primary font-medium">Terverifikasi</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground">Kabel Fiber</p>
                  <p className="text-lg font-bold text-foreground mt-1">157 Segmen</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Jalur Utama & Sub</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-primary/20 bg-primary/5 gap-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Visualisasi Spasial Peta Digital Jaringan</p>
                    <p className="text-xs text-muted-foreground">
                      Buka layer interaktif MapLibre GL untuk inspeksi redaman kabel optik, kapasitas port ODP, dan rute pelanggan.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleNav('/network/map')}
                  className="w-full sm:w-auto shrink-0 gap-2 text-xs"
                >
                  <span>Buka Peta Interaktif</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan: Jalan Pintas NOC & Pengendalian Sistem */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground">Jalan Pintas Operasional NOC</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Tindakan cepat pengelolaan jaringan, persetujuan perubahan, dan antrean disposisi.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/network/map')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Peta Jaringan & Jalur Kabel</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Inspeksi rute kabel fiber dan posisi ODP secara spasial.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/network/approvals')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <GitBranch className="w-4 h-4 text-amber-500" />
                  <span>Persetujuan Relokasi ODP</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Tinjau usulan koordinat baru simpul jaringan dari teknisi lapangan.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/settings/dispatch')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>Pengaturan Disposisi Otomatis</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Atur ambang batas round-robin dan toleransi penugasan tim.
                </p>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto p-3.5 flex flex-col items-start gap-1.5 text-left border-border hover:bg-muted/50 transition-colors"
                onClick={() => handleNav('/network/bras')}
              >
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <Cpu className="w-4 h-4 text-indigo-500" />
                  <span>Integrasi Router BRAS & PPPoE</span>
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Kelola autentikasi secret dan profil bandwidth pelanggan.
                </p>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default NocDashboard;

