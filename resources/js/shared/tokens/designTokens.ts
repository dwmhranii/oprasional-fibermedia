/**
 * FIBERMEDIA DESIGN SYSTEM - DESIGN TOKENS
 * Standar token desain terpadu untuk Web Admin Desktop & PWA Lapangan Mobile.
 * Sesuai pola: kategori-peran-skala (color-brand-cyan, color-status-warning-bg, dll).
 */

export const DESIGN_TOKENS = {
  // Brand & Palette
  color: {
    brand: {
      navy: {
        50: '#f8fafc',
        100: '#f1f5f9',
        500: '#334155',
        700: '#1e293b',
        800: '#0f172a',
        900: '#090d16',
        950: '#04070d',
      },
      cyan: {
        50: '#ecfeff',
        100: '#cffafe',
        400: '#22d3ee',
        500: '#06b6d4',
        600: '#0891b2',
        700: '#0e7490',
      },
      orange: {
        50: '#fff7ed',
        100: '#ffedd5',
        500: '#f97316',
        600: '#ea580c',
        700: '#c2410c',
      },
    },
    // Semantic Status tokens
    status: {
      safe: {
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/40',
        textLight: 'text-emerald-700',
        textDark: 'dark:text-emerald-400',
        borderLight: 'border-emerald-200',
        borderDark: 'dark:border-emerald-800',
        dot: 'bg-emerald-500',
      },
      warning: {
        bgLight: 'bg-amber-50',
        bgDark: 'dark:bg-amber-950/40',
        textLight: 'text-amber-700',
        textDark: 'dark:text-amber-400',
        borderLight: 'border-amber-200',
        borderDark: 'dark:border-amber-800',
        dot: 'bg-amber-500',
      },
      breached: {
        bgLight: 'bg-rose-50',
        bgDark: 'dark:bg-rose-950/40',
        textLight: 'text-rose-700',
        textDark: 'dark:text-rose-400',
        borderLight: 'border-rose-200',
        borderDark: 'dark:border-rose-800',
        dot: 'bg-rose-500',
      },
      paused: {
        bgLight: 'bg-slate-100',
        bgDark: 'dark:bg-slate-800/60',
        textLight: 'text-slate-700',
        textDark: 'dark:text-slate-300',
        borderLight: 'border-slate-300',
        borderDark: 'dark:border-slate-700',
        dot: 'bg-slate-400',
      },
      info: {
        bgLight: 'bg-cyan-50',
        bgDark: 'dark:bg-cyan-950/40',
        textLight: 'text-cyan-700',
        textDark: 'dark:text-cyan-400',
        borderLight: 'border-cyan-200',
        borderDark: 'dark:border-cyan-800',
        dot: 'bg-cyan-500',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: 'font-sans',
      mono: 'font-mono tracking-tight',
    },
    scale: {
      xs: 'text-xs leading-4',
      sm: 'text-sm leading-5',
      base: 'text-base leading-6',
      lg: 'text-lg leading-7 font-semibold',
      xl: 'text-xl leading-7 font-semibold',
      '2xl': 'text-2xl leading-8 font-bold',
      '3xl': 'text-3xl leading-9 font-extrabold',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },

  // Spacing & Density
  density: {
    compact: {
      input: 'py-1.5 px-3 text-xs',
      button: 'py-1.5 px-3 text-xs h-8',
      iconButton: 'p-1.5 h-8 w-8',
      tableCell: 'py-2 px-3 text-xs',
      card: 'p-3',
      gap: 'gap-2',
    },
    comfortable: {
      input: 'py-3 px-4 text-sm min-h-12', // 48px touch target
      button: 'py-3 px-4 text-sm font-medium min-h-12',
      iconButton: 'p-3 min-h-12 min-w-12',
      tableCell: 'py-3.5 px-4 text-sm',
      card: 'p-4 sm:p-5',
      gap: 'gap-4',
    },
  },

  // Radius (8-12px standard)
  radius: {
    sm: 'rounded-md', // 6px - 8px
    md: 'rounded-lg', // 8px - 10px
    lg: 'rounded-xl', // 12px
    full: 'rounded-full',
  },

  // Shadow
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    glowCyan: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
    glowActive: 'shadow-[0_0_12px_rgba(8,145,178,0.4)]',
    none: 'shadow-none',
  },

  // Transitions / Motion
  motion: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },

  // Z-Index
  zIndex: {
    base: 'z-0',
    card: 'z-10',
    dropdown: 'z-20',
    sticky: 'z-30',
    banner: 'z-40',
    modal: 'z-50',
    toast: 'z-60',
  },

  // Focus Ring
  focusRing: 'focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 focus:outline-none',
} as const;

export type Density = 'compact' | 'comfortable';

