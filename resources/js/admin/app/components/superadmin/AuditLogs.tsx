import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Calendar,
  Loader2,
  Users,
  Activity,
  Database,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';
import { apiClient } from '../../lib/api';
import { userToFrontend } from '../../lib/mappers';
import { useDebounce } from '../../hooks/useDebounce';

import { formatDate } from '../../lib/formatters';
export const AuditLogs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [userFilter, setUserFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Query users to populate causer filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list', { limit: 100 }],
    queryFn: async () => {
      const response = await apiClient.get<any>('/superadmin/users?per_page=100');
      return (response.data || []).map(userToFrontend);
    },
  });

  const users = usersData || [];

  // Query live audit logs with filters
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminAuditLogs', 'list', { page, causer: userFilter, event: eventFilter, model: modelFilter, search: debouncedSearch, dateFrom, dateTo, sortBy, sortOrder }],
    queryFn: async () => {
      let url = `/admin/audit-logs?page=${page}&per_page=15`;
      
      if (userFilter && userFilter !== 'all') url += `&causer_id=${userFilter}`;
      if (eventFilter && eventFilter !== 'all') url += `&event=${eventFilter}`;
      if (modelFilter && modelFilter !== 'all') url += `&subject_type=${encodeURIComponent(modelFilter)}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (sortBy) url += `&sort_by=${sortBy}`;
      if (sortOrder) url += `&sort_order=${sortOrder}`;
      
      const response = await apiClient.get<any>(url);
      return {
        logs: response.data || [],
        meta: response.meta || { current_page: 1, last_page: 1, total: 0 },
      };
    },
  });

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      sales: '#3b82f6',
      admin: '#10b981',
      teknisi: '#f59e0b',
      superadmin: '#ef4444',
    };
    return colors[role] || '#6b7280';
  };

  const getRoleBadge = (role: string) => {
    const color = getRoleBadgeColor(role);
    return (
      <Badge style={{ backgroundColor: `${color}20`, color: color }}>
        {role?.toUpperCase()}
      </Badge>
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data?.meta?.last_page || 1)) {
      setPage(newPage);
    }
  };

  const handleSortChange = (value: string) => { setSortBy(value); setPage(1); };
  const handleOrderChange = (value: string) => { setSortOrder(value); setPage(1); };
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => { setDateFrom(e.target.value); setPage(1); };
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => { setDateTo(e.target.value); setPage(1); };

  const filteredLogs = data?.logs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Log Audit Perubahan Sistem
        </h1>
        <p className="text-gray-500 dark:text-slate-400">
          Jejak audit trail terpusat atas aktivitas modifikasi database, validasi, dan penyelesaian instalasi.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari deskripsi aktivitas atau model ID..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Input type="date" value={dateFrom} onChange={handleDateFromChange} className="w-36" title="Dari Tanggal" />
                <Input type="date" value={dateTo} onChange={handleDateToChange} className="w-36" title="Sampai Tanggal" />
                
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Tanggal Dibuat</SelectItem>
                    <SelectItem value="event">Jenis Aksi</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={handleOrderChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Arah" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Terbaru</SelectItem>
                    <SelectItem value="asc">Terlama</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {/* Filter by User */}
              <Select value={userFilter} onValueChange={(val) => { setUserFilter(val); setPage(1); }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Pilih Aktor (User)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aktor</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nama_lengkap || u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter by Log Group Event */}
              <Select value={eventFilter} onValueChange={(val) => { setEventFilter(val); setPage(1); }}>
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Jenis Aksi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Aksi</SelectItem>
                  <SelectItem value="created">Dibuat</SelectItem>
                  <SelectItem value="updated">Diperbarui</SelectItem>
                  <SelectItem value="deleted">Dihapus</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter by Database Model Subject Type */}
              <Select value={modelFilter} onValueChange={(val) => { setModelFilter(val); setPage(1); }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Modul Sistem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Modul</SelectItem>
                  <SelectItem value="App\Models\User">Pengguna (User)</SelectItem>
                  <SelectItem value="App\Models\Submission">Pengajuan (Submission)</SelectItem>
                  <SelectItem value="App\Models\Provisioning">Provisi (Provisioning)</SelectItem>
                  <SelectItem value="App\Models\Task">Tugas (Task)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan Memuat Audit Logs</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Gagal terhubung dengan server logs.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium">Log Aktivitas Kosong</p>
              <p className="text-sm text-gray-400 mt-1">Tidak ada catatan audit yang cocok dengan filter aktif.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aktor / Staf</TableHead>
                    <TableHead>Deskripsi Perubahan</TableHead>
                    <TableHead>Model Subject Data</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any) => (
                    <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-800 dark:text-slate-100">
                            {log.causer?.name || 'Sistem'}
                          </p>
                          {log.causer?.roles?.[0] && (
                            <p className="text-xs">{getRoleBadge(log.causer.roles[0])}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-700">
                        {log.description}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">
                        {log.subject_type ? (
                          <span className="bg-gray-100 border px-2 py-1 rounded text-gray-700 block w-max">
                            {log.subject_type.split('\\').pop()} #{log.subject_id}
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold uppercase tracking-wider text-[10px] text-gray-500">
                          {log.event || log.log_name || 'default'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 flex items-center gap-1.5 pt-4">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDate(log.created_at)}
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
            Menampilkan halaman <span className="font-semibold">{page}</span> dari{' '}
            <span className="font-semibold">{data.meta.last_page}</span>
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
