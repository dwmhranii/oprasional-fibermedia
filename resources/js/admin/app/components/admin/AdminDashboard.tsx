import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/api';
import { packageService, extractPackages } from '../../lib/packageService';
import { submissionToFrontend } from '../../lib/mappers';
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
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Wifi,
  BarChart3,
  Activity,
  Sparkles,
  Clock,
  ExternalLink,
  Package as PackageIcon,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { 
  PageHeader, 
  StatCards, 
  StatusBadge 
} from '@shared/ui';
import { ACTIONS, TERMS } from '@shared/i18n/id';
import { formatDate } from '@shared/lib/formatters';

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
        const response = await apiClient.get<any>('/admin/submissions?status=pending&per_page=5');
        const items = response?.data || response?.items || (Array.isArray(response) ? response : []);
        if (items.length > 0) return items.map(submissionToFrontend);

        const res2 = await apiClient.get<any>('/admin/submissions?status=pending_validation&per_page=5');
        const items2 = res2?.data || res2?.items || (Array.isArray(res2) ? res2 : []);
        if (items2.length > 0) return items2.map(submissionToFrontend);

        const allRes = await apiClient.get<any>('/admin/submissions?per_page=10');
        const allItems = allRes?.data || (Array.isArray(allRes) ? allRes : []);
        const filtered = allItems.filter((i: any) =>
          ['pending', 'pending_validation', 'submitted', 'in_review'].includes(i.status?.toLowerCase())
        );
        return filtered.map(submissionToFrontend);
      } catch {
        const fallbackRes = await apiClient.get<any>('/admin/submissions?per_page=5');
        const items = fallbackRes?.data || (Array.isArray(fallbackRes) ? fallbackRes : []);
        return items.map(submissionToFrontend);
      }
    },
  });

  // 2. Fetch Stats counts
  const { data: totalPendingData, isLoading: isPendingCountLoading } = useQuery({
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

  const { data: totalCompletedData, isLoading: isCompletedLoading } = useQuery({
    queryKey: ['adminDashboard', 'stats', 'completedCount'],
    queryFn: () => apiClient.get<any>('/admin/submissions?status=completed&per_page=1'),
  });

  const { data: totalProvisioningData, isLoading: isProvisioningLoading } = useQuery({
    queryKey: ['adminDashboard', 'stats', 'provisioningCount'],
    queryFn: () => apiClient.get<any>('/admin/provisionings?per_page=1'),
  });

  const { data: packagesData, isLoading: isPackagesLoading } = useQuery({
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

  const isStatsLoading = isPendingCountLoading || isCompletedLoading || isProvisioningLoading || isPackagesLoading;

  const getInitials = (name: string) => {
    if (!name) return 'PL';
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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
          <Sparkles className="w-56 h-56" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-white/20 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                Administrator Operasional
              </span>
              <span className="text-xs text-blue-200 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatDate(new Date())}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Selamat Datang Kembali, {user?.name || 'Admin'}! 👋
            </h1>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Pantau antrian validasi berkas {TERMS.customer.toLowerCase()}, status verifikasi teknis, {TERMS.workOrder} jaringan, dan operasional layanan secara terpadu.
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
              {ACTIONS.reload}
            </Button>
            <Button
              onClick={() => onNavigate('/admin/submissions')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-10 px-4 shadow-md"
            >
              <ClipboardList className="w-4 h-4 mr-1.5" />
              Validasi Pengajuan
            </Button>
          </div>
        </div>
      </div>

      {/* Shortcut Cards */}
      <DashboardShortcutCards />

      {/* KPI Stats Metric Cards Grid */}
      <StatCards
        isLoading={isStatsLoading}
        columns={4}
        items={[
          {
            title: 'Validasi Menunggu',
            value: pendingCount,
            subtitle: 'Butuh tinjauan berkas pengajuan',
            variant: 'warning',
            icon: ClipboardList,
            onClick: () => onNavigate('/admin/submissions'),
          },
          {
            title: `Total ${TERMS.workOrder}`,
            value: provisioningCount,
            subtitle: `${TERMS.workOrder} aktif`,
            variant: 'info',
            icon: Server,
            onClick: () => onNavigate('/admin/provisionings'),
          },
          {
            title: `${TERMS.psb} Selesai`,
            value: completedCount,
            subtitle: `${TERMS.customer} Aktif`,
            variant: 'success',
            icon: CheckCircle,
            onClick: () => onNavigate('/admin/customers'),
          },
          {
            title: 'Katalog Paket Resmi',
            value: `${totalPackagesCount} Paket`,
            subtitle: 'Tersinkronisasi',
            variant: 'neutral',
            icon: PackageIcon,
            onClick: () => onNavigate('/admin/packages'),
          },
        ]}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Validation Queue List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xs border-border bg-card overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/40 p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                  Antrian Validasi Pengajuan Terbaru
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Pengajuan {TERMS.customer.toLowerCase()} baru dari Sales yang memerlukan pemeriksaan admin.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('/admin/submissions')}
                className="text-xs text-primary hover:text-primary/80 hover:bg-muted"
              >
                Lihat Semua ({pendingCount})
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {isLoadingPending ? (
                <div className="space-y-3 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border border-border rounded-xl space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : !pendingSubmissions || pendingSubmissions.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-foreground text-sm">Tidak ada antrian validasi tertunda</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seluruh berkas pengajuan {TERMS.customer.toLowerCase()} saat ini telah diperiksa.
                  </p>
                </div>
              ) : (
                pendingSubmissions.slice(0, 5).map((item: any) => (
                  <div
                    key={item.id || item.submissionNumber}
                    onClick={() => onNavigate(`/admin/submissions/${item.id}`)}
                    className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer shadow-xs group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3.5">
                        <Avatar className="w-10 h-10 border border-border shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(item.customer?.name || item.customerName || 'Pelanggan')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                              {item.submissionNumber || item.id}
                            </span>
                            <StatusBadge status={item.status} type="submission" size="sm" />
                          </div>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                            {item.customer?.name || item.name || 'Nama Pelanggan'}
                          </h4>
                          <div className="flex items-center space-x-3 text-xs text-muted-foreground pt-0.5">
                            <span className="flex items-center">
                              <Wifi className="w-3.5 h-3.5 mr-1 text-primary" />
                              {item.package?.name || 'Paket Internet'} ({item.package?.speed || '30 Mbps'})
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">
                              {item.address?.city || item.address?.district || 'Kab. Malang'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 px-3 shadow-xs"
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
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="border-b border-border bg-muted/40 p-5">
              <CardTitle className="text-base font-bold text-foreground flex items-center">
                <Sliders className="w-5 h-5 mr-2 text-primary" />
                Navigasi Modul Operasional
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('/admin/provisionings')}
                  className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-left group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 w-fit group-hover:scale-105 transition-transform border border-blue-200 dark:border-blue-800">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{TERMS.workOrder}</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">Kelola perintah kerja & server BRAS</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/admin/packages')}
                  className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-left group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-fit group-hover:scale-105 transition-transform border border-indigo-200 dark:border-indigo-800">
                    <PackageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Sinkronisasi Katalog Paket</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">Sinkronkan paket layanan</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/sales-report')}
                  className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-left group space-y-2"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 w-fit group-hover:scale-105 transition-transform border border-emerald-200 dark:border-emerald-800">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">Laporan Sales</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">Analisis pendaftaran & pendapatan</p>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Server Node Health & System Log */}
        <div className="space-y-6">
          {/* Server Node Status Monitor */}
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="border-b border-border bg-muted/40 p-5 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground flex items-center">
                <Server className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
                Status Node Server & OLT
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Online
              </Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {[
                { name: 'Malang-NAS-01 (Main Router)', load: 45, status: 'healthy', location: 'Datacenter Malang' },
                { name: 'Kepanjen-OLT-02 (Optic Node)', load: 68, status: 'healthy', location: 'POP Kepanjen' },
                { name: 'Singosari-NAS-03 (Backup Router)', load: 82, status: 'warning', location: 'POP Singosari' },
              ].map((server) => (
                <div key={server.name} className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">{server.name}</p>
                      <p className="text-[10px] text-muted-foreground">{server.location}</p>
                    </div>
                    <Badge
                      className={`text-[10px] ${
                        server.status === 'healthy'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {server.load}% Beban
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        server.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${server.load}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Live Activity Stream */}
          <Card className="shadow-xs border-border bg-card">
            <CardHeader className="border-b border-border bg-muted/40 p-5">
              <CardTitle className="text-base font-bold text-foreground flex items-center">
                <Activity className="w-4 h-4 mr-2 text-primary" />
                Aktivitas Sistem Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {(!auditLogsData || auditLogsData.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Belum ada aktivitas terbaru.</p>
                ) : (
                  auditLogsData.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="flex items-start space-x-3 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-foreground">{log.description || log.log_name || 'Aktivitas Sistem'}</p>
                        <p className="text-muted-foreground">Oleh: {log.causer?.name || log.causer?.email || 'Sistem'}</p>
                        <p className="text-[10px] text-muted-foreground/70">{log.created_at ? formatDate(log.created_at) : ''}</p>
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

export default AdminDashboard;
