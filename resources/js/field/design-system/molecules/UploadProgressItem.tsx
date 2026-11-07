import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';

export interface UploadProgressItemProps {
  title: string;
  subtitle?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  timestamp: string;
  errorReason?: string;
  onRetry?: () => void;
}

export const UploadProgressItem: React.FC<UploadProgressItemProps> = ({
  title,
  subtitle,
  status,
  timestamp,
  errorReason,
  onRetry,
}) => {
  return (
    <div className="rounded-token-md bg-surface-muted border border-edge-subtle p-3 space-y-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-content-primary">{title}</p>
          {subtitle && <p className="text-content-secondary mt-0.5">{subtitle}</p>}
          <p className="font-mono text-content-muted mt-0.5 tabular-nums">
            {new Date(timestamp).toLocaleTimeString('id-ID')} WIB
          </p>
        </div>

        <div className="shrink-0">
          {status === 'pending' && (
            <Badge tone="warning" icon={<Clock className="w-3.5 h-3.5" />}>
              Menunggu Sinyal
            </Badge>
          )}
          {status === 'syncing' && (
            <Badge tone="info" icon={<Spinner size="sm" />}>
              Mengunggah...
            </Badge>
          )}
          {status === 'synced' && (
            <Badge tone="safe" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
              Terkirim
            </Badge>
          )}
          {status === 'failed' && (
            <Badge tone="danger" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
              Gagal Kirim
            </Badge>
          )}
        </div>
      </div>

      {errorReason && (
        <div role="alert" className="p-2 rounded-token-sm bg-status-danger-bg text-status-danger-fg border border-status-danger-border">
          {errorReason}
        </div>
      )}

      {status === 'failed' && onRetry && (
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={onRetry}
          fullWidth
        >
          Coba Unggah Ulang
        </Button>
      )}
    </div>
  );
};
