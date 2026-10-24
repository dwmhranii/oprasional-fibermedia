import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Building2,
  Plus,
  RefreshCw,
  MapPin,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import type { OfficeLocation } from '../../../shared/types/api.generated';

export const OfficeLocationManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<OfficeLocation | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: 50,
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: officesResponse, isLoading, refetch } = useQuery({
    queryKey: ['office-locations'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/admin/office-locations');
      return res?.data || (Array.isArray(res) ? res : []);
    },
  });
  const offices: OfficeLocation[] = officesResponse || [];

  const openCreateModal = () => {
    setEditingOffice(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      radius_meters: 50,
      is_active: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (office: OfficeLocation) => {
    setEditingOffice(office);
    setFormData({
      name: office.name,
      latitude: String(office.latitude),
      longitude: String(office.longitude),
      radius_meters: office.radius_meters || 50,
      is_active: Boolean(office.is_active),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const payload: any = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius_meters: parseInt(String(formData.radius_meters), 10) || 50,
        is_active: formData.is_active,
      };

      if (editingOffice) {
        return await apiClient.put(`/admin/office-locations/${editingOffice.id}`, payload);
      } else {
        return await apiClient.post('/admin/office-locations', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan titik kantor.';
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/admin/office-locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-locations'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Titik Kantor & Geofence Absensi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfigurasi koordinat kantor cabang/pusat dan radius geofence (meter) untuk validasi absensi harian staf.
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
            Tambah Titik Kantor
          </Button>
        </div>
      </div>

      {/* Grid Office Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offices.map((office) => {
          const isActive = office.is_active;

          return (
            <Card
              key={office.id}
              className={`border transition-all hover:shadow-md ${
                !isActive ? 'opacity-75 border-slate-200' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {office.name}
                    </CardTitle>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {isActive ? 'AKTIF' : 'NONAKTIF'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Radius Geofence:</span>
                    <strong className="text-indigo-600 font-bold">{office.radius_meters} meter</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Koordinat GPS:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {office.latitude}, {office.longitude}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(office)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Hapus titik kantor ${office.name}?`)) {
                        deleteMutation.mutate(office.id);
                      }
                    }}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {offices.length === 0 && !isLoading && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-base">Belum ada titik kantor</p>
            <p className="text-xs mt-1">Tambahkan lokasi kantor pertama Anda untuk geofence absensi.</p>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Ubah Titik Kantor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingOffice ? `Ubah Kantor: ${editingOffice.name}` : 'Tambah Titik Kantor Baru'}
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
                  Nama Titik Kantor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kantor Pusat Sawojajar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="-7.9824"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="112.6304"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Radius Geofence (Meter) *
                </label>
                <input
                  type="number"
                  required
                  min={50}
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value, 10) || 50 })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Minimal radius adalah 50 meter sesuai standar absensi.</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="office_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="office_active" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Aktifkan titik kantor ini
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
                  {saveMutation.isPending ? 'Menyimpan...' : editingOffice ? 'Simpan Perubahan' : 'Buat Titik Kantor'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
