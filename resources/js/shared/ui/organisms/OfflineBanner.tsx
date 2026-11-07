import React from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../atoms';

export interface OfflineBannerProps {
  isOffline: boolean;
  queuedCount?: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  className?: string;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  queuedCount = 0,
  onSyncNow,
  isSyncing = false,
  className = '',
}) => {
  if (!isOffline && queuedCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full py-2.5 px-4 bg-amber-500 text-slate-950 font-medium text-xs sm:text-sm shadow-md transition-all duration-200 z-40 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1 rounded-full bg-slate-950/15 shrink-0">
          <WifiOff className="w-4 h-4 text-slate-950" />
        </div>
        <div className="min-w-0">
          <span className="font-bold">
            {isOffline ? 'Koneksi Terputus (Mode Luring).' : 'Ada data tersimpan di perangkat.'}
          </span>{' '}
          <span className="opacity-90">
            {queuedCount > 0
              ? `${queuedCount} tindakan tersimpan di Outbox dan akan disinkronkan otomatis.`
              : 'Fitur lapangan tetap aktif menggunakan cache lokal.'}
          </span>
        </div>
      </div>

      {onSyncNow && (
        <Button
          variant="secondary"
          size="sm"
          density="compact"
          isLoading={isSyncing}
          onClick={onSyncNow}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 bg-slate-950 text-white hover:bg-slate-900 border-none shadow-xs"
        >
          Sinkronkan
        </Button>
      )}
    </div>
  );
};

