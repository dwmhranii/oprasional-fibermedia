import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  RefreshCw,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Wifi,
  Phone,
  MessageSquare,
  Sparkles,
  Edit3,
  Trash2,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { apiClient } from '../../lib/api';
import { reportService } from '../../lib/reportService';
import { submissionToFrontend } from '../../lib/mappers';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { formatDate } from '../../lib/formatters';

export const SubmissionList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrSuperadmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.roles?.includes('Admin') || user?.roles?.includes('Superadmin') || user?.roles?.includes('superadmin');
  const isSuperadmin = user?.role === 'superadmin' || user?.roles?.includes('Superadmin') || user?.roles?.includes('superadmin');

  const handleDelete = async (id: number | string, subNumber: string) => {
    const isConfirmed = window.confirm(`Yakin ingin menghapus pengajuan ${subNumber || `#${id}`}?`);
    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/submissions/${id}`);
      toast.success('Pengajuan berhasil dihapus!');
      refetch();
    } catch (error: any) {
      if (error?.status === 403) {
        toast.error('Akses Ditolak: Hanya Superadmin yang diizinkan menghapus pengajuan.');
      } else {
        toast.error('Terjadi kesalahan saat menghapus pengajuan.');
      }
    }
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Query submissions with pagination and backend parameters
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'salesSubmissions',
      'list',
      { page, status: statusFilter, search: debouncedSearch, dateFrom, dateTo, sortBy, sortOrder },
    ],
    queryFn: async () => {
      let url = `/submissions?page=${page}&per_page=10`;
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (dateFrom) {
        url += `&date_from=${dateFrom}`;
      }
      if (dateTo) {
        url += `&date_to=${dateTo}`;
      }
      if (sortBy) {
        url += `&sort_by=${sortBy}`;
      }
      if (sortOrder) {
        url += `&sort_order=${sortOrder}`;
      }
      const response = await apiClient.get<any>(url);

      const items = response.data || [];
      return {
        submissions: items.map(submissionToFrontend),
        meta: response.meta || { current_page: 1, last_page: 1, total: items.length },
      };
    },
  });

  const submissions = data?.submissions || [];

  // Summary Metrics Calculation
  const stats = useMemo(() => {
    const total = data?.meta?.total || submissions.length;
    const pending = submissions.filter((s: any) =>
      ['pending', 'pending_validation', 'in_review', 'submitted'].includes(s.status)
    ).length;
    const approved = submissions.filter((s: any) =>
      ['approved', 'provisioning', 'provisioned', 'completed'].includes(s.status)
    ).length;
    const rejected = submissions.filter((s: any) =>
      ['rejected', 'need_info'].includes(s.status)
    ).length;

    return { total, pending, approved, rejected };
  }, [data, submissions]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; bg: string; text: string; border: string }
    > = {
      pending: { label: 'Menunggu Validasi', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
      submitted: { label: 'Terkirim', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      pending_validation: { label: 'Menunggu Validasi', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
      in_review: { label: 'Sedang Ditinjau', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      approved: { label: 'Disetujui', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      rejected: { label: 'Ditolak', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      need_info: { label: 'Butuh Info', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
      provisioning: { label: 'Proses Provisi', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      provisioned: { label: 'Terprovisi', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      completed: { label: 'Selesai / Aktif', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    };

    const config = statusConfig[status] || {
      label: status,
      bg: 'bg-gray-50',
      text: 'text-gray-700',
      border: 'border-gray-200',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {config.label}
      </span>
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data?.meta?.last_page || 1)) {
      setPage(newPage);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      toast.info('Menyiapkan Laporan Excel...', {
        description: 'Mengunduh data pengajuan dari server...',
      });
      await reportService.exportSubmissionsExcel(statusFilter !== 'all' ? statusFilter : undefined);
      toast.success('Ekspor Excel Berhasil', {
        description: 'File Laporan_Pengajuan.xlsx telah diunduh.',
      });
    } catch (err: any) {
      toast.error('Ekspor Excel Gagal', {
        description: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Daftar Pengajuan Pelanggan
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Kelola, filter, dan pantau status seluruh pengajuan pendaftaran internet baru
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdminOrSuperadmin && (
            <Button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              variant="outline"
              className="border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs h-9 shadow-xs flex items-center gap-2"
            >
              {isExportingExcel ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              )}
              Ekspor Excel
            </Button>
          )}

          <Button
            onClick={() => navigate('/submissions/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Pengajuan Baru
          </Button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Pengajuan</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Menunggu Validasi</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Disetujui / Selesai</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Ditolak / Perlu Info</p>
              <p className="text-2xl font-black text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari nomor pengajuan, nama pelanggan, KTP, atau telepon..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-36 text-xs h-9"
                title="Dari Tanggal"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-36 text-xs h-9"
                title="Sampai Tanggal"
              />

              <div className="w-36">
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Menunggu Validasi</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                    <SelectItem value="need_info">Butuh Info</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data Pengajuan</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil data dari server.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data || submissions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 text-sm">Tidak ada pengajuan ditemukan</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian atau filter status yang Anda pilih.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="text-xs">
                <TableHeader className="bg-gray-50/80 dark:bg-slate-950/80">
                  <TableRow className="border-b border-gray-200 dark:border-slate-800">
                    <TableHead className="py-3 px-4 text-gray-700 dark:text-slate-300">No. Pengajuan</TableHead>
                    <TableHead className="py-3 px-4 text-gray-700 dark:text-slate-300">Nama Pelanggan & Kontak</TableHead>
                    <TableHead className="py-3 px-4 text-gray-700 dark:text-slate-300">NIK KTP</TableHead>
                    <TableHead className="py-3 px-4 text-gray-700 dark:text-slate-300">Paket Layanan</TableHead>
                    <TableHead className="py-3 px-4 text-gray-700 dark:text-slate-300">Status</TableHead>
                    <TableHead className="py-3 px-4 text-gray-700 dark:text-slate-300">Tanggal Dibuat</TableHead>
                    <TableHead className="py-3 px-4 text-right text-gray-700 dark:text-slate-300">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {submissions.map((sub: any) => (
                    <TableRow key={sub.id} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/60 transition-colors border-b border-gray-100 dark:border-slate-800/80">
                      <TableCell className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        {sub.submissionNumber}
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{sub.customer?.name || '-'}</p>
                        <p className="text-gray-500 text-[11px] mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          +62{sub.customer?.phone || '-'}
                          {sub.customer?.whatsapp && (
                            <span className="text-green-600 font-semibold text-[10px] bg-green-50 px-1 rounded">
                              WA
                            </span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 font-mono text-gray-600">
                        {sub.customer?.ktp ? `${sub.customer.ktp.slice(0, 6)}**********` : '-'}
                      </TableCell>
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1">
                          <Wifi className="w-3.5 h-3.5 text-blue-500" />
                          {sub.package?.name || 'Paket Internet'}
                        </div>
                        {sub.package?.speed && (
                          <div className="text-[11px] text-gray-500 font-semibold">
                            {sub.package.speed}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4">{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="py-3.5 px-4 text-gray-500 text-[11px]">
                        {formatDate(sub.createdAt)}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/submissions/${sub.id}`)}
                            className="bg-blue-50/60 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs font-semibold h-8 px-3"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Detail Pengajuan
                          </Button>
                          {isSuperadmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(sub.id, sub.submissionNumber)}
                              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold h-8 px-2"
                              title="Hapus Submission (Superadmin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {data && data.meta && data.meta.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-gray-200 rounded-xl p-4 gap-4 text-xs">
          <div className="text-gray-500">
            Menampilkan <span className="font-bold text-gray-900">{data.meta.to ? data.meta.to - data.meta.from + 1 : 0}</span> dari{' '}
            <span className="font-bold text-gray-900">{data.meta.total}</span> total data pengajuan
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="h-8 text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Sebelum
            </Button>
            <span className="text-gray-700 font-medium">
              Halaman <span className="font-bold text-blue-600">{page}</span> dari{' '}
              <span className="font-bold">{data.meta.last_page}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.meta.last_page}
              className="h-8 text-xs"
            >
              Sesudah <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
