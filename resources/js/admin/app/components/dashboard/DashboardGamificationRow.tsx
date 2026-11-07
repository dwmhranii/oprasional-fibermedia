import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Zap,
  Flame,
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronRight,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { Button } from '../ui/button';
import type { DashboardSummaryData } from '../../types/dashboard';

interface DashboardGamificationRowProps {
  data?: DashboardSummaryData | null;
  isLoading?: boolean;
}

export const DashboardGamificationRow: React.FC<DashboardGamificationRowProps> = ({
  data,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // Hitung Skor Kesiapan Operasional secara dinamis (0 - 100%)
  const totalTeams = data?.tim_hari_ini?.total_tim_aktif || 0;
  const readyTeams = data?.tim_hari_ini?.tim_siap || 0;
  const teamRatio = totalTeams > 0 ? readyTeams / totalTeams : 1;

  const totalMembers = data?.tim_hari_ini?.total_anggota || 0;
  const presentMembers = data?.tim_hari_ini?.anggota_hadir || 0;
  const attendanceRatio = totalMembers > 0 ? presentMembers / totalMembers : 1;

  const urgentItems = data?.perlu_tindakan || [];
  const criticalUrgentCount = urgentItems.filter((i) => i.urgency === 'critical').length;
  const urgentPenalty = Math.min(30, criticalUrgentCount * 10);

  const networkIssues =
    (data?.jaringan?.olt_bermasalah || 0) + (data?.jaringan?.odc_bermasalah || 0);
  const networkPenalty = Math.min(20, networkIssues * 10);

  const calculatedScore = Math.max(
    25,
    Math.min(
      100,
      Math.round(teamRatio * 45 + attendanceRatio * 35 + 20 - urgentPenalty - networkPenalty)
    )
  );

  const score = isLoading ? 0 : calculatedScore;

  // Tier info
  const getTier = (s: number) => {
    if (s >= 90) {
      return {
        label: 'Optimal & Siap Tempur',
        badge: 'Level S',
        textColor: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        barGradient: 'from-emerald-500 to-teal-400',
        icon: Sparkles,
      };
    }
    if (s >= 75) {
      return {
        label: 'Kondisi Baik',
        badge: 'Level A',
        textColor: 'text-sky-500',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/30',
        barGradient: 'from-sky-500 to-blue-500',
        icon: TrendingUp,
      };
    }
    if (s >= 60) {
      return {
        label: 'Perlu Perhatian',
        badge: 'Level B',
        textColor: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        barGradient: 'from-amber-500 to-orange-400',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Intervensi Mendesak',
      badge: 'Level C',
      textColor: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      barGradient: 'from-rose-500 to-red-600',
      icon: AlertTriangle,
    };
  };

  const tier = getTier(score);
  const TierIcon = tier.icon;

  // Lencana Performa Hari Ini
  const isSlaMaster = (data?.pengaduan?.diteruskan_ke_admin ?? 0) === 0;
  const isQuickResponse = (data?.pengaduan?.belum_ditugaskan ?? 0) === 0;
  const isFullForce = readyTeams > 0 && readyTeams === totalTeams;
  const isNetworkSolid = networkIssues === 0;

  const badges = [
    {
      id: 'sla-master',
      title: 'SLA Master',
      desc: '0 tiket eskalasi ke admin',
      unlocked: isSlaMaster,
      icon: Trophy,
      activeColor: 'from-amber-500 to-yellow-400 text-amber-950',
      activeBorder: 'border-amber-400/40 shadow-amber-500/10',
    },
    {
      id: 'quick-response',
      title: 'Respons Kilat',
      desc: 'Antrean tiket bersih',
      unlocked: isQuickResponse,
      icon: Zap,
      activeColor: 'from-sky-500 to-cyan-400 text-sky-950',
      activeBorder: 'border-sky-400/40 shadow-sky-500/10',
    },
    {
      id: 'full-force',
      title: 'Kekuatan Penuh',
      desc: `${readyTeams}/${totalTeams} tim siap operasi`,
      unlocked: isFullForce,
      icon: Users,
      activeColor: 'from-emerald-500 to-teal-400 text-emerald-950',
      activeBorder: 'border-emerald-400/40 shadow-emerald-500/10',
    },
    {
      id: 'network-solid',
      title: 'Jaringan Tangguh',
      desc: 'Infrastruktur OLT normal',
      unlocked: isNetworkSolid,
      icon: ShieldCheck,
      activeColor: 'from-indigo-500 to-purple-400 text-indigo-950',
      activeBorder: 'border-indigo-400/40 shadow-indigo-500/10',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-4"
    >
      {/* 1. Skor Kesiapan Operasional (Gauge Card) */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/20 p-5 shadow-xs"
      >
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Skor Kesiapan Operasional
              </h2>
              <p className="text-xs text-muted-foreground">Indeks performa & kesiapan hari ini</p>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tier.bgColor} ${tier.textColor} ${tier.borderColor}`}
          >
            <TierIcon className="w-3.5 h-3.5" />
            <span>{tier.badge}</span>
          </div>
        </div>

        {/* Big Score Display */}
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-foreground">
              {score}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
          </div>
          <span className={`text-xs font-bold ${tier.textColor}`}>
            {tier.label}
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden p-0.5 border border-border/40 mb-4">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${tier.barGradient} shadow-sm`}
          />
        </div>

        {/* Micro Stats in Score Card */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/60 text-center">
          <div className="px-2 py-1.5 rounded-lg bg-muted/30">
            <span className="block text-[11px] text-muted-foreground">Tim Siap</span>
            <span className="text-xs font-bold text-foreground">
              {readyTeams}/{totalTeams}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-muted/30">
            <span className="block text-[11px] text-muted-foreground">Hadir Kerja</span>
            <span className="text-xs font-bold text-foreground">
              {presentMembers}/{totalMembers}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-muted/30">
            <span className="block text-[11px] text-muted-foreground">Tindakan Kritis</span>
            <span
              className={`text-xs font-bold ${
                criticalUrgentCount > 0 ? 'text-rose-500' : 'text-emerald-500'
              }`}
            >
              {criticalUrgentCount}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 2. Lencana Prestasi & Giliran Round-Robin */}
      <div className="lg:col-span-7 flex flex-col justify-between gap-4">
        {/* Row of Badges */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Lencana Performa Hari Ini</span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {badges.filter((b) => b.unlocked).length} dari {badges.length} Terbuka
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {badges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.18 }}
                  className={`relative p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    badge.unlocked
                      ? `bg-card border-border ${badge.activeBorder} shadow-xs`
                      : 'bg-muted/15 border-border/50 opacity-60 grayscale'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 shadow-xs ${
                      badge.unlocked
                        ? `bg-gradient-to-br ${badge.activeColor}`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground line-clamp-1">
                    {badge.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {badge.desc}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Giliran Round-Robin & Streak Disiplin Operasional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dispatch Round-Robin Turn Card */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[11px] font-medium text-muted-foreground">
                  Giliran Pemasangan (PSB)
                </span>
                <span className="text-xs font-bold text-foreground">
                  {data?.tim_hari_ini?.giliran_psb || 'Belum tersedia'}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/dispatch')}
              className="h-7 px-2 text-xs text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Giliran Pengaduan */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[11px] font-medium text-muted-foreground">
                  Giliran Pengaduan
                </span>
                <span className="text-xs font-bold text-foreground">
                  {data?.tim_hari_ini?.giliran_pengaduan || 'Belum tersedia'}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/dispatch')}
              className="h-7 px-2 text-xs text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

