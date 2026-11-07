import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ACTIONS, TERMS } from '@shared/i18n/id';
import { formatDistance } from '@shared/lib/formatters';
import {
  CalendarCheck,
  UserX,
  MapPinOff,
  UsersRound,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';
import type { AbsensiHariIniSummary } from '../../types/dashboard';

interface DashboardAttendanceTodayProps {
  data?: AbsensiHariIniSummary | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const DashboardAttendanceToday: React.FC<DashboardAttendanceTodayProps> = ({
  data,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const navigate = useNavigate();

  const belumAbsen = data?.belum_absen_masuk || [];
  const luarRadius = data?.luar_radius || [];
  const timBelumSiap = data?.tim_belum_siap || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-xl border border-border p-5 shadow-xs"
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Absensi Hari Ini</h2>
            <p className="text-xs text-muted-foreground">
              Pemantauan kehadiran personil lapangan, validasi radius kantor, dan kesiapan operasional tim
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/attendance/today')}
          className="text-xs text-primary hover:text-primary/80 gap-1 h-8"
        >
          <span>{TERMS.dailyAttendance}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="p-4 rounded-lg border border-border bg-muted/20 animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">Gagal memuat data absensi hari ini.</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
                {ACTIONS.retry}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kolom 1: Belum Absen Masuk */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    <UserX className="w-4 h-4" />
                    <span>Belum Absen Masuk ({belumAbsen.length})</span>
                  </div>
                </div>

                {belumAbsen.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Semua personil tim telah absen</span>
                  </div>
                ) : (
                  <ul className="divide-y divide-border text-xs max-h-52 overflow-y-auto pr-1 space-y-1">
                    {belumAbsen.slice(0, 6).map((item) => (
                      <li key={item.id} className="py-1.5 flex items-center justify-between">
                        <span className="font-medium text-foreground truncate max-w-[140px]">{item.name}</span>
                        <span className="text-muted-foreground bg-muted px-2 py-0.5 rounded text-[11px]">{item.team}</span>
                      </li>
                    ))}
                    {belumAbsen.length > 6 && (
                      <li className="pt-2 text-center text-[11px] text-muted-foreground">
                        +{belumAbsen.length - 6} personil lainnya
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </motion.div>

            {/* Kolom 2: Di Luar Radius Kantor */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <MapPinOff className="w-4 h-4" />
                    <span>Di Luar Radius Kantor ({luarRadius.length})</span>
                  </div>
                </div>

                {luarRadius.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Tidak ada absensi luar radius</span>
                  </div>
                ) : (
                  <ul className="divide-y divide-border text-xs max-h-52 overflow-y-auto pr-1 space-y-1">
                    {luarRadius.slice(0, 6).map((item) => (
                      <li key={item.id} className="py-1.5 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">{item.name}</div>
                          <div className="text-[11px] text-muted-foreground">{item.team} ({item.check_in_at || '-'})</div>
                        </div>
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-xs">
                          {formatDistance(item.distance_meters)}
                        </span>
                      </li>
                    ))}
                    {luarRadius.length > 6 && (
                      <li className="pt-2 text-center text-[11px] text-muted-foreground">
                        +{luarRadius.length - 6} lainnya
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </motion.div>

            {/* Kolom 3: Tim Belum Siap */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl border border-border bg-card/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    <UsersRound className="w-4 h-4" />
                    <span>Tim Belum Siap ({timBelumSiap.length})</span>
                  </div>
                </div>

                {timBelumSiap.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Seluruh tim siap beroperasi</span>
                  </div>
                ) : (
                  <ul className="divide-y divide-border text-xs max-h-52 overflow-y-auto pr-1 space-y-1">
                    {timBelumSiap.slice(0, 6).map((item) => (
                      <li key={item.id} className="py-1.5 flex items-center justify-between">
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          {item.reason}
                        </span>
                      </li>
                    ))}
                    {timBelumSiap.length > 6 && (
                      <li className="pt-2 text-center text-[11px] text-muted-foreground">
                        +{timBelumSiap.length - 6} tim lainnya
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
