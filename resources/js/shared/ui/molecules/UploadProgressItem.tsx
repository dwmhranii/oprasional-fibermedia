import React from 'react';
import { CheckCircle2, AlertCircle, X, RotateCcw, FileText } from 'lucide-react';
import { IconButton } from '../atoms';

export interface UploadProgressItemProps {
  fileName: string;
  fileSize?: string;
  progress: number; // 0 to 100
  status: 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const UploadProgressItem: React.FC<UploadProgressItemProps> = ({
  fileName,
  fileSize,
  progress,
  status,
  errorMessage,
  onRetry,
  onCancel,
  className = '',
}) => {
  return (
    <div
      className={`rounded-lg border border-border bg-card p-3 shadow-xs space-y-2 transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
            {fileSize && <p className="text-[11px] text-muted-foreground">{fileSize}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {status === 'completed' && (
            <span className="text-emerald-500 flex items-center gap-1 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Selesai</span>
            </span>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-1 text-rose-500">
              <AlertCircle className="w-4 h-4" />
              {onRetry && (
                <IconButton
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  ariaLabel="Unggah ulang"
                  variant="ghost"
                  size="sm"
                  density="compact"
                  onClick={onRetry}
                />
              )}
            </div>
          )}

          {status === 'uploading' && onCancel && (
            <IconButton
              icon={<X className="w-3.5 h-3.5" />}
              ariaLabel="Batalkan unggahan"
              variant="ghost"
              size="sm"
              density="compact"
              onClick={onCancel}
            />
          )}
        </div>
      </div>

      {status === 'uploading' && (
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>Mengunggah...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className="text-[11px] text-rose-500 font-medium">{errorMessage}</p>
      )}
    </div>
  );
};

