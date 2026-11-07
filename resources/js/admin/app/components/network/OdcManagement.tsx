import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Boxes,
  Plus,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  X,
  MapPin,
  Check,
} from 'lucide-react';
import type { Odc, OperationalStatus } from '../../../shared/types/api.generated';
import { NodeStatusChangeModal } from './NodeStatusChangeModal';

export const OdcManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOdc, setEditingOdc] = useState<Odc | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalNode, setStatusModalNode] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    capacity_odp: 48,
    operational_status: 'normal' as OperationalStatus,
    wilayah: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: odcResponse, isLoading, refetch } = useQuery({
    queryKey: ['odcs', page, search, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get<any>('/odcs', {
        params: {
          page,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
        },
      });
      return res;
    },
  });

  const odcs: Odc[] = odcResponse?.data || [];
  const meta = odcResponse?.meta;

  const openCreateModal = () => {
    setEditingOdc(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      capacity_odp: 48,
      operational_status: 'normal',
      wilayah: '',
      notes: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (odc: Odc) => {
    setEditingOdc(odc);
    setFormData({
      code: odc.code,
      name: odc.name,
      address: odc.address || '',
      latitude: odc.latitude ? String(odc.latitude) : '',
      longitude: odc.longitude ? String(odc.longitude) : '',
      capacity_odp: odc.capacity_odp || 48,
      operational_status: odc.operational_status || 'normal',
      wilayah: odc.wilayah || '',
      notes: odc.notes || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const payload: any = {
        code: formData.code,
        name: formData.name,
        address: formData.address || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        capacity_odp: parseInt(String(formData.capacity_odp), 10),
        operational_status: formData.operational_status,
        wilayah: formData.wilayah || null,
        notes: formData.notes || null,
      };

      if (editingOdc) {
        return await apiClient.put(`/odcs/${editingOdc.id}`, payload);
      } else {
        return await apiClient.post('/odcs', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odcs'] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan ODC.';
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/odcs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odcs'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: OperationalStatus }) => {
      return await apiClient.put(`/odcs/${id}`, { operational_status: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odcs'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-indigo-600" />
            Manajemen ODC (Optical Distribution Center)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data sentral distribusi fiber optik, kapasitas slot ODP, dan status operasional.
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
            Tambah ODC
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode ODC, nama, atau alamat..."
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
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="normal">Normal</option>
              <option value="disrupted">Terganggu (Disrupted)</option>
              <option value="cut">Putus (Cut)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {odcs.map((odc) => {
          const status = odc.operational_status || 'normal';
          const isNormal = status === 'normal';
          const isCut = status === 'cut';

          return (
            <Card
              key={odc.id}
              className={`border transition-all hover:shadow-md ${
                isCut
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                  : !isNormal
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                      {odc.code}
                    </span>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
                      {odc.name}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isCut
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : !isNormal
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }
                  >
                    {status.toUpperCase()}
                  </Badge>
                </div>
                {odc.address && (
                  <CardDescription className="text-xs text-slate-500 flex items-center gap-1 mt-1 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    {odc.address}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500">Kapasitas ODP</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{odc.capacity_odp} Port</p>
                  </div>
                  <div>
                    <span className="text-slate-500">ODP Tertaut</span>
                    <p className="font-bold text-indigo-600 text-sm">{odc.odps_count ?? 0} Unit</p>
                  </div>
                  {odc.wilayah && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Wilayah:</span>{' '}
                      <strong className="text-slate-800 dark:text-slate-200">{odc.wilayah}</strong>
                    </div>
                  )}
                </div>

                {odc.notes && (
                  <p className="text-slate-500 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
                    "{odc.notes}"
                  </p>
                )}

                {/* Status Toggle & Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant={isCut || status === 'disrupted' ? 'destructive' : 'outline'}
                    onClick={() => {
                      setStatusModalNode({
                        id: odc.id,
                        type: 'odc',
                        name: odc.name,
                        code: odc.code,
                        status: odc.operational_status || 'normal',
                      });
                      setStatusModalOpen(true);
                    }}
                    className="h-7 text-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Ubah Status
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(odc)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Hapus ODC ${odc.code}?`)) {
                          deleteMutation.mutate(odc.id);
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

        {odcs.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base">Belum ada data ODC</p>
            <p className="text-xs mt-1">Tambahkan data ODC pertama Anda menggunakan tombol di kanan atas.</p>
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

      {/* Modal Form Tambah / Ubah ODC */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                {editingOdc ? `Ubah ODC ${editingOdc.code}` : 'Tambah ODC Baru'}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode ODC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ODC-MLG-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama ODC *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ODC Klojen Raya"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Jl. Ijen No. 12, Kota Malang"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-7.9824"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="112.6304"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kapasitas ODP *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.capacity_odp}
                    onChange={(e) => setFormData({ ...formData, capacity_odp: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wilayah
                  </label>
                  <input
                    type="text"
                    placeholder="Malang Kota"
                    value={formData.wilayah}
                    onChange={(e) => setFormData({ ...formData, wilayah: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={formData.operational_status}
                    onChange={(e) => setFormData({ ...formData, operational_status: e.target.value as OperationalStatus })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="disrupted">Disrupted</option>
                    <option value="cut">Cut</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan akses tiang, kontak PIC gedung..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
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
                  {saveMutation.isPending ? 'Menyimpan...' : editingOdc ? 'Simpan Perubahan' : 'Buat ODC'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Status & Pratinjau Dampak */}
      <NodeStatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        node={statusModalNode}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
