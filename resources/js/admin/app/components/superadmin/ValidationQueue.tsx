import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
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
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { apiClient } from '../../lib/api';
import { reportService } from '../../lib/reportService';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { submissionToFrontend } from '../../lib/mappers';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../lib/formatters';

interface ValidationQueueProps {
  isEmbedded?: boolean;
}

export const ValidationQueue: React.FC<ValidationQueueProps> = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Query live admin submissions list
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminSubmissions', 'list', { page, status: statusFilter, search: debouncedSearch, dateFrom, dateTo, sortBy, sortOrder }],
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

  // Query stats totals from admin endpoint using status filter checks
  const { data: totalPending } = useQuery({
    queryKey: ['adminSubmissions', 'stats', 'pending'],
    queryFn: () => apiClient.get<any>('/submissions?status=pending&per_page=1'),
  });

  const { data: totalApproved } = useQuery({
    queryKey: ['adminSubmissions', 'stats', 'approved'],
    queryFn: () => apiClient.get<any>('/submissions?status=approved&per_page=1'),
  });

  const { data: totalRejected } = useQuery({
    queryKey: ['adminSubmissions', 'stats', 'rejected'],
    queryFn: () => apiClient.get<any>('/submissions?status=rejected&per_page=1'),
  });

  const { data: totalNeedInfo } = useQuery({
    queryKey: ['adminSubmissions', 'stats', 'need_info'],
    queryFn: () => apiClient.get<any>('/submissions?status=need_info&per_page=1'),
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Menunggu', color: '#f59e0b' },
      draft: { label: 'Draft', color: '#6b7280' },
      submitted: { label: 'Terkirim', color: '#3b82f6' },
      pending_validation: { label: 'Menunggu', color: '#f59e0b' },
      in_review: { label: 'Sedang Ditinjau', color: '#3b82f6' },
      approved: { label: 'Disetujui', color: '#10b981' },
      rejected: { label: 'Ditolak', color: '#ef4444' },
      need_info: { label: 'Butuh Info', color: '#f59e0b' },
      completed: { label: 'Selesai', color: '#10b981' },
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </Badge>
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

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const handleOrderChange = (value: string) => {
    setSortOrder(value);
    setPage(1);
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    setPage(1);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    setPage(1);
  };

  const filteredSubmissions = data?.submissions || [];

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      toast.info('Menyiapkan Laporan Excel...', { description: 'Mengunduh data pengajuan dari server...' });
      await reportService.exportSubmissionsExcel(statusFilter !== 'all' ? statusFilter : undefined);
      toast.success('Ekspor Excel Berhasil', { description: 'File Laporan_Pengajuan.xlsx telah diunduh.' });
    } catch (err: any) {
      toast.error('Ekspor Excel Gagal', { description: err?.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!isEmbedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
              Antrian Validasi Admin
            </h1>
            <p className="text-gray-500 dark:text-slate-400">
              Monitor, tinjau, dan setujui/tolak pengajuan baru dari Sales.
            </p>
          </div>

          {/* Excel Export Button (Restricted to Admin & Superadmin) */}
          <Button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-sm shrink-0"
          >
            {isExportingExcel ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengunduh...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Ekspor Excel (.xlsx)
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Daftar Antrean Validasi Berkas Pelanggan
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tinjau dokumen KTP dan foto lokasi untuk memvalidasi persetujuan pengajuan baru.
            </p>
          </div>
          <Button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3.5 rounded-lg shadow-sm shrink-0"
          >
            {isExportingExcel ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Mengunduh...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                Ekspor Excel (.xlsx)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Menunggu Validasi</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>
                  {totalPending?.meta?.total ?? 0}
                </p>
              </div>
              <Clock className="w-8 h-8 opacity-40" style={{ color: '#f59e0b' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Butuh Info Tambahan</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>
                  {totalNeedInfo?.meta?.total ?? 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 opacity-40" style={{ color: '#3b82f6' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Disetujui</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>
                  {totalApproved?.meta?.total ?? 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 opacity-40" style={{ color: '#10b981' }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Total Ditolak</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#ef4444' }}>
                  {totalRejected?.meta?.total ?? 0}
                </p>
              </div>
              <XCircle className="w-8 h-8 opacity-40" style={{ color: '#ef4444' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan nomor pengajuan atau nama pelanggan..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <Input type="date" value={dateFrom} onChange={handleDateFromChange} className="w-36" title="Dari Tanggal" />
              <Input type="date" value={dateTo} onChange={handleDateToChange} className="w-36" title="Sampai Tanggal" />
              
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Urutkan Berdasarkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Tanggal Dibuat</SelectItem>
                  <SelectItem value="submission_number">No Pengajuan</SelectItem>
                  <SelectItem value="customer_name">Nama Pelanggan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={handleOrderChange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Urutan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Terbaru</SelectItem>
                  <SelectItem value="asc">Terlama</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="w-full md:w-56">
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Menunggu Validasi</SelectItem>
                    <SelectItem value="need_info">Butuh Info</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error View */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat memuat data.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Grid Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data || filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium">Antrian validasi kosong</p>
              <p className="text-sm text-gray-400 mt-1">Tidak ada pengajuan yang membutuhkan tindakan saat ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pengajuan</TableHead>
                    <TableHead>Nama Pelanggan</TableHead>
                    <TableHead>KTP</TableHead>
                    <TableHead>Paket Layanan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Diajukan Tanggal</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.map((sub: any) => (
                    <TableRow key={sub.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer" onClick={() => navigate(`/submissions/${sub.id}`)}>
                      <TableCell className="font-semibold">{sub.submissionNumber}</TableCell>
                      <TableCell>{sub.customer.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {sub.customer.ktp.slice(0, 6) + '**********'}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-800 dark:text-slate-100">{sub.package.name}</span>
                        <span className="text-xs text-gray-400 block">{sub.package.speed}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(sub.createdAt)}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); navigate(`/submissions/${sub.id}`); }}
                          className="bg-blue-50/60 hover:bg-blue-600 hover:text-white border-blue-200 text-blue-700 text-xs font-semibold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Validasi Pengajuan
                        </Button>
                        {sub.taskId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${sub.taskId}`); }}
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Progress Tim
                          </Button>
                        )}
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
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white border rounded-lg p-4 gap-4">
          <div className="text-sm text-gray-500">
            Menampilkan <span className="font-semibold">{data.meta.to ? (data.meta.to - data.meta.from + 1) : 0}</span> dari{' '}
            <span className="font-semibold">{data.meta.total}</span> data
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Halaman <span className="font-semibold">{page}</span> dari{' '}
              <span className="font-semibold">{data.meta.last_page}</span>
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.meta.last_page}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
