import React from 'react';
import { Badge, Button, IconButton, ComponentDensity } from '../atoms';
import { RefreshCw, Trash2, Clock, AlertCircle, CheckCircle2, UploadCloud } from 'lucide-react';
import { EmptyState } from '../molecules';

export interface OutboxItem {
  id: string | number;
  actionType: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  errorDetails?: string;
}

export interface OutboxListProps {
  items: OutboxItem[];
  onRetryItem: (id: string | number) => void;
  onDeleteItem: (id: string | number) => void;
  onRetryAll?: () => void;
  isSyncingAll?: boolean;
  density?: ComponentDensity;
  className?: string;
}

export const OutboxList: React.FC<OutboxListProps> = ({
  items,
  onRetryItem,
  onDeleteItem,
  onRetryAll,
  isSyncingAll = false,
  density = 'comfortable',
  className = '',
}) => {
  if (items.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <EmptyState
          title="Outbox Kosong"
          description="Seluruh data telah tersinkronisasi dengan server Fibermedia."
          icon={CheckCircle2}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {items.length} Data Menunggu Sinkronisasi
          </span>
        </div>

        {onRetryAll && (
          <Button
            variant="outline"
            size="sm"
            density="compact"
            isLoading={isSyncingAll}
            onClick={onRetryAll}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sinkronkan Semua
          </Button>
        )}
      </div>

      {/* Item cards */}
      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-xs space-y-2 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">
                    {item.actionType}
                  </span>
                  <Badge
                    tone={
                      item.status === 'syncing'
                        ? 'info'
                        : item.status === 'failed'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                    dot={item.status === 'syncing'}
                  >
                    {item.status === 'syncing'
                      ? 'Sinkronisasi...'
                      : item.status === 'failed'
                      ? 'Gagal'
                      : 'Menunggu'}
                  </Badge>
                </div>
                <p className="text-xs text-foreground font-medium truncate">
                  {item.description}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{item.createdAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <IconButton
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  ariaLabel="Kirim ulang item"
                  variant="ghost"
                  size="sm"
                  density={density}
                  onClick={() => onRetryItem(item.id)}
                />
                <IconButton
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                  ariaLabel="Hapus item outbox"
                  variant="ghost"
                  size="sm"
                  density={density}
                  onClick={() => onDeleteItem(item.id)}
                />
              </div>
            </div>

            {item.status === 'failed' && item.errorDetails && (
              <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.errorDetails}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

