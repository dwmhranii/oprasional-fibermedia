import React from 'react';
import { useApp } from '../context/AppContext';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, setIsOnline, offlineQueue, syncOutbox } = useApp();

  if (isOnline && offlineQueue.length === 0) return null;

  return (
    <aside aria-label="Status Jaringan" className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-sm">
      {!isOnline ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>Mode Offline — Bukti & absensi disimpan di Outbox</span>
          </div>
          <button
            onClick={() => setIsOnline(true)}
            className="rounded-lg bg-white/20 px-2 py-1 text-[11px] hover:bg-white/30 whitespace-nowrap"
          >
            Hubungkan
          </button>
        </div>
      ) : offlineQueue.length > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-300 animate-ping shrink-0" />
            <span>{offlineQueue.length} aksi di outbox menunggu sinkron</span>
          </div>
          <button
            onClick={syncOutbox}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-[11px] hover:bg-white/30 whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3" />
            Kirim
          </button>
        </div>
      ) : null}
    </aside>
  );
};
