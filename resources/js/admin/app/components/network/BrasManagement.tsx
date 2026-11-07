import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Server,
  Plus,
  RefreshCw,
  Cpu,
  HardDrive,
  Clock,
  Users,
  Activity,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import type { BrasDevice } from '../../../shared/types/api.generated';

export const BrasManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BrasDevice | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ id: number; message: string; isError?: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    api_port: 8728,
    username: 'admin',
    password: '',
    location: '',
    notes: '',
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: devicesResponse, isLoading, refetch } = useQuery({
    queryKey: ['bras-devices'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/network/bras-devices');
      return res?.data || (Array.isArray(res) ? res : []);
    },
  });
  const devices: BrasDevice[] = devicesResponse || [];

  const openCreateModal = () => {
    setEditingDevice(null);
    setFormData({
      name: '',
      ip_address: '',
      api_port: 8728,
      username: 'admin',
      password: '',
      location: '',
      notes: '',
      is_active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (device: BrasDevice) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      ip_address: device.ip_address,
      api_port: device.api_port || 8728,
      username: device.username || 'admin',
      password: '', // Blank unless updating
      location: device.location || '',
      notes: device.notes || '',
      is_active: Boolean(device.is_active),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const payload: any = {
        name: formData.name,
        ip_address: formData.ip_address,
        api_port: parseInt(String(formData.api_port), 10) || 8728,
        username: formData.username || null,
        location: formData.location || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      if (editingDevice) {
        return await apiClient.put(`/network/bras-devices/${editingDevice.id}`, payload);
      } else {
        return await apiClient.post('/network/bras-devices', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bras-devices'] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan perangkat BRAS.';
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/network/bras-devices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bras-devices'] });
    },
  });

  const handleSync = async (device: BrasDevice) => {
    setSyncingId(device.id);
    setSyncFeedback(null);
    try {
      const res = await apiClient.post<any>(`/network/bras-devices/${device.id}/sync`);
      setSyncFeedback({
        id: device.id,
        message: res?.message || 'Sinkronisasi berhasil.',
      });
      queryClient.invalidateQueries({ queryKey: ['bras-devices'] });
    } catch (err: any) {
      setSyncFeedback({
        id: device.id,
        message: err?.response?.data?.message || err?.message || 'Gagal sinkronisasi BRAS.',
        isError: true,
      });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Server className="w-7 h-7 text-indigo-600" />
            Manajemen Router BRAS (Broadband Remote Access Server)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Integrasi Router MikroTik via API Port, sinkronisasi sesi PPPoE aktif berkala, dan pemantauan beban server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Router BRAS
          </Button>
        </div>
      </div>

      {/* Grid BRAS Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => {
          const isSyncing = syncingId === device.id;
          const feedback = syncFeedback?.id === device.id ? syncFeedback : null;
          const isActive = device.is_active;

          return (
            <Card
              key={device.id}
              className={`border transition-all hover:shadow-md ${
                !isActive
                  ? 'border-slate-200 dark:border-slate-800 opacity-75'
                  : device.last_error
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                      {device.ip_address}:{device.api_port}
                    </span>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1.5">
                      {device.name}
                    </CardTitle>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      !isActive
                        ? 'bg-slate-100 text-slate-600'
                        : device.last_error
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }
                  >
                    {!isActive ? 'NONAKTIF' : device.last_error ? 'PERINGATAN' : 'ONLINE'}
                  </Badge>
                </div>

                {device.location && (
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Lokasi: {device.location}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3.5 text-xs">
                {/* Telemetry Stats */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Sesi PPPoE</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {device.total_active_sessions ?? 0} Sesi
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Beban CPU</span>
                      <strong className="text-slate-900 dark:text-slate-100 text-sm">
                        {device.cpu_load !== null && device.cpu_load !== undefined
                          ? `${device.cpu_load}%`
                          : '-'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Free RAM</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {device.free_memory ? `${Math.round(device.free_memory / 1024 / 1024)} MB` : '-'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-500 block">Uptime</span>
                      <strong className="text-slate-900 dark:text-slate-100 truncate">
                        {device.uptime || '-'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Last Sync Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Sinkronisasi Terakhir:</span>
                  <span className="font-mono">
                    {device.last_sync_at ? new Date(device.last_sync_at).toLocaleTimeString('id-ID') : 'Belum pernah'}
                  </span>
                </div>

                {device.last_error && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                    {device.last_error}
                  </p>
                )}

                {feedback && (
                  <div
                    className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                      feedback.isError
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {feedback.isError ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSync(device)}
                    disabled={isSyncing}
                    className="h-7 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Sesi'}
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(device)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Hapus konfigurasi BRAS ${device.name}?`)) {
                          deleteMutation.mutate(device.id);
                        }
                      }}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {devices.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            <Server className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base">Belum ada Router BRAS</p>
            <p className="text-xs mt-1">Tambahkan router MikroTik BRAS pertama Anda menggunakan tombol di atas.</p>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Ubah BRAS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                {editingDevice ? `Ubah Konfigurasi BRAS: ${editingDevice.name}` : 'Tambah Router BRAS Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="p-5 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Perangkat BRAS *
                </label>
                <input
                  type="text"
                  required
                  placeholder="BRAS-CORE-CCR2004"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat IP Router *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="10.20.0.1"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    API Port *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.api_port}
                    onChange={(e) => setFormData({ ...formData, api_port: parseInt(e.target.value, 10) || 8728 })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    API Username
                  </label>
                  <input
                    type="text"
                    placeholder="api_fibermedia"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    API Password {editingDevice && '(Kosongkan jika tidak berubah)'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lokasi Server
                </label>
                <input
                  type="text"
                  placeholder="Data Center Gedung Cyber Lt. 2 / POP Sawojajar"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan interface, routing, atau backup..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="bras_is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="bras_is_active" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Aktifkan perangkat ini untuk sinkronisasi otomatis
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : editingDevice ? 'Simpan Perubahan' : 'Buat BRAS'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
