import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Smartphone,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  User,
} from 'lucide-react';
import type { Device } from '../../../shared/types/api.generated';

export const DeviceManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'revoked'>('all');
  const [page, setPage] = useState(1);

  const { data: devicesResponse, isLoading, refetch } = useQuery({
    queryKey: ['admin-devices', page, search, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get<any>('/devices', {
        params: {
          page,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });
      return res;
    },
  });

  const devices: Device[] = devicesResponse?.data || [];
  const meta = devicesResponse?.meta;

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.put(`/devices/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devices'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.put(`/devices/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-devices'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Smartphone className="w-7 h-7 text-indigo-600" />
            Manajemen Perangkat HP & PWA
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Persetujuan perangkat terdaftar untuk absensi dan tiket lapangan, penguncian UUID, dan pencabutan akses.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Muat Ulang
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama teknisi, label perangkat, atau UUID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="pending">Menunggu Persetujuan</option>
              <option value="revoked">Dicabut / Diblokir</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
          const isApproved = device.status === 'approved';
          const isPending = device.status === 'pending';
          const isRevoked = device.status === 'revoked';

          return (
            <Card
              key={device.id}
              className={`border transition-all hover:shadow-md ${
                isRevoked
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                  : isPending
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
                      {device.platform || 'Android / PWA'}
                    </span>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {device.label || 'Mobile Device'}
                    </CardTitle>
                    {device.model && (
                      <p className="text-xs text-slate-500">{device.model}</p>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      isRevoked
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : isPending
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }
                  >
                    {isRevoked ? 'DIBLOKIR' : isPending ? 'MENUNGGU' : 'DISETUJUI'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3 text-xs">
                {/* User & Team */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{device.user?.name || 'User Tidak Dikenal'}</span>
                  </div>
                  {device.user?.team && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      Tim: <strong className="text-indigo-600">{device.user.team}</strong>
                    </p>
                  )}
                </div>

                {/* UUID */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">DEVICE UUID</span>
                  <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate" title={device.device_uuid}>
                    {device.device_uuid}
                  </p>
                </div>

                {/* Audit Timestamps */}
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span>Terakhir Aktif:</span>
                    <span className="font-mono">
                      {device.last_seen_at ? new Date(device.last_seen_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                  {device.approved_at && (
                    <div className="flex items-center justify-between">
                      <span>Disetujui Pada:</span>
                      <span className="font-mono text-emerald-600">
                        {new Date(device.approved_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  {isRevoked || isPending ? (
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(device.id)}
                      disabled={approveMutation.isPending}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Setujui Akses
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Cabut dan blokir akses perangkat ${device.label}?`)) {
                          revokeMutation.mutate(device.id);
                        }
                      }}
                      disabled={revokeMutation.isPending}
                      className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Cabut Akses
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {devices.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            <Smartphone className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base">Belum ada perangkat terdaftar</p>
            <p className="text-xs mt-1">Perangkat akan otomatis muncul di sini saat staf membuka aplikasi PWA di HP.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Menampilkan halaman {meta.current_page} dari {meta.last_page} ({meta.total} total)</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
