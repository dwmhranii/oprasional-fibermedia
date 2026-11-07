import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  packageService,
  extractPackages,
  extractSyncedAt,
  defaultNormalizedPackages,
} from '../../lib/packageService';
import { Package } from '../../types/packages';
import { formatDate } from '../../lib/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  RefreshCw,
  Loader2,
  Package as PackageIcon,
  Search,
  CheckCircle,
  Wifi,
  Sparkles,
  ShieldAlert,
  Plus,
  Edit,
  Trash2,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export const PackagesManagement: React.FC = () => {
  const { user, isSuperadmin: authIsSuperadmin, can } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [packageForm, setPackageForm] = useState({
    code: '',
    name: '',
    speed_mbps: 30,
    price: 125000,
    category: 'residential',
    description: '',
    is_popular: false,
    is_active: true,
  });

  // Check admin/superadmin role and permissions
  const isSuperadmin = authIsSuperadmin || user?.role?.toLowerCase() === 'superadmin';
  const isAdmin = user?.role?.toLowerCase() === 'admin' || can('catalog.manage');
  const isAdminOrSuperadmin = isSuperadmin || isAdmin || can('catalog.view');

  const fetchPackagesList = async () => {
    try {
      setIsLoading(true);
      const res = await packageService.getAllPackages();
      const extracted = extractPackages(res);
      const timestamp = extractSyncedAt(res);

      if (extracted.length > 0) {
        setPackages(extracted);
        setSyncedAt(timestamp);
      } else {
        setPackages(defaultNormalizedPackages);
      }
    } catch (err: any) {
      console.error('Failed to load packages:', err);
      setPackages(defaultNormalizedPackages);
      toast.error('Gagal Memuat Paket', {
        description: err?.message || 'Terjadi kesalahan saat memuat data paket dari server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesList();
  }, []);

  const handleSyncPackages = async () => {
    if (!isAdminOrSuperadmin) {
      toast.error('Akses Ditolak', {
        description: 'Hanya Admin dan Superadmin yang diizinkan melakukan sync.',
      });
      return;
    }

    try {
      setIsSyncing(true);
      const result = await packageService.syncPackages();

      if (result && result.success !== false) {
        toast.success('Sync Paket Berhasil', {
          description: result.message || `Berhasil menyinkronkan ${result.synced} paket dari fibermediaplay.net.`,
        });
        if (result.synced_at) {
          setSyncedAt(result.synced_at);
        }
        await fetchPackagesList();
      } else {
        toast.error('Sync Paket Gagal', {
          description: result?.message || 'Gagal menyinkronkan paket, silakan coba lagi.',
        });
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      toast.error('Gagal Menyinkronkan Paket', {
        description: err?.message || 'Terjadi kesalahan koneksi ke server.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Enable / Disable Toggle Handler
  const handleToggleActive = async (pkg: Package) => {
    try {
      if (pkg.id) {
        await packageService.togglePackageActive(pkg.id);
      }
      setPackages((prev) =>
        prev.map((item) =>
          (item.id && item.id === pkg.id) || item.code === pkg.code
            ? { ...item, is_active: !item.is_active }
            : item
        )
      );
      toast.success(
        `Status Paket '${pkg.name}' Berhasil ${!pkg.is_active ? 'Diaktifkan' : 'Dinonaktifkan'}`
      );
    } catch (err: any) {
      toast.error('Gagal Mengubah Status Paket', {
        description: err?.message || 'Terjadi kesalahan pada server.',
      });
    }
  };

  // Add Package Submit Handler
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await packageService.createPackage(packageForm);
      toast.success('Paket Baru Berhasil Ditambahkan');
      setShowAddModal(false);
      await fetchPackagesList();
    } catch (err: any) {
      toast.error('Gagal Menambah Paket', {
        description: err?.message || 'Periksa kembali data yang dimasukkan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Package Open Handler
  const handleOpenEdit = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPackageForm({
      code: pkg.code,
      name: pkg.name,
      speed_mbps: pkg.speed_mbps,
      price: pkg.price,
      category: pkg.category || 'residential',
      description: pkg.description || '',
      is_popular: Boolean(pkg.is_popular),
      is_active: pkg.is_active !== undefined ? Boolean(pkg.is_active) : true,
    });
    setShowEditModal(true);
  };

  // Edit Package Submit Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage?.id) return;
    try {
      setIsSubmitting(true);
      await packageService.updatePackage(selectedPackage.id, packageForm);
      toast.success('Data Paket Berhasil Diperbarui');
      setShowEditModal(false);
      await fetchPackagesList();
    } catch (err: any) {
      toast.error('Gagal Memperbarui Paket', {
        description: err?.message || 'Terjadi kesalahan saat menyimpan data.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Package Handler (RESTRICTED TO SUPERADMIN)
  const handleDeleteSubmit = async () => {
    if (!isSuperadmin || !selectedPackage?.id) return;
    try {
      setIsSubmitting(true);
      await packageService.deletePackage(selectedPackage.id);
      toast.success(`Paket '${selectedPackage.name}' Berhasil Dihapus`);
      setShowDeleteModal(false);
      await fetchPackagesList();
    } catch (err: any) {
      toast.error('Gagal Menghapus Paket', {
        description: err?.message || 'Terjadi kesalahan saat menghapus paket.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPackages = packages.filter((pkg) => {
    const term = searchTerm.toLowerCase();
    return (
      pkg.name.toLowerCase().includes(term) ||
      pkg.code.toLowerCase().includes(term) ||
      `${pkg.speed_mbps}mbps`.includes(term.replace(/\s+/g, ''))
    );
  });

  if (!isAdminOrSuperadmin) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-xl border border-red-200 space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-red-900">Akses Ditolak</h2>
        <p className="text-sm text-red-700">
          Anda tidak memiliki wewenang untuk mengakses halaman manajemen paket ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen & Sync Paket</h1>
            <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
              <Wifi className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
              Katalog Resmi
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Kelola, atur status aktif, tambah paket kustom, dan sinkronkan paket dari <strong>fibermediaplay.net</strong>.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            onClick={() => {
              setPackageForm({
                code: '',
                name: '',
                speed_mbps: 30,
                price: 125000,
                category: 'residential',
                description: '',
                is_popular: false,
                is_active: true,
              });
              setShowAddModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Paket Baru
          </Button>

          <Button
            onClick={handleSyncPackages}
            disabled={isSyncing}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 font-medium text-xs px-4 py-2.5 rounded-lg"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Menyinkronkan...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1.5 text-blue-600" />
                Sync dari Website
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sync Timestamp Status Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center space-x-3 text-gray-700">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <span className="font-semibold text-gray-900">Status Sinkronisasi Terakhir: </span>
            <span className="text-gray-600">
              {syncedAt ? formatDate(syncedAt) : 'Terbaru dari cache'}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Admin & Superadmin dapat mengedit/toggle paket. <strong>Hapus paket khusus Superadmin.</strong>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paket</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{packages.length}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <PackageIcon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paket Aktif</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {packages.filter((p) => p.is_active !== false).length}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Power className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kecepatan Max</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {packages.length > 0 ? Math.max(...packages.map((p) => p.speed_mbps)) : 0} Mbps
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Wifi className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Best Seller</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {packages.filter((p) => p.is_popular).length} Paket
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Packages Table Card */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Daftar Katalog Paket</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Tabel manajemen seluruh paket internet (Aktif & Non-Aktif)
            </CardDescription>
          </div>

          {/* Search Table */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari nama atau kode paket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 bg-white"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-medium">Memuat katalog paket...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <PackageIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-base font-semibold text-gray-700">Tidak ada paket ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full min-w-[960px] border-collapse">
                <TableHeader className="bg-slate-100/80 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-4 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[130px]">
                      STATUS PAKET
                    </TableHead>
                    <TableHead className="px-4 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[170px]">
                      KODE PAKET
                    </TableHead>
                    <TableHead className="px-4 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[200px]">
                      NAMA PAKET & DESKRIPSI
                    </TableHead>
                    <TableHead className="px-3 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[100px]">
                      KECEPATAN
                    </TableHead>
                    <TableHead className="px-3 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[120px]">
                      HARGA BULANAN
                    </TableHead>
                    <TableHead className="px-3 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[110px]">
                      KATEGORI
                    </TableHead>
                    <TableHead className="px-3 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[110px]">
                      STATUS POPULER
                    </TableHead>
                    <TableHead className="px-4 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider text-right min-w-[80px]">
                      AKSI
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {filteredPackages.map((pkg) => {
                    const isActive = pkg.is_active !== false;
                    return (
                      <TableRow key={pkg.code} className="hover:bg-blue-50/40 transition-colors">
                        <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handleToggleActive(pkg)}
                            />
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {isActive ? 'Aktif' : 'Non-Aktif'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block shadow-2xs">
                            {pkg.code}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-middle">
                          <div className="space-y-0.5">
                            <span className="font-bold text-sm text-gray-900 block">
                              {pkg.name}
                            </span>
                            {pkg.description && (
                              <span className="text-xs text-gray-500 font-normal leading-normal line-clamp-1 block">
                                {pkg.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 font-bold text-sm text-blue-600">
                            <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{pkg.speed_mbps} Mbps</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle whitespace-nowrap">
                          <div>
                            <span className="font-extrabold text-sm text-slate-900 block">
                              Rp {Number(pkg.price).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal block">
                              per bulan
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle whitespace-nowrap">
                          <Badge variant="outline" className="capitalize text-xs px-2.5 py-0.5 bg-slate-50 text-slate-700 border-slate-200 font-medium rounded-full">
                            {pkg.category || 'residential'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-3.5 align-middle whitespace-nowrap">
                          {pkg.is_popular ? (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
                              🏆 Best Seller
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400 block pl-2">-</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            {/* Edit Button (Admin & Superadmin) */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(pkg)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                              title="Edit Paket"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            {/* Delete Button (RESTRICTED TO SUPERADMIN ONLY) */}
                            {isSuperadmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPackage(pkg);
                                  setShowDeleteModal(true);
                                }}
                                className="h-8 w-8 p-0 text-gray-600 hover:text-red-600 hover:bg-red-50"
                                title="Hapus Paket (Superadmin)"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Package Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg font-bold text-gray-900">
              <Plus className="w-5 h-5 text-emerald-600 mr-2" />
              Tambah Paket Layanan Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Isi formulir berikut untuk menambahkan paket internet baru ke katalog.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Nama Paket</Label>
              <Input
                required
                placeholder="Contoh: Paket Family Super"
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                className="text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Kecepatan (Mbps)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={packageForm.speed_mbps}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, speed_mbps: parseInt(e.target.value, 10) || 0 })
                  }
                  className="text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Harga (Rp/Bulan)</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={packageForm.price}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, price: parseFloat(e.target.value) || 0 })
                  }
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Kategori Paket</Label>
              <Select
                value={packageForm.category}
                onValueChange={(val) => setPackageForm({ ...packageForm, category: val })}
              >
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Internet Rumah / Residential</SelectItem>
                  <SelectItem value="internet_only">Internet Only</SelectItem>
                  <SelectItem value="combo_tv">Combo Fiber + TV</SelectItem>
                  <SelectItem value="streaming">Streaming Package</SelectItem>
                  <SelectItem value="enterprise">Enterprise / Dedicated Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Deskripsi Paket</Label>
              <Textarea
                placeholder="Penjelasan keunggulan paket..."
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                className="text-xs bg-white min-h-[60px]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold text-gray-700">Tandai Best Seller?</Label>
              <Switch
                checked={packageForm.is_popular}
                onCheckedChange={(val) => setPackageForm({ ...packageForm, is_popular: val })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Simpan Paket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Package Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg font-bold text-gray-900">
              <Edit className="w-5 h-5 text-blue-600 mr-2" />
              Edit Data Paket
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Perbarui rincian paket {selectedPackage?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Nama Paket</Label>
              <Input
                required
                value={packageForm.name}
                onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                className="text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Kecepatan (Mbps)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={packageForm.speed_mbps}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, speed_mbps: parseInt(e.target.value, 10) || 0 })
                  }
                  className="text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Harga (Rp/Bulan)</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={packageForm.price}
                  onChange={(e) =>
                    setPackageForm({ ...packageForm, price: parseFloat(e.target.value) || 0 })
                  }
                  className="text-xs bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Kategori Paket</Label>
              <Select
                value={packageForm.category}
                onValueChange={(val) => setPackageForm({ ...packageForm, category: val })}
              >
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Internet Rumah / Residential</SelectItem>
                  <SelectItem value="internet_only">Internet Only</SelectItem>
                  <SelectItem value="combo_tv">Combo Fiber + TV</SelectItem>
                  <SelectItem value="streaming">Streaming Package</SelectItem>
                  <SelectItem value="enterprise">Enterprise / Dedicated Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Deskripsi Paket</Label>
              <Textarea
                value={packageForm.description}
                onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                className="text-xs bg-white min-h-[60px]"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold text-gray-700">Tandai Best Seller?</Label>
              <Switch
                checked={packageForm.is_popular}
                onCheckedChange={(val) => setPackageForm({ ...packageForm, is_popular: val })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal (SUPERADMIN ONLY) */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg font-bold text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              Konfirmasi Hapus Paket (Superadmin)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-1">
              Apakah Anda yakin ingin menghapus paket <strong>{selectedPackage?.name}</strong>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleDeleteSubmit}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Ya, Hapus Paket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
