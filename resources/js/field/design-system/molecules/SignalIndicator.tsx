import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '../atoms/Badge';

export interface SignalIndicatorProps {
  dbm: number | null;
  showRangeGuide?: boolean;
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({
  dbm,
  showRangeGuide = true,
}) => {
  const isValid = dbm !== null && !Number.isNaN(dbm);

  let state: 'unmeasured' | 'good' | 'warning' | 'los' = 'unmeasured';
  if (isValid) {
    if (dbm >= -24 && dbm <= -8) state = 'good';
    else if (dbm >= -27 && dbm < -24) state = 'warning';
    else state = 'los';
  }

  return (
    <div className="rounded-token-md bg-surface-muted border border-edge-subtle p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-content-primary">
          <Activity className="w-4 h-4 text-brand-accent shrink-0" />
          <span>Redaman Optik OPM</span>
        </div>
        {state === 'unmeasured' && <Badge tone="paused">Belum Diukur</Badge>}
        {state === 'good' && (
          <Badge tone="safe" icon={<CheckCircle2 className="w-3.5 h-3.5" />} mono>
            {dbm} dBm · Normal
          </Badge>
        )}
        {state === 'warning' && (
          <Badge tone="warning" icon={<AlertTriangle className="w-3.5 h-3.5" />} mono>
            {dbm} dBm · Batas Wajar
          </Badge>
        )}
        {state === 'los' && (
          <Badge tone="danger" icon={<XCircle className="w-3.5 h-3.5" />} mono>
            {dbm} dBm · Kritis (LOS)
          </Badge>
        )}
      </div>

      {showRangeGuide && (
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs pt-1">
          <div
            className={`p-1.5 rounded-token-sm border ${
              state === 'good'
                ? 'bg-status-safe-bg text-status-safe-fg border-status-safe-border font-bold'
                : 'bg-surface-card text-content-muted border-edge-subtle'
            }`}
          >
            -8 s/d -24 dBm
            <span className="block font-sans text-xs">Normal</span>
          </div>
          <div
            className={`p-1.5 rounded-token-sm border ${
              state === 'warning'
                ? 'bg-status-warning-bg text-status-warning-fg border-status-warning-border font-bold'
                : 'bg-surface-card text-content-muted border-edge-subtle'
            }`}
          >
            -24 s/d -27 dBm
            <span className="block font-sans text-xs">Waspada</span>
          </div>
          <div
            className={`p-1.5 rounded-token-sm border ${
              state === 'los'
                ? 'bg-status-danger-bg text-status-danger-fg border-status-danger-border font-bold'
                : 'bg-surface-card text-content-muted border-edge-subtle'
            }`}
          >
            &lt; -27 dBm
            <span className="block font-sans text-xs">LOS Merah</span>
          </div>
        </div>
      )}
    </div>
  );
};
