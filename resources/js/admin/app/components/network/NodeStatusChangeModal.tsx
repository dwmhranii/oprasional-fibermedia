import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Network,
  ShieldAlert,
  Loader2,
  Info,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

export interface NodeStatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: {
    id: number;
    type: 'olt' | 'odc' | 'odp' | 'cable';
    name?: string;
    code?: string;
    status: 'normal' | 'disrupted' | 'cut' | 'maintenance' | string;
  } | null;
  onSuccess?: () => void;
}

export const NodeStatusChangeModal: React.FC<NodeStatusChangeModalProps> = ({
  isOpen,
  onClose,
  node,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { isSuperadmin, can } = useAuth();
  const canManage = isSuperadmin || can('incidents.manage');

  const [targetStatus, setTargetStatus] = useState<string>('normal');
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (node) {
      setTargetStatus(node.status || 'normal');
      setReason('');
    }
  }, [node, isOpen]);

  const isDisruptionTarget = targetStatus === 'disrupted' || targetStatus === 'cut';
  const isCurrentlyDisrupted = node?.status === 'disrupted' || node?.status === 'cut';

  // Pratinjau dampak jika target status adalah gangguan atau putus
  const {
    data: previewData,
    isLoading: loadingPreview,
    isError: previewError,
  } = useQuery({
    queryKey: ['mass-outage-preview', node?.type, node?.id],
    queryFn: async () => {
      if (!node) return null;
      const res = await apiClient.get<any>('/network/mass-outage/preview', {
        params: { type: node.type, id: node.id },
      });
      return res?.data || null;
    },
    enabled: isOpen && Boolean(node) && isDisruptionTarget,
    staleTime: 10000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!node) return;
      const res = await apiClient.post<any>(`/network/${node.type}/${node.id}/status`, {
        status: targetStatus,
        reason: reason.trim() || undefined,
        source: 'manual',
      });
      return res?.data;
    },
    onSuccess: (data) => {
      toast.success(
        isDisruptionTarget
          ? `Gangguan massal berhasil dicatat. Tiket ${data?.incident?.complaint?.ticket_number || 'pengaduan'} diterbitkan!`
          : `Status simpul berhasil diperbarui ke ${targetStatus}.`
      );

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['network-map-geojson'] });
      queryClient.invalidateQueries({ queryKey: ['network-cables-undrawn'] });
      queryClient.invalidateQueries({ queryKey: ['active-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['odps'] });
      queryClient.invalidateQueries({ queryKey: ['odcs'] });
      queryClient.invalidateQueries({ queryKey: ['olts'] });
      queryClient.invalidateQueries({ queryKey: ['cables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Gagal memperbarui status simpul.';
      toast.error(msg);
    },
  });

  if (!node) return null;

  const nodeLabel = node.name || node.code || `#${node.id}`;
  const typeLabel =
    node.type === 'olt'
      ? 'OLT'
      : node.type === 'odc'
      ? 'ODC'
      : node.type === 'odp'
      ? 'ODP'
      : 'Kabel';

  const preview = previewData?.data || previewData;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase font-mono text-[10px]">
              {typeLabel}
            </Badge>
            <DialogTitle className="text-lg font-bold">
              Ubah Status Operasional: {nodeLabel}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Perubahan status simpul jaringan akan dicatat dalam riwayat audit log dan memicu alur
            penanganan gangguan massal jika diubah ke Gangguan atau Putus.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Status Saat Ini */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground">Status Operasional Saat Ini:</span>
            <Badge
              variant={
                node.status === 'normal'
                  ? 'success'
                  : node.status === 'disrupted'
                  ? 'warning'
                  : node.status === 'cut'
                  ? 'destructive'
                  : 'outline'
              }
            >
              {node.status === 'normal'
                ? 'Normal'
                : node.status === 'disrupted'
                ? 'Gangguan'
                : node.status === 'cut'
                ? 'Putus'
                : node.status}
            </Badge>
          </div>

          {/* Pemilihan Status Baru */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Pilih Status Operasional Baru:
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setTargetStatus('normal')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all ${
                  targetStatus === 'normal'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs">Normal</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetStatus('disrupted')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all ${
                  targetStatus === 'disrupted'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold'
                    : 'border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs">Gangguan</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetStatus('cut')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all ${
                  targetStatus === 'cut'
                    ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                    : 'border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-destructive" />
                <span className="text-xs">Putus</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetStatus('maintenance')}
                className={`p-3 rounded-lg border text-left flex flex-col items-start gap-1 transition-all ${
                  targetStatus === 'maintenance'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold'
                    : 'border-border hover:bg-muted/50 text-foreground'
                }`}
              >
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-xs">Pemeliharaan</span>
              </button>
            </div>
          </div>

          {/* Pratinjau Dampak Pelanggan (Jika Gangguan / Putus) */}
          {isDisruptionTarget && (
            <div className="space-y-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-foreground">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5 text-destructive">
                  <ShieldAlert className="w-4 h-4" />
                  Pratinjau Dampak Gangguan Massal
                </span>
                {loadingPreview && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              </div>

              {loadingPreview ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Menghitung topologi pelanggan terdampak...
                </div>
              ) : preview ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-card border border-border">
                      <div className="text-lg font-bold text-destructive">
                        {preview.affected_customers_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="w-3 h-3" /> Pelanggan Terdampak
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border">
                      <div className="text-lg font-bold text-foreground">
                        {preview.odps?.length ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Network className="w-3 h-3" /> ODP Terdampak
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-border">
                      <div className="text-lg font-bold text-muted-foreground">
                        {preview.isolated_customers_count ?? 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Layers className="w-3 h-3" /> Terisolir (Dikecualikan)
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sistem akan otomatis menerbitkan <strong>1 tiket gangguan massal</strong> dengan
                    koordinat geofence pada simpul {nodeLabel}, menghubungkan seluruh{' '}
                    <strong>{preview.affected_customers_count ?? 0}</strong> pelanggan ke tiket
                    tersebut, dan menugaskan tiket ke antrean teknisi lapangan.
                  </p>
                </div>
              ) : previewError ? (
                <p className="text-xs text-destructive">Gagal menghitung pratinjau dampak pelanggan.</p>
              ) : null}
            </div>
          )}

          {/* Pemulihan dari Gangguan ke Normal */}
          {targetStatus === 'normal' && isCurrentlyDisrupted && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-semibold">Menyelesaikan Gangguan Massal</p>
                <p className="text-[11px] mt-0.5 text-emerald-700 dark:text-emerald-400">
                  Mengembalikan status simpul ke Normal akan otomatis menyelesaikan tiket gangguan
                  massal yang terbuka dan memulihkan status seluruh pelanggan terdampak ke kondisi
                  pulih.
                </p>
              </div>
            </div>
          )}

          {/* Peringatan Izin (Superadmin vs Admin) */}
          {!canManage && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Akses Terbatas</p>
                <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-400">
                  Hanya Superadmin yang memiliki hak akses untuk mengubah status gangguan massal
                  atau menerbitkan tiket gangguan massal baru.
                </p>
              </div>
            </div>
          )}

          {/* Keterangan / Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Keterangan / Rincian Penyebab:{' '}
              {isDisruptionTarget && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isDisruptionTarget
                  ? 'Contoh: Kabel FO tertabrak truk, konektor ODP pecah akibat angin kencang...'
                  : 'Catatan tambahan terkait perubahan status operasional ini...'
              }
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={updateStatusMutation.isPending}>
            Batal
          </Button>
          <Button
            type="button"
            variant={isDisruptionTarget ? 'destructive' : 'default'}
            size="sm"
            onClick={() => updateStatusMutation.mutate()}
            disabled={
              !canManage ||
              updateStatusMutation.isPending ||
              targetStatus === node.status ||
              (isDisruptionTarget && !reason.trim())
            }
          >
            {updateStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {isDisruptionTarget ? 'Terapkan & Buat Tiket Massal' : 'Simpan Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
