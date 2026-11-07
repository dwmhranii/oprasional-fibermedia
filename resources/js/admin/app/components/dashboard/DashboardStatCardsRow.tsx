import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { StatCards, StatItem } from '@shared/ui';
import { TERMS } from '@shared/i18n/id';
import {
  MessageSquareWarning,
  Clock,
  AlertTriangle,
  FileCheck2,
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  Coins,
  Wrench,
  ShieldCheck,
  Network,
  GitBranch,
  Layers,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import type { DashboardPeriod, DashboardSummaryData } from '../../types/dashboard';

interface DashboardStatCardsRowProps {
  data?: DashboardSummaryData | null;
  period: DashboardPeriod;
  isLoading?: boolean;
}

export const DashboardStatCardsRow: React.FC<DashboardStatCardsRowProps> = ({
  data,
  period,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // Helper date strings for customer due date filter
  const todayStr = new Date().toISOString().split('T')[0];
  const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // 1. Pengaduan Stat Cards
  const pengaduan = data?.pengaduan;
  const pengaduanItems: StatItem[] = [
    {
      id: 'stat-pengaduan-baru',
      title: period === 'today' ? 'Baru Hari Ini' : `Baru (${data?.period_label || 'Periode'})`,
      value: pengaduan ? pengaduan.baru : 0,
      subtitle: 'Tiket pengaduan masuk',
      icon: MessageSquareWarning,
      variant: 'info',
      onClick: () => navigate(`/complaints?period=${period}`),
    },
    {
      id: 'stat-pengaduan-unassigned',
      title: 'Belum Ditugaskan',
      value: pengaduan ? pengaduan.belum_ditugaskan : 0,
      subtitle: 'Menunggu penugasan teknisi',
      icon: Clock,
      variant: (pengaduan?.belum_ditugaskan ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/complaints?status=unassigned'),
    },
    {
      id: 'stat-pengaduan-escalated',
      title: 'Diteruskan ke Admin',
      value: pengaduan ? pengaduan.diteruskan_ke_admin : 0,
      subtitle: 'Batas oper tim terlewati',
      icon: AlertTriangle,
      variant: (pengaduan?.diteruskan_ke_admin ?? 0) > 0 ? 'danger' : 'neutral',
      onClick: () => navigate('/complaints?status=escalated_to_admin'),
    },
    {
      id: 'stat-pengaduan-review',
      title: 'Perlu Ditinjau',
      value: pengaduan ? pengaduan.perlu_ditinjau : 0,
      subtitle: 'Hasil pekerjaan tahap 1 selesai',
      icon: FileCheck2,
      variant: (pengaduan?.perlu_ditinjau ?? 0) > 0 ? 'info' : 'neutral',
      onClick: () => navigate('/work-orders?type=complaint'),
    },
  ];

  // 2. Pelanggan Stat Cards
  const pelanggan = data?.pelanggan;
  const pelangganItems: StatItem[] = [
    {
      id: 'stat-pelanggan-total',
      title: 'Total Pelanggan',
      value: pelanggan ? pelanggan.total.toLocaleString('id-ID') : 0,
      subtitle: 'Seluruh basis pelanggan',
      icon: Users,
      variant: 'info',
      onClick: () => navigate('/customers'),
    },
    {
      id: 'stat-pelanggan-aktif',
      title: 'Pelanggan Aktif',
      value: pelanggan ? pelanggan.aktif.toLocaleString('id-ID') : 0,
      subtitle: 'Layanan berjalan normal',
      icon: UserCheck,
      variant: 'success',
      onClick: () => navigate('/customers?status=active'),
    },
    {
      id: 'stat-pelanggan-terisolir',
      title: 'Terisolir',
      value: pelanggan ? pelanggan.terisolir.toLocaleString('id-ID') : 0,
      subtitle: 'Isolir pembayaran / suspend',
      icon: UserX,
      variant: (pelanggan?.terisolir ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/customers?status=suspended'),
    },
    {
      id: 'stat-pelanggan-berhenti',
      title: 'Berhenti',
      value: pelanggan ? pelanggan.berhenti.toLocaleString('id-ID') : 0,
      subtitle: 'Langganan dihentikan',
      icon: UserX,
      variant: 'neutral',
      onClick: () => navigate('/customers?status=terminated'),
    },
    {
      id: 'stat-pelanggan-jatuh-tempo',
      title: 'Jatuh Tempo 7 Hari',
      value: pelanggan ? pelanggan.jatuh_tempo_7_hari.toLocaleString('id-ID') : 0,
      subtitle: 'Tagihan jatuh tempo segera',
      icon: CalendarClock,
      variant: (pelanggan?.jatuh_tempo_7_hari ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate(`/customers?expires_from=${todayStr}&expires_to=${next7Days}`),
    },
    {
      id: 'stat-pelanggan-hutang',
      title: 'Hutang > Rp 0',
      value: pelanggan ? pelanggan.hutang_lebih_dari_0.toLocaleString('id-ID') : 0,
      subtitle: 'Pelanggan memiliki tunggakan',
      icon: Coins,
      variant: (pelanggan?.hutang_lebih_dari_0 ?? 0) > 0 ? 'danger' : 'neutral',
      onClick: () => navigate('/customers?has_debt=1'),
    },
  ];

  // 3. Pemasangan (PSB) Stat Cards
  const psb = data?.psb;
  const psbItems: StatItem[] = [
    {
      id: 'stat-psb-validasi',
      title: 'Menunggu Validasi',
      value: psb ? psb.menunggu_validasi : 0,
      subtitle: 'Pengajuan pendaftaran baru',
      icon: ClipboardList,
      variant: (psb?.menunggu_validasi ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/submissions?status=pending'),
    },
    {
      id: 'stat-psb-unassigned',
      title: 'Belum Ditugaskan',
      value: psb ? psb.belum_ditugaskan : 0,
      subtitle: 'Work order PSB siap pasang',
      icon: Clock,
      variant: (psb?.belum_ditugaskan ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/psb?filter=unassigned'),
    },
    {
      id: 'stat-psb-progress',
      title: 'Sedang Dikerjakan',
      value: psb ? psb.sedang_dikerjakan : 0,
      subtitle: 'Teknisi di perjalanan / pengerjaan',
      icon: Wrench,
      variant: 'info',
      onClick: () => navigate('/work-orders?type=psb&status=in_progress'),
    },
    {
      id: 'stat-psb-review',
      title: 'Perlu Ditinjau',
      value: psb ? psb.perlu_ditinjau : 0,
      subtitle: 'Bukti instalasi selesai diunggah',
      icon: FileCheck2,
      variant: (psb?.perlu_ditinjau ?? 0) > 0 ? 'info' : 'neutral',
      onClick: () => navigate('/work-orders?type=psb'),
    },
  ];

  // 4. Tim Hari Ini Stat Cards
  const tim = data?.tim_hari_ini;
  const timItems: StatItem[] = [
    {
      id: 'stat-tim-siap',
      title: 'Tim Siap Hari Ini',
      value: tim ? `${tim.tim_siap} / ${tim.total_tim_aktif}` : '0 / 0',
      subtitle: 'Memenuhi batas minimal personil',
      icon: ShieldCheck,
      variant: (tim?.tim_siap ?? 0) > 0 ? 'success' : 'danger',
      onClick: () => navigate('/attendance/today'),
    },
    {
      id: 'stat-tim-hadir',
      title: 'Anggota Hadir',
      value: tim ? `${tim.anggota_hadir} / ${tim.total_anggota}` : '0 / 0',
      subtitle: 'Teknisi aktif absen masuk',
      icon: UserCheck,
      variant: 'info',
      onClick: () => navigate('/attendance/today'),
    },
    {
      id: 'stat-tim-giliran-psb',
      title: 'Giliran Antrean PSB',
      value: tim?.giliran_psb || 'Belum tersedia',
      subtitle: 'Round-robin berikutnya',
      icon: ArrowRight,
      variant: 'info',
      onClick: () => navigate('/settings/dispatch'),
    },
    {
      id: 'stat-tim-giliran-pengaduan',
      title: 'Giliran Pengaduan',
      value: tim?.giliran_pengaduan || 'Belum tersedia',
      subtitle: 'Round-robin berikutnya',
      icon: ArrowRight,
      variant: 'info',
      onClick: () => navigate('/settings/dispatch'),
    },
  ];

  // 5. Jaringan Stat Cards
  const jaringan = data?.jaringan;
  const odcOdpBermasalah = (jaringan?.odc_bermasalah ?? 0) + (jaringan?.odp_bermasalah ?? 0);

  const jaringanItems: StatItem[] = [
    {
      id: 'stat-jaringan-odc-odp',
      title: 'ODC & ODP Gangguan',
      value: odcOdpBermasalah,
      subtitle: `ODC: ${jaringan?.odc_bermasalah ?? 0} | ODP: ${jaringan?.odp_bermasalah ?? 0} unit`,
      icon: Network,
      variant: odcOdpBermasalah > 0 ? 'danger' : 'success',
      onClick: () => navigate('/network/nodes?tab=odp&status=disrupted'),
    },
    {
      id: 'stat-jaringan-kabel',
      title: 'Kabel Putus / Gangguan',
      value: jaringan?.kabel_bermasalah ?? 0,
      subtitle: 'Kabel fiber berstatus gangguan/putus',
      icon: GitBranch,
      variant: (jaringan?.kabel_bermasalah ?? 0) > 0 ? 'danger' : 'neutral',
      onClick: () => navigate('/network/nodes?tab=cable&status=disrupted'),
    },
    {
      id: 'stat-jaringan-persetujuan',
      title: 'Perubahan Lapangan',
      value: jaringan?.perubahan_menunggu_persetujuan ?? 0,
      subtitle: 'Relokasi ODP menunggu persetujuan',
      icon: GitBranch,
      variant: (jaringan?.perubahan_menunggu_persetujuan ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/network/approvals'),
    },
    {
      id: 'stat-jaringan-undrawn',
      title: 'Jalur Belum Digambar',
      value: jaringan?.jalur_kabel_belum_digambar ?? 0,
      subtitle: 'Kabel fiber tanpa koordinat peta',
      icon: GitBranch,
      variant: (jaringan?.jalur_kabel_belum_digambar ?? 0) > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/network/nodes?tab=cable&undrawn=1'),
    },
  ];

  // Hanya tampilkan OLT bila tabelnya sudah aktif (Bukan MENUNGGU FASE X)
  if (jaringan?.olt_status_tag && jaringan.olt_status_tag !== 'MENUNGGU FASE X') {
    jaringanItems.unshift({
      id: 'stat-jaringan-olt',
      title: 'OLT Gangguan / Putus',
      value: jaringan.olt_bermasalah ?? 0,
      subtitle: 'Perangkat OLT bermasalah',
      icon: Layers,
      variant: (jaringan.olt_bermasalah ?? 0) > 0 ? 'danger' : 'success',
      onClick: () => navigate('/network/nodes?tab=olt&status=disrupted'),
    });
  }

  // Gangguan Massal Aktif (Fase N1)
  if (jaringan?.gangguan_massal_aktif) {
    const totalIncidents = jaringan.gangguan_massal_aktif.total_insiden ?? 0;
    const totalAffectedCustomers = jaringan.gangguan_massal_aktif.total_pelanggan_terdampak ?? 0;

    jaringanItems.unshift({
      id: 'stat-gangguan-massal-aktif',
      title: 'Gangguan Massal Aktif',
      value: totalIncidents,
      subtitle: `${totalAffectedCustomers} pelanggan terdampak`,
      icon: AlertTriangle,
      variant: totalIncidents > 0 ? 'danger' : 'success',
      onClick: () => navigate('/complaints?type=mass'),
    });
  }

  return (
    <div className="space-y-6">
      {/* Bagian 1: Pengaduan (Paling Menonjol) */}
      {pengaduan !== null && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          aria-labelledby="heading-pengaduan"
        >
          <div className="flex items-center justify-between mb-2.5">
            <h2 id="heading-pengaduan" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquareWarning className="w-4 h-4 text-primary" />
              <span>{TERMS.complaint}</span>
            </h2>
          </div>
          <StatCards items={pengaduanItems} columns={4} isLoading={isLoading} />
        </motion.section>
      )}

      {/* Bagian 2: Pelanggan (Paling Menonjol) */}
      {pelanggan !== null && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          aria-labelledby="heading-pelanggan"
        >
          <div className="flex items-center justify-between mb-2.5">
            <h2 id="heading-pelanggan" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span>{TERMS.customer}</span>
            </h2>
          </div>
          <StatCards items={pelangganItems} columns={3} isLoading={isLoading} />
        </motion.section>
      )}

      {/* Bagian 3: Pemasangan (PSB) */}
      {psb !== null && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          aria-labelledby="heading-psb"
        >
          <div className="flex items-center justify-between mb-2.5">
            <h2 id="heading-psb" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-primary" />
              <span>{TERMS.psb}</span>
            </h2>
          </div>
          <StatCards items={psbItems} columns={4} isLoading={isLoading} />
        </motion.section>
      )}

      {/* Bagian 4 & 5: Tim & Jaringan (Grid 2 Kolom di Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tim !== null && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            aria-labelledby="heading-tim"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h2 id="heading-tim" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Tim Hari Ini</span>
              </h2>
            </div>
            <StatCards items={timItems} columns={2} isLoading={isLoading} />
          </motion.section>
        )}

        {jaringan !== null && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            aria-labelledby="heading-jaringan"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h2 id="heading-jaringan" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Network className="w-4 h-4 text-primary" />
                <span>Status Jaringan</span>
              </h2>
            </div>
            <StatCards items={jaringanItems} columns={2} isLoading={isLoading} />
          </motion.section>
        )}
      </div>
    </div>
  );
};
