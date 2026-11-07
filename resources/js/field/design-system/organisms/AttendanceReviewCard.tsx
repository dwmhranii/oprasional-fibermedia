import React from 'react';
import { DailyAttendance } from '../../types';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { CheckCircle2, Clock, Wifi, MapPin, AlertTriangle } from 'lucide-react';

export interface AttendanceReviewCardProps {
  attendance: DailyAttendance;
  userName: string;
  userAvatar?: string;
  isToday?: boolean;
}

export const AttendanceReviewCard: React.FC<AttendanceReviewCardProps> = ({
  attendance,
  userName,
  userAvatar,
  isToday = false,
}) => {
  const formattedDate = new Date(`${attendance.work_date}T00:00:00`).toLocaleDateString(
    'id-ID',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );

  const checkInTime = attendance.check_in_at
    ? new Date(attendance.check_in_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

  const checkOutTime = attendance.check_out_at
    ? new Date(attendance.check_out_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const isFieldChannel =
    attendance.attendance_channel === 'field' || attendance.status === 'field_checkin';

  return (
    <div className="rounded-token-md bg-surface-muted border border-edge-subtle p-3 flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar src={userAvatar} name={userName} size="sm" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-content-primary truncate">{formattedDate}</span>
            {isToday && <Badge tone="safe">Hari Ini</Badge>}
            <Badge
              tone={isFieldChannel ? 'info' : 'brand'}
              icon={
                isFieldChannel ? (
                  <MapPin className="w-3 h-3" />
                ) : (
                  <Wifi className="w-3 h-3" />
                )
              }
            >
              {isFieldChannel ? 'Jalur Lapangan' : 'Jalur Kantor'}
            </Badge>
            {attendance.is_manual && (
              <Badge tone="warning" icon={<AlertTriangle className="w-3 h-3" />}>
                Manual
              </Badge>
            )}
          </div>
          <p className="text-content-muted font-mono tabular-nums mt-1 truncate">
            {isFieldChannel
              ? 'Swafoto Lapangan Terverifikasi'
              : `${attendance.office_distance_meters || 10}m dari kantor`}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 space-y-1">
        <div className="font-mono font-bold tabular-nums text-content-primary">
          <span className="text-status-safe-fg">{checkInTime}</span>
          <span className="text-content-muted"> — </span>
          <span>{checkOutTime || 'Aktif'}</span>
        </div>
        <div>
          {attendance.needs_admin_review ? (
            <Badge tone="warning" icon={<AlertTriangle className="w-3 h-3" />}>
              Perlu Ditinjau
            </Badge>
          ) : checkOutTime ? (
            <Badge tone="safe" icon={<CheckCircle2 className="w-3 h-3" />}>
              Selesai
            </Badge>
          ) : (
            <Badge tone="info" icon={<Clock className="w-3 h-3" />}>
              Aktif
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
