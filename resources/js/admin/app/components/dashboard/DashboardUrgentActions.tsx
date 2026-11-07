import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { EmptyState } from '@shared/ui';
import { ACTIONS } from '@shared/i18n/id';
import { formatTime } from '@shared/lib/formatters';
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/button';
import type { PerluTindakanItem } from '../../types/dashboard';

interface DashboardUrgentActionsProps {
  items?: PerluTindakanItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export const DashboardUrgentActions: React.FC<DashboardUrgentActionsProps> = ({
  items = [],
  isLoading = false,
  isError = false,
  onRetry,
}) => {
  const navigate = useNavigate();

  const getUrgencyBadge = (urgency: 'critical' | 'high' | 'medium') => {
    switch (urgency) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            <span>Kritis</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            <span>Tinggi</span>
          </span>
        );
      case 'medium':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            <Clock className="w-3 h-3" />
            <span>Sedang</span>
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-xl border border-border p-5 shadow-xs"
    >
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Perlu Tindakan Sekarang</h2>
            <p className="text-xs text-muted-foreground">
              Daftar antrean paling mendesak yang membutuhkan intervensi admin saat ini
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/dispatch')}
          className="text-xs text-primary hover:text-primary/80 gap-1 h-8"
        >
          <span>Lihat Semua</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-12 bg-muted/20 animate-pulse rounded-lg border border-border" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-destructive font-medium">Gagal memuat daftar tindakan mendesak.</p>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
                {ACTIONS.retry}
              </Button>
            )}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada yang perlu ditindak"
              description="Semua tiket dan antrean operasional saat ini berjalan lancar dan tertangani."
            />
          </motion.div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground bg-muted/40 border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Tingkat</th>
                  <th className="py-2.5 px-3 font-semibold">Kategori</th>
                  <th className="py-2.5 px-3 font-semibold">Deskripsi / Judul</th>
                  <th className="py-2.5 px-3 font-semibold">Alasan Mendesak</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    className={`hover:bg-muted/30 transition-colors ${
                      item.urgency === 'critical' ? 'bg-rose-500/[0.02]' : ''
                    }`}
                  >
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getUrgencyBadge(item.urgency)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded">
                        {item.type_label}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-foreground text-sm truncate max-w-xs md:max-w-md">
                        {item.title}
                      </div>
                      {item.created_at && (
                        <div className="text-xs text-muted-foreground">
                          Masuk: {formatTime(item.created_at)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {item.urgent_reason}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant={item.urgency === 'critical' ? 'default' : 'outline'}
                        onClick={() => navigate(item.action_url)}
                        className={`text-xs h-8 px-3 gap-1.5 ${
                          item.urgency === 'critical'
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                            : 'border-border'
                        }`}
                      >
                        <span>{item.action_label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};
