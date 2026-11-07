import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Shield,
  Users,
  Search,
  CheckCircle2,
  Loader2,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../lib/api';

interface RoleApiData {
  id: number;
  name: string;
  permissions: string[];
  user_count: number;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  roles?: { name: string }[];
  status?: string;
}

const ROLE_META: Record<string, { label: string; description: string; badgeBg: string }> = {
  superadmin: {
    label: 'Superadmin',
    description: 'Akses penuh tanpa batasan untuk mengelola seluruh aspek sistem, pengguna staf, dan audit logs.',
    badgeBg: 'bg-red-500 text-white',
  },
  admin: {
    label: 'Admin Provisioning',
    description: 'Staf kantor yang memvalidasi pengajuan pelanggan, menyusun profil bandwidth NAS, dan membagikan tugas teknisi.',
    badgeBg: 'bg-emerald-600 text-white',
  },
  sales: {
    label: 'Sales Agent',
    description: 'Staf pemasaran di lapangan yang mendaftarkan data pelanggan baru dan mengunggah berkas KTP/Rumah.',
    badgeBg: 'bg-blue-600 text-white',
  },
  teknisi: {
    label: 'Teknisi Lapangan',
    description: 'Instalatur fisik di rumah pelanggan yang melaporkan status perjalanan, pengerjaan, dan mengunggah foto modem.',
    badgeBg: 'bg-amber-500 text-white',
  },
};

export const RoleManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Change Role Modal State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [targetRole, setTargetRole] = useState<string>('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch Roles
  const { data: roles, isLoading: isLoadingRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['superadmin', 'roles'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: RoleApiData[] }>('/roles');
      return response.data || [];
    },
  });

  // Fetch Users
  const { data: users, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['superadmin', 'users', 'all'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/users?per_page=100');
      const list = response.data || response || [];
      return Array.isArray(list) ? list : list.data || [];
    },
  });

  // Handle Role Change Submission
  const handleRoleChangeSubmit = async () => {
    if (!selectedUser || !targetRole) return;
    try {
      setIsUpdating(true);
      await apiClient.put(`/users/${selectedUser.id}`, {
        role: targetRole,
      });
      toast.success(`Role Pengguna '${selectedUser.name}' Berhasil Diubah ke '${targetRole.toUpperCase()}'`);
      setShowRoleModal(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin'] });
      refetchRoles();
      refetchUsers();
    } catch (err: any) {
      toast.error('Gagal Mengubah Role', {
        description: err?.message || 'Terjadi kesalahan saat memperbarui role pengguna.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredUsers = (users || []).filter((u: UserItem) => {
    const userRole = (u.role || u.roles?.[0]?.name || '').toLowerCase();
    const matchesRole = roleFilter === 'all' || userRole === roleFilter.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manajemen Role & Hak Akses Staf</h1>
            <Badge className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800">
              <Shield className="w-3 h-3 mr-1 text-red-600 dark:text-red-400" />
              Superadmin Only
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Kelola pembagian peran (*Role Reassignment*) dan pantau matriks izin Spatie Permission untuk seluruh akun staf.
          </p>
        </div>

        <Button
          onClick={() => {
            refetchRoles();
            refetchUsers();
          }}
          variant="outline"
          size="sm"
          className="text-xs shrink-0 border-gray-300"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Data
        </Button>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingRoles
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse p-4">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </Card>
            ))
          : (roles || []).map((r) => {
              const meta = ROLE_META[r.name.toLowerCase()] || {
                label: r.name,
                description: 'Peran pengguna terdaftar',
                badgeBg: 'bg-gray-600 text-white',
              };
              return (
                <Card key={r.id} className="shadow-sm border-gray-200">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center">
                      <Badge className={`${meta.badgeBg} font-bold text-xs`}>
                        {meta.label}
                      </Badge>
                      <span className="text-xs font-semibold text-gray-500 flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {r.user_count} Pengguna
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <p className="text-xs text-gray-500 leading-relaxed min-h-[48px]">
                      {meta.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                      <span>Total Izin Spatie:</span>
                      <span className="font-bold text-gray-700">{r.permissions?.length || 0} Hak Akses</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* User Role Reassignment Table */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Daftar Pengguna & Penetapan Role</CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Pilih pengguna untuk mengganti wewenang role (Sales, Admin, Superadmin, Teknisi)
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Role */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px] text-xs h-9 bg-white">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="teknisi">Teknisi</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Cari pengguna..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingUsers ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-medium">Memuat data pengguna...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-base font-semibold text-gray-700">Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="font-bold text-xs text-gray-700">NAMA PENGGUNA</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700">EMAIL</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700">ROLE SAAT INI</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 text-right">UBAH ROLE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u: UserItem) => {
                    const currentRole = (u.role || u.roles?.[0]?.name || 'sales').toLowerCase();
                    const meta = ROLE_META[currentRole] || {
                      label: currentRole,
                      badgeBg: 'bg-gray-500 text-white',
                    };
                    return (
                      <TableRow key={u.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="font-semibold text-sm text-gray-900">
                          {u.name}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${meta.badgeBg} text-xs font-semibold`}>
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(u);
                              setTargetRole(currentRole);
                              setShowRoleModal(true);
                            }}
                            className="text-xs border-gray-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-blue-600" />
                            Ganti Role
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

      {/* Role Change Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg font-bold text-gray-900">
              <UserCheck className="w-5 h-5 text-blue-600 mr-2" />
              Ubah Role Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Pilih peran baru untuk <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Pilih Role Baru</label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="text-xs bg-white">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Agent</SelectItem>
                  <SelectItem value="admin">Admin Provisioning</SelectItem>
                  <SelectItem value="teknisi">Teknisi Lapangan</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
              <p className="font-semibold text-blue-800">Catatan Perubahan Role:</p>
              <p className="mt-0.5 text-blue-700">
                Pengguna akan langsung memiliki hak akses dan menu sesuai dengan role baru yang ditetapkan pada saat login berikutnya.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRoleModal(false)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isUpdating}
              onClick={handleRoleChangeSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Simpan Role Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
