import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { promoService, PromoCode } from '../../lib/promoService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Tag,
  Plus,
  RefreshCw,
  Search,
  Copy,
  Check,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Percent,
  DollarSign,
  Gift,
  Calendar,
  Users,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export const PromoManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'fixed' as 'fixed' | 'percentage' | 'free_installation',
    value: 50000,
    min_package_price: 0,
    max_uses: '',
    valid_until: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch Promo Codes
  const { data: promoRes, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['adminPromos', statusFilter, searchQuery],
    queryFn: () => promoService.getPromos(statusFilter === 'all' ? undefined : statusFilter, searchQuery),
  });

  const promosList = promoRes?.data || [];
  const summary = promoRes?.summary || {
    total_promos: promosList.length,
    total_active: promosList.filter((p) => p.status === 'active').length,
    total_used: promosList.reduce((acc, p) => acc + (p.used_count || 0), 0),
    total_expired: 0,
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Kode promo '${code}' berhasil disalin!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (id: string | number, currentStatus: string) => {
    try {
      await promoService.toggleStatus(id);
      toast.success(
        `Kode promo berhasil di-${currentStatus === 'active' ? 'nonaktifkan' : 'aktifkan'}`
      );
      queryClient.invalidateQueries({ queryKey: ['adminPromos'] });
    } catch (err) {
      toast.error('Gagal memperbarui status kode promo');
    }
  };

  const handleDeletePromo = async (id: string | number, code: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus kode promo '${code}'?`)) return;
    try {
      await promoService.deletePromo(id);
      toast.success(`Kode promo '${code}' telah dihapus`);
      queryClient.invalidateQueries({ queryKey: ['adminPromos'] });
    } catch (err) {
      toast.error('Gagal menghapus kode promo');
    }
  };

  const handleGenerateRandomCode = () => {
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    setFormData((prev) => ({ ...prev, code: `FIBER-${randomStr}` }));
  };

  const handleCreatePromoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama promo wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<PromoCode> = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        value: Number(formData.value || 0),
        min_package_price: Number(formData.min_package_price || 0),
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        status: formData.status,
      };

      const res = await promoService.createPromo(payload);
      toast.success(`Kode promo '${res.code}' berhasil dibuat!`);
      setIsModalOpen(false);
      setFormData({
        code: '',
        name: '',
        description: '',
        type: 'fixed',
        value: 50000,
        min_package_price: 0,
        max_uses: '',
        valid_until: '',
        status: 'active',
      });
      queryClient.invalidateQueries({ queryKey: ['adminPromos'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membuat kode promo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Manajemen Kode Promo & Diskon
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Buat, kelola, dan pantau penggunaan kode promo diskon untuk sales & calon pelanggan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              handleGenerateRandomCode();
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Kode Promo
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Kode Promo</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{summary.total_promos}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Promo Aktif</p>
              <p className="text-2xl font-black text-green-600 mt-1">{summary.total_active}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Penggunaan</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{summary.total_used}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Expired / Nonaktif</p>
              <p className="text-2xl font-black text-orange-600 mt-1">
                {promosList.length - summary.total_active}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="p-4 md:p-6 pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold text-gray-900">
              Daftar Kode Promo Terdaftar
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 mt-0.5">
              Daftar kode yang dapat dimasukkan oleh tim sales pada pengajuan baru
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Cari kode promo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex items-center bg-gray-100 p-1 rounded-lg w-full sm:w-auto text-xs">
              {(['all', 'active', 'inactive'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                    statusFilter === filter
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {filter === 'all' ? 'Semua' : filter === 'active' ? 'Aktif' : 'Nonaktif'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : promosList.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 text-sm">Tidak ada kode promo ditemukan</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `Tidak ada promo dengan kata kunci "${searchQuery}"`
                  : 'Belum ada kode promo terdaftar. Klik "Buat Kode Promo" untuk menambahkan promo pertama.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Kode Promo</th>
                    <th className="py-3 px-4">Nama & Deskripsi</th>
                    <th className="py-3 px-4">Tipe & Nilai Diskon</th>
                    <th className="py-3 px-4">Kuota / Terpakai</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {promosList.map((promo) => (
                    <tr key={promo.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Code column */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md">
                          <span>{promo.code}</span>
                          <button
                            onClick={() => handleCopyCode(promo.code)}
                            className="hover:text-blue-900 transition-colors"
                            title="Salin Kode"
                          >
                            {copiedCode === promo.code ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Name & Desc */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-900">{promo.name}</p>
                        <p className="text-gray-500 text-[11px] mt-0.5 max-w-xs truncate">
                          {promo.description || '-'}
                        </p>
                      </td>

                      {/* Type & Value */}
                      <td className="py-3.5 px-4">
                        {promo.type === 'fixed' && (
                          <span className="font-bold text-gray-900">
                            Rp {promo.value.toLocaleString('id-ID')}
                          </span>
                        )}
                        {promo.type === 'percentage' && (
                          <span className="font-bold text-purple-700">{promo.value}% Off</span>
                        )}
                        {promo.type === 'free_installation' && (
                          <span className="font-bold text-green-700">Gratis Instalasi</span>
                        )}
                        <span className="block text-[11px] text-gray-400 capitalize">
                          {promo.type === 'fixed'
                            ? 'Potongan Rp'
                            : promo.type === 'percentage'
                            ? 'Diskon Persen'
                            : 'Bebas Instalasi'}
                        </span>
                      </td>

                      {/* Quota */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-gray-700">
                          {promo.used_count || 0} / {promo.max_uses ? promo.max_uses : '∞'}
                        </span>
                        <span className="block text-[11px] text-gray-400">kali digunakan</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={
                            promo.status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-200 font-semibold'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }
                        >
                          {promo.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(promo.id, promo.status)}
                            title={promo.status === 'active' ? 'Nonaktifkan Promo' : 'Aktifkan Promo'}
                            className="h-8 text-xs text-gray-600 hover:text-gray-900"
                          >
                            {promo.status === 'active' ? (
                              <ToggleRight className="w-5 h-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePromo(promo.id, promo.code)}
                            title="Hapus Kode Promo"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog Create Promo Code */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  Buat Kode Promo Baru
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Isi rincian promo untuk digunakan tim Sales
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePromoSubmit} className="p-5 space-y-4 text-xs">
              {/* Code Generator field */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Kode Promo <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Contoh: FIBER50K"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="font-mono uppercase font-bold text-blue-700 tracking-wider flex-1 h-9"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateRandomCode}
                    className="text-xs h-9 border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Acak Kode
                  </Button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Nama Campaign Promo <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Contoh: Diskon Merdeka 50K"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">Deskripsi Ringkas</label>
                <Input
                  placeholder="Keterangan promo untuk sales / pelanggan"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-9"
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tipe Diskon</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as any,
                        value: e.target.value === 'percentage' ? 10 : 50000,
                      })
                    }
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Nominal Rupiah (Rp)</option>
                    <option value="percentage">Persentase (%)</option>
                    <option value="free_installation">Gratis Biaya Instalasi</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    {formData.type === 'fixed'
                      ? 'Potongan (Rp)'
                      : formData.type === 'percentage'
                      ? 'Diskon (%)'
                      : 'Nilai Potongan (Rp)'}
                  </label>
                  <Input
                    type="number"
                    disabled={formData.type === 'free_installation'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="h-9 font-semibold"
                  />
                </div>
              </div>

              {/* Quota & Expired */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Maksimal Kuota (Opsional)</label>
                  <Input
                    type="number"
                    placeholder="Kosongkan jika unlimit"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Berlaku Sampai (Opsional)</label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Form Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-semibold px-5"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Simpan Kode Promo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
