import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  X,
  MapPin,
  Map,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { NodeStatusChangeModal } from './NodeStatusChangeModal';

interface OltItem {
  id: number;
  code: string;
  name: string;
  ip_address?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  status: 'normal' | 'disrupted' | 'cut' | 'maintenance';
  is_active: boolean;
  notes?: string | null;
  odcs_count?: number;
  updated_at?: string;
}

export const OltManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOlt, setEditingOlt] = useState<OltItem | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalNode, setStatusModalNode] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    ip_address: '',
    address: '',
    latitude: '',
    longitude: '',
    status: 'normal' as 'normal' | 'disrupted' | 'cut' | 'maintenance',
    is_active: true,
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: olts = [], isLoading, refetch, isFetching } = useQuery<OltItem[]>({
    queryKey: ['networkOlts'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/network/olts');
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const filteredOlts = olts.filter((olt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      olt.name?.toLowerCase().includes(q) ||
      olt.code?.toLowerCase().includes(q) ||
      olt.address?.toLowerCase().includes(q) ||
      olt.ip_address?.toLowerCase().includes(q)
    );
  });

  const openCreateModal = () => {
    setEditingOlt(null);
    setFormData({
      code: '',
      name: '',
      ip_address: '',
      address: '',
      latitude: '',
      longitude: '',
      status: 'normal',
      is_active: true,
      notes: '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (olt: OltItem) => {
    setEditingOlt(olt);
    setFormData({
      code: olt.code || '',
      name: olt.name || '',
      ip_address: olt.ip_address || '',
      address: olt.address || '',
      latitude: olt.latitude != null ? String(olt.latitude) : '',
      longitude: olt.longitude != null ? String(olt.longitude) : '',
      status: olt.status || 'normal',
      is_active: olt.is_active ?? true,
      notes: olt.notes || '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: formData.code.trim() || undefined,
        name: formData.name.trim(),
        ip_address: formData.ip_address.trim() || undefined,
        address: formData.address.trim() || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        status: formData.status,
        is_active: formData.is_active,
        notes: formData.notes.trim() || undefined,
      };

      if (editingOlt) {
        return apiClient.put(`/network/olts/${editingOlt.id}`, payload);
      }
      return apiClient.post('/network/olts', payload);
    },
    onSuccess: () => {
      toast.success(editingOlt ? 'OLT berhasil diperbarui' : 'OLT baru berhasil ditambahkan');
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['networkOlts'] });
      queryClient.invalidateQueries({ queryKey: ['networkMap'] });
    },
    onError: (err: any) => {
      setFormError(err?.message || 'Gagal menyimpan data OLT');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/network/olts/${id}`);
    },
    onSuccess: () => {
      toast.success('OLT berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['networkOlts'] });
      queryClient.invalidateQueries({ queryKey: ['networkMap'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus OLT');
    },
  });

  const handleDelete = (olt: OltItem) => {
    if (confirm(`Yakin ingin menghapus OLT ${olt.name} (${olt.code})? Seluruh data terkait ODC di bawahnya mungkin terpengaruh.`)) {
      deleteMutation.mutate(olt.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama, kode, IP, atau lokasi OLT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          <Button size="sm" onClick={openCreateModal} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Tambah OLT</span>
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" />
                <span>Daftar Optical Line Terminal (OLT)</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Simpul aktif pusat distribusi serat optik FTTH Fibermedia
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-medium">
              {filteredOlts.length} Unit
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">KODE & NAMA</th>
                  <th className="py-3 px-4">ALAMAT IP</th>
                  <th className="py-3 px-4">LOKASI / ALAMAT</th>
                  <th className="py-3 px-4">KOORDINAT</th>
                  <th className="py-3 px-4">JUMLAH ODC</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                        <span>Memuat data OLT...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOlts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                      {search ? 'Tidak ada OLT yang cocok dengan pencarian.' : 'Belum ada data OLT.'}
                    </td>
                  </tr>
                ) : (
                  filteredOlts.map((olt) => (
                    <tr key={olt.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{olt.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{olt.code}</div>
                      </td>
                      <td className="py-3 px-4">
                        {olt.ip_address ? (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                            {olt.ip_address}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-xs text-muted-foreground">
                        {olt.address || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                        {olt.latitude && olt.longitude ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/network/map?lat=${olt.latitude}&lng=${olt.longitude}&zoom=17`)}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors text-left"
                            title="Buka di Peta"
                          >
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span>{Number(olt.latitude).toFixed(5)}, {Number(olt.longitude).toFixed(5)}</span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground/60">Belum ada titik</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {olt.odcs_count ?? 0} ODC
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusModalNode({
                              id: olt.id,
                              type: 'olt',
                              name: olt.name,
                              code: olt.code,
                              status: olt.status || 'normal',
                            });
                            setStatusModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer ${
                            olt.status === 'normal'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : olt.status === 'disrupted'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : olt.status === 'cut'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                          title="Klik untuk melihat pratinjau dampak dan mengubah status"
                        >
                          <AlertTriangle className="w-3 h-3 mr-0.5" />
                          {olt.status === 'normal' ? 'Normal' : olt.status === 'disrupted' ? 'Gangguan' : olt.status === 'cut' ? 'Putus' : 'Pemeliharaan'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(olt)}
                            title="Ubah OLT"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            onClick={() => handleDelete(olt)}
                            title="Hapus OLT"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-base">
                {editingOlt ? 'Ubah Data OLT' : 'Tambah OLT Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                if (!formData.name.trim()) {
                  setFormError('Nama OLT wajib diisi');
                  return;
                }
                saveMutation.mutate();
              }}
              className="p-6 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nama OLT <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="mis. OLT Bululawang Utama"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Kode OLT
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="mis. OLT-BLW-01"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Alamat IP Manajemen
                  </label>
                  <input
                    type="text"
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    placeholder="mis. 10.10.1.2"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Status Operasional
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="normal">Normal</option>
                    <option value="disrupted">Gangguan</option>
                    <option value="cut">Putus</option>
                    <option value="maintenance">Pemeliharaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Alamat / Lokasi Fisik
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="mis. Gedung NOC Bululawang, Lt. 2"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="-8.0814"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="112.6377"
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Keterangan teknis, tipe perangkat, atau kontak pengelola..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saveMutation.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-1.5"
                >
                  {saveMutation.isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingOlt ? 'Simpan Perubahan' : 'Buat OLT'}</span>
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

export default OltManagement;
