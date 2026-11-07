import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  CheckCircle,
  TrendingUp,
  Plus,
  Search,
  Eye,
  RefreshCw,
  Sparkles,
  Wifi,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '../../lib/api';
import { submissionToFrontend } from '../../lib/mappers';
import { formatDate } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';

interface SalesDashboardProps {
  onNavigate: (path: string) => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // Single synchronized query to fetch all sales submissions
  const {
    data: submissions,
    isLoading,
    isRefetching,
    isError,
    error,
  } = useQuery({
    queryKey: ['salesSubmissions', 'all'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/submissions?per_page=100');
      const items = response?.data || response?.items || (Array.isArray(response) ? response : []);
      return items.map(submissionToFrontend);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['salesSubmissions'] });
  };

  const allSubmissions = submissions || [];

  // Accurate metric calculations directly from dataset
  const totalCount = allSubmissions.length;

  const pendingCount = allSubmissions.filter((s: any) =>
    ['pending', 'pending_validation', 'submitted', 'in_review'].includes(s.status?.toLowerCase())
  ).length;

  const approvedCount = allSubmissions.filter((s: any) =>
    ['approved', 'provisioning', 'provisioned'].includes(s.status?.toLowerCase())
  ).length;

  const completedCount = allSubmissions.filter((s: any) =>
    s.status?.toLowerCase() === 'completed'
  ).length;

  const rejectedCount = allSubmissions.filter((s: any) =>
    s.status?.toLowerCase() === 'rejected'
  ).length;

  const successfulCount = approvedCount + completedCount;
  const conversionRate = totalCount > 0 ? Math.min(100, Math.round((successfulCount / totalCount) * 100)) : 0;

  // Filter recent submissions by search term
  const filteredSubmissions = allSubmissions.filter((sub: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const subNo = sub.submissionNumber || sub.id || '';
    const custName = sub.customer?.name || sub.name || '';
    return subNo.toLowerCase().includes(term) || custName.toLowerCase().includes(term);
  });

  // Dynamic weekly trend data
  const getSubmissionsTrend = (subs: any[]) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const trend: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trend[days[date.getDay()]] = 0;
    }
    subs.forEach((sub) => {
      if (sub.createdAt) {
        const d = new Date(sub.createdAt);
        const dayName = days[d.getDay()];
        if (trend[dayName] !== undefined) {
          trend[dayName]++;
        }
      }
    });
    return Object.entries(trend).map(([name, submissions]) => ({ name, submissions }));
  };

  const trendData = getSubmissionsTrend(allSubmissions);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
      case 'pending_validation':
      case 'submitted':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Menunggu Validasi</Badge>;
      case 'approved':
      case 'provisioning':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-semibold">Disetujui Admin</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">Terpasang (Selesai)</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ditolak</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status || 'Diproses'}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'CS';
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
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-10 pointer-events-none">
          <Sparkles className="w-56 h-56" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-blue-100 border border-white/20 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                Sales Representative
              </span>
              <span className="text-xs text-blue-200 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatDate(new Date().toISOString())}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Halo, {user?.name || 'Sales Agent'}! 🚀
            </h1>
            <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
              Pantau performa pendaftaran pelanggan baru, status persetujuan validasi berkas, dan raih target penjualan internet broadband Anda.
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
              onClick={() => onNavigate('/submissions/new')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs h-10 px-4 shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Buat Pengajuan Baru
            </Button>
          </div>
        </div>
      </div>

      {/* Global Error Notice */}
      {isError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data Submissions</AlertTitle>
          <AlertDescription className="flex items-center justify-between mt-1">
            <span>{error instanceof Error ? error.message : 'Terjadi masalah koneksi server.'}</span>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Pengajuan Saya
                </p>
                <h3 className="text-3xl font-black text-gray-900 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : totalCount}
                </h3>
                <p className="text-xs text-blue-600 font-medium mt-1">
                  Semua berkas terdaftar
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Menunggu Validasi
                </p>
                <h3 className="text-3xl font-black text-amber-600 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : pendingCount}
                </h3>
                <p className="text-xs text-amber-600 font-medium mt-1">
                  Dalam pemeriksaan admin
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
                  Disetujui / Selesai
                </p>
                <h3 className="text-3xl font-black text-emerald-600 mt-1">
                  {isLoading ? <Skeleton className="h-8 w-16" /> : successfulCount}
                </h3>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Siap dipasang / Terpasang
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-all border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tingkat Konversi
                </p>
                <h3 className="text-3xl font-black text-indigo-600 mt-1">
                  {conversionRate}%
                </h3>
                <p className="text-xs text-indigo-600 font-medium mt-1">
                  Persentase sukses
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Submissions Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Pengajuan Terbaru Saya
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Daftar pengajuan calon pelanggan internet yang Anda masukkan.
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari pengajuan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-8 bg-white border-gray-200"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onNavigate('/submissions')}
                  className="text-xs text-blue-600 hover:bg-blue-50 shrink-0"
                >
                  Semua
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700">Belum Ada Pengajuan</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Silakan klik 'Buat Pengajuan Baru' untuk menambahkan pendaftaran pelanggan.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader className="bg-slate-100/70 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">NO. PENGAJUAN</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">PELANGGAN</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">PAKET</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase">STATUS</TableHead>
                        <TableHead className="px-4 py-3 text-xs font-bold text-slate-700 uppercase text-right">AKSI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {filteredSubmissions.slice(0, 5).map((sub: any) => (
                        <TableRow key={sub.id || sub.submissionNumber} className="hover:bg-blue-50/40 transition-colors">
                          <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {sub.submissionNumber || sub.id}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle">
                            <div className="flex items-center space-x-2.5">
                              <Avatar className="w-8 h-8 border border-gray-200 shrink-0">
                                <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                                  {getInitials(sub.customer?.name || sub.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-sm text-gray-900 block">
                                  {sub.customer?.name || sub.name || 'Pelanggan'}
                                </span>
                                <span className="text-[11px] text-gray-400 block">
                                  NIK: {sub.customer?.ktp || '-'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                            <div className="flex items-center space-x-1 font-bold text-xs text-blue-600">
                              <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{sub.package?.name || 'Paket Internet'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle whitespace-nowrap">
                            {getStatusBadge(sub.status)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onNavigate(`/submissions/${sub.id}`)}
                              className="h-8 text-xs text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
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

        {/* Right Column: Dynamic Weekly Sales Trend Chart */}
        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 p-5">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                Tren Penjualan 7 Hari Terakhir
              </CardTitle>
              <CardDescription className="text-xs text-gray-500 mt-0.5">
                Grafik pendaftaran harian produk internet.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="submissions"
                      name="Pengajuan"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#2563eb' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card className="shadow-sm border-gray-200 bg-gradient-to-br from-slate-900 to-blue-950 text-white">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">Tips Sales Sukses</h4>
              </div>
              <p className="text-xs text-blue-200 leading-relaxed">
                Pastikan mengunggah foto KTP dan Rumah calon pelanggan dengan jelas untuk mempercepat proses validasi admin dalam waktu kurang dari 30 menit.
              </p>
              <Button
                onClick={() => onNavigate('/submissions/new')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-9 mt-2"
              >
                + Pendaftaran Baru
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
