import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Clock,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { apiClient } from '../../lib/api';
import { userToFrontend } from '../../lib/mappers';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  PageHeader, 
  FilterBar, 
  DataTable, 
  ColumnDef 
} from '@shared/ui';
import { ACTIONS, TERMS, MESSAGES } from '@shared/i18n/id';
import { formatDateTime } from '@shared/lib/formatters';

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
      const response = await apiClient.get<any>('/users?per_page=100');
      return (response.data || []).map(userToFrontend);
    },
  });

  const users = usersData || [];

  // Query live audit logs with filters
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminAuditLogs', 'list', { page, causer: userFilter, event: eventFilter, model: modelFilter, search: debouncedSearch, dateFrom, dateTo, sortBy, sortOrder }],
    queryFn: async () => {
      let url = `/audit-logs?page=${page}&per_page=15`;
      
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

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; badgeClass: string }> = {
      sales: { label: 'Sales', badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
      admin: { label: 'Admin', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
      teknisi: { label: 'Teknisi', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
      superadmin: { label: 'Superadmin', badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
    };

    const normRole = (role || '').toLowerCase();
    const config = roleConfig[normRole] || { label: role || 'Pengguna', badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800' };

    return (
      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium border ${config.badgeClass}`}>
        {config.label}
      </span>
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setUserFilter('all');
    setEventFilter('all');
    setModelFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'causer',
      header: 'Aktor / Staf',
      render: (log) => (
        <div className="space-y-1">
          <p className="font-semibold text-sm text-foreground">
            {log.causer?.name || 'Sistem'}
          </p>
          {log.causer?.roles?.[0] && (
            <div>{getRoleBadge(log.causer.roles[0])}</div>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Deskripsi Perubahan',
      render: (log) => (
        <span className="font-medium text-sm text-foreground">
          {log.description}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Model Subject Data',
      render: (log) => (
        log.subject_type ? (
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border inline-block">
            {log.subject_type.split('\\').pop()} #{log.subject_id}
          </span>
        ) : '-'
      ),
    },
    {
      key: 'event',
      header: 'Kategori Aksi',
      render: (log) => (
        <Badge variant="outline" className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">
          {log.event || log.log_name || 'default'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Waktu Log',
      render: (log) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5 opacity-60" />
          <span>{formatDateTime(log.created_at)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Log Audit Perubahan Sistem"
        description="Jejak audit trail terpusat atas aktivitas modifikasi database, validasi, dan penyelesaian instalasi sistem Fibermedia-Ops."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {ACTIONS.reload}
          </Button>
        }
      />

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
        searchPlaceholder="Cari deskripsi aktivitas atau model ID..."
        onReset={handleResetFilters}
      >
        <Input 
          type="date" 
          value={dateFrom} 
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} 
          className="w-36 text-xs" 
          title="Dari Tanggal" 
        />
        <Input 
          type="date" 
          value={dateTo} 
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }} 
          className="w-36 text-xs" 
          title="Sampai Tanggal" 
        />
        
        <Select value={userFilter} onValueChange={(val) => { setUserFilter(val); setPage(1); }}>
          <SelectTrigger className="w-44 text-xs">
            <SelectValue placeholder="Pilih Aktor" />
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

        <Select value={eventFilter} onValueChange={(val) => { setEventFilter(val); setPage(1); }}>
          <SelectTrigger className="w-32 text-xs">
            <SelectValue placeholder="Semua Aksi" />
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

        <Select value={modelFilter} onValueChange={(val) => { setModelFilter(val); setPage(1); }}>
          <SelectTrigger className="w-44 text-xs">
            <SelectValue placeholder="Semua Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Modul</SelectItem>
            <SelectItem value="App\Models\User">Pengguna (User)</SelectItem>
            <SelectItem value="App\Models\Submission">Pengajuan (Submission)</SelectItem>
            <SelectItem value="App\Models\Provisioning">Work Order (Provisioning)</SelectItem>
            <SelectItem value="App\Models\Task">Work Order (Task)</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Error Alert */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan Memuat Audit Logs</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Gagal terhubung dengan server logs.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> {ACTIONS.reload}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Audit Logs Data Table */}
      <DataTable
        data={data?.logs || []}
        columns={columns}
        keyExtractor={(log, idx) => log.id || idx}
        isLoading={isLoading}
        onReload={() => refetch()}
        emptyTitle="Log Aktivitas Kosong"
        emptyDescription="Tidak ada catatan audit yang cocok dengan kriteria filter saat ini."
        pagination={{
          currentPage: page,
          totalPages: data?.meta?.last_page || 1,
          totalItems: data?.meta?.total || 0,
          perPage: 15,
          onPageChange: setPage,
        }}
      />
    </div>
  );
};

export default AuditLogs;
