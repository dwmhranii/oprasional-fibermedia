export * from './designTokens';

/**
 * FIBERMEDIA-OPS DESIGN TOKENS
 * Standar terpadu warna, tipografi, spasi, radius, bayangan, dan ukuran ikon
 * Mendukung mode terang (Light Mode) dan mode gelap (Dark Mode)
 */

export const TOKENS = {
  // Radius
  radius: {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  },

  // Bayangan
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    none: 'shadow-none',
  },

  // Spasi
  spacing: {
    pagePadding: 'p-4 sm:p-6 lg:p-8',
    cardPadding: 'p-4 sm:p-5',
    sectionGap: 'space-y-6',
    itemGap: 'gap-4',
  },

  // Tipografi
  typography: {
    pageTitle: 'text-2xl sm:text-3xl font-bold tracking-tight text-foreground',
    pageSubtitle: 'text-sm text-muted-foreground mt-1',
    sectionTitle: 'text-lg font-semibold text-foreground',
    cardTitle: 'text-base font-semibold text-foreground',
    bodyText: 'text-sm text-foreground',
    mutedText: 'text-xs text-muted-foreground',
    tableHeader: 'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
    tableCell: 'text-sm text-foreground',
  },

  // Ukuran Ikon
  iconSize: {
    xs: 14,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },

  // Warna Semantik
  semantic: {
    success: {
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    },
    warning: {
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    danger: {
      text: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-200 dark:border-rose-800',
      badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500',
    },
    info: {
      text: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500',
    },
    neutral: {
      text: 'text-slate-700 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-900/40',
      border: 'border-slate-200 dark:border-slate-800',
      badge: 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800',
      dot: 'bg-slate-500',
    },
  },
} as const;

export type SemanticVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Pemetaan status operasional ke warna semantik baku
 */
export function getStatusSemanticVariant(status: string | null | undefined): SemanticVariant {
  if (!status) return 'neutral';
  const s = status.toLowerCase();

  // Success / Aktif / Normal / Selesai / Disetujui / Hadir / Di dalam radius
  if (['active', 'normal', 'resolved', 'completed', 'approved', 'hadir', 'inside', 'success', 'online'].includes(s)) {
    return 'success';
  }

  // Warning / Menunggu / Perlu Ditinjau / Izin / Akurasi Rendah / Rework / Pending
  if (['pending', 'unassigned', 'assigned', 'phase_1_completed', 'phase_1_submitted', 'pending_validation', 'need_info', 'rework', 'izin', 'low_accuracy', 'ready', 'processing'].includes(s)) {
    return 'warning';
  }

  // Danger / Terisolir / Putus / Gangguan / Ditolak / Sakit / Alpa / Di luar radius / Gagal / Bermasalah
  if (['suspended', 'terminated', 'cut', 'disrupted', 'rejected', 'failed', 'cancelled', 'outside', 'alpa', 'flagged', 'critical'].includes(s)) {
    return 'danger';
  }

  // Info / Dikerjakan / Dalam Perjalanan / Eskalasi / Sakit
  if (['in_progress', 'on_the_way', 'escalated', 'escalated_to_admin', 'sakit'].includes(s)) {
    return 'info';
  }

  return 'neutral';
}
