import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
} from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import type { TimelineEvent } from '../../types';

interface SubmissionTimelineCardProps {
  timeline?: TimelineEvent[];
}

export const SubmissionTimelineCard: React.FC<SubmissionTimelineCardProps> = ({ timeline = [] }) => {
  if (!timeline || timeline.length === 0) {
    return (
      <Card>
        <CardHeader className="border-b bg-gray-50/50 py-4">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
            <Clock className="w-5 h-5 text-indigo-600" />
            Linimasa & Riwayat Proses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-6 text-gray-400 text-sm flex flex-col items-center gap-2">
            <Clock className="w-8 h-8 text-gray-300 stroke-[1.5]" />
            <p>Belum ada riwayat linimasa proses.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format event details helper
  const getEventConfig = (event: TimelineEvent) => {
    const rawType = (event.type || event.event || event.title || '').toLowerCase();
    const rawStatus = (event.status || '').toLowerCase();
    const desc = (event.description || event.notes || event.reason || '').toLowerCase();

    if (rawType.includes('approve') || rawStatus.includes('approve') || desc.includes('disetujui')) {
      return {
        bg: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Disetujui',
      };
    }

    if (rawType.includes('reject') || rawStatus.includes('reject') || desc.includes('ditolak')) {
      return {
        bg: 'bg-red-100 text-red-700 border-red-300',
        icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
        badgeBg: 'bg-red-50 text-red-700 border-red-200',
        label: 'Ditolak',
      };
    }

    if (
      rawType.includes('need_info') ||
      rawStatus.includes('need_info') ||
      desc.includes('membutuhkan') ||
      desc.includes('revisi') ||
      desc.includes('perbaikan')
    ) {
      return {
        bg: 'bg-amber-100 text-amber-700 border-amber-300',
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Perlu Info / Revisi',
      };
    }

    if (rawType.includes('document') || desc.includes('dokumen') || event.document_name) {
      return {
        bg: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Tinjauan Dokumen',
      };
    }

    return {
      bg: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      icon: <User className="w-3.5 h-3.5 text-indigo-600" />,
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'Aktivitas System',
    };
  };

  const getActorName = (event: TimelineEvent) => {
    if (typeof event.user === 'string' && event.user) return event.user;
    if (typeof event.actor === 'string' && event.actor) return event.actor;
    if (typeof event.reviewer === 'string' && event.reviewer) return event.reviewer;
    if (event.actor?.name) return event.actor.name;
    if (event.reviewer?.name) return event.reviewer.name;
    if (event.user?.name) return event.user.name;
    return 'Sistem';
  };

  const getActorRole = (event: TimelineEvent) => {
    const roleStr =
      event.actor?.role ||
      event.reviewer?.role ||
      event.user?.role ||
      '';
    return roleStr ? ` (${roleStr})` : '';
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-gray-50/50 py-3.5">
        <CardTitle className="text-base font-bold flex items-center justify-between text-gray-900">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Linimasa & Riwayat Proses
          </div>
          <Badge variant="outline" className="bg-white text-[11px] font-normal text-gray-600">
            {timeline.length} Aktivitas
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
          {timeline.map((event, idx) => {
            const config = getEventConfig(event);
            const actorName = getActorName(event);
            const actorRole = getActorRole(event);
            const timeStr = event.timestamp || event.created_at || event.date;

            const title =
              event.title ||
              event.type ||
              event.event ||
              (event.document_name ? `Dokumen ${event.document_name}` : 'Aktivitas Pengajuan');
            const description = event.description || event.notes || event.reason || '';

            return (
              <div key={event.id || idx} className="relative group">
                {/* Dot Icon */}
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white shadow-xs ${config.bg}`}
                >
                  {config.icon}
                </div>

                {/* Event Card Content */}
                <div className="bg-white border rounded-xl p-3 space-y-1.5 hover:border-indigo-200 transition-colors shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="font-bold text-xs text-gray-900 leading-snug">
                      {title}
                    </span>
                    <Badge className={`text-[10px] px-1.5 py-0 border ${config.badgeBg}`}>
                      {config.label}
                    </Badge>
                  </div>

                  {description && (
                    <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/80 p-2 rounded-lg border border-gray-100 font-medium">
                      {description}
                    </p>
                  )}

                  {event.reason && event.reason !== description && (
                    <p className="text-xs text-red-600 bg-red-50/80 p-1.5 rounded border border-red-100">
                      <strong>Alasan:</strong> {event.reason}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-100 mt-1">
                    <span className="flex items-center gap-1 font-medium text-gray-600">
                      <User className="w-3 h-3 text-gray-400" />
                      {actorName}
                      <span className="text-gray-400 font-normal">{actorRole}</span>
                    </span>
                    {timeStr && (
                      <span className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {formatDate(timeStr)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
