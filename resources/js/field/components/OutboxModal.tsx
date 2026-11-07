import React from 'react';
import { useApp } from '../context/AppContext';
import { X, RefreshCw, Trash2, Clock, CheckCircle2 } from 'lucide-react';

interface OutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OutboxModal: React.FC<OutboxModalProps> = ({ isOpen, onClose }) => {
  const { offlineQueue, syncOutbox, isOnline } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Antrean Offline (Outbox)</h2>
            <p className="text-xs text-slate-500">
              {offlineQueue.length} transaksi menunggu pengiriman ke server
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          {offlineQueue.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Semua Antrean Bersih</p>
              <p className="text-xs text-slate-400 mt-1">Tidak ada transaksi yang tertunda di memori lokal.</p>
            </div>
          ) : (
            offlineQueue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition text-xs"
              >
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="uppercase text-sky-700 bg-sky-100 px-2 py-0.5 rounded text-[10px] tracking-wide">
                    {item.action_type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-[11px] text-slate-500 truncate">
                  Key: {item.idempotency_key}
                </div>
                <div className="mt-1 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Percobaan: {item.retry_count}x</span>
                  <span
                    className={`font-semibold ${
                      item.status === 'syncing' ? 'text-amber-600 animate-pulse' : 'text-slate-500'
                    }`}
                  >
                    Status: {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            {isOnline ? 'Koneksi aktif' : 'Sedang offline'}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Tutup
            </button>
            {offlineQueue.length > 0 && (
              <button
                onClick={syncOutbox}
                disabled={!isOnline}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sinkronkan Sekarang
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
