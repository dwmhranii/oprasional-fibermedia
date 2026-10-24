import React, { useState } from 'react';
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
  Database,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  Wifi,
  Filter,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { apiClient } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../lib/formatters';

interface ProvisioningManagementProps {
  isEmbedded?: boolean;
}

export const ProvisioningManagement: React.FC<ProvisioningManagementProps> = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bfassStatusFilter, setBfassStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

  // Query live provisioning list
  const { data, isLoading, isRefetching, isError, error, refetch } = useQuery({
    queryKey: [
      'adminProvisionings',
      'list',
      {
        page,
        status: statusFilter,
        bfass_status: bfassStatusFilter,
        search: debouncedSearch,
        sortOrder,
      },
    ],
    queryFn: async () => {
      let url = `/admin/provisionings?page=${page}&per_page=10`;
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (bfassStatusFilter && bfassStatusFilter !== 'all') {
        url += `&bfass_status=${bfassStatusFilter}`;
      }
      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (sortOrder) {
        url += `&sort_order=${sortOrder}`;
      }
      const response = await apiClient.get<any>(url);
      const items = response.data || response.items || (Array.isArray(response) ? response : []);
      return {
        provisionings: items,
        meta: response.meta || { current_page: 1, last_page: 1, total: items.length },
      };
    },
  });

  const provisioningsList = data?.provisionings || [];
  const metaData = data?.meta || { current_page: 1, last_page: 1, total: 0 };

  // Calculate statistics directly from loaded data or fallback API counts
  const totalCount = metaData.total || provisioningsList.length;
  const successCount = provisioningsList.filter(
    (p: any) => p.status === 'success' || p.status === 'completed'
  ).length;
  const pendingCount = provisioningsList.filter(
    (p: any) => p.status === 'pending' || p.status === 'processing' || p.status === 'ready'
  ).length;
  const failedCount = provisioningsList.filter(
    (p: any) => p.status === 'failed' || p.bfass_status === 'failed'
  ).length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBfassStatusFilter('all');
    setSortOrder('desc');
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 font-bold">
            Success
          </Badge>
        );
      case 'processing':
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 font-medium">
            Processing
          </Badge>
        );
      case 'ready':
      case 'pending':
        return (
          <Badge className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 font-medium">
            Pending Queue
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60 font-bold">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline" className="capitalize dark:border-slate-700 dark:text-slate-300">{status || 'Draft'}</Badge>;
    }
  };

  const getBfassBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'synced':
      case 'active':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 font-semibold"
          >
            BFASS Synced
          </Badge>
        );
      case 'pending':
      case 'ready':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 font-medium"
          >
            BFASS Pending
          </Badge>
        );
      case 'failed':
      case 'error':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50 font-bold"
          >
            BFASS Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
            {status || 'Unsynced'}
          </Badge>
        );
    }
  };

  const formatBandwidth = (up?: any, down?: any) => {
    if (!up && !down) return <span className="text-gray-400 text-xs font-normal">-</span>;
    const formatSpeed = (val: any) => {
      if (!val) return '0';
      const num = Number(val);
      return num >= 1000 ? `${(num / 1000).toFixed(0)}M` : `${num}K`;
    };
    return (
      <div className="font-mono text-xs font-semibold whitespace-nowrap">
        <span className="text-emerald-600">↑ {formatSpeed(up)}</span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-blue-600">↓ {formatSpeed(down)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      {!isEmbedded ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 p-6 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Provisioning</h1>
              <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                <Server className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
                BFASS & NAS Node
              </Badge>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Kelola akun sinkronisasi kredensial BFASS dan server konfigurasi jaringan pelanggan.
            </p>
          </div>

          {/* Create New Action Button */}
          <Button
            onClick={() => navigate('/admin/provisionings/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Provisi Pengajuan Baru
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Daftar Provisi Jaringan & BFASS
              <Badge className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px]">
                <Server className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
                BFASS & NAS
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pantau status profil bandwidth dan sinkronisasi server jaringan pelanggan terprovisi.
            </p>
          </div>

          <Button
            onClick={() => navigate('/admin/provisionings/create')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Provisi Pengajuan Baru
          </Button>
        </div>
      )}

      {/* Global Error Boundary */}
      {isError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data Provisioning</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat backend.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Provisi</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalCount}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Berhasil</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{successCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Antrean Pending</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gagal Sinkron</p>
              <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{failedCount}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-sm border-gray-200 dark:border-slate-800 dark:bg-slate-900/80 overflow-hidden">
        {/* Unified Filter Toolbar */}
        <CardHeader className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-950/60 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">Daftar Akun Provisioning</CardTitle>
              <CardDescription className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Kelola status kredensial NAS router dan sinkronisasi sistem BFASS.
              </CardDescription>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-xs h-9 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh Table
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Cari no. provisi, sub ID, nama pelanggan, ODP..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs h-9 bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Status Provisi Select */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs h-9 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <SelectValue placeholder="Status Provisi" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                <SelectItem value="all">Semua Status Provisi</SelectItem>
                <SelectItem value="pending">Pending Queue</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Status BFASS Select */}
            <Select
              value={bfassStatusFilter}
              onValueChange={(val) => {
                setBfassStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs h-9 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <SelectValue placeholder="Status BFASS" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                <SelectItem value="all">Semua Status BFASS</SelectItem>
                <SelectItem value="active">BFASS Synced / Active</SelectItem>
                <SelectItem value="pending">BFASS Pending</SelectItem>
                <SelectItem value="failed">BFASS Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        {/* Table Body */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 space-y-3">
              <Skeleton className="h-10 w-full dark:bg-slate-800" />
              <Skeleton className="h-10 w-full dark:bg-slate-800" />
              <Skeleton className="h-10 w-full dark:bg-slate-800" />
            </div>
          ) : provisioningsList.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Database className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-700 mb-2" />
              <p className="text-base font-bold text-gray-700 dark:text-slate-300">Belum ada data provisi</p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Klik 'Provisi Pengajuan Baru' untuk menghubungkan pengajuan ke router BFASS.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <Table className="w-full table-fixed text-[11px]">
                <TableHeader className="bg-slate-100/80 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-2 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider w-[22%]">
                      NO. PROVISI & SUB ID
                    </TableHead>
                    <TableHead className="px-2 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider w-[22%]">
                      NAMA PELANGGAN
                    </TableHead>
                    <TableHead className="px-1.5 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider w-[12%]">
                      ODP
                    </TableHead>
                    <TableHead className="px-1.5 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider w-[13%]">
                      PROVISI STATUS
                    </TableHead>
                    <TableHead className="px-1.5 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider w-[13%]">
                      BFASS STATUS
                    </TableHead>
                    <TableHead className="px-2 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider w-[12%]">
                      TANGGAL DIBUAT
                    </TableHead>
                    <TableHead className="px-2 py-2.5 text-[10px] font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider text-right w-[6%]">
                      AKSI
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {provisioningsList.map((prov: any) => {
                    const displayOdp = prov.odp || prov.bfass_response?.manual_provisioning?.odp || '-';
                    const customerName =
                      prov.submission?.customer_name ||
                      prov.customer_name ||
                      prov.submission?.name ||
                      prov.submission?.customer?.name ||
                      prov.user?.name ||
                      '-';
                    const customerPhone =
                      prov.submission?.phone ||
                      prov.phone ||
                      prov.submission?.customer?.phone ||
                      '';

                    return (
                      <TableRow
                        key={prov.id}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors duration-150"
                      >
                        {/* No. Provisi */}
                        <TableCell className="px-2 py-2.5 align-middle">
                          <div className="space-y-0.5 truncate">
                            <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/70 inline-block truncate max-w-full">
                              {prov.provisioning_number || `PRV-${prov.id}`}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono block truncate">
                              Sub ID: #{prov.submission_id || '-'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Nama Pelanggan */}
                        <TableCell className="px-2 py-2.5 align-middle">
                          <div className="space-y-0.5 truncate">
                            <span className="font-semibold text-[11px] text-gray-900 dark:text-slate-200 block truncate" title={customerName}>
                              {customerName}
                            </span>
                            {customerPhone && (
                              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-mono block truncate">
                                {customerPhone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* ODP */}
                        <TableCell className="px-1.5 py-2.5 align-middle font-mono text-[11px] text-gray-800 dark:text-slate-300 truncate">
                          {displayOdp}
                        </TableCell>

                        {/* Status Provisi */}
                        <TableCell className="px-1.5 py-2.5 align-middle">
                          {getStatusBadge(prov.status)}
                        </TableCell>

                        {/* Status BFASS */}
                        <TableCell className="px-1.5 py-2.5 align-middle">
                          <div className="space-y-0.5">
                            {getBfassBadge(prov.bfass_status)}
                            {prov.bfass_status === 'failed' && (
                              <span className="text-[9px] text-red-500 dark:text-red-400 block font-medium">
                                Retry: {prov.retry_count || 0}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Tanggal Dibuat */}
                        <TableCell className="px-2 py-2.5 align-middle text-[10px] text-gray-600 dark:text-slate-400 font-medium">
                          {formatDate(prov.created_at || new Date().toISOString())}
                        </TableCell>

                        {/* Aksi Button */}
                        <TableCell className="px-2 py-2.5 align-middle text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => navigate(`/admin/provisionings/${prov.id}`)}
                            className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700"
                            title="Detail Provisioning"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
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

      {/* Pagination Footer */}
      {metaData.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 rounded-xl p-4 gap-4 shadow-sm text-gray-500 dark:text-slate-400">
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Menampilkan <span className="font-semibold text-gray-900 dark:text-slate-200">{provisioningsList.length}</span> dari{' '}
            <span className="font-semibold text-gray-900 dark:text-slate-200">{metaData.total}</span> data provisi
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="h-8 text-xs dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Sebelumnya
            </Button>
            <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 px-2">
              {page} / {metaData.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(metaData.last_page, page + 1))}
              disabled={page === metaData.last_page}
              className="h-8 text-xs dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
