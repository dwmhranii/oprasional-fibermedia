import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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
  Search,
  Edit,
  MoreVertical,
  UserPlus,
  Shield,
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
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { userToFrontend } from '../../lib/mappers';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

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

  // Auto-focus first invalid field
  useEffect(() => {
    const errorKeys = Object.keys(backendErrors);
    if (errorKeys.length > 0) {
      const firstError = errorKeys[0];
      const prefix = showCreateModal ? 'create_' : showEditModal ? 'edit_' : showPasswordModal ? 'reset_' : '';
      if (prefix) {
        // Handle special case for password reset (API usually returns 'password')
        const fieldId = prefix + (showPasswordModal && firstError === 'password' ? 'pass' : firstError);
        const element = document.getElementById(fieldId);
        if (element) {
          element.focus();
        }
      }
    }
  }, [backendErrors, showCreateModal, showEditModal, showPasswordModal]);

  // Query live users list
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminUsers', 'list', { page, role: roleFilter, status: statusFilter, search: debouncedSearch, dateFrom, dateTo, sortBy, sortOrder }],
    queryFn: async () => {
      let url = `/superadmin/users?page=${page}&per_page=10`;
      if (roleFilter && roleFilter !== 'all') url += `&role=${roleFilter}`;
      if (statusFilter && statusFilter !== 'all') url += `&status=${statusFilter}`;
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      if (sortBy) url += `&sort_by=${sortBy}`;
      if (sortOrder) url += `&sort_order=${sortOrder}`;
      
      const response = await apiClient.get<any>(url);
      
      const mappedUsers = (response.data || []).map(userToFrontend);
      return {
        users: mappedUsers,
        meta: response.meta || { current_page: 1, last_page: 1, total: mappedUsers.length, from: 1, to: mappedUsers.length },
      };
    },
  });

  // Query stats (fetch with large limit to count correctly)
  const { data: allUsersData, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ['users', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/superadmin/users?per_page=100');
      return (response.data || []).map(userToFrontend);
    },
  });

  const stats = {
    total: allUsersData?.length || 0,
    sales: allUsersData?.filter((u: any) => u.role === 'sales').length || 0,
    admin: allUsersData?.filter((u: any) => u.role === 'admin').length || 0,
    teknisi: allUsersData?.filter((u: any) => u.role === 'teknisi').length || 0,
    active: allUsersData?.filter((u: any) => u.status === 'active').length || 0,
  };

  const isAnyError = isError || isStatsError;

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; color: string }> = {
      sales: { label: 'Sales', color: '#3b82f6' },
      admin: { label: 'Admin', color: '#10b981' },
      teknisi: { label: 'Teknisi', color: '#f59e0b' },
      superadmin: { label: 'Superadmin', color: '#ef4444' },
    };

    const config = roleConfig[role] || { label: role || 'User', color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      active: { label: 'Active', color: '#10b981' },
      inactive: { label: 'Inactive', color: '#6b7280' },
      suspended: { label: 'Suspended', color: '#ef4444' },
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </Badge>
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
      await apiClient.post('/superadmin/users', payload);
      toast.success('Pengguna baru berhasil ditambahkan!');

      setShowCreateModal(false);
      setCreateForm({
        name: '',
        username: '',
        email: '',
        phone: '',
        role: 'Sales',
        status: 'active',
        password: '',
      });

      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menambahkan pengguna.');
        if (err.errors) setBackendErrors(err.errors);
      } else {
        toast.error('Terjadi kesalahan koneksi saat mengirim data.');
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
      await apiClient.put(`/superadmin/users/${selectedUser.id}`, payload);
      toast.success('Detail pengguna berhasil diperbarui!');

      setShowEditModal(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menyimpan pembaruan.');
        if (err.errors) setBackendErrors(err.errors);
      } else {
        toast.error('Terjadi kesalahan koneksi saat memperbarui data.');
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

      const res = await apiClient.post<any>(`/superadmin/users/${selectedUser.id}/reset-password`, payload);
      const tempPass = res?.data?.temporary_password || res?.temporary_password || res?.data?.password || res?.password;

      if (tempPass) {
        toast.success(`Password berhasil direset! Password temporary: ${tempPass}`, { duration: 10000 });
      } else {
        toast.success('Kata sandi pengguna berhasil direset!');
      }

      setShowPasswordModal(false);
      setPasswordForm({ password: '', password_confirmation: '' });
      setSelectedUser(null);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal mereset kata sandi.');
        if (err.errors) setBackendErrors(err.errors);
      } else {
        toast.error('Terjadi kesalahan koneksi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userToToggle: any) => {
    const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
    const actionText = newStatus === 'active' ? 'mengaktifkan kembali' : 'menonaktifkan';

    try {
      await apiClient.patch(`/superadmin/users/${userToToggle.id}/status`, {
        status: newStatus,
      });
      toast.success(`Berhasil ${actionText} user ${userToToggle.name}`);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      try {
        await apiClient.put(`/superadmin/users/${userToToggle.id}`, {
          status: newStatus,
          name: userToToggle.name,
          email: userToToggle.email,
          role: mapRoleToBackend(userToToggle.role),
        });
        toast.success(`Berhasil ${actionText} user ${userToToggle.name}`);
        queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        refetch();
      } catch (fallbackErr) {
        if (fallbackErr instanceof ApiError) {
          toast.error(fallbackErr.getFirstError() || 'Gagal mengubah status pengguna.');
        } else {
          toast.error('Terjadi kesalahan koneksi.');
        }
      }
    }
  };

  const handleDeleteUser = async (userToDelete: any) => {
    const isConfirmed = window.confirm(`Yakin ingin menghapus pengguna ${userToDelete.name || userToDelete.email}?`);
    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/superadmin/users/${userToDelete.id}`);
      toast.success(`Pengguna ${userToDelete.name || userToDelete.email} berhasil dihapus!`);
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menghapus pengguna.');
      } else {
        toast.error('Terjadi kesalahan koneksi saat menghapus data.');
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

  const filteredUsers = data?.users || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Manajemen Pengguna Staf
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            Kelola data staf sales, admin provisioning, teknisi pemasangan, dan akses superadmin.
          </p>
        </div>
        <Button
          className="text-white"
          style={{ backgroundColor: '#667eea' }}
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pengguna Baru
        </Button>
      </div>

      {/* Global Error Boundary */}
      {isAnyError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses data pengguna dari backend.'}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {isStatsLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Pengguna</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#667eea' }}>{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase">Sales</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#3b82f6' }}>{stats.sales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase">Admin</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{stats.admin}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase">Teknisi</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#f59e0b' }}>{stats.teknisi}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 font-semibold uppercase">Staf Aktif</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#10b981' }}>{stats.active}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari pengguna berdasarkan nama, username, atau email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
                  <SelectItem value="username">Username</SelectItem>
                  <SelectItem value="nama_lengkap">Nama Lengkap</SelectItem>
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
              
              <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
                <SelectTrigger className="w-full md:w-36">
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
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data || filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-medium">Tidak ada pengguna</p>
              <p className="text-sm text-gray-400 mt-1">Coba filter pencarian atau peran yang berbeda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama & Username</TableHead>
                    <TableHead>Email & Telepon</TableHead>
                    <TableHead>Peran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                              {getInitials(user.name || user.nama_lengkap)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-800">{user.name || user.nama_lengkap}</p>
                            <p className="text-xs text-gray-400 font-mono">@{user.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/superadmin/users/${user.id}`)}
                            className="bg-blue-50/50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Profil
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                                <Edit className="w-4 h-4 mr-2 text-gray-500" /> Edit User Info
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setPasswordForm({ password: '', password_confirmation: '' });
                                  setShowPasswordModal(true);
                                }}
                              >
                                <KeyRound className="w-4 h-4 mr-2 text-gray-500" /> Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={user.status === 'active' ? 'text-amber-600' : 'text-green-600'}
                                onClick={() => handleToggleStatus(user)}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <Ban className="w-4 h-4 mr-2" /> Deactivate Staf
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Activate Staf
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 font-semibold focus:text-red-700"
                                onClick={() => handleDeleteUser(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Hapus User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Create User Modal Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              <DialogDescription>
                Daftarkan akun pengguna staf baru ke database system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="create_name">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input
                  id="create_name"
                  placeholder="Contoh: Budi Santoso"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.name && <p className="text-xs text-red-500 font-medium">{backendErrors.name[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_email">Alamat Email <span className="text-red-500">*</span></Label>
                <Input
                  id="create_email"
                  type="email"
                  placeholder="Contoh: budi.santoso@example.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  disabled={isSubmitting}
                  required
                />
                {backendErrors.email && <p className="text-xs text-red-500 font-medium">{backendErrors.email[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="create_password">Kata Sandi (Password) <span className="text-red-500">*</span></Label>
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
                {backendErrors.password && <p className="text-xs text-red-500 font-medium">{backendErrors.password[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label>Peran Sistem <span className="text-red-500">*</span></Label>
                <Select value={createForm.role} onValueChange={(val) => setCreateForm({ ...createForm, role: val })} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Superadmin">Superadmin</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Teknisi">Teknisi</SelectItem>
                  </SelectContent>
                </Select>
                {backendErrors.role && <p className="text-xs text-red-500 font-medium">{backendErrors.role[0]}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" className="text-white" style={{ backgroundColor: '#667eea' }} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Daftarkan Pengguna'}
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
              <DialogTitle>Edit Informasi Pengguna</DialogTitle>
              <DialogDescription>
                Perbarui detail profil atau ubah peran penugasan pengguna.
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
                {backendErrors.name && <p className="text-xs text-red-500 font-medium">{backendErrors.name[0]}</p>}
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
                {backendErrors.username && <p className="text-xs text-red-500 font-medium">{backendErrors.username[0]}</p>}
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
                {backendErrors.email && <p className="text-xs text-red-500 font-medium">{backendErrors.email[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit_phone">Nomor Telepon</Label>
                <Input
                  id="edit_phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  disabled={isSubmitting}
                />
                {backendErrors.phone && <p className="text-xs text-red-500 font-medium">{backendErrors.phone[0]}</p>}
              </div>
              <div className="space-y-1">
                <Label>Peran Sistem</Label>
                <Select value={editForm.role} onValueChange={(val) => setEditForm({ ...editForm, role: val })} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" className="text-white bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Simpan Perubahan'}
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
              <DialogTitle>Reset Sandi Pengguna</DialogTitle>
              <DialogDescription>
                Tentukan kata sandi baru untuk akun: <span className="font-semibold text-gray-700">{selectedUser?.name}</span>
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
                {backendErrors.password && <p className="text-xs text-red-500 font-medium">{backendErrors.password[0]}</p>}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" className="text-white bg-amber-500 hover:bg-amber-600" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Meriset...</> : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
