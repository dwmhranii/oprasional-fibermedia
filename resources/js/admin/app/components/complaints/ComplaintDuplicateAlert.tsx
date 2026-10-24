import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { ComplaintListItem } from '../../types/complaint';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { formatDate } from '../../lib/formatters';

interface ComplaintDuplicateAlertProps {
  duplicates: ComplaintListItem[];
  className?: string;
  onViewTicket?: (id: number) => void;
}

export const ComplaintDuplicateAlert: React.FC<ComplaintDuplicateAlertProps> = ({
  duplicates = [],
  className = '',
  onViewTicket,
}) => {
  if (duplicates.length === 0) return null;

  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm text-amber-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-amber-200/80 rounded-lg text-amber-800 flex-shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h4 className="text-sm font-semibold text-amber-900">
              Peringatan: Pelanggan Memiliki Tiket Pengaduan Aktif ({duplicates.length})
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Ditemukan tiket pengaduan yang masih berjalan untuk pelanggan ini. Anda tetap dapat melanjutkan pembuatan tiket jika ini adalah kendala baru yang berbeda.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            {duplicates.map((dup) => (
              <div
                key={dup.id}
                className="flex items-center justify-between bg-white/90 border border-amber-200 rounded-lg px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{dup.ticket_number}</span>
                  <ComplaintStatusBadge status={dup.status} />
                  <span className="text-gray-500">• {dup.subject}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-400">
                    {formatDate(dup.created_at)}
                  </span>
                  {onViewTicket && (
                    <button
                      type="button"
                      onClick={() => onViewTicket(dup.id)}
                      className="text-amber-800 hover:text-amber-950 font-medium inline-flex items-center gap-1"
                    >
                      <span>Lihat</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
