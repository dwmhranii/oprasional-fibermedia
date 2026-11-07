import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Download,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Wifi,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { reportService } from '../../lib/reportService';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'sonner';

export const SalesReportPage: React.FC = () => {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch submissions dataset for report analytics
  const { data: submissionsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['salesSubmissions', 'report', dateRange],
    queryFn: () => apiClient.get<any>('/submissions?per_page=200'),
  });

  const items = useMemo(() => {
    const raw = submissionsData?.data || (Array.isArray(submissionsData) ? submissionsData : []);
    return raw;
  }, [submissionsData]);

  // Key Metrics Calculations
  const metrics = useMemo(() => {
    const total = items.length;
    const disetujui = items.filter((i: any) =>
      ['approved', 'provisioning', 'provisioned', 'completed'].includes(i.status)
    ).length;
    const pending = items.filter((i: any) =>
      ['pending', 'pending_validation', 'in_review', 'submitted'].includes(i.status)
    ).length;
    const ditolak = items.filter((i: any) =>
      ['rejected', 'need_info'].includes(i.status)
    ).length;

    const rate = total > 0 ? Math.round((disetujui / total) * 100) : 0;
    const pendapatan = items
      .filter((i: any) => ['approved', 'provisioning', 'provisioned', 'completed'].includes(i.status))
      .reduce((acc: number, curr: any) => {
        const rawPrice = curr.package?.price ?? curr.package_price ?? 0;
        const numPrice = parseFloat(String(rawPrice)) || 0;
        return acc + numPrice;
      }, 0);

    return { total, disetujui, pending, ditolak, rate, pendapatan };
  }, [items]);

  // Aggregate daily submissions
  const dailySubmissions = useMemo(() => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const trend: Record<string, { total: number; approved: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = days[date.getDay()];
      trend[dayName] = { total: 0, approved: 0 };
    }

    items.forEach((sub: any) => {
      const d = new Date(sub.created_at || sub.createdAt || new Date());
      const name = days[d.getDay()];
      if (trend[name] !== undefined) {
        trend[name].total++;
        if (['approved', 'provisioning', 'provisioned', 'completed'].includes(sub.status)) {
          trend[name].approved++;
        }
      }
    });

    return Object.entries(trend).map(([day, val]) => ({
      day,
      Pengajuan: val.total,
      Disetujui: val.approved,
    }));
  }, [items]);

  // Aggregate Package Breakdown
  const packageBreakdown = useMemo(() => {
    const pkgCounts: Record<string, { count: number; revenue: number }> = {};
    items.forEach((sub: any) => {
      const pkgName = sub.package?.name || sub.package_name || 'Paket Layanan';
      const rawPrice = sub.package?.price ?? sub.package_price ?? 0;
      const price = parseFloat(String(rawPrice)) || 0;

      if (!pkgCounts[pkgName]) {
        pkgCounts[pkgName] = { count: 0, revenue: 0 };
      }
      pkgCounts[pkgName].count++;
      if (['approved', 'provisioning', 'provisioned', 'completed'].includes(sub.status)) {
        pkgCounts[pkgName].revenue += price;
      }
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
    return Object.entries(pkgCounts).map(([name, val], i) => ({
      name,
      value: val.count,
      revenue: val.revenue,
      color: colors[i % colors.length],
    }));
  }, [items]);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Menyiapkan file Laporan Penjualan Excel...');
      await reportService.exportSubmissionsExcel();
      toast.success('Ekspor Laporan Excel Berhasil!');
    } catch (err: any) {
      toast.error('Gagal mengunduh laporan', {
        description: err?.message || 'Terjadi kesalahan pada server',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 text-sm font-medium">Memuat data analitik laporan...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Gagal Memuat Data Laporan</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses data.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Laporan Penjualan & Analitik Layanan
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Ringkasan performa penjualan, statistik konversi pengajuan, dan distribusi paket terjual
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select
            value={dateRange}
            onValueChange={(val: 'week' | 'month' | 'year') => setDateRange(val)}
          >
            <SelectTrigger className="w-36 text-xs h-9">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Minggu Ini</SelectItem>
              <SelectItem value="month">Bulan Ini</SelectItem>
              <SelectItem value="year">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-sm flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            Ekspor Excel
          </Button>
        </div>
      </div>

      {/* KPI Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Pengajuan</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{metrics.total}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Tingkat Disetujui</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.rate}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Pengajuan Disetujui</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{metrics.disetujui}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Est. Pendapatan Berulang</p>
              <p className="text-xl font-black text-green-700 mt-1">
                Rp {metrics.pendapatan.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Bar Chart */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Tren Pengajuan Harian (Minggu Ini)
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Perbandingan total pengajuan dan pengajuan yang berhasil disetujui per hari
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailySubmissions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Pengajuan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Disetujui" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Package Distribution Pie Chart */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-purple-600" />
              Distribusi Paket Terjual
            </CardTitle>
            <CardDescription className="text-xs text-gray-500">
              Proporsi pilihan paket internet yang diminati pelanggan
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 flex flex-col items-center justify-center">
            {packageBreakdown.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Belum ada data paket terjual.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={packageBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {packageBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} Transaksi`, name]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Package Breakdown Table */}
      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Rincian Performa & Pendapatan per Paket Layanan
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Rincian jumlah transaksi dan total pendapatan per produk paket internet
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Paket Layanan</th>
                  <th className="py-3 px-4">Total Pengajuan</th>
                  <th className="py-3 px-4">Kontribusi (%)</th>
                  <th className="py-3 px-4 text-right">Pendapatan Disetujui</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {packageBreakdown.map((pkg) => {
                  const percentage =
                    metrics.total > 0 ? Math.round((pkg.value / metrics.total) * 100) : 0;
                  return (
                    <tr key={pkg.name} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: pkg.color }}
                        ></span>
                        {pkg.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {pkg.value} pengajuan
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, backgroundColor: pkg.color }}
                            ></div>
                          </div>
                          <span className="font-mono text-gray-600 text-[11px] font-bold">
                            {percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-green-700">
                        Rp {pkg.revenue.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
