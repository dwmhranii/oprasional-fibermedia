import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/api';
import { packageService, extractPackages } from '../../lib/packageService';
import { submissionToFrontend } from '../../lib/mappers';
import { formatDate } from '../../lib/formatters';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { DashboardShortcutCards } from '../common/DashboardShortcutCards';
import {
  ClipboardList,
  CheckCircle,
  Server,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Wifi,
  BarChart3,
  Activity,
  Sparkles,
  Clock,
  UserCheck,
  ExternalLink,
  Loader2,
  Wrench,
  Package as PackageIcon,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 1. Fetch pending validation submissions
  const {
    data: pendingSubmissions,
    isLoading: isLoadingPending,
    isRefetching: isRefetchingPending,
  } = useQuery({
    queryKey: ['adminDashboard', 'pendingSubmissions'],
    queryFn: async () => {
      try {
        // Try status=pending first
        const response = await apiClient.get<any>('/admin/submissions?status=pending&per_page=5');
        const items = response?.data || response?.items || (Array.isArray(response) ? response : []);
        if (items.length > 0) return items.map(submissionToFrontend);

        // Fallback to status=pending_validation
        const res2 = await apiClient.get<any>('/admin/submissions?status=pending_validation&per_page=5');
        const items2 = res2?.data || res2?.items || (Array.isArray(res2) ? res2 : []);
        if (items2.length > 0) return items2.map(submissionToFrontend);

        // Fallback to general list & filter pending status in frontend
        const allRes = await apiClient.get<any>('/admin/submissions?per_page=10');
        const allItems = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const filtered = allItems.filter((i: any) =>
          ['pending', 'pending_validation', 'submitted', 'in_review'].includes(i.status?.toLowerCase())
        );
        return filtered.map(submissionToFrontend);
      } catch (err) {
        const fallbackRes = await apiClient.get<any>('/admin/submissions?per_page=5');
        const items = fallbackRes?.data || (Array.isArray(fallbackRes) ? fallbackRes : []);
        return items.map(submissionToFrontend);
      }
    },
  });

  // 2. Fetch Stats counts
  const { data: totalPendingData } = useQuery({
    queryKey: ['adminDashboard', 'stats', 'pendingCount'],
    queryFn: async () => {
      try {
        const res1 = await apiClient.get<any>('/admin/submissions?status=pending&per_page=1');
        if ((res1?.meta?.total || res1?.total || 0) > 0) return res1;
        
        const res2 = await apiClient.get<any>('/admin/submissions?status=pending_validation&per_page=1');
        if ((res2?.meta?.total || res2?.total || 0) > 0) return res2;

        const allRes = await apiClient.get<any>('/admin/submissions?per_page=100');
        const allItems = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const count = allItems.filter((i: any) =>
          ['pending', 'pending_validation', 'submitted', 'in_review'].includes(i.status?.toLowerCase())
        ).length;
        return { meta: { total: count } };
      } catch {
        return null;
      }
    },
  });

  const { data: totalCompletedData } = useQuery({
    queryKey: ['adminDashboard', 'stats', 'completedCount'],
    queryFn: () => apiClient.get<any>('/admin/submissions?status=completed&per_page=1'),
  });

  const { data: totalProvisioningData } = useQuery({
    queryKey: ['adminDashboard', 'stats', 'provisioningCount'],
    queryFn: () => apiClient.get<any>('/admin/provisionings?per_page=1'),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['adminDashboard', 'stats', 'packagesCount'],
    queryFn: () => packageService.getPackages(),
  });

  // 3. Fetch Audit Logs for live system activity
  const { data: auditLogsData } = useQuery({
    queryKey: ['adminDashboard', 'auditLogs'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>('/admin/audit-log?per_page=5');
        return response?.data || response?.items || (Array.isArray(response) ? response : []);
      } catch {
        return [];
      }
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminDashboard'] });
  };

  const pendingCount = totalPendingData?.meta?.total ?? totalPendingData?.total ?? (pendingSubmissions?.length || 0);
  const completedCount = totalCompletedData?.meta?.total ?? totalCompletedData?.total ?? 0;
  const provisioningCount = totalProvisioningData?.meta?.total ?? totalProvisioningData?.total ?? (Array.isArray(totalProvisioningData?.data) ? totalProvisioningData.data.length : 0);
  const totalPackagesCount = extractPackages(packagesData).length || 0;

  const getInitials = (name: string) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPriorityBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending_validation':
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Menunggu Validasi</Badge>;
      case 'approved':
      case 'provisioning':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Dalam Proses</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Selesai Terpasang</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ditolak</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status || 'Diproses'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
          <Sparkles className="w-56 h-56" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-white/20 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                Operational Administrator
              </span>
              <span className="text-xs text-blue-200 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatDate(new Date().toISOString())}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Selamat Datang Kembali, {user?.name || 'Admin'}! 👋
            </h1>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Pantau antrian validasi berkas pelanggan, status verifikasi teknis, provisioning jaringan BFASS, dan kinerja koneksi real-time.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs h-10 px-4"
              disabled={isRefetchingPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetchingPending ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <Button
              onClick={() => onNavigate('/admin/submissions')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-10 px-4 shadow-md"
            >
              <ClipboardList className="w-4 h-4 mr-1.5" />
              Validasi Berkas
            </Button>
          </div>
        </div>
      </div>

      {/* Shortcut Cards (Fase 1) */}
      <DashboardShortcutCards />

      {/* KPI Stats Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Metric 1 */}
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Validasi Menunggu
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  {pendingCount}
                </h3>
                <p className="text-xs text-amber-600 font-medium mt-1 flex items-center">
                  <Activity className="w-3.5 h-3.5 mr-1" />
                  Butuh tinjauan berkas
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2 */}
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Provisioning
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  {provisioningCount}
                </h3>
                <p className="text-xs text-blue-600 font-medium mt-1 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Work Order Aktif
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <Server className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3 */}
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Instalasi Selesai
                </p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">
                  {completedCount}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Pelanggan Aktif
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4 */}
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Katalog Paket Resmi
                </p>
                <h3 className="text-3xl font-black text-indigo-600 mt-1">
                  {totalPackagesCount} Paket
                </h3>
                <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center">
                  <Wifi className="w-3.5 h-3.5 mr-1" />
                  Tersinkronisasi
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <PackageIcon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Validation Queue List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
                  Antrian Validasi Berkas Terbaru
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Pengajuan pelanggan baru dari Sales yang memerlukan pemeriksaan admin.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/admin/submissions')}
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Lihat Semua ({pendingCount})
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {isLoadingPending ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-xl space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : !pendingSubmissions || pendingSubmissions.length === 0 ? (
                <div className="p-10 text-center text-gray-500 bg-gray-50/50 rounded-xl border border-gray-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-800 text-sm">Tidak ada antrian validasi tertunda</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Seluruh berkas pengajuan pelanggan saat ini telah diperiksa.
                  </p>
                </div>
              ) : (
                pendingSubmissions.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id || item.submissionNumber}
                    onClick={() => onNavigate(`/admin/submissions/${item.id}`)}
                    className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3.5">
                        <Avatar className="w-11 h-11 border border-gray-200 shrink-0">
                          <AvatarFallback className="bg-blue-600 text-white font-bold text-sm">
                            {getInitials(item.customer?.name || item.customerName || 'Pelanggan')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {item.submissionNumber || item.id}
                            </span>
                            {getPriorityBadge(item.status)}
                          </div>
                          <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                            {item.customer?.name || item.name || 'Nama Pelanggan'}
                          </h4>
                          <div className="flex items-center space-x-3 text-xs text-gray-500 pt-0.5">
                            <span className="flex items-center">
                              <Wifi className="w-3.5 h-3.5 mr-1 text-blue-500" />
                              {item.package?.name || 'Paket Internet'} ({item.package?.speed || '30Mbps'})
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">
                              {item.address?.city || item.address?.district || 'Kab. Malang'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span className="text-[11px] text-gray-400">
                          {formatDate(item.createdAt)}
                        </span>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(`/admin/submissions/${item.id}`);
                          }}
                        >
                          Tinjau Validasi
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Module Shortcuts Grid */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5">
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                <Sliders className="w-5 h-5 mr-2 text-indigo-600" />
                Navigasi Modul Operasional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/admin/provisionings')}
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 w-fit group-hover:scale-105 transition-transform">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-gray-900 group-hover:text-blue-600">Provisioning</h5>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola work order & server BFASS</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/admin/packages')}
                  className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 w-fit group-hover:scale-105 transition-transform">
                    <PackageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-gray-900 group-hover:text-indigo-600">Sync Katalog Paket</h5>
                    <p className="text-xs text-gray-500 mt-0.5">Sinkronkan fibermediaplay.net</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/sales-report')}
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 w-fit group-hover:scale-105 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-gray-900 group-hover:text-emerald-600">Laporan Sales</h5>
                    <p className="text-xs text-gray-500 mt-0.5">Analisis pendaftaran & revenue</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Server Node Health & System Log */}
        <div className="space-y-6">
          {/* Server Node Status Monitor */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5 flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                <Server className="w-4 h-4 mr-2 text-emerald-600" />
                Status Node Server & OLT
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                Online
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {[
                { name: 'Malang-NAS-01 (Main Router)', load: 45, status: 'healthy', location: 'Datacenter Malang' },
                { name: 'Kepanjen-OLT-02 (Optic Node)', load: 68, status: 'healthy', location: 'POP Kepanjen' },
                { name: 'Singosari-NAS-03 (Backup Router)', load: 82, status: 'warning', location: 'POP Singosari' },
              ].map((server) => (
                <div key={server.name} className="space-y-2 p-3 rounded-lg bg-gray-50/70 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{server.name}</p>
                      <p className="text-[10px] text-gray-400">{server.location}</p>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        server.status === 'healthy'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}
                    >
                      {server.load}% Load
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${server.load}%`,
                        backgroundColor: server.status === 'healthy' ? '#10b981' : '#f59e0b',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Live Activity Stream */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-indigo-600" />
                Aktivitas Sistem Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {(!auditLogsData || auditLogsData.length === 0) ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">Belum ada aktivitas terbaru.</p>
                ) : (
                  auditLogsData.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="flex items-start space-x-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-900">{log.description || log.log_name || 'Aktivitas System'}</p>
                        <p className="text-gray-500">Oleh: {log.causer?.name || log.causer?.email || 'Sistem'}</p>
                        <p className="text-[10px] text-gray-400">{log.created_at ? formatDate(log.created_at) : ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
