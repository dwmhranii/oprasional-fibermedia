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
  Clock,
  CheckCircle,
  XCircle,
  Wrench,
  Loader2,
  Calendar,
  RefreshCw,
  Users
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { apiClient } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { useAuth } from '../../context/AuthContext';

import { formatDate } from '../../lib/formatters';
export const TaskList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Query live tasks list
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['tasks', 'list', user?.id, { page, status: statusFilter, search: debouncedSearch, dateFrom, dateTo, sortBy, sortOrder }],
    queryFn: async () => {
      let url = `/teknisi/tasks?page=${page}&per_page=10`;
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
      return {
        tasks: response.data || [],
        meta: response.meta || { current_page: 1, last_page: 1, total: (response.data || []).length, from: 1, to: (response.data || []).length },
      };
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      assigned: { label: 'Assigned', color: '#3b82f6' },
      on_the_way: { label: 'On The Way', color: '#8b5cf6' },
      in_progress: { label: 'In Progress', color: '#f59e0b' },
      phase_1_submitted: { label: 'Fase 1 Selesai (Menunggu Absen)', color: '#0d9488' },
      phase_2_complete: { label: 'Fase 2 Selesai', color: '#0ea5e9' },
      submitted: { label: 'Submitted (Menunggu Persetujuan Admin)', color: '#6366f1' },
      completed: { label: 'Completed', color: '#10b981' },
      failed: { label: 'Failed', color: '#ef4444' },
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

  const filteredTasks = data?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Daftar Tugas Saya
        </h1>
        <p className="text-gray-500 dark:text-slate-400">
          Cek detail jadwal pemasangan baru dan status progress pengerjaan teknisi.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari berdasarkan nomor tugas, nama pelanggan, atau alamat..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Input type="date" value={dateFrom} onChange={handleDateFromChange} className="w-36" title="Dari Tanggal" />
              <Input type="date" value={dateTo} onChange={handleDateToChange} className="w-36" title="Sampai Tanggal" />
              
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Tanggal Dibuat</SelectItem>
                  <SelectItem value="task_number">No Tugas</SelectItem>
                  <SelectItem value="customer_name">Nama Pelanggan</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={handleOrderChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Terbaru</SelectItem>
                  <SelectItem value="asc">Terlama</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex-1 min-w-[200px]">
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="on_the_way">On The Way</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="phase_1_submitted">Fase 1 Selesai</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Banner */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat mengambil list tugas teknisi dari backend.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium">Belum ada tugas instalasi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Tugas</TableHead>
                    <TableHead>Tim & Teknisi Field</TableHead>
                    <TableHead>Nama Pelanggan</TableHead>
                    <TableHead>Alamat Pemasangan</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Jadwal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task: any) => {
                    // Extract Team Name dynamically from backend fields
                    const rawTeam = task.assigned_team || task.team || task.team_name || task.assignments?.[0]?.team || task.all_assignments?.[0]?.team || task.team_code;
                    let teamName = '';
                    if (typeof rawTeam === 'string' && rawTeam.trim()) {
                      teamName = rawTeam;
                    } else if (typeof rawTeam === 'object' && rawTeam !== null) {
                      teamName = rawTeam.name || rawTeam.team_name || rawTeam.code || '';
                    }
                    if (!teamName) teamName = '-';

                    // Extract Assignments & Technician Names from all_assignments / assignments / technicians / users
                    const rawAssignments = task.all_assignments || task.assignments || task.task_assignments || task.technicians || task.assigned_users || task.users || [];
                    let techNames: string[] = [];

                    if (Array.isArray(rawAssignments) && rawAssignments.length > 0) {
                      techNames = rawAssignments
                        .map((a: any) => {
                          if (typeof a === 'string') return a;
                          return (
                            a.user?.name ||
                            a.user?.nama_lengkap ||
                            a.technician?.name ||
                            a.technician_name ||
                            a.user_name ||
                            a.name ||
                            (a.user_id ? `Teknisi ${a.user_id}` : '')
                          );
                        })
                        .filter((n: string) => Boolean(n) && n !== '-');
                    } else if (task.current_assignment?.user?.name) {
                      techNames = [task.current_assignment.user.name];
                    } else if (task.user?.name) {
                      techNames = [task.user.name];
                    } else if (task.technician_name) {
                      techNames = [task.technician_name];
                    }

                    if (techNames.length === 0 && Array.isArray(rawAssignments) && rawAssignments.length > 0) {
                      techNames = rawAssignments.map((a: any, idx: number) => a.user_id ? `Teknisi ${a.user_id}` : `Teknisi ${idx + 1}`);
                    }

                    return (
                      <TableRow key={task.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors" onClick={() => navigate(`/teknisi/tasks/${task.id}`)}>
                        <TableCell className="font-semibold font-mono text-sm">
                          {task.task_number || `TSK-${task.id}`}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                              <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{teamName}</span>
                            </div>
                            {techNames.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {techNames.map((name, idx) => (
                                  <span key={idx} className="bg-indigo-50 text-indigo-700 font-medium text-[11px] px-1.5 py-0.5 rounded border border-indigo-100">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-400 italic">Belum ditugaskan</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-800">
                          {task.customer?.name || '-'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {task.customer?.address || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-gray-700">
                          {task.customer?.phone || '-'}
                        </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(task.scheduled_date)}
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); navigate(`/teknisi/tasks/${task.id}`); }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detail
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/tasks/${task.id}`); }}
                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          >
                            <Users className="w-4 h-4 mr-1" />
                            Review Task
                          </Button>
                        )}
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
