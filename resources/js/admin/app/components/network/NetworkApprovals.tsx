import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { PageHeader } from '@shared/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckSquare, Network, Cable, MapPin, Clock, AlertCircle } from 'lucide-react';
import { EmptyState } from '@shared/ui/EmptyState';
import { formatCoordinate } from '@shared/lib/formatters';

export const NetworkApprovals: React.FC = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['networkApprovals'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/network/approvals');
      return res?.data ?? res;
    },
  });

  const pendingOdps = data?.pending_odps ?? [];
  const pendingCables = data?.pending_cable_tracks ?? [];
  const totalPending = pendingOdps.length + pendingCables.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Persetujuan Perubahan Jaringan"
        subtitle="Verifikasi dan tinjau usulan perubahan titik ODP dan jalur kabel dari teknisi lapangan"
        action={
          <Badge variant={totalPending > 0 ? 'warning' : 'outline'} className="text-sm px-3 py-1">
            {totalPending} Menunggu Persetujuan
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usulan Titik ODP */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-semibold">Usulan Titik ODP</CardTitle>
            </div>
            <Badge variant="secondary">{pendingOdps.length}</Badge>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat data usulan ODP...</div>
            ) : pendingOdps.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Tidak Ada Usulan ODP"
                description="Semua titik ODP telah disetujui atau tidak ada usulan pergeseran koordinat."
              />
            ) : (
              pendingOdps.map((odp: any) => (
                <div key={odp.id} className="p-3.5 rounded-lg border border-border bg-card/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{odp.name || odp.code}</span>
                    <Badge variant={odp.is_approved ? 'info' : 'warning'}>
                      {odp.is_approved ? 'Geser Titik' : 'ODP Baru'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      {odp.proposed_latitude && odp.proposed_longitude
                        ? `Usulan: ${formatCoordinate(odp.proposed_latitude)}, ${formatCoordinate(odp.proposed_longitude)}`
                        : `Titik: ${formatCoordinate(odp.latitude)}, ${formatCoordinate(odp.longitude)}`}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ODC Induk: <span className="font-medium text-foreground">{odp.odc?.name || '-'}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Usulan Jalur Kabel */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center space-x-2">
              <Cable className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-semibold">Usulan Jalur Kabel</CardTitle>
            </div>
            <Badge variant="secondary">{pendingCables.length}</Badge>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat data usulan kabel...</div>
            ) : pendingCables.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Tidak Ada Usulan Kabel"
                description="Tidak ada usulan jalur kabel baru atau rekonsiliasi yang menunggu persetujuan."
              />
            ) : (
              pendingCables.map((cable: any) => (
                <div key={cable.id} className="p-3.5 rounded-lg border border-border bg-card/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{cable.name || `Kabel #${cable.id}`}</span>
                    <Badge variant="warning">Usulan Baru</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tipe: <span className="font-medium text-foreground">{cable.cable_type || 'Distribusi'}</span> • Panjang: <span className="font-medium text-foreground">{cable.length_meters ? `${cable.length_meters}m` : '-'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Dibuat oleh: {cable.creator?.name || 'Teknisi'}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NetworkApprovals;
