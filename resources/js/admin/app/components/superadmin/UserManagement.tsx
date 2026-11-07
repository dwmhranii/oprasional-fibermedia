import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Plus,
  Edit,
  MoreVertical,
  Mail,
  Phone,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  KeyRound,
  Ban,
  CheckCircle2,
  Users,
  Trash2,
  AlertCircle,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { apiClient, ApiError } from '../../lib/api';
import { userToFrontend } from '../../lib/mappers';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  PageHeader, 
  StatCards, 
  FilterBar, 
  StatusBadge, 
  ConfirmDialog, 
  showToast 
} from '@shared/ui';
import { ACTIONS, TERMS, MESSAGES } from '@shared/i18n/id';
import { formatPhone } from '@shared/lib/formatters';

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Dialog Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<Record<string, string[]>>({});

  // Confirm delete dialog state
  const [deleteTargetUser, setDeleteTargetUser] = useState<any>(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'sales',
    status: 'active',
    password: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'sales',
    status: 'active',
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    password_confirmation: '',
  });

  // Role switcher modal state
  const [roleModalUser, setRoleModalUser] = useState<any>(null);
  const [targetRole, setTargetRole] = useState<string>('');

  const { data: availableRolesData } = useQuery({
    queryKey: ['access-roles-list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/roles');
      return (Array.isArray(res) ? res : res?.data || []) as any[];
    },
  });
  const availableRoles = availableRolesData || [];

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiClient.patch(`/users/${userId}/role`, { role });
    },
    onSuccess: (res: any) => {
      showToast.success(res?.message || 'Role pengguna berhasil diubah!');
      setRoleModalUser(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    },
    onError: (err: any) => {
      showToast.error(err?.response?.data?.message || 'Gagal mengubah role pengguna.');
    },
  });

  // Query users
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminUsers', page, debouncedSearch, roleFilter, statusFilter, dateFrom, dateTo, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '10');
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (sortBy) params.append('sort_by', sortBy);
      if (sortOrder) params.append('sort_order', sortOrder);

      const response = await apiClient.get<any>(`/users?${params.toString()}`);
      const rawList = Array.isArray(response) ? response : (response?.data || []);
      return {
        users: rawList.map(userToFrontend),
        meta: response?.meta || {
          current_page: 1,
          last_page: 1,
          per_page: 10,
          total: rawList.length,
        },
      };
    },
  });

  // Query stats
  const { data: allUsersData, isLoading: isStatsLoading, isError: isStatsError, error: statsError } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/users?per_page=100');
      const rawList = Array.isArray(response) ? response : (response?.data || []);
      return rawList.map(userToFrontend);
    },
  });

  const stats = {
    total: allUsersData?.length || 0,
    sales: allUsersData?.filter((u: any) => u.role?.toLowerCase() === 'sales').length || 0,
    admin: allUsersData?.filter((u: any) => u.role?.toLowerCase() === 'admin').length || 0,
    teknisi: allUsersData?.filter((u: any) => u.role?.toLowerCase() === 'teknisi').length || 0,
    active: allUsersData?.filter((u: any) => u.status === 'active').length || 0,
  };

  const isAnyError = isError || isStatsError;
  const activeError = error || statsError;

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    queryClient.invalidateQueries({ queryKey: ['users', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['access-roles-list'] });
    refetch();
  };

  const getRoleBadge = (role: string) => {
    const normRole = (role || '').toLowerCase();
    const roleConfig: Record<string, { label: string; badgeClass: string }> = {
      sales: { label: 'Sales', badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
      admin: { label: 'Admin', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
      'admin/cs': { label: 'Admin / CS', badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
      teknisi: { label: 'Teknisi', badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
      superadmin: { label: 'Superadmin', badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
      noc: { label: 'NOC Dispatcher', badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
      'noc/dispatcher': { label: 'NOC Dispatcher', badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
      collector: { label: 'Kolektor', badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
    };

    const config = roleConfig[normRole] || { label: role || 'Pengguna', badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400 border-slate-200 dark:border-slate-800' };

    return (
      <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full font-medium border ${config.badgeClass}`}>
        {config.label}
      </span>
    );
  };

  const mapRoleToBackend = (frontendRole: string): string => {
    const mapping: Record<string, string> = {
      sales: 'Sales',
      admin: 'Admin',
      teknisi: 'Teknisi',
      superadmin: 'Superadmin',
      Sales: 'Sales',
      Admin: 'Admin',
      Teknisi: 'Teknisi',
      Superadmin: 'Superadmin',
    };
    return mapping[frontendRole] || frontendRole;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setBackendErrors({});

    const payload: any = {
      name: createForm.name.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: mapRoleToBackend(createForm.role),
    };

    if (createForm.username?.trim()) {
      payload.username = createForm.username.trim();
    }
    if (createForm.phone?.trim()) {
      payload.phone = createForm.phone.trim();
    }
    if (createForm.status) {
      payload.status = createForm.status;
    }

    try {
      await apiClient.post('/users', payload);
      showToast.success('Pengguna baru berhasil ditambahkan!');

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        username: '',
        email: '',
        phone: '',
        role: 'sales',
        status: 'active',
        password: '',
      });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast.error(err.getFirstError() || 'Gagal menambahkan pengguna.');
        if (err.errors) setBackendErrors(err.errors);
      } else {
        showToast.error('Terjadi kesalahan koneksi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setBackendErrors({});

    const payload: any = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: mapRoleToBackend(editForm.role),
    };

    if (editForm.username?.trim()) {
      payload.username = editForm.username.trim();
    }
    if (editForm.phone?.trim()) {
      payload.phone = editForm.phone.trim();
    }
    if (editForm.status) {
      payload.status = editForm.status;
    }

    try {
      await apiClient.put(`/users/${selectedUser.id}`, payload);
      showToast.success('Informasi pengguna berhasil diperbarui!');

      setShowEditModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast.error(err.getFirstError() || 'Gagal menyimpan pembaruan.');
        if (err.errors) setBackendErrors(err.errors);
      } else {
        showToast.error('Terjadi kesalahan koneksi saat memperbarui data.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const payload: any = {};
      if (passwordForm.password) {
        payload.password = passwordForm.password;
        payload.password_confirmation = passwordForm.password_confirmation || passwordForm.password;
      }

      const res = await apiClient.post<any>(`/users/${selectedUser.id}/reset-password`, payload);
      const tempPass = res?.data?.temporary_password || res?.temporary_password || res?.data?.password || res?.password;

      if (tempPass) {
        showToast.success(`Kata sandi berhasil direset! Password temporary: ${tempPass}`);
      } else {
        showToast.success('Kata sandi pengguna berhasil direset!');
      }

      setShowPasswordModal(false);
      setPasswordForm({ password: '', password_confirmation: '' });
      setSelectedUser(null);
    } catch (err) {
      if (err instanceof ApiError) {
        showToast.error(err.getFirstError() || 'Gagal mereset kata sandi.');
        if (err.errors) setBackendErrors(err.errors);
      } else {
        showToast.error('Terjadi kesalahan koneksi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userToToggle: any) => {
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'mengaktifkan kembali' : 'menonaktifkan';

    try {
      await apiClient.patch(`/users/${userToToggle.id}/status`, {
        status: newStatus,
      });
      showToast.success(`Berhasil ${actionText} akun ${userToToggle.name}`);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      try {
        await apiClient.put(`/users/${userToToggle.id}`, {
          status: newStatus,
          name: userToToggle.name,
          email: userToToggle.email,
          role: mapRoleToBackend(userToToggle.role),
        });
        showToast.success(`Berhasil ${actionText} akun ${userToToggle.name}`);
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        refetch();
      } catch (fallbackErr) {
        if (fallbackErr instanceof ApiError) {
          showToast.error(fallbackErr.getFirstError() || 'Gagal mengubah status pengguna.');
        } else {
          showToast.error('Terjadi kesalahan koneksi.');
        }
      }
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTargetUser) return;

    try {
      await apiClient.delete(`/users/${deleteTargetUser.id}`);
      showToast.success(`Pengguna ${deleteTargetUser.name || deleteTargetUser.email} berhasil dihapus!`);
      setDeleteTargetUser(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        showToast.error(err.getFirstError() || 'Gagal menghapus pengguna.');
      } else {
        showToast.error('Terjadi kesalahan koneksi saat menghapus data.');
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data?.meta?.last_page || 1)) {
      setPage(newPage);
    }
  };

  const getInitials = (name: string) => {
    return (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const filteredUsers = data?.users || [];

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Manajemen Pengguna Staf"
        description="Kelola akun staf internal, pembagian peran operasional, dan izin akses sistem Fibermedia-Ops."
        actions={
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {ACTIONS.add} Pengguna
          </Button>
        }
      />

      {/* Global Error Boundary */}
      {isAnyError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{activeError instanceof Error ? activeError.message : 'Terjadi kesalahan saat memproses data pengguna dari backend.'}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" /> {ACTIONS.reload}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards with Semantic Tokens */}
      <StatCards
        isLoading={isStatsLoading}
        columns={4}
        items={[
          {
            title: 'Total Pengguna',
            value: stats.total,
            variant: 'neutral',
            icon: Users,
          },
          {
            title: 'Staf Sales',
            value: stats.sales,
            variant: 'info',
            icon: Users,
          },
          {
            title: 'Staf Admin',
            value: stats.admin,
            variant: 'success',
            icon: Users,
          },
          {
            title: 'Teknisi Lapangan',
            value: stats.teknisi,
            variant: 'warning',
            icon: Users,
          },
        ]}
      />

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
        searchPlaceholder="Cari pengguna berdasarkan nama, username, atau email..."
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
        
        <Select value={sortBy} onValueChange={(val) => { setSortBy(val); setPage(1); }}>
          <SelectTrigger className="w-36 text-xs">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Tanggal Dibuat</SelectItem>
            <SelectItem value="username">Username</SelectItem>
            <SelectItem value="nama_lengkap">Nama Lengkap</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(val) => { setSortOrder(val); setPage(1); }}>
          <SelectTrigger className="w-32 text-xs">
            <SelectValue placeholder="Urutan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Terbaru</SelectItem>
            <SelectItem value="asc">Terlama</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
          <SelectTrigger className="w-36 text-xs">
            <SelectValue placeholder="Semua Peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Peran</SelectItem>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="Teknisi">Teknisi</SelectItem>
            <SelectItem value="Superadmin">Superadmin</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
          <SelectTrigger className="w-36 text-xs">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
            <SelectItem value="suspended">Terisolir</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <tr className="border-b border-border bg-muted/40">
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Nama & Tim</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Email & Telepon</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Peran</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Akses PWA</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs uppercase font-semibold text-muted-foreground text-right">Aksi</TableHead>
              </tr>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <TableRow key={rIdx} className="animate-pulse">
                    <TableCell colSpan={6} className="py-4">
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-base font-medium text-foreground">{MESSAGES.emptyData}</p>
                    <p className="text-xs text-muted-foreground mt-1">{MESSAGES.emptySearchResult}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: any) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {getInitials(user.name || user.nama_lengkap)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{user.name || user.nama_lengkap}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono">@{user.username}</span>
                            {user.team && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-medium">
                                  {typeof user.team === 'object' ? user.team.name : user.team}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 opacity-60" />
                          <span className="text-foreground">{user.email}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3.5 h-3.5 opacity-60" />
                            <span>{formatPhone(user.phone)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.displayRole || (user.roles && user.roles[0]) || user.role)}</TableCell>
                    <TableCell>
                      {(user.has_pwa_access || user.permissions?.includes('pwa.access') || ['superadmin', 'admin', 'teknisi', 'sales'].includes(user.role?.toLowerCase())) ? (
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          /pwa
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] bg-muted text-muted-foreground border-border">
                          Tidak
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/access/users/${user.id}`)}
                          className="text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> {ACTIONS.viewDetails}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem
                              onClick={() => {
                                setRoleModalUser(user);
                                setTargetRole(user.role || 'Sales');
                              }}
                            >
                              <Shield className="w-4 h-4 mr-2 opacity-70" /> Ganti Role Pengguna
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setEditForm({
                                  name: user.name || user.nama_lengkap || '',
                                  username: user.username || '',
                                  email: user.email || '',
                                  phone: user.phone || '',
                                  role: user.role || 'sales',
                                  status: user.status || 'active',
                                });
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2 opacity-70" /> {ACTIONS.edit} Pengguna
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setPasswordForm({ password: '', password_confirmation: '' });
                                setShowPasswordModal(true);
                              }}
                            >
                              <KeyRound className="w-4 h-4 mr-2 opacity-70" /> Atur Ulang Kata Sandi
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={user.status === 'active' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
                              onClick={() => handleToggleStatus(user)}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <Ban className="w-4 h-4 mr-2" /> Nonaktifkan Pengguna
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" /> Aktifkan Pengguna
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-rose-600 dark:text-rose-400 font-medium focus:text-rose-700"
                              onClick={() => setDeleteTargetUser(user)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> {ACTIONS.delete} Pengguna
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {data && data.meta && data.meta.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border bg-muted/10 gap-4 text-xs text-muted-foreground">
            <div>
              Menampilkan <span className="font-semibold text-foreground">{data.meta.to ? (data.meta.to - data.meta.from + 1) : 0}</span> dari{' '}
              <span className="font-semibold text-foreground">{data.meta.total}</span> data
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>
                Halaman <span className="font-semibold text-foreground">{page}</span> dari{' '}
                <span className="font-semibold text-foreground">{data.meta.last_page}</span>
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === data.meta.last_page}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{ACTIONS.add} Pengguna</DialogTitle>
              <DialogDescription>
                Daftarkan akun pengguna staf baru ke sistem Fibermedia-Ops.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="create_name">Nama Lengkap <span className="text-rose-500">*</span></Label>
                <Input
                  id="create_name"
                  placeholder="Contoh: Budi Santoso"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.name && <p className="text-xs text-rose-500 font-medium">{backendErrors.name[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_email">Alamat Email <span className="text-rose-500">*</span></Label>
                <Input
                  id="create_email"
                  type="email"
                  placeholder="Contoh: budi.santoso@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.email && <p className="text-xs text-rose-500 font-medium">{backendErrors.email[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_password">Kata Sandi <span className="text-rose-500">*</span></Label>
                <Input
                  id="create_password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  disabled={isSubmitting}
                  minLength={8}
                  required
                />
                {backendErrors.password && <p className="text-xs text-rose-500 font-medium">{backendErrors.password[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label>Peran Sistem <span className="text-rose-500">*</span></Label>
                <Select value={createForm.role} onValueChange={(val) => setCreateForm({ ...createForm, role: val })} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Superadmin">Superadmin</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Teknisi">Teknisi</SelectItem>
                  </SelectContent>
                </Select>
                {backendErrors.role && <p className="text-xs text-rose-500 font-medium">{backendErrors.role[0]}</p>}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
                {ACTIONS.cancel}
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {MESSAGES.saving}</> : ACTIONS.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleEditUser} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{ACTIONS.edit} Data Pengguna</DialogTitle>
              <DialogDescription>
                Perbarui detail profil atau ubah peran penugasan pengguna staf.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edit_name">Nama Lengkap</Label>
                <Input
                  id="edit_name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.name && <p className="text-xs text-rose-500 font-medium">{backendErrors.name[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_username">Username</Label>
                <Input
                  id="edit_username"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.username && <p className="text-xs text-rose-500 font-medium">{backendErrors.username[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_email">Alamat Email</Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.email && <p className="text-xs text-rose-500 font-medium">{backendErrors.email[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_phone">Nomor Telepon</Label>
                <Input
                  id="edit_phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  disabled={isSubmitting}
                />
                {backendErrors.phone && <p className="text-xs text-rose-500 font-medium">{backendErrors.phone[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label>Peran Sistem</Label>
                <Select value={editForm.role} onValueChange={(val) => setEditForm({ ...editForm, role: val })} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Peran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Superadmin">Superadmin</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Teknisi">Teknisi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
                {ACTIONS.cancel}
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {MESSAGES.saving}</> : ACTIONS.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal Dialog */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Atur Ulang Kata Sandi</DialogTitle>
              <DialogDescription>
                Tentukan kata sandi baru untuk akun: <span className="font-semibold text-foreground">{selectedUser?.name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="reset_pass">Kata Sandi Baru</Label>
                <Input
                  id="reset_pass"
                  type="password"
                  placeholder="Ketik kata sandi baru..."
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.password && <p className="text-xs text-rose-500 font-medium">{backendErrors.password[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="reset_pass_confirm">Konfirmasi Sandi Baru</Label>
                <Input
                  id="reset_pass_confirm"
                  type="password"
                  placeholder="Ketik konfirmasi sandi..."
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} disabled={isSubmitting}>
                {ACTIONS.cancel}
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : 'Atur Ulang Sandi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ganti Role Modal Dialog */}
      <Dialog open={!!roleModalUser} onOpenChange={(open) => !open && setRoleModalUser(null)}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Ganti Role Pengguna</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ubah peran wewenang operasional untuk akun: <strong className="text-foreground">{roleModalUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Pilih Role Baru</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="bg-background border-border text-foreground text-sm font-medium">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {availableRoles.length > 0 ? (
                    availableRoles.map((r: any) => (
                      <SelectItem key={r.id || r.name} value={r.name} className="text-sm">
                        {r.name} {r.is_system ? '(Sistem)' : '(Kustom)'}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="Superadmin">Superadmin</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Teknisi">Teknisi</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Perubahan wewenang akan langsung berlaku pada permintaan data berikutnya.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRoleModalUser(null)}
              disabled={updateRoleMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (roleModalUser && targetRole) {
                  updateRoleMutation.mutate({ userId: roleModalUser.id, role: targetRole });
                }
              }}
              disabled={!targetRole || updateRoleMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Role Baru'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete User Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        onConfirm={confirmDeleteUser}
        title="Konfirmasi Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus akun pengguna staf "${deleteTargetUser?.name || deleteTargetUser?.email}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={ACTIONS.delete}
        variant="danger"
      />
    </div>
  );
};

export default UserManagement;
