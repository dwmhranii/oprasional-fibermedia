import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Grid,
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
  Eye,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import type { Odp, Odc, OperationalStatus, OdpPortItem } from '../../../shared/types/api.generated';

export const OdpManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [odcFilter, setOdcFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modals
  const [portModalOpen, setPortModalOpen] = useState(false);
  const [selectedOdpForPorts, setSelectedOdpForPorts] = useState<Odp | null>(null);

  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [odpForApproval, setOdpForApproval] = useState<Odp | null>(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingOdp, setEditingOdp] = useState<Odp | null>(null);

  const [formData, setFormData] = useState({
    odc_id: '',
    code: '',
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    port_capacity: 8,
    operational_status: 'normal' as OperationalStatus,
    wilayah: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch ODCs for dropdown
  const { data: odcsResponse } = useQuery({
    queryKey: ['odcs-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/admin/odcs', { params: { per_page: 100 } });
      return res?.data || [];
    },
  });
  const odcList: Odc[] = odcsResponse || [];

  // Fetch ODPs
  const { data: odpResponse, isLoading, refetch } = useQuery({
    queryKey: ['odps', page, search, odcFilter, statusFilter, approvalFilter],
    queryFn: async () => {
      const res = await apiClient.get<any>('/admin/odps', {
        params: {
          page,
          search: search || undefined,
          odc_id: odcFilter !== 'all' ? odcFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          is_approved: approvalFilter === 'approved' ? 1 : approvalFilter === 'pending' ? 0 : undefined,
        },
      });
      return res;
    },
  });

  const odps: Odp[] = odpResponse?.data || [];
  const meta = odpResponse?.meta;

  const openPortVisualizer = async (odp: Odp) => {
    try {
      const detail = await apiClient.get<any>(`/admin/odps/${odp.id}`);
      setSelectedOdpForPorts(detail?.data || odp);
      setPortModalOpen(true);
    } catch {
      setSelectedOdpForPorts(odp);
      setPortModalOpen(true);
    }
  };

  const openApprovalModal = (odp: Odp) => {
    setOdpForApproval(odp);
    setApprovalModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingOdp(null);
    setFormData({
      odc_id: odcList[0]?.id ? String(odcList[0].id) : '',
      code: '',
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      port_capacity: 8,
      operational_status: 'normal',
      wilayah: '',
      notes: '',
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  const openEditModal = (odp: Odp) => {
    setEditingOdp(odp);
    setFormData({
      odc_id: odp.odc_id ? String(odp.odc_id) : '',
      code: odp.code,
      name: odp.name,
      address: odp.address || '',
      latitude: odp.latitude ? String(odp.latitude) : '',
      longitude: odp.longitude ? String(odp.longitude) : '',
      port_capacity: odp.port_capacity || 8,
      operational_status: odp.operational_status || 'normal',
      wilayah: odp.wilayah || '',
      notes: odp.notes || '',
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const payload: any = {
        odc_id: formData.odc_id ? parseInt(formData.odc_id, 10) : null,
        code: formData.code,
        name: formData.name,
        address: formData.address || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        port_capacity: parseInt(String(formData.port_capacity), 10),
        operational_status: formData.operational_status,
        wilayah: formData.wilayah || null,
        notes: formData.notes || null,
      };

      if (editingOdp) {
        return await apiClient.put(`/admin/odps/${editingOdp.id}`, payload);
      } else {
        return await apiClient.post('/admin/odps', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odps'] });
      setFormModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan ODP.';
      setFormError(msg);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve, notes }: { id: number; approve: boolean; notes?: string }) => {
      return await apiClient.post(`/admin/odps/${id}/approve`, { approve, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odps'] });
      setApprovalModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/admin/odps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odps'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Grid className="w-7 h-7 text-indigo-600" />
            Manajemen ODP (Optical Distribution Point)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisasi kotak port 1..port_capacity, persetujuan pergeseran koordinat teknisi, dan pemantauan utilisasi fiber.
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
            Tambah ODP
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
              placeholder="Cari kode ODP, nama, atau alamat..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={odcFilter}
              onChange={(e) => {
                setOdcFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua ODC</option>
              {odcList.map((odc) => (
                <option key={odc.id} value={odc.id}>
                  {odc.code} - {odc.name}
                </option>
              ))}
            </select>

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
              <option value="disrupted">Terganggu</option>
              <option value="cut">Putus</option>
            </select>

            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Approval</option>
              <option value="approved">Disetujui</option>
              <option value="pending">Menunggu Persetujuan</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Grid of ODPs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {odps.map((odp) => {
          const status = odp.operational_status || 'normal';
          const isCut = status === 'cut';
          const isDisrupted = status === 'disrupted';
          const hasRelocation = odp.has_pending_relocation || Boolean(odp.proposed_latitude);
          const occupied = odp.occupied_ports_count ?? 0;
          const total = odp.port_capacity || 8;
          const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

          return (
            <Card
              key={odp.id}
              className={`border transition-all hover:shadow-md ${
                isCut
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                  : isDisrupted
                  ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                        {odp.code}
                      </span>
                      {odp.odc && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          ODC: {odp.odc.code}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">
                      {odp.name}
                    </CardTitle>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className={
                        isCut
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : isDisrupted
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }
                    >
                      {status.toUpperCase()}
                    </Badge>
                    {!odp.is_approved && (
                      <Badge className="bg-amber-500 text-white text-[10px]">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>

                {odp.address && (
                  <CardDescription className="text-xs text-slate-500 flex items-center gap-1 mt-1 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    {odp.address}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3 text-xs">
                {/* Port Occupancy Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Kotak Port:</span>
                    <strong className="text-slate-900 dark:text-slate-100">
                      {occupied} / {total} Terpakai ({occupancyRate}%)
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        occupancyRate >= 90
                          ? 'bg-rose-500'
                          : occupancyRate >= 70
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                </div>

                {/* Relocation alert if technician proposed coordinates */}
                {hasRelocation && (
                  <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Usulan geser titik koordinat</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openApprovalModal(odp)}
                      className="h-6 px-2 text-[10px] border-amber-400 text-amber-900 hover:bg-amber-100"
                    >
                      Tinjau
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openPortVisualizer(odp)}
                    className="h-7 text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  >
                    <Grid className="w-3.5 h-3.5 mr-1" />
                    Kotak Port
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(odp)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Hapus ODP ${odp.code}?`)) {
                          deleteMutation.mutate(odp.id);
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

        {odps.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            <Grid className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base">Belum ada data ODP</p>
            <p className="text-xs mt-1">Tambahkan data ODP menggunakan tombol di atas.</p>
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

      {/* Modal 1: Visualisasi Kotak Port ODP */}
      {portModalOpen && selectedOdpForPorts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-600" />
                  Kotak Port {selectedOdpForPorts.code} ({selectedOdpForPorts.name})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kapasitas Total: {selectedOdpForPorts.port_capacity} Port | Terisi:{' '}
                  {selectedOdpForPorts.occupied_ports_count ?? 0} | Kosong:{' '}
                  {selectedOdpForPorts.available_ports_count ?? selectedOdpForPorts.port_capacity}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPortModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Port Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                {(selectedOdpForPorts.ports || []).map((port: OdpPortItem) => {
                  const isOccupied = port.is_occupied;
                  return (
                    <div
                      key={port.port_number}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                        isOccupied
                          ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] font-bold text-slate-500 mb-1">
                        Port {port.port_number}
                      </span>
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isOccupied
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-dashed border-slate-300'
                        }`}
                      >
                        {port.port_number}
                      </div>

                      <div className="mt-2 text-[10px] w-full truncate">
                        {isOccupied && port.customer ? (
                          <div title={`${port.customer.customer_code} - ${port.customer.name}`}>
                            <p className="font-bold text-indigo-700 dark:text-indigo-400 truncate">
                              {port.customer.customer_code}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300 truncate">
                              {port.customer.name}
                            </p>
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium">Bebas</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-indigo-600 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300">Port Terisi Pelanggan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-dashed border-slate-400 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300">Port Bebas / Kosong</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button variant="outline" onClick={() => setPortModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Tinjau & Setujui Pergeseran Koordinat ODP */}
      {approvalModalOpen && odpForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Persetujuan Titik Koordinat ODP
              </h3>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Teknisi mengajukan pembaruan titik koordinat lapangan untuk ODP{' '}
                <strong>{odpForApproval.code} ({odpForApproval.name})</strong>:
              </p>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 font-semibold block mb-1">Koordinat Saat Ini</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200">
                    Lat: {odpForApproval.latitude ?? '-'}
                  </p>
                  <p className="font-mono text-slate-800 dark:text-slate-200">
                    Lng: {odpForApproval.longitude ?? '-'}
                  </p>
                </div>

                <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                  <span className="text-amber-600 font-semibold block mb-1">Koordinat Usulan</span>
                  <p className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    Lat: {odpForApproval.proposed_latitude ?? '-'}
                  </p>
                  <p className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    Lng: {odpForApproval.proposed_longitude ?? '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => approveMutation.mutate({ id: odpForApproval.id, approve: false })}
                  disabled={approveMutation.isPending}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Tolak Usulan
                </Button>
                <Button
                  onClick={() => approveMutation.mutate({ id: odpForApproval.id, approve: true })}
                  disabled={approveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Setujui Pergeseran
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Form Tambah / Ubah ODP */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-600" />
                {editingOdp ? `Ubah ODP ${editingOdp.code}` : 'Tambah ODP Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
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
                    ODC Induk *
                  </label>
                  <select
                    required
                    value={formData.odc_id}
                    onChange={(e) => setFormData({ ...formData, odc_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Pilih ODC</option>
                    {odcList.map((odc) => (
                      <option key={odc.id} value={odc.id}>
                        {odc.code} - {odc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kode ODP *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ODP-KLJ-01"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama ODP *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ODP Tiang 14 Jl. Ijen"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat / Patokan Tiang
                </label>
                <input
                  type="text"
                  placeholder="Depan Apotek Kimia Farma, Tiang No. 12"
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
                    Kapasitas Port *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.port_capacity}
                    onChange={(e) => setFormData({ ...formData, port_capacity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Wilayah
                  </label>
                  <input
                    type="text"
                    placeholder="Klojen"
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
                  placeholder="Keterangan splitter, redaman, tiang..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : editingOdp ? 'Simpan Perubahan' : 'Buat ODP'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
