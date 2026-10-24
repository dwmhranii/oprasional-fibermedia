import React from 'react';
import { Clock, User, ArrowRight, FileText } from 'lucide-react';
import type { ComplaintActivityLog } from '../../types/complaint';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { formatDate } from '../../lib/formatters';

interface ComplaintTimelineProps {
  logs?: ComplaintActivityLog[];
  className?: string;
}

export const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({
  logs = [],
  className = '',
}) => {
  if (logs.length === 0) {
    return (
      <div className={`p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-lg border border-gray-100 ${className}`}>
        Belum ada riwayat aktivitas.
      </div>
    );
  }

  // Sort descending by created_at
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className={`relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 ${className}`}>
      {sortedLogs.map((log, index) => (
        <div key={log.id || index} className="relative pl-4 group">
          {/* Timeline Dot */}
          <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-indigo-600 group-hover:scale-125 transition-transform" />

          <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
              <span className="font-semibold text-gray-900">{log.action}</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(log.created_at)}
              </span>
            </div>

            {/* Status transition if exists */}
            {(log.from_status || log.to_status) && (
              <div className="flex items-center gap-1.5 text-xs">
                {log.from_status && <ComplaintStatusBadge status={log.from_status} showIcon={false} />}
                {log.from_status && log.to_status && (
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                )}
                {log.to_status && <ComplaintStatusBadge status={log.to_status} showIcon={false} />}
              </div>
            )}

            {/* Reason or Notes if exists */}
            {(log.reason || (log as any).notes) && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs text-slate-800 dark:text-slate-200 mt-1">
                <span className="font-semibold text-slate-900 dark:text-white">Catatan: </span>
                <span>{log.reason || (log as any).notes}</span>
              </div>
            )}

            {/* Actor */}
            <div className="text-[11px] text-gray-500 flex items-center gap-1 pt-1 border-t border-gray-50">
              <User className="w-3 h-3 text-gray-400" />
              <span>
                Oleh: <strong>{log.actor_name}</strong> {log.actor_role && `(${log.actor_role})`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
