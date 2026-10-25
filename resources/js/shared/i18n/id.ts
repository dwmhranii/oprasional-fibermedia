/**
 * Single Source of Truth untuk Seluruh Istilah, Label, Aksi, dan Pesan Antarmuka
 * FIBERMEDIA-OPS KAMUS ISTILAH BAKU (Bahasa Indonesia)
 */

export const TERMS = {
  // Entitas Utama
  customer: 'Pelanggan',
  customerId: 'ID Pelanggan',
  user: 'Pengguna', // Staf / Admin
  team: 'Tim',
  teamMember: 'Anggota Tim',
  members: 'Anggota',
  technician: 'Teknisi',
  sales: 'Sales',

  // Tiket & Pekerjaan
  complaintTicket: 'Tiket Pengaduan',
  complaint: 'Pengaduan',
  psb: 'Pemasangan (PSB)',
  workOrder: 'Work Order',
  phase1: 'Tahap 1: Pengerjaan',
  phase2: 'Tahap 2: Absensi di Lokasi',

  // Kehadiran
  attendance: 'Absensi',
  clockIn: 'Absen Masuk',
  clockOut: 'Absen Pulang',
  attendanceRecap: 'Rekap Absensi',
  dailyAttendance: 'Absensi Harian',

  // Jaringan & Infrastruktur (Istilah teknis tetap)
  olt: 'OLT',
  odc: 'ODC',
  odp: 'ODP',
  cable: 'Kabel Fiber',
  bras: 'Server BRAS',
  onu: 'ONU / Modem',
  gps: 'GPS',
  kpi: 'KPI',
  pppoe: 'PPPoE',
} as const;

export const ACTIONS = {
  add: 'Tambah',
  edit: 'Ubah',
  delete: 'Hapus',
  save: 'Simpan',
  cancel: 'Batal',
  search: 'Cari',
  applyFilter: 'Terapkan Filter',
  reset: 'Atur Ulang',
  reload: 'Muat Ulang',
  exportExcel: 'Ekspor Excel',
  importExcel: 'Impor Excel',
  download: 'Unduh',
  accept: 'Terima',
  reject: 'Tolak',
  assign: 'Tugaskan',
  approve: 'Setujui',
  rework: 'Minta Ulang',
  flagIssue: 'Tandai Bermasalah',
  viewDetails: 'Lihat Detail',
  close: 'Tutup',
  back: 'Kembali',
  verify: 'Verifikasi',
  resend: 'Kirim Ulang',
  retry: 'Coba Lagi',
  confirm: 'Konfirmasi',
} as const;

export const STATUS_LABELS = {
  // Status Pelanggan
  customer: {
    active: 'Aktif',
    suspended: 'Terisolir',
    terminated: 'Berhenti',
  },
  // Status Jaringan
  network: {
    normal: 'Normal',
    disrupted: 'Gangguan',
    cut: 'Putus',
    maintenance: 'Pemeliharaan',
  },
  // Status Tiket & Work Order
  ticket: {
    open: 'Pengaduan Baru',
    pending: 'Menunggu',
    unassigned: 'Belum Ditugaskan',
    escalated_to_admin: 'Eskalasi ke Admin',
    assigned: 'Menunggu Diterima',
    on_the_way: 'Dalam Perjalanan',
    in_progress: 'Dikerjakan',
    phase_1_completed: 'Perlu Ditinjau',
    phase_1_submitted: 'Perlu Ditinjau',
    pending_customer: 'Menunggu Pelanggan',
    resolved: 'Selesai',
    completed: 'Selesai',
    closed: 'Ditutup',
    cancelled: 'Dibatalkan',
    reopened: 'Dibuka Kembali',
    failed: 'Gagal',
  },
  // Status Peninjauan (Review)
  review: {
    not_required: 'Tidak Perlu',
    pending: 'Perlu Ditinjau',
    approved: 'Disetujui',
    rework: 'Kerja Ulang',
    flagged: 'Bermasalah',
  },
  // Status Lokasi (Geofence)
  geofence: {
    inside: 'Di dalam radius',
    outside: 'Di luar radius',
    low_accuracy: 'Akurasi rendah',
    unverified: 'Belum diverifikasi',
  },
  // Status Absensi
  attendance: {
    hadir: 'Hadir',
    izin: 'Izin',
    sakit: 'Sakit',
    alpa: 'Alpa',
  },
  // Status Pemasangan (Provisioning)
  provisioning: {
    pending: 'Menunggu',
    ready: 'Siap Dikonfigurasi',
    processing: 'Sedang Diproses',
    success: 'Berhasil',
    failed: 'Gagal',
    suspended: 'Terisolir',
    active: 'Aktif',
    completed: 'Selesai',
  },
  // Status Pengajuan Sales (Submission)
  submission: {
    pending: 'Menunggu Validasi',
    pending_validation: 'Menunggu Validasi Ulang',
    need_info: 'Perlu Info Tambahan',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    completed: 'Selesai Dipasang',
  },
  // Prioritas Pengaduan
  priority: {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
    critical: 'Kritis',
  },
} as const;

export const CUSTOMER_COLUMNS = [
  'No',
  'ID Pelanggan',
  'Ref Eksternal',
  'Nama Pelanggan',
  'NIK',
  'Nomor Telepon',
  'Email',
  'Alamat',
  'Latitude',
  'Longitude',
  'Tipe Layanan',
  'Server BRAS',
  'Kolektor',
  'Username Layanan',
  'Password Layanan',
  'Paket Layanan',
  'Harga Bulanan',
  'Local Address',
  'Remote Address',
  'Parent Queue',
  'Rate Limit',
  'Tanggal Berlangganan',
  'Tanggal Jatuh Tempo',
  'Status',
  'Status Online',
  'Terakhir Online',
  'Terakhir Offline',
  'IP Saat Ini',
  'MAC Address',
  'Session Uptime',
  'ONU Index',
  'ODP',
  'Port ODP',
  'Hutang',
  'Wilayah',
  'Tim Pemasang',
  'Sales',
  'Catatan',
] as const;

export const MESSAGES = {
  loading: 'Memuat data...',
  saving: 'Menyimpan data...',
  deleting: 'Menghapus data...',
  successSave: 'Data berhasil disimpan.',
  successUpdate: 'Data berhasil diperbarui.',
  successDelete: 'Data berhasil dihapus.',
  errorGeneric: 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.',
  errorNetwork: 'Koneksi jaringan terputus. Memeriksa status luring...',
  confirmDeleteTitle: 'Konfirmasi Penghapusan',
  confirmDeleteDesc: 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
  confirmActionTitle: 'Konfirmasi Tindakan',
  confirmLeaveTitle: 'Perubahan Belum Disimpan',
  confirmLeaveDesc: 'Anda memiliki perubahan form yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?',
  reasonRequired: 'Alasan wajib diisi untuk melanjutkan tindakan ini.',
  emptyData: 'Belum ada data untuk ditampilkan.',
  emptySearchResult: 'Tidak ditemukan data yang sesuai dengan filter atau kata kunci pencarian.',
} as const;
