import React from 'react';
import { PageHeader } from '@shared/ui';
import { ACTIONS } from '@shared/i18n/id';
import { formatDateTime } from '@shared/lib/formatters';
import { RefreshCw, Radio, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';
import type { DashboardPeriod } from '../../types/dashboard';

interface DashboardHeaderProps {
  lastUpdated?: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  onReload: () => void;
  isReloading?: boolean;
  isLiveConnected?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  lastUpdated,
  period,
  onPeriodChange,
  onReload,
  isReloading = false,
  isLiveConnected = false,
}) => {
  const formattedTime = lastUpdated ? formatDateTime(lastUpdated) : '-';

  const periodButtons: Array<{ id: DashboardPeriod; label: string }> = [
    { id: 'today', label: 'Hari Ini' },
    { id: '7d', label: '7 Hari' },
    { id: '30d', label: '30 Hari' },
  ];

  return (
    <PageHeader
      title="Dashboard"
      description={`Terakhir diperbarui: ${formattedTime}`}
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Koneksi Reverb / Polling */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isLiveConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
            }`}
            title={
              isLiveConnected
                ? 'Terhubung langsung via Reverb WebSocket'
                : 'Koneksi cadangan polling berkala setiap 60 detik'
            }
          >
            {isLiveConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Langsung</span>
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Tidak Langsung (Polling 60d)</span>
              </>
            )}
          </div>

          {/* Pemilih Periode */}
          <div className="inline-flex p-1 bg-muted rounded-lg border border-border" role="group" aria-label="Pemilih Periode">
            {periodButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => onPeriodChange(btn.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  period === btn.id
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Tombol Muat Ulang */}
          <Button
            variant="outline"
            size="sm"
            onClick={onReload}
            disabled={isReloading}
            className="text-xs h-8.5 gap-1.5 border-border bg-card hover:bg-accent text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            <span>{ACTIONS.reload}</span>
          </Button>
        </div>
      }
    />
  );
};
