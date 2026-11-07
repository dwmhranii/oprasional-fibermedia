import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { ACTIONS } from '@shared/i18n/id';
import type { TrenSummary } from '../../types/dashboard';

interface DashboardTrendChartsProps {
  tren?: TrenSummary | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const DashboardTrendCharts: React.FC<DashboardTrendChartsProps> = ({
  tren,
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const pengaduanData = tren?.pengaduan_harian || [];
  const durasiData = tren?.durasi_sla || [];
  const targetSlaHours = tren?.target_sla_hours || 4.0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Grafik 1: Pengaduan Masuk vs Selesai */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Tren Pengaduan: Masuk vs Selesai
                </h3>
                <p className="text-xs text-muted-foreground">
                  Garis penuh: Masuk | Garis putus-putus: Selesai
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {isLoading ? (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            ) : isError ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-destructive font-medium mb-2">Gagal memuat tren pengaduan.</p>
                {onRetry && <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">{ACTIONS.retry}</Button>}
              </div>
            ) : pengaduanData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Tidak ada data pengaduan pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pengaduanData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card, #ffffff)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="masuk"
                    name="Pengaduan Masuk (Garis Penuh)"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#3b82f6' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="selesai"
                    name="Pengaduan Selesai (Garis Putus-putus)"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Grafik 2: Rata-rata Durasi Penyelesaian vs Target SLA */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Rata-rata Durasi Penyelesaian vs Target SLA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Garis penuh: Realisasi (jam) | Garis merah putus-putus: Target SLA ({targetSlaHours} jam)
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            {isLoading ? (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg" />
            ) : isError ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-destructive font-medium mb-2">Gagal memuat tren SLA.</p>
                {onRetry && <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">{ACTIONS.retry}</Button>}
              </div>
            ) : durasiData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Tidak ada data penyelesaian pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={durasiData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} unit=" j" stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card, #ffffff)',
                      borderColor: 'var(--color-border, #e2e8f0)',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [val !== null ? `${val} jam` : 'Belum ada data', '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <ReferenceLine
                    y={targetSlaHours}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target SLA (${targetSlaHours}h)`,
                      position: 'top',
                      fill: '#ef4444',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rata_rata_jam"
                    name="Durasi Realisasi (jam)"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
