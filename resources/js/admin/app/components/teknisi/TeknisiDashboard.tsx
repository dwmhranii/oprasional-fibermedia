import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench,
  Clock,
  CheckCircle2,
  MapPin,
  Phone,
  Eye,
  Wifi,
  AlertTriangle,
  Calendar,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../lib/formatters';

export const TeknisiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Query live technician field tasks list
  const {
    data: tasksData,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks', 'list', user?.id, { limit: 100 }],
    queryFn: () => apiClient.get<any>('/teknisi/tasks?per_page=100'),
    staleTime: 1000 * 30,
  });

  const tasks = tasksData?.data || (Array.isArray(tasksData) ? tasksData : []);

  // Calculate stats
  const assignedCount = tasks.filter(
    (t: any) => t.status === 'assigned' || t.status === 'on_the_way'
  ).length;
  const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const failedCount = tasks.filter((t: any) => t.status === 'failed').length;

  // Active tasks for field schedule
  const activeSchedule = tasks.filter(
    (t: any) =>
      t.status === 'assigned' || t.status === 'on_the_way' || t.status === 'in_progress'
  );

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Ditugaskan</Badge>;
      case 'on_the_way':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Menuju Lokasi</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 animate-pulse">Sedang Dikerjakan</Badge>;
      case 'submitted':
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Verifikasi Admin</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Selesai Terpasang</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Kendala / Gagal</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status || 'Aktif'}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'TK';
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
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
          <Wrench className="w-56 h-56" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-amber-100 border border-white/20 flex items-center">
                <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-200" />
                Field Installation Technician
              </span>
              <span className="text-xs text-amber-100 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatDate(new Date().toISOString())}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Selamat Bertugas, {user?.name || 'Teknisi Field'}! 🛠️
            </h1>
            <p className="text-amber-100 text-sm max-w-2xl leading-relaxed">
              Cek daftar work order pemasangan jaringan fiber optic, update lokasi GPS, dan selesaikan checklist foto bukti instalasi pelanggan.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs h-10 px-4"
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Sync Tugas
            </Button>
            <Button
              onClick={() => navigate('/teknisi/tasks')}
              className="bg-white text-amber-900 hover:bg-amber-50 font-bold text-xs h-10 px-4 shadow-md"
            >
              <ClipboardList className="w-4 h-4 mr-1.5 text-amber-700" />
              Semua Work Order
            </Button>
          </div>
        </div>
      </div>

      {/* Global Error Notice */}
      {isError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Daftar Tugas</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-1">
            <span>{error instanceof Error ? error.message : 'Terjadi masalah koneksi server.'}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Stats Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Work Order Aktif
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : assignedCount + inProgressCount}
                </h3>
                <p className="text-xs text-blue-600 font-medium mt-1">
                  Penugasan siap dikerjakan
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <ClipboardList className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Dalam Pengerjaan
                </p>
                <h3 className="text-3xl font-black text-amber-600 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : inProgressCount}
                </h3>
                <p className="text-xs text-amber-600 font-medium mt-1">
                  Proses di lokasi pelanggan
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pemasangan Selesai
                </p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : completedCount}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Sudah aktif terpasang
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Kendala / Gagal
                </p>
                <h3 className="text-3xl font-black text-red-600 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : failedCount}
                </h3>
                <p className="text-xs text-red-600 font-medium mt-1">
                  Perlu penjadwalan ulang
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Field Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-amber-600" />
                  Jadwal Kerja & Work Order Aktif
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Tugas penugasan pemasangan jaringan fisik yang harus diselesaikan di lapangan.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/teknisi/tasks')}
                className="text-xs text-amber-700 hover:bg-amber-50"
              >
                Semua Task
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>

            <CardContent className="p-5">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : activeSchedule.length === 0 ? (
                <div className="p-12 text-center text-gray-500 bg-gray-50/50 rounded-xl border border-gray-200">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-800 text-sm">Tidak Ada Jadwal Tugas Aktif</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Semua work order penugasan pemasangan saat ini telah terselesaikan dengan baik.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSchedule.map((task: any) => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/teknisi/tasks/${task.id}`)}
                      className="p-4 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50/20 transition-all cursor-pointer shadow-2xs space-y-3 flex flex-col justify-between group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {task.task_number || `TSK-${task.id}`}
                          </span>
                          {getStatusBadge(task.status)}
                        </div>

                        <div className="flex items-start space-x-3 pt-1">
                          <Avatar className="w-9 h-9 border border-gray-200 shrink-0">
                            <AvatarFallback className="bg-amber-600 text-white font-bold text-xs">
                              {getInitials(task.customer?.name || 'Pelanggan')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                              {task.customer?.name || 'Pelanggan Fibermedia'}
                            </h4>
                            <p className="text-xs text-gray-500 flex items-center mt-0.5 truncate max-w-[180px]">
                              <MapPin className="w-3 h-3 mr-1 text-gray-400 shrink-0" />
                              {task.address || task.customer?.address || 'Kab. Malang'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        {task.customer?.phone && (
                          <a
                            href={`tel:${task.customer.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline flex items-center font-medium"
                          >
                            <Phone className="w-3.5 h-3.5 mr-1" />
                            {task.customer.phone}
                          </a>
                        )}
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 px-3 ml-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/teknisi/tasks/${task.id}`);
                          }}
                        >
                          Kerjakan
                          <Eye className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Activities Feed & SOP Reminder */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-amber-600" />
                Aktivitas Pemasangan Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-4">
                {tasks.slice(0, 4).map((task: any) => (
                  <div key={task.id} className="flex items-start space-x-3 text-xs">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">
                        {task.customer?.name || `Task #${task.id}`}
                      </p>
                      <p className="text-gray-500 text-[11px] truncate">
                        Status: <span className="font-semibold text-gray-700">{task.status}</span>
                      </p>
                      <p className="text-[10px] text-gray-400">{formatDate(task.updated_at || task.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 bg-gradient-to-br from-slate-900 to-amber-950 text-white">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">SOP Pemasangan Teknisi</h4>
              </div>
              <p className="text-xs text-amber-100 leading-relaxed">
                Pastikan selalu mengambil foto Redup/Redundant ODP, foto bukti Modem terpasang, dan tanda tangan digital pelanggan sebelum menandai task sebagai 'Completed'.
              </p>
              <Button
                onClick={() => navigate('/teknisi/tasks')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 mt-2"
              >
                Buka Semua Penugasan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
