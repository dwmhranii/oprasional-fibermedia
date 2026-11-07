export type DashboardPeriod = 'today' | '7d' | '30d';

export interface PengaduanSummary {
  baru: number;
  belum_ditugaskan: number;
  diteruskan_ke_admin: number;
  perlu_ditinjau: number;
}

export interface PsbSummary {
  menunggu_validasi: number;
  belum_ditugaskan: number;
  sedang_dikerjakan: number;
  perlu_ditinjau: number;
}

export interface PelangganSummary {
  total: number;
  aktif: number;
  terisolir: number;
  berhenti: number;
  jatuh_tempo_7_hari: number;
  hutang_lebih_dari_0: number;
}

export interface TimHariIniSummary {
  tim_siap: number;
  total_tim_aktif: number;
  anggota_hadir: number;
  total_anggota: number;
  giliran_psb: string;
  giliran_pengaduan: string;
}

export interface JaringanSummary {
  olt_bermasalah: number;
  olt_status_tag: string;
  odc_bermasalah: number;
  odp_bermasalah: number;
  kabel_bermasalah: number;
  perubahan_menunggu_persetujuan: number;
  jalur_kabel_belum_digambar: number;
  gangguan_massal_aktif?: {
    total_insiden: number;
    total_pelanggan_terdampak: number;
  };
}

export interface PerluTindakanItem {
  id: string;
  entity_type: string;
  raw_id: number;
  title: string;
  type_label: string;
  urgency: 'critical' | 'high' | 'medium';
  urgent_reason: string;
  created_at: string;
  action_url: string;
  action_label: string;
}

export interface BelumAbsenItem {
  id: number;
  name: string;
  team: string;
  status: string;
}

export interface LuarRadiusItem {
  id: number;
  name: string;
  team: string;
  distance_meters: number;
  allowed_radius: number;
  check_in_at?: string;
}

export interface TimBelumSiapItem {
  id: number;
  name: string;
  present_count: number;
  min_required: number;
  reason: string;
}

export interface AbsensiHariIniSummary {
  belum_absen_masuk: BelumAbsenItem[];
  luar_radius: LuarRadiusItem[];
  tim_belum_siap: TimBelumSiapItem[];
}

export interface TrenPengaduanItem {
  tanggal: string;
  raw_date: string;
  masuk: number;
  selesai: number;
}

export interface TrenDurasiSlaItem {
  tanggal: string;
  raw_date: string;
  rata_rata_jam: number | null;
  target_sla_jam: number;
}

export interface TrenSummary {
  target_sla_hours: number;
  pengaduan_harian: TrenPengaduanItem[];
  durasi_sla: TrenDurasiSlaItem[];
}

export interface DashboardSummaryData {
  last_updated: string;
  period: DashboardPeriod;
  period_label: string;
  pengaduan: PengaduanSummary | null;
  psb: PsbSummary | null;
  pelanggan: PelangganSummary | null;
  tim_hari_ini: TimHariIniSummary | null;
  jaringan: JaringanSummary | null;
  perlu_tindakan: PerluTindakanItem[];
  absensi_hari_ini: AbsensiHariIniSummary | null;
  tren: TrenSummary | null;
}
