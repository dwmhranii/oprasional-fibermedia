import React, { useState } from 'react';
import {
  OutboxList,
  OutboxItem,
  OfflineBanner,
  Button,
} from '@shared/ui';
import { Wifi, WifiOff, UploadCloud, CheckCircle2 } from 'lucide-react';

export interface FieldOutboxScreenProps {
  isOffline?: boolean;
  onToggleConnectionSimulation?: () => void;
}

export const FieldOutboxScreen: React.FC<FieldOutboxScreenProps> = ({
  isOffline = true,
  onToggleConnectionSimulation,
}) => {
  const [items, setItems] = useState<OutboxItem[]>([
    {
      id: 'ob-1',
      actionType: 'ABSEN_MASUK',
      description: 'Absen masuk di Kantor Kepanjen (18 m dari radius)',
      createdAt: '08:02 WIB',
      status: 'pending',
    },
    {
      id: 'ob-2',
      actionType: 'STATUS_UPDATE',
      description: 'Perjalanan ke lokasi tiket #TKT-2026-0914 (Bambang Sudiro)',
      createdAt: '08:35 WIB',
      status: 'pending',
    },
    {
      id: 'ob-3',
      actionType: 'BAST_SUBMIT',
      description: 'Tanda tangan BAST Pelanggan Siti Rahmawati (#TKT-2026-0912)',
      createdAt: '09:12 WIB',
      status: 'failed',
      errorDetails: 'Gagal kirim: Koneksi timeout ke server gateway',
    },
  ]);

  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const handleRetryItem = (id: string | number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'syncing' } : item
      )
    );

    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 800);
  };

  const handleDeleteItem = (id: string | number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRetryAll = () => {
    setIsSyncingAll(true);
    setItems((prev) =>
      prev.map((item) => ({ ...item, status: 'syncing' }))
    );

    setTimeout(() => {
      setIsSyncingAll(false);
      setItems([]);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      {/* Simulation Toggle Bar */}
      <div className="p-3.5 rounded-2xl border border-border bg-card flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          {isOffline ? (
            <WifiOff className="w-4 h-4 text-amber-500" />
          ) : (
            <Wifi className="w-4 h-4 text-emerald-500" />
          )}
          <span className="font-semibold text-foreground">
            Status: {isOffline ? 'Mode Luring (Offline)' : 'Terhubung (Online)'}
          </span>
        </div>

        {onToggleConnectionSimulation && (
          <Button
            variant="outline"
            size="sm"
            density="compact"
            onClick={onToggleConnectionSimulation}
          >
            Ubah Mode
          </Button>
        )}
      </div>

      {/* Offline Alert Banner */}
      <OfflineBanner
        isOffline={isOffline}
        queuedCount={items.length}
        onSyncNow={items.length > 0 ? handleRetryAll : undefined}
        isSyncing={isSyncingAll}
      />

      {/* Outbox List of Queued Actions */}
      <OutboxList
        items={items}
        density="comfortable"
        onRetryItem={handleRetryItem}
        onDeleteItem={handleDeleteItem}
        onRetryAll={items.length > 0 ? handleRetryAll : undefined}
        isSyncingAll={isSyncingAll}
      />
    </div>
  );
};

