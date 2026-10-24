import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  FileText,
  TrendingUp,
  Server,
  AlertCircle,
  Activity,
  CheckCircle,
  Loader2,
  Shield,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Clock,
  ExternalLink,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { DashboardShortcutCards } from '../common/DashboardShortcutCards';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { apiClient } from '../../lib/api';
import { userToFrontend } from '../../lib/mappers';
import { formatDate } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';

export const SuperadminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query live users list to compute stats
  const {
    data: users,
    isLoading: isUsersLoading,
    isRefetching,
    isError: isUsersError,
    error: usersError,
  } = useQuery({
    queryKey: ['users', 'list', { limit: 100 }],
    queryFn: async () => {
      const response = await apiClient.get<any>('/superadmin/users?per_page=100');
      const items = response?.data || (Array.isArray(response) ? response : []);
      return items.map(userToFrontend);
    },
  });

  // Query system audit logs
  const {
    data: auditData,
    isLoading: isAuditLoading,
    isError: isAuditError,
  } = useQuery({
    queryKey: ['auditLogs', { limit: 5 }],
    queryFn: () => apiClient.get<any>('/admin/audit-logs?per_page=5'),
  });

  const auditLogs = auditData?.data || (Array.isArray(auditData) ? auditData : []);
  const userList = users || [];

  // Calculate stats
  const totalUsers = userList.length || 0;
  const activeUsers = userList.filter((u: any) => u.status === 'active' || u.status === 'aktif').length;
  const salesCount = userList.filter((u: any) => u.role === 'sales').length;
  const adminCount = userList.filter((u: any) => u.role === 'admin').length;
  const teknisiCount = userList.filter((u: any) => u.role === 'teknisi').length;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
  };

  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'superadmin':
        return <Badge className="bg-red-100 text-red-800 border-red-200 font-bold">SUPERADMIN</Badge>;
      case 'admin':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">ADMIN</Badge>;
      case 'sales':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold">SALES</Badge>;
      case 'teknisi':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">TEKNISI</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{role || 'User'}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'SA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-purple-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
          <Shield className="w-56 h-56" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-rose-100 border border-white/20 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                System Control Center (Superadmin)
              </span>
              <span className="text-xs text-rose-200 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatDate(new Date().toISOString())}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Pusat Kontrol Sistem, {user?.name || 'Superadmin'} 🔒
            </h1>
            <p className="text-rose-100 text-sm max-w-2xl leading-relaxed">
              Kelola seluruh akun pengguna lintas peran (Sales, Admin, Teknisi), audit aktivitas log terpusat, dan konfigurasi hak akses sistem.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs h-10 px-4"
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => navigate('/superadmin/users')}
              className="bg-white text-red-700 hover:bg-red-50 font-bold text-xs h-10 px-4 shadow-md"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Kelola Pengguna
            </Button>
          </div>
        </div>
      </div>

      {/* Shortcut Cards (Fase 1) */}
      <DashboardShortcutCards />

      {/* Global Error Notice */}
      {(isUsersError || isAuditError) && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data Superadmin</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-1">
            <span>{usersError instanceof Error ? usersError.message : 'Terjadi masalah koneksi server.'}</span>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Pengguna
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  {isUsersLoading ? <Skeleton className="h-8 w-16" /> : totalUsers}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Aktif: {activeUsers} Akun
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tim Sales
                </p>
                <h3 className="text-3xl font-black text-blue-600 mt-1">
                  {isUsersLoading ? <Skeleton className="h-8 w-16" /> : salesCount}
                </h3>
                <p className="text-xs text-blue-600 font-medium mt-1">
                  Pemasaran Lapangan
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tim Admin
                </p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">
                  {isUsersLoading ? <Skeleton className="h-8 w-16" /> : adminCount}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Validasi & Provisi
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/superadmin/teams')}
          className="shadow-sm hover:shadow-md transition-all border-gray-200 cursor-pointer hover:border-amber-400 group"
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider group-hover:text-amber-600 transition-colors">
                  Tim Teknisi
                </p>
                <h3 className="text-3xl font-black text-amber-600 mt-1">
                  {isUsersLoading ? <Skeleton className="h-8 w-16" /> : teknisiCount}
                </h3>
                <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                  Instalatur Fisik <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  System Audit
                </p>
                <h3 className="text-3xl font-black text-red-600 mt-1">
                  {isAuditLoading ? <Skeleton className="h-8 w-16" /> : auditLogs.length}
                </h3>
                <p className="text-xs text-red-600 font-medium mt-1">
                  Aktivitas terekam
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Accounts Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-red-600" />
                  Daftar Pengguna Sistem Terbaru
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Akun staf operasional terdaftar di dalam sistem provisioning.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/superadmin/users')}
                className="text-xs text-red-600 hover:bg-red-50"
              >
                Kelola Semua ({totalUsers})
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {isUsersLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : userList.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">Belum Ada Pengguna Terdaftar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">PENGGUNA</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">PERAN (ROLE)</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">STATUS</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase text-right">AKSI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {userList.slice(0, 6).map((u: any) => (
                        <TableRow key={u.id} className="hover:bg-red-50/20 transition-colors">
                          <TableCell className="px-4 py-3.5 align-middle">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-9 h-9 border border-gray-200 shrink-0">
                                <AvatarFallback className="bg-slate-800 text-white font-bold text-xs">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-sm text-gray-900 block">
                                  {u.name}
                                </span>
                                <span className="text-xs text-gray-500 block truncate max-w-[200px]">
                                  {u.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                            {getRoleBadge(u.role)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                u.status === 'active' || u.status === 'aktif'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 border-gray-200'
                              }`}
                            >
                              {u.status === 'active' || u.status === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/superadmin/users/${u.id}`)}
                              className="h-8 text-xs text-red-600 hover:bg-red-50"
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Audit Logs Feed & Shortcuts */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-red-600" />
                Audit Log Sistem Terbaru
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/audit-logs')}
                className="text-[11px] text-red-600 hover:bg-red-50 h-7 px-2"
              >
                Log Lengkap
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {isAuditLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Belum ada aktivitas audit log.</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="flex items-start space-x-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-bold text-gray-900 truncate">{log.action || 'Sistem Event'}</p>
                        <p className="text-gray-500 text-[11px] truncate">{log.description || log.user || 'Admin Action'}</p>
                        <p className="text-[10px] text-gray-400">{formatDate(log.created_at || new Date().toISOString())}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Superadmin Quick Controls */}
          <Card className="shadow-sm border-gray-200 bg-gradient-to-br from-slate-950 to-red-950 text-white">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">Kontrol Manajemen Lanjutan</h4>
              </div>
              <p className="text-xs text-rose-200 leading-relaxed">
                Superadmin memiliki wewenang penuh dalam menghapus paket, meninjau laporan penjualan terpadu, dan mengelola hak akses seluruh peran.
              </p>
              <div className="pt-1 space-y-2">
                <Button
                  onClick={() => navigate('/superadmin/teams')}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 shadow-md shadow-rose-900/40"
                >
                  🛠️ Kelola Tim Teknisi Lapangan
                </Button>
                <Button
                  onClick={() => navigate('/sales-report')}
                  className="w-full bg-white text-slate-900 hover:bg-gray-100 font-bold text-xs h-9"
                >
                  📊 Laporan Penjualan Terpadu
                </Button>
                <Button
                  onClick={() => navigate('/superadmin/roles')}
                  variant="outline"
                  className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 text-xs h-9"
                >
                  🛡️ Atur Role & Hak Akses
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
