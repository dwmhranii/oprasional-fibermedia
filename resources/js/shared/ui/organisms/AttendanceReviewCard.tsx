import React, { useState } from 'react';
import { Avatar, Badge, Button, ComponentDensity } from '../atoms';
import { MapPin, Clock, ShieldCheck, AlertTriangle, Check, X, Eye } from 'lucide-react';
import { ACTIONS } from '../../i18n/id';

export interface AttendanceReviewCardProps {
  id: number | string;
  userName: string;
  userRole: string;
  avatarUrl?: string;
  workDate: string;
  clockInTime: string;
  distanceMeters: number;
  isInsideRadius: boolean;
  gpsAccuracyMeters?: number;
  photoUrl?: string;
  density?: ComponentDensity;
  onApprove: (id: number | string) => void;
  onReject: (id: number | string) => void;
  isLoading?: boolean;
  className?: string;
}

export const AttendanceReviewCard: React.FC<AttendanceReviewCardProps> = ({
  id,
  userName,
  userRole,
  avatarUrl,
  workDate,
  clockInTime,
  distanceMeters,
  isInsideRadius,
  gpsAccuracyMeters,
  photoUrl,
  density = 'comfortable',
  onApprove,
  onReject,
  isLoading = false,
  className = '',
}) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const formatDist = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4 transition-all ${className}`}
    >
      {/* Header: User & Geofence Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} name={userName} size="md" status="online" />
          <div>
            <h4 className="text-sm font-semibold text-foreground tracking-tight">{userName}</h4>
            <p className="text-xs text-muted-foreground">{userRole}</p>
          </div>
        </div>

        <Badge
          tone={isInsideRadius ? 'success' : 'danger'}
          size="sm"
          icon={isInsideRadius ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
        >
          {isInsideRadius ? 'Di dalam radius' : 'Di luar radius'}
        </Badge>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Waktu Absen:</span>
          </span>
          <p className="font-mono font-semibold text-foreground">{clockInTime}</p>
          <p className="text-[11px] text-muted-foreground">{workDate}</p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Jarak Kantor:</span>
          </span>
          <p className="font-mono font-semibold text-foreground">
            {formatDist(distanceMeters)}
          </p>
          {gpsAccuracyMeters && (
            <p className="text-[11px] text-muted-foreground">
              Akurasi GPS: ±{Math.round(gpsAccuracyMeters)} m
            </p>
          )}
        </div>
      </div>

      {/* Selfie Photo Preview */}
      {photoUrl && (
        <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 aspect-4/3 max-h-48 group">
          <img
            src={photoUrl}
            alt={`Foto selfie ${userName}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPhotoModal(true)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium gap-1.5 transition-opacity"
          >
            <Eye className="w-4 h-4" />
            <span>Perbesar Foto</span>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          density={density}
          disabled={isLoading}
          onClick={() => onReject(id)}
          leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
        >
          {ACTIONS.reject}
        </Button>
        <Button
          variant="primary"
          size="sm"
          density={density}
          isLoading={isLoading}
          onClick={() => onApprove(id)}
          leftIcon={<Check className="w-3.5 h-3.5" />}
        >
          {ACTIONS.approve}
        </Button>
      </div>

      {/* Modal Zoom Photo */}
      {showPhotoModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-lg w-full rounded-2xl overflow-hidden bg-card border border-border p-2">
            <img
              src={photoUrl}
              alt={`Foto selfie ${userName}`}
              className="w-full h-auto rounded-xl object-contain max-h-[80vh]"
            />
            <div className="p-3 flex justify-between items-center text-xs">
              <span className="font-medium text-foreground">{userName} - {clockInTime}</span>
              <Button
                variant="secondary"
                size="sm"
                density="compact"
                onClick={() => setShowPhotoModal(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

