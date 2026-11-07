import React from 'react';
import { Badge, Button, IconButton } from '../atoms';
import { SignalIndicator } from '../molecules';
import { X, MapPin, Radio, Users, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatCoordinate } from '../../lib/formatters';

export interface OdpPort {
  portNumber: number;
  isUsed: boolean;
  customerName?: string;
  customerId?: string;
  onuSerial?: string;
  opticalDbm?: number;
}

export interface OdpDetailPanelProps {
  odpCode: string;
  odcCode?: string;
  latitude: number;
  longitude: number;
  totalPorts: number;
  usedPorts: number;
  status: 'normal' | 'full' | 'maintenance';
  ports: OdpPort[];
  onClose: () => void;
  onDispatchToOdp?: (odpCode: string) => void;
  className?: string;
}

export const OdpDetailPanel: React.FC<OdpDetailPanelProps> = ({
  odpCode,
  odcCode = 'ODC-KPN-01',
  latitude,
  longitude,
  totalPorts,
  usedPorts,
  status,
  ports,
  onClose,
  onDispatchToOdp,
  className = '',
}) => {
  const availablePorts = totalPorts - usedPorts;
  const percentage = Math.round((usedPorts / totalPorts) * 100);

  const statusTone =
    status === 'normal' ? 'success' : status === 'full' ? 'warning' : 'danger';
  const statusLabel =
    status === 'normal' ? 'Tersedia' : status === 'full' ? 'Penuh' : 'Pemeliharaan';

  return (
    <div
      className={`flex flex-col h-full rounded-2xl border border-border bg-card shadow-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-foreground">{odpCode}</span>
            <Badge tone={statusTone} size="sm">
              {statusLabel}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span>Induk ODC: </span>
            <span className="font-mono font-medium text-foreground">{odcCode}</span>
          </div>
        </div>

        <IconButton
          icon={<X className="w-4 h-4" />}
          ariaLabel="Tutup panel ODP"
          variant="ghost"
          size="sm"
          density="compact"
          onClick={onClose}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Coordinates */}
        <div className="p-3 rounded-xl bg-muted/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span>Koordinat:</span>
          </div>
          <span className="font-mono font-medium text-foreground">
            {formatCoordinate(latitude, longitude)}
          </span>
        </div>

        {/* Capacity Meter */}
        <div className="p-4 rounded-xl border border-border space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground">Kapasitas Port ODP</span>
            <span className="font-mono font-bold text-foreground">
              {usedPorts} / {totalPorts} Port ({percentage}%)
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 90 ? 'bg-rose-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
            <span>Terpakai: {usedPorts}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Tersedia: {availablePorts} Port
            </span>
          </div>
        </div>

        {/* Connected Ports List */}
        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Daftar Pelanggan Terhubung</span>
          </h5>

          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {ports.map((port) => (
              <div
                key={port.portNumber}
                className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[11px] font-bold shrink-0 ${
                      port.isUsed
                        ? 'bg-primary/10 text-primary'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    P{port.portNumber}
                  </div>
                  <div className="min-w-0">
                    {port.isUsed ? (
                      <>
                        <p className="font-medium text-foreground truncate">
                          {port.customerName}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground truncate">
                          {port.customerId} • {port.onuSerial}
                        </p>
                      </>
                    ) : (
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Port Kosong
                      </p>
                    )}
                  </div>
                </div>

                {port.isUsed && port.opticalDbm !== undefined && (
                  <SignalIndicator dbm={port.opticalDbm} showText={false} size="sm" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      {onDispatchToOdp && (
        <div className="p-4 border-t border-border bg-muted/20">
          <Button
            variant="primary"
            size="md"
            density="compact"
            className="w-full"
            onClick={() => onDispatchToOdp(odpCode)}
            rightIcon={<ExternalLink className="w-4 h-4" />}
          >
            Tugaskan Teknisi ke ODP Ini
          </Button>
        </div>
      )}
    </div>
  );
};

