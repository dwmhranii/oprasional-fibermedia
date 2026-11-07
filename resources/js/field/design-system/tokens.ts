export interface DesignTokenItem {
  category: 'color-brand' | 'color-surface' | 'color-content' | 'color-status' | 'typography' | 'spacing-radius' | 'shadow-motion';
  tokenName: string;
  tailwindClass: string;
  lightValue: string;
  darkValue: string;
  purpose: string;
}

export interface ComponentSpecRow {
  layer: 'Atom' | 'Molecule' | 'Organism' | 'Template';
  name: string;
  purpose: string;
  propsInterface: string;
  variants: string;
  sizes: string;
  states: string;
  responsiveBehavior: string;
  accessibilityNotes: string;
}

export interface ScreenAuditRow {
  screenName: string;
  productTarget: 'PWA Lapangan (390px)' | 'Shared Design System';
  templateUsed: string;
  organismsUsed: string[];
  moleculesUsed: string[];
  atomsUsed: string[];
  zeroHardcodedVerified: boolean;
}

export const DESIGN_TOKENS_CATALOG: DesignTokenItem[] = [
  // Color Brand
  {
    category: 'color-brand',
    tokenName: '--color-brand-navy',
    tailwindClass: 'bg-brand-navy / text-brand-navy',
    lightValue: '#0a162e',
    darkValue: '#060d1e',
    purpose: 'Warna dasar navy jaringan fiber optik untuk header dan identitas utama',
  },
  {
    category: 'color-brand',
    tokenName: '--color-brand-primary',
    tailwindClass: 'bg-brand-primary / text-brand-primary',
    lightValue: '#0891b2',
    darkValue: '#06b6d4',
    purpose: 'Aksen primer tombol CTA utama dan fokus interaktif',
  },
  {
    category: 'color-brand',
    tokenName: '--color-brand-accent',
    tailwindClass: 'bg-brand-accent / text-brand-accent',
    lightValue: '#06b6d4',
    darkValue: '#22d3ee',
    purpose: 'Cahaya serat optik (Optical Cyan) untuk indikator aktif dan step berjalan',
  },
  // Color Surface
  {
    category: 'color-surface',
    tokenName: '--color-surface-canvas',
    tailwindClass: 'bg-surface-canvas',
    lightValue: '#f1f5f9',
    darkValue: '#060d1e',
    purpose: 'Latar kanvas utama layar aplikasi (60% porsi warna)',
  },
  {
    category: 'color-surface',
    tokenName: '--color-surface-card',
    tailwindClass: 'bg-surface-card',
    lightValue: '#ffffff',
    darkValue: '#0b1730',
    purpose: 'Permukaan kartu utama (TicketCard, StatCard, AttendanceReviewCard)',
  },
  {
    category: 'color-surface',
    tokenName: '--color-surface-muted',
    tailwindClass: 'bg-surface-muted',
    lightValue: '#e2e8f0',
    darkValue: '#071022',
    purpose: 'Permukaan kontainer sekunder, baris tabel genap, dan skeleton',
  },
  // Color Content
  {
    category: 'color-content',
    tokenName: '--color-text-primary',
    tailwindClass: 'text-content-primary',
    lightValue: '#0f172a',
    darkValue: '#f8fafc',
    purpose: 'Teks utama kontras tinggi (WCAG AAA di luar ruangan)',
  },
  {
    category: 'color-content',
    tokenName: '--color-text-secondary',
    tailwindClass: 'text-content-secondary',
    lightValue: '#334155',
    darkValue: '#cbd5e1',
    purpose: 'Teks deskripsi alamat pelanggan, nama teknisi, dan label form',
  },
  {
    category: 'color-content',
    tokenName: '--color-text-muted',
    tailwindClass: 'text-content-muted',
    lightValue: '#64748b',
    darkValue: '#94a3b8',
    purpose: 'Metadata waktu, helper text, dan keterangan tambahan',
  },
  // Color Semantic Status
  {
    category: 'color-status',
    tokenName: '--color-status-safe-bg / -fg',
    tailwindClass: 'bg-status-safe-bg text-status-safe-fg border-status-safe-border',
    lightValue: '#dcfce7 / #166534',
    darkValue: 'rgba(16,185,129,0.16) / #34d399',
    purpose: 'Status SLA Aman, Geofence Dalam Radius (<=50m), Redaman Normal (-8 s/d -24 dBm)',
  },
  {
    category: 'color-status',
    tokenName: '--color-status-warning-bg / -fg',
    tailwindClass: 'bg-status-warning-bg text-status-warning-fg border-status-warning-border',
    lightValue: '#fef3c7 / #92400e',
    darkValue: 'rgba(245,158,11,0.18) / #fbbf24',
    purpose: 'Peringatan SLA Hampir Lewat, Redaman Batas (-24 s/d -27 dBm), Antrean Outbox',
  },
  {
    category: 'color-status',
    tokenName: '--color-status-danger-bg / -fg',
    tailwindClass: 'bg-status-danger-bg text-status-danger-fg border-status-danger-border',
    lightValue: '#fee2e2 / #991b1b',
    darkValue: 'rgba(239,68,68,0.18) / #f87171',
    purpose: 'SLA Lewat Batas, Redaman Kritis LOS (<-27 dBm), Geofence Ditolak (>50m)',
  },
  {
    category: 'color-status',
    tokenName: '--color-status-paused-bg / -fg',
    tailwindClass: 'bg-status-paused-bg text-status-paused-fg border-status-paused-border',
    lightValue: '#e2e8f0 / #334155',
    darkValue: 'rgba(148,163,184,0.16) / #cbd5e1',
    purpose: 'Status SLA Dijeda (Paused), Tiket Ditutup, atau Perangkat Offline',
  },
  // Typography
  {
    category: 'typography',
    tokenName: '--font-family-sans',
    tailwindClass: 'font-sans',
    lightValue: 'Plus Jakarta Sans (400, 600, 700)',
    darkValue: 'Plus Jakarta Sans (400, 600, 700)',
    purpose: 'Huruf sans geometris utama untuk seluruh antarmuka Indonesia',
  },
  {
    category: 'typography',
    tokenName: '--font-family-mono',
    tailwindClass: 'font-mono tabular-nums',
    lightValue: 'JetBrains Mono (tabular-nums)',
    darkValue: 'JetBrains Mono (tabular-nums)',
    purpose: 'Khusus Serial ONU, ID Tiket, Kode Pelanggan, Koordinat GPS, Redaman dBm',
  },
  // Spacing & Radius
  {
    category: 'spacing-radius',
    tokenName: '--space-touch-min',
    tailwindClass: 'min-h-touch',
    lightValue: '3rem (48px)',
    darkValue: '3rem (48px)',
    purpose: 'Target sentuh minimum wajib di seluruh elemen interaktif PWA lapangan',
  },
  {
    category: 'spacing-radius',
    tokenName: '--radius-token-sm / -md / -lg',
    tailwindClass: 'rounded-token-sm / rounded-token-md / rounded-token-lg',
    lightValue: '8px / 10px / 12px',
    darkValue: '8px / 10px / 12px',
    purpose: 'Sudut komponen konsisten 8-12px sesuai spesifikasi desain teknis ISP',
  },
  // Shadow & Motion
  {
    category: 'shadow-motion',
    tokenName: '--shadow-token-card / --shadow-token-glow',
    tailwindClass: 'shadow-token-card / shadow-token-glow',
    lightValue: 'Soft elevation / Cyan focus ring',
    darkValue: 'Deep navy elevation / Cyan optical glow',
    purpose: 'Bayangan lembut kartu dan glow cyan tipis hanya pada elemen aktif/fokus',
  },
];

export const COMPONENT_SPEC_CATALOG: ComponentSpecRow[] = [
  // ATOMS
  {
    layer: 'Atom',
    name: 'Button',
    purpose: 'Tombol aksi utama dan sekunder di seluruh layar PWA & Admin',
    propsInterface: 'variant?: "primary"|"secondary"|"outline"|"ghost"|"danger"; size?: "sm"|"md"|"lg"; density?: "comfortable"|"compact"; loading?: boolean; fullWidth?: boolean',
    variants: 'primary, secondary, outline, ghost, danger',
    sizes: 'sm, md, lg (PWA comfortable min-h-touch 48px)',
    states: 'default, hover, focus-visible, disabled, loading (dengan Spinner)',
    responsiveBehavior: 'Penuh (fullWidth) di action bar mobile; inline di toolbar desktop',
    accessibilityNotes: 'aria-busy saat loading, focus-visible ring cyan, kontras >= 4.5:1',
  },
  {
    layer: 'Atom',
    name: 'IconButton',
    purpose: 'Tombol aksi berbasis ikon tunggal (kembali, sinkronisasi, tutup, filter)',
    propsInterface: 'icon: ReactNode; label: string; variant?: "surface"|"ghost"|"primary"; size?: "sm"|"md"|"lg"; badgeCount?: number',
    variants: 'surface, ghost, primary',
    sizes: 'sm, md, lg (hitbox sentuh >= 48px di PWA)',
    states: 'default, hover, focus-visible, disabled, active',
    responsiveBehavior: 'Tetap mempertahankan area sentuh 48x48px pada layar 390px',
    accessibilityNotes: 'Wajib memiliki prop label untuk aria-label pembaca layar',
  },
  {
    layer: 'Atom',
    name: 'Input',
    purpose: 'Kolom input teks, angka dBm, NIK, dan koordinat',
    propsInterface: 'tone?: "default"|"error"|"valid"; density?: "comfortable"|"compact"; mono?: boolean; leftIcon?: ReactNode',
    variants: 'default, mono (untuk Serial ONU/dBm/Koordinat)',
    sizes: 'comfortable (48px), compact (38px)',
    states: 'default, hover, focus-visible, disabled, error, readonly',
    responsiveBehavior: 'Lebar 100% dari FormField container',
    accessibilityNotes: 'Terhubung dengan id label & aria-invalid saat tone="error"',
  },
  {
    layer: 'Atom',
    name: 'Select',
    purpose: 'Pemilih opsi dropdown (Paket Internet, ODP, Alasan Pause SLA)',
    propsInterface: 'options: {value: string; label: string}[]; tone?: "default"|"error"; density?: "comfortable"|"compact"',
    variants: 'default, error',
    sizes: 'comfortable (48px), compact (38px)',
    states: 'default, focus-visible, disabled, error',
    responsiveBehavior: 'Native touch picker di mobile PWA, keyboard navigable di desktop',
    accessibilityNotes: 'Mendukung navigasi panah keyboard dan aria-required',
  },
  {
    layer: 'Atom',
    name: 'Checkbox',
    purpose: 'Kotak centang manual untuk Checklist Instalasi Step 1 (Tidak auto-check)',
    propsInterface: 'checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string; disabled?: boolean',
    variants: 'card-row, inline',
    sizes: 'comfortable (baris sentuh >= 48px)',
    states: 'unchecked, checked, focus-visible, disabled',
    responsiveBehavior: 'Seluruh baris kartu dapat disentuh untuk toggle di lapangan',
    accessibilityNotes: 'Input checkbox semantik dengan role dan label eksplisit',
  },
  {
    layer: 'Atom',
    name: 'Switch',
    purpose: 'Sakelar biner (Mode Gelap/Terang, Simulasi Offline, Auto-Reassign)',
    propsInterface: 'checked: boolean; onChange: (val: boolean) => void; label: string',
    variants: 'default, brand',
    sizes: 'sm, md',
    states: 'off, on, focus-visible, disabled',
    responsiveBehavior: 'Hitbox sentuh minimum 48px tinggi baris',
    accessibilityNotes: 'role="switch" dengan aria-checked',
  },
  {
    layer: 'Atom',
    name: 'Badge',
    purpose: 'Penanda status semantik dengan ikon + teks (tidak hanya warna)',
    propsInterface: 'tone?: "safe"|"warning"|"danger"|"paused"|"info"|"brand"; size?: "sm"|"md"; icon?: ReactNode; mono?: boolean',
    variants: 'safe (hijau), warning (kuning/oranye), danger (merah), paused (abu), info (cyan)',
    sizes: 'sm, md',
    states: 'static, interactive',
    responsiveBehavior: 'Single-line whitespace-nowrap',
    accessibilityNotes: 'Selalu menyertakan teks label dan ikon pendamping warna',
  },
  {
    layer: 'Atom',
    name: 'Avatar',
    purpose: 'Foto profil teknisi/sales dengan fallback inisial nama',
    propsInterface: 'src?: string; name: string; size?: "sm"|"md"|"lg"; status?: "online"|"offline"',
    variants: 'circle, rounded-token',
    sizes: 'sm (32px), md (40px), lg (48px)',
    states: 'image-loaded, fallback-initials',
    responsiveBehavior: 'Ukuran tetap (shrink-0)',
    accessibilityNotes: 'Zero-broken-image fallback otomatis ke inisial nama',
  },
  {
    layer: 'Atom',
    name: 'Spinner & Skeleton',
    purpose: 'Indikator pemuatan proses sinkronisasi outbox, speedtest, dan tabel data',
    propsInterface: 'size?: "sm"|"md"|"lg"; label?: string',
    variants: 'Spinner (rotasi optik), Skeleton (blok shimmer)',
    sizes: 'sm, md, lg',
    states: 'loading',
    responsiveBehavior: 'Menyesuaikan tinggi baris data',
    accessibilityNotes: 'role="status" dan aria-live="polite"',
  },
  {
    layer: 'Atom',
    name: 'Divider & Tooltip',
    purpose: 'Pemisah struktur bagian dan petunjuk istilah teknis (OPM, LOS, ODP)',
    propsInterface: 'label?: string; content?: string',
    variants: 'horizontal, vertical, labeled',
    sizes: '1px hairline border-edge-subtle',
    states: 'default, hover/focus (Tooltip)',
    responsiveBehavior: 'Menyesuaikan lebar kontainer',
    accessibilityNotes: 'role="separator" dan role="tooltip"',
  },
  // MOLECULES
  {
    layer: 'Molecule',
    name: 'FormField',
    purpose: 'Pembungkus standar Label + Input/Select + Helper Text + Pesan Error',
    propsInterface: 'label: string; required?: boolean; helperText?: string; errorText?: string; children: ReactNode',
    variants: 'comfortable (PWA), compact (Admin)',
    sizes: 'full-width',
    states: 'default, valid, error, disabled',
    responsiveBehavior: 'Susunan vertikal konsisten di mobile dan grid di desktop',
    accessibilityNotes: 'Menghubungkan label, deskripsi, dan pesan error secara semantik',
  },
  {
    layer: 'Molecule',
    name: 'SearchBox',
    purpose: 'Kolom pencarian instan ID Tiket, Nama Pelanggan, atau Kode ODP',
    propsInterface: 'value: string; onChange: (val: string) => void; placeholder?: string; onClear?: () => void',
    variants: 'comfortable, compact',
    sizes: 'min-h-touch (48px)',
    states: 'empty, typing, filled (dengan tombol hapus cepat)',
    responsiveBehavior: 'Lebar penuh di PWA, 320px di FilterBar desktop',
    accessibilityNotes: 'role="searchbox" dengan tombol bersihkan berlabel',
  },
  {
    layer: 'Molecule',
    name: 'StatusBadge & SlaBadge',
    purpose: 'Indikator status siklus tiket WO dan sisa waktu SLA (Hijau/Kuning/Merah/Abu)',
    propsInterface: 'status: TicketStatus; slaState?: "safe"|"warning"|"overdue"|"paused"; remainingText?: string',
    variants: 'ticket-status, sla-countdown',
    sizes: 'sm, md',
    states: 'safe (Hijau), warning (Kuning), overdue (Merah), paused (Abu)',
    responsiveBehavior: 'Ringkas satu baris dengan font-mono untuk angka SLA',
    accessibilityNotes: 'Kombinasi ikon status + label eksplisit Bahasa Indonesia',
  },
  {
    layer: 'Molecule',
    name: 'StatCard',
    purpose: 'Kartu ringkasan metrik operasional & KPI (Kehadiran, Tugas Aktif, Skor SLA)',
    propsInterface: 'label: string; value: string|number; unit?: string; tone?: "default"|"brand"|"safe"|"warning"|"danger"; icon?: ReactNode; subtitle?: string',
    variants: 'default, brand, safe, warning, danger',
    sizes: 'comfortable, compact',
    states: 'default, loading (Skeleton), interactive',
    responsiveBehavior: 'Grid 2 kolom di PWA 390px, 4 kolom di Web Admin 1440px',
    accessibilityNotes: 'Angka memakai font-mono tabular-nums',
  },
  {
    layer: 'Molecule',
    name: 'SignalIndicator',
    purpose: 'Indikator kualitas redaman optik OPM (dBm) dan telemetri Speedtest',
    propsInterface: 'dbm: number | null; showRangeGuide?: boolean',
    variants: 'good (-8 s/d -24 dBm), warning (-24.01 s/d -27 dBm), los (<-27 dBm)',
    sizes: 'sm, md, lg',
    states: 'unmeasured, normal, marginal, critical-los',
    responsiveBehavior: 'Menampilkan bar visual + nilai dBm monospace',
    accessibilityNotes: 'Status tertulis: Normal / Batas Wajar / Kritis (LOS)',
  },
  {
    layer: 'Molecule',
    name: 'UploadProgressItem & ToastItem',
    purpose: 'Baris progres unggah bukti foto/tanda tangan di Outbox & notifikasi mengambang',
    propsInterface: 'title: string; status: "pending"|"syncing"|"synced"|"failed"; timestamp: string; onRetry?: () => void',
    variants: 'pending, syncing, synced, failed',
    sizes: 'comfortable',
    states: 'queued, uploading, error-retry, completed',
    responsiveBehavior: 'Full width di dalam modal/drawer Outbox',
    accessibilityNotes: 'role="alert" untuk error, tombol Coba Lagi >= 48px',
  },
  {
    layer: 'Molecule',
    name: 'EmptyState & ConfirmDialog',
    purpose: 'Tampilan saat daftar kosong & dialog konfirmasi tindakan penting',
    propsInterface: 'title: string; description: string; actionLabel?: string; onAction?: () => void',
    variants: 'default, warning, danger',
    sizes: 'md',
    states: 'idle, confirming',
    responsiveBehavior: 'Bottom-sheet modal di PWA 390px, centered dialog di desktop',
    accessibilityNotes: 'role="dialog", aria-modal="true", fokus terkunci di dalam modal',
  },
  // ORGANISMS
  {
    layer: 'Organism',
    name: 'TicketStepper',
    purpose: 'Stepper progres pengerjaan WO (1. Detail & Perjalanan -> 2. Step 1 Bukti -> 3. Step 2 Absen Tim -> 4. Riwayat) yang terkunci berurutan',
    propsInterface: 'currentStep: number; steps: {id: string; label: string; completed: boolean; locked: boolean}[]; onSelectStep: (id: string) => void',
    variants: 'horizontal-stepper',
    sizes: 'comfortable (48px touch tabs)',
    states: 'completed, active, locked (dengan ikon gembok)',
    responsiveBehavior: '4 langkah proporsional pada lebar 390px',
    accessibilityNotes: 'aria-disabled pada step yang belum terbuka, aria-current="step"',
  },
  {
    layer: 'Organism',
    name: 'TicketCard',
    purpose: 'Kartu tugas lapangan (PSB & Gangguan) dengan SlaBadge, ODP, jarak GPS, dan 1 tombol aksi',
    propsInterface: 'workOrder: WorkOrder; distanceMeters?: number; onSelect: (wo: WorkOrder) => void; density?: "comfortable"|"compact"',
    variants: 'psb, complaint',
    sizes: 'comfortable (PWA), compact (Admin)',
    states: 'assigned, on_the_way, arrived, phase1_completed, closed',
    responsiveBehavior: 'Stack vertikal di PWA 390px',
    accessibilityNotes: 'Seluruh kartu memiliki fokus keyboard jelas dan label aksi eksplisit',
  },
  {
    layer: 'Organism',
    name: 'SignaturePad',
    purpose: 'Kanvas Tanda Tangan Elektronik (TTE) Verifikasi Pelanggan untuk BAST Step 1',
    propsInterface: 'isOpen: boolean; customerName: string; ticketNumber: string; onSave: (dataUrl: string) => void',
    variants: 'modal-canvas',
    sizes: 'responsive canvas',
    states: 'empty, drawing, signed',
    responsiveBehavior: 'Mendukung input sentuh jari (touch) dan kursor mouse',
    accessibilityNotes: 'Tombol Hapus Ulang dan Simpan TTE berukuran >= 48px',
  },
  {
    layer: 'Organism',
    name: 'DataTable & AttendanceReviewCard',
    purpose: 'Tabel data padat/nyaman dengan sortir & kartu riwayat absensi pribadi karyawan',
    propsInterface: 'columns: Column[]; data: T[]; density?: "comfortable"|"compact"; emptyMessage?: string',
    variants: 'comfortable (PWA), compact (Web Admin)',
    sizes: 'full-width',
    states: 'populated, empty, loading, sorted',
    responsiveBehavior: 'Kartu/tabel responsif tanpa memotong informasi penting',
    accessibilityNotes: 'Header tabel semantik <th> dengan aria-sort',
  },
  {
    layer: 'Organism',
    name: 'OdpDetailPanel & MapPanel',
    purpose: 'Panel telemetri kapasitas port ODP dan visualisasi peta geofence 50m',
    propsInterface: 'odpCode: string; portNumber?: number; distanceMeters: number; radiusMeters: number; status: "inside"|"outside"|"low_accuracy"',
    variants: 'geofence-radar, odp-port-grid',
    sizes: 'comfortable',
    states: 'inside-radius (Sah), outside-radius (Tolak), low-accuracy',
    responsiveBehavior: 'Menyesuaikan lebar layar 390px hingga 1440px',
    accessibilityNotes: 'Menampilkan angka meter dan status teks eksplisit',
  },
  {
    layer: 'Organism',
    name: 'OfflineBanner & OutboxList',
    purpose: 'Banner status koneksi lapangan & daftar antrean sinkronisasi bukti offline',
    propsInterface: 'isOnline: boolean; queue: OfflineAction[]; onSyncNow: () => void',
    variants: 'online, offline-queued, syncing',
    sizes: 'compact banner + modal list',
    states: 'hidden (saat online & 0 antrean), warning-offline, syncing',
    responsiveBehavior: 'Sticky di atas BottomNav dengan batas total sticky <= 15% tinggi layar',
    accessibilityNotes: 'aria-live="assertive" saat koneksi terputus',
  },
  {
    layer: 'Organism',
    name: 'TopBar & BottomNav',
    purpose: 'Navigasi atas bermotif topologi fiber tipis & navigasi bawah 4-5 tab utama PWA',
    propsInterface: 'activeTab: TabKey; onChangeTab: (tab: TabKey) => void',
    variants: 'teknisi, sales, design-system',
    sizes: 'TopBar 56px, BottomNav 60px (min-h-touch)',
    states: 'active-tab (glow cyan tipis), inactive-tab',
    responsiveBehavior: 'Sticky top & fixed bottom untuk ergonomi satu tangan (thumb-zone)',
    accessibilityNotes: 'nav aria-label="Navigasi Utama", aria-current="page"',
  },
  // TEMPLATES
  {
    layer: 'Template',
    name: 'FieldLayout',
    purpose: 'Template standar PWA Lapangan (TopBar + Banner Offline + Konten + BottomNav)',
    propsInterface: 'header: ReactNode; children: ReactNode; bottomNav: ReactNode; offlineBanner?: ReactNode',
    variants: 'pwa-mobile, desktop-expanded',
    sizes: '390px mobile-first hingga container responsif',
    states: 'light-mode, dark-mode',
    responsiveBehavior: 'Menjaga proporsi thumb-zone dan sticky cap <= 15%',
    accessibilityNotes: 'Landmark semantik <header>, <main>, <nav>',
  },
];

export const SCREEN_CONSISTENCY_AUDIT: ScreenAuditRow[] = [
  {
    screenName: '1. Beranda Operasional (DashboardScreen)',
    productTarget: 'PWA Lapangan (390px)',
    templateUsed: 'FieldLayout',
    organismsUsed: ['TopBar', 'TicketCard', 'OdpDetailPanel', 'BottomNav'],
    moleculesUsed: ['StatCard', 'StatusBadge', 'SlaBadge', 'SignalIndicator'],
    atomsUsed: ['Button', 'Badge', 'Avatar', 'Divider'],
    zeroHardcodedVerified: true,
  },
  {
    screenName: '2. Daftar Tugas & Detail WO Step 1-2 (WorkOrdersScreen + WorkOrderDetailModal)',
    productTarget: 'PWA Lapangan (390px)',
    templateUsed: 'FieldLayout',
    organismsUsed: ['FilterBar', 'TicketCard', 'TicketStepper', 'SignaturePad', 'MapPanel'],
    moleculesUsed: ['SearchBox', 'StatusBadge', 'SlaBadge', 'SignalIndicator', 'FormField', 'EmptyState'],
    atomsUsed: ['Button', 'IconButton', 'Input', 'Checkbox', 'Badge', 'Spinner'],
    zeroHardcodedVerified: true,
  },
  {
    screenName: '3. Absen Masuk/Pulang & Riwayat Pribadi (AttendanceScreen)',
    productTarget: 'PWA Lapangan (390px)',
    templateUsed: 'FieldLayout',
    organismsUsed: ['MapPanel', 'AttendanceReviewCard', 'DataTable'],
    moleculesUsed: ['StatCard', 'StatusBadge', 'EmptyState'],
    atomsUsed: ['Button', 'Badge', 'Avatar', 'Divider'],
    zeroHardcodedVerified: true,
  },
  {
    screenName: '4. Pengajuan PSB Sales (SalesScreen)',
    productTarget: 'PWA Lapangan (390px)',
    templateUsed: 'FieldLayout',
    organismsUsed: ['FilterBar', 'DataTable'],
    moleculesUsed: ['FormField', 'SearchBox', 'StatusBadge', 'StatCard', 'EmptyState'],
    atomsUsed: ['Button', 'Input', 'Select', 'Badge'],
    zeroHardcodedVerified: true,
  },
  {
    screenName: '5. Outbox & Offline Sync (OutboxModal + OfflineBanner)',
    productTarget: 'PWA Lapangan (390px)',
    templateUsed: 'FieldLayout',
    organismsUsed: ['OfflineBanner', 'OutboxList'],
    moleculesUsed: ['UploadProgressItem', 'EmptyState', 'ConfirmDialog'],
    atomsUsed: ['Button', 'IconButton', 'Badge', 'Spinner'],
    zeroHardcodedVerified: true,
  },
  {
    screenName: '6. Katalog Design System & Component Gallery (ComponentGalleryScreen)',
    productTarget: 'Shared Design System',
    templateUsed: 'FieldLayout',
    organismsUsed: ['FilterBar', 'DataTable', 'TicketStepper', 'TicketCard', 'AttendanceReviewCard'],
    moleculesUsed: ['FormField', 'SearchBox', 'StatusBadge', 'SlaBadge', 'StatCard', 'SignalIndicator', 'UploadProgressItem', 'EmptyState'],
    atomsUsed: ['Button', 'IconButton', 'Input', 'Select', 'Checkbox', 'Switch', 'Badge', 'Avatar', 'Spinner', 'Skeleton', 'Divider', 'Tooltip'],
    zeroHardcodedVerified: true,
  },
];

export const TAILWIND_CONFIG_SNIPPET = `// tailwind.config.ts & CSS Variables (@theme di src/index.css)
// Seluruh warna, tipografi, spasi, radius (8-12px), dan shadow menggunakan semantic token:
:root {
  --color-brand-navy: #0a162e;
  --color-brand-primary: #0891b2;
  --color-brand-accent: #06b6d4;
  --color-surface-canvas: #f1f5f9;
  --color-surface-card: #ffffff;
  --color-text-primary: #0f172a;
  --color-status-safe-bg: #dcfce7;
  --color-status-safe-fg: #166534;
  --color-status-warning-bg: #fef3c7;
  --color-status-warning-fg: #92400e;
  --color-status-danger-bg: #fee2e2;
  --color-status-danger-fg: #991b1b;
  --color-status-paused-bg: #e2e8f0;
  --color-status-paused-fg: #334155;
  --space-touch-min: 3rem; /* 48px target sentuh minimum PWA */
  --radius-token-sm: 0.5rem;   /* 8px */
  --radius-token-md: 0.625rem; /* 10px */
  --radius-token-lg: 0.75rem;  /* 12px */
}

.dark {
  --color-brand-navy: #060d1e;
  --color-brand-primary: #06b6d4;
  --color-brand-accent: #22d3ee;
  --color-surface-canvas: #060d1e;
  --color-surface-card: #0b1730;
  --color-text-primary: #f8fafc;
}`;
