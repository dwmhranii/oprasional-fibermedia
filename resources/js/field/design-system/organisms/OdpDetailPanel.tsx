import React from 'react';
import { Server, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '../atoms/Badge';

export interface OdpDetailPanelProps {
  odpCode: string;
  odpName?: string;
  address?: string;
  activePort?: number;
  capacity?: number;
  distanceMeters?: number;
  geofenceStatus?: 'inside' | 'outside' | 'low_accuracy';
}

export const OdpDetailPanel: React.FC<OdpDetailPanelProps> = ({
  odpCode,
  odpName = 'Optical Distribution Point',
  address,
  activePort = 3,
  capacity = 8,
  distanceMeters = 12,
  geofenceStatus = 'inside',
}) => {
  return (
    <div className="rounded-token-lg bg-surface-card border border-edge-subtle p-4 shadow-token-card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-edge-subtle">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-brand-accent shrink-0" />
          <div>
            <h3 className="text-xs font-extrabold text-content-primary font-mono">
              {odpCode}
            </h3>
            <p className="text-xs text-content-muted">{odpName}</p>
          </div>
        </div>

        <Badge
          tone={geofenceStatus === 'inside' ? 'safe' : 'danger'}
          icon={
            geofenceStatus === 'inside' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )
          }
          mono
        >
          {distanceMeters}m · {geofenceStatus === 'inside' ? 'Dalam Radius 50m' : 'Luar Radius'}
        </Badge>
      </div>

      {address && (
        <p className="text-xs text-content-secondary flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-content-muted shrink-0" />
          <span>{address}</span>
        </p>
      )}

      {/* Visual Port Capacity Matrix */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-content-secondary">
            Matriks Port Optik ({capacity} Port)
          </span>
          <span className="font-mono font-bold text-brand-accent">
            Port Aktif: #{activePort}
          </span>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: capacity }).map((_, i) => {
            const portNum = i + 1;
            const isTarget = portNum === activePort;
            const isUsed = portNum < activePort;
            return (
              <div
                key={portNum}
                className={`py-1.5 rounded-token-sm border text-center font-mono text-xs font-bold tabular-nums ${
                  isTarget
                    ? 'bg-brand-primary text-brand-on-primary border-edge-focus shadow-token-glow'
                    : isUsed
                    ? 'bg-status-safe-bg text-status-safe-fg border-status-safe-border'
                    : 'bg-surface-muted text-content-muted border-edge-subtle'
                }`}
              >
                P{portNum}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
