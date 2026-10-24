import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Users,
  UserCheck,
  UserX,
  AlertOctagon,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  FileCheck,
  MoreHorizontal,
  Wifi,
  MapPin,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError, API_BASE_URL, getToken } from '../../lib/api';
import { formatDate, formatCurrency, formatDateOnly } from '../../lib/formatters';

export const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperadmin =
    user?.role === 'superadmin' ||
    user?.roles?.includes('Superadmin') ||
    user?.roles?.includes('superadmin');

  // State filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status Change Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('active');
  const [statusNotes, setStatusNotes] = useState('');

  // Delete Customer Modal (Superadmin only)
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  // Export & Import states
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  const downloadBlob = async (endpoint: string, defaultFilename: string, params?: Record<string, any>) => {
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      const qs = queryParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error('Gagal mengunduh file dari server.');
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Menyiapkan file export Excel...');
      const params: Record<string, any> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const filename = `data-pelanggan-fibermedia-${new Date().toISOString().slice(0, 10)}.xlsx`;
      await downloadBlob('/admin/customers/export', filename, params);
      toast.success('Data pelanggan berhasil diunduh ke Excel (.xlsx)');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor data ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      toast.info('Mengunduh template import Excel...');
      await downloadBlob('/admin/customers/import-template', 'template-import-pelanggan.xlsx');
      toast.success('Template import berhasil diunduh');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunduh template');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Pilih file Excel terlebih dahulu');
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/customers/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mengimpor file Excel');
      }

      toast.success(json.message || 'Import data pelanggan berhasil');
      setImportSummary(json.data);
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      refetchStats();
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses file Excel');
    } finally {
      setIsImporting(false);
    }
  };

  // Fetch stats
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['adminCustomers', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/admin/customers/stats');
      return response.data || response;
    },
  });

  // Fetch customers list
  const { data: customersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminCustomers', 'list', page, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, any> = { page, per_page: 10 };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await apiClient.get<any>('/admin/customers', { params });
      return response;
    },
  });

  const customers = customersData?.data || [];
  const meta = customersData?.meta || { current_page: 1, last_page: 1, total: customers.length };

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number | string; status: string; notes: string }) => {
      return await apiClient.patch(`/admin/customers/${id}/status`, { status, notes });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Status pelanggan berhasil diperbarui');
      setSelectedCustomer(null);
      setStatusNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.getFirstError() || 'Gagal mengubah status pelanggan');
      } else {
        toast.error('Terjadi kesalahan koneksi');
      }
    },
  });

  // Delete Customer mutation (Superadmin only)
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return await apiClient.delete(`/superadmin/customers/${id}`);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Data pelanggan berhasil dihapus');
      setCustomerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.getFirstError() || 'Gagal menghapus pelanggan');
      } else {
        toast.error('Terjadi kesalahan koneksi');
      }
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Nomor pelanggan disalin: ${text}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openStatusModal = (customer: any) => {
    setSelectedCustomer(customer);
    setNewStatus(customer.status || 'active');
    setStatusNotes('');
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    updateStatusMutation.mutate({
      id: selectedCustomer.id,
      status: newStatus,
      notes: statusNotes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Aktif
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Ditangguhkan (Isolir)
          </Badge>
        );
      case 'terminated':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Non-Aktif (Putus)
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Kelola Pelanggan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daftar pelanggan resmi yang telah menyelesaikan pemasangan, aktivasi, dan serah terima (BAST).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 text-xs h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 transition-colors"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Export Excel</span>
          </Button>

          {/* Tombol Import Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportFile(null);
              setImportSummary(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 hover:border-indigo-300 transition-colors"
          >
            <FileUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Import Excel</span>
          </Button>

          {/* Tombol Muat Ulang */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchStats();
            }}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pelanggan</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {isLoadingStats ? '...' : statsData?.total ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Semua data terverifikasi</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Pelanggan Aktif</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                {isLoadingStats ? '...' : statsData?.active ?? 0}
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Layanan aktif normal</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Ditangguhkan (Isolir)</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                {isLoadingStats ? '...' : statsData?.suspended ?? 0}
              </h3>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Tunggakan / Isolir sementara</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertOctagon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Non-Aktif / Putus</p>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">
                {isLoadingStats ? '...' : statsData?.terminated ?? 0}
              </h3>
              <p className="text-[11px] text-rose-600/80 mt-0.5">Berhenti berlangganan</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <UserX className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border shadow-xs bg-white">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            Daftar Data Pelanggan
          </CardTitle>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari ID, Nama, No. HP, ODP..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs h-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44 text-xs h-9">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="suspended">Ditangguhkan (Isolir)</SelectItem>
                <SelectItem value="terminated">Non-Aktif (Putus)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">No. Pelanggan</th>
                  <th className="p-3.5">Nama &amp; Kontak</th>
                  <th className="p-3.5">Paket &amp; Harga</th>
                  <th className="p-3.5">ODP &amp; BRAS</th>
                  <th className="p-3.5 text-center">Status Layanan</th>
                  <th className="p-3.5 text-center">Jatuh Tempo</th>
                  <th className="p-3.5 text-right pr-5">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                      Memuat data pelanggan...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Tidak ada data pelanggan yang sesuai dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  customers.map((cust: any) => (
                    <tr key={cust.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                      {/* Customer Code */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs">
                            {cust.customer_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(cust.customer_code, String(cust.id))}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Salin No. Pelanggan"
                          >
                            {copiedId === String(cust.id) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {cust.external_ref ? (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Ref: {cust.external_ref}
                          </span>
                        ) : cust.service_chain?.submission_number ? (
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Ref: {cust.service_chain.submission_number}
                          </span>
                        ) : null}
                      </td>

                      {/* Name & Contact */}
                      <td className="p-3.5">
                        <p className="font-bold text-slate-800 text-xs">{cust.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {cust.phone}
                        </p>
                        {cust.wilayah && (
                          <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            {cust.wilayah}
                          </span>
                        )}
                      </td>

                      {/* Package & Price */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-xs font-semibold text-indigo-700">
                          <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                          {cust.package || 'Default Package'}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
                          {formatCurrency(cust.monthly_price)}
                          <span className="text-[10px] font-normal text-slate-400">/bln</span>
                        </span>
                      </td>

                      {/* ODP & BRAS */}
                      <td className="p-3.5">
                        <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          {cust.odp_code || '-'}{cust.odp_port ? ` (P:${cust.odp_port})` : ''}
                        </div>
                        <span className="text-[11px] text-slate-500 block font-mono mt-0.5">
                          BRAS: {cust.bras_name || '-'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {getStatusBadge(cust.status)}
                      </td>

                      {/* Jatuh Tempo */}
                      <td className="p-3.5 text-center">
                        {cust.expires_at ? (
                          <div>
                            <span className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatDateOnly(cust.expires_at)}
                            </span>
                            {cust.debt > 0 && (
                              <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                                Tagihan: {formatCurrency(cust.debt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openStatusModal(cust)}
                            className="text-xs h-8 px-2.5 font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Ubah Status
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/admin/customers/${cust.id}`)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-2.5 flex items-center gap-1 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detail
                          </Button>
                          {isSuperadmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCustomerToDelete(cust)}
                              className="text-xs h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded"
                              title="Hapus Pelanggan (Superadmin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Menampilkan halaman {meta.current_page} dari {meta.last_page} ({meta.total} total data)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs h-8"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                  className="text-xs h-8"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              Ubah Status Pelanggan
            </DialogTitle>
            <DialogDescription>
              Perbarui status operasional pelanggan <strong>{selectedCustomer?.name}</strong> (
              <span className="font-mono font-semibold">{selectedCustomer?.customer_code}</span>).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleStatusSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Pilih Status Baru</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="text-emerald-700 font-semibold">Aktif</span> — Layanan berjalan normal
                  </SelectItem>
                  <SelectItem value="suspended">
                    <span className="text-amber-700 font-semibold">Ditangguhkan (Isolir)</span> — Isolir sementara
                  </SelectItem>
                  <SelectItem value="terminated">
                    <span className="text-rose-700 font-semibold">Non-Aktif (Putus)</span> — Berhenti berlangganan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Catatan / Alasan Perubahan (Opsional)</Label>
              <Textarea
                placeholder="Contoh: Permintaan pelanggan berhenti sementara, atau penunggakan pembayaran..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedCustomer(null)}
                disabled={updateStatusMutation.isPending}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateStatusMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>


      {/* Import Customers Excel Modal */}
      <Dialog
        open={isImportModalOpen}
        onOpenChange={(open) => {
          if (!open && !isImporting) {
            setIsImportModalOpen(false);
            setImportFile(null);
            setImportSummary(null);
          }
        }}
      >
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-800 dark:text-white">
                  Import Data Pelanggan dari Excel
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Unggah file spreadsheet (.xlsx, .xls, .csv) untuk input data pelanggan secara massal.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleImportSubmit} className="space-y-4 pt-1">
            {/* Step 1: Download Template */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Format Template Excel
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="h-7 text-[11px] px-2.5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-200 hover:bg-indigo-50"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Unduh Template (.xlsx)
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Gunakan format kolom yang sesuai: <strong>Nama Pelanggan</strong>, <strong>No Telepon/WA</strong>, <strong>Alamat Lengkap</strong>, <strong>Paket Layanan</strong>, dan <strong>Kode ODP</strong>. Kolom Kode Pelanggan bersifat opsional (dibuat otomatis jika kosong).
              </p>
            </div>

            {/* Step 2: Upload File Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilih File Excel / CSV <span className="text-red-500">*</span>
              </Label>
              <div
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
                  importFile
                    ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
                onClick={() => document.getElementById('customer-excel-input')?.click()}
              >
                <input
                  id="customer-excel-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImportFile(file);
                      setImportSummary(null);
                    }
                  }}
                />
                {importFile ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {importFile.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {(importFile.size / 1024).toFixed(1)} KB &bull; Klik untuk ganti file
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-500">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Klik untuk memilih file Excel (.xlsx, .xls, .csv)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Maksimal ukuran file 10MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Hasil Ringkasan Import */}
            {importSummary && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Hasil Pemrosesan Import:
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-emerald-100 dark:border-emerald-900">
                    <span className="block text-lg font-bold text-emerald-600">{importSummary.imported}</span>
                    <span className="text-[10px] text-slate-500">Baru Ditambahkan</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-emerald-100 dark:border-emerald-900">
                    <span className="block text-lg font-bold text-indigo-600">{importSummary.updated}</span>
                    <span className="text-[10px] text-slate-500">Data Diperbarui</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded border border-emerald-100 dark:border-emerald-900">
                    <span className="block text-lg font-bold text-amber-600">{importSummary.skipped}</span>
                    <span className="text-[10px] text-slate-500">Dilewati / Kosong</span>
                  </div>
                </div>

                {importSummary.errors && importSummary.errors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 text-[11px] text-rose-700 space-y-0.5">
                    <span className="font-semibold block">Catatan Peringatan:</span>
                    {importSummary.errors.map((err: string, i: number) => (
                      <p key={i}>&bull; {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportSummary(null);
                }}
                disabled={isImporting}
                className="text-xs"
              >
                {importSummary ? 'Tutup' : 'Batal'}
              </Button>
              <Button
                type="submit"
                disabled={!importFile || isImporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs min-w-[130px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <FileUp className="w-3.5 h-3.5 mr-1.5" />
                    Mulai Import
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation Modal (Superadmin Only) */}
      <Dialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Konfirmasi Hapus Pelanggan
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data pelanggan{' '}
              <strong>{customerToDelete?.name}</strong> (
              <span className="font-mono font-semibold">{customerToDelete?.customer_code}</span>)?
              <br />
              <span className="text-rose-600 font-medium mt-2 block text-xs">
                Perhatian: Tindakan ini hanya dapat dilakukan oleh Superadmin dan akan menghapus data pelanggan dari database secara permanen.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomerToDelete(null)}
              disabled={deleteCustomerMutation.isPending}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => customerToDelete && deleteCustomerMutation.mutate(customerToDelete.id)}
              disabled={deleteCustomerMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteCustomerMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Pelanggan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
