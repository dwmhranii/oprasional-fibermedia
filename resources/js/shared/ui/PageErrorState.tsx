import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@admin/app/components/ui/button';

interface PageErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const PageErrorState: React.FC<PageErrorStateProps> = ({
  title = 'Gagal Memuat Halaman',
  message = 'Terjadi kesalahan saat mengambil data dari peladen. Silakan coba beberapa saat lagi.',
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="p-8 my-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center space-y-4 max-w-lg mx-auto"
    >
      <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-destructive/30 hover:bg-destructive/10 text-destructive font-medium gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default PageErrorState;
