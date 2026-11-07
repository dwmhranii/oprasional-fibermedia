import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import {
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Server,
  Wrench,
  AlertTriangle,
  Calendar as CalendarIcon,
  Loader2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

export const AnalyticsDashboard: React.FC = () => {
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('district');

  // Query Keys payload
  const queryParams = { start_date: startDate, end_date: endDate };

  // 1. Fetch KPI
  const { 
    data: kpiData, 
    isLoading: isKpiLoading, 
    isError: isKpiError, 
    error: kpiError,
    refetch: refetchKpi
  } = useQuery({
    queryKey: ['analytics', 'kpi', queryParams],
    queryFn: async () => {
      let url = '/analytics/kpi';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiClient.get<any>(url);
      return response?.data ?? response;
    }
  });

  // 2. Fetch Funnel
  const {
    data: funnelData,
    isLoading: isFunnelLoading,
    isError: isFunnelError,
    error: funnelError,
    refetch: refetchFunnel
  } = useQuery({
    queryKey: ['analytics', 'funnel', queryParams],
    queryFn: async () => {
      let url = '/analytics/funnel';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiClient.get<any>(url);
      return response?.data ?? response;
    }
  });

  // 3. Fetch Regional
  const {
    data: regionalData,
    isLoading: isRegionalLoading,
    isError: isRegionalError,
    error: regionalError,
    refetch: refetchRegional
  } = useQuery({
    queryKey: ['analytics', 'regional', { ...queryParams, group_by: groupBy }],
    queryFn: async () => {
      let url = '/analytics/regional';
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (groupBy) params.append('group_by', groupBy);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await apiClient.get<any>(url);
      return Array.isArray(response) ? response : (response?.data || []);
    }
  });

  const handleRefetchAll = () => {
    refetchKpi();
    refetchFunnel();
    refetchRegional();
  };

  const isAnyError = isKpiError || isFunnelError || isRegionalError;
  const firstError = kpiError || funnelError || regionalError;

  // Process Funnel Data for Recharts
  const funnelChartData = funnelData ? [
    { name: 'Total Submissions', count: funnelData.raw_counts.total_submissions, percentage: 100 },
    { name: 'Validated', count: funnelData.raw_counts.validated, percentage: funnelData.conversion_percentages.validated },
    { name: 'Provisioned', count: funnelData.raw_counts.provisioned, percentage: funnelData.conversion_percentages.provisioned },
    { name: 'Task Assigned', count: funnelData.raw_counts.task_assigned, percentage: funnelData.conversion_percentages.task_assigned },
    { name: 'Installed', count: funnelData.raw_counts.installed, percentage: funnelData.conversion_percentages.installed },
  ] : [];

  // Process Regional Data (Top 10)
  const sortedRegional = regionalData ? [...regionalData].sort((a: any, b: any) => b.total_submissions - a.total_submissions) : [];
  const topRegional = sortedRegional.slice(0, 10);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400">Pantau performa submission, instalasi, dan tren SLA secara real-time.</p>
        </div>
        
        <Card className="w-full md:w-auto shadow-sm">
          <CardContent className="p-3 flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Tanggal Mulai</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 h-9 text-sm w-full md:w-[150px]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Tanggal Akhir</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 h-9 text-sm w-full md:w-[150px]"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Reset
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Global Error Boundary */}
      {isAnyError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data Analytics</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{firstError instanceof Error ? firstError.message : 'Terjadi kesalahan saat mengambil data dari server.'}</p>
            <Button variant="outline" size="sm" onClick={handleRefetchAll}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                {isKpiLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{kpiData?.submissions?.total || 0}</p>
                )}
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            {!isKpiLoading && kpiData && (
              <div className="mt-4 flex gap-4 text-xs">
                <span className="text-green-600 font-medium">{kpiData.submissions.approved} Approved</span>
                <span className="text-yellow-600 font-medium">{kpiData.submissions.pending} Pending</span>
                <span className="text-red-600 font-medium">{kpiData.submissions.rejected} Rejected</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Provisioning Tasks</p>
                {isKpiLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{kpiData?.provisionings?.total || 0}</p>
                )}
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                <Server className="h-5 w-5" />
              </div>
            </div>
            {!isKpiLoading && kpiData && (
              <div className="mt-4 flex gap-4 text-xs">
                <span className="text-green-600 font-medium">{kpiData.provisionings.successful} Success</span>
                <span className="text-red-600 font-medium">{kpiData.provisionings.failed} Failed</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Installations</p>
                {isKpiLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-gray-900">{kpiData?.installations?.total || 0}</p>
                )}
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
                <Wrench className="h-5 w-5" />
              </div>
            </div>
            {!isKpiLoading && kpiData && (
              <div className="mt-4 flex gap-4 text-xs">
                <span className="text-green-600 font-medium">{kpiData.installations.completed} Completed</span>
                <span className="text-amber-600 font-medium">{kpiData.installations.pending} Pending</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Open SLA Breaches</p>
                {isKpiLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-3xl font-bold text-red-600">{kpiData?.sla_breaches?.open || 0}</p>
                )}
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-full">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            {!isKpiLoading && kpiData && (
              <div className="mt-4 flex gap-4 text-xs">
                <span className="text-gray-600 font-medium">{kpiData.sla_breaches.resolved} Resolved</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Conversion Pipeline</CardTitle>
            <CardDescription>Persentase konversi dari registrasi hingga terpasang.</CardDescription>
          </CardHeader>
          <CardContent>
            {isFunnelLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : funnelChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Data tidak tersedia
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={funnelChartData} layout="vertical" margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'percentage') return [`${value}%`, 'Konversi'];
                        return [value, 'Total Data'];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Total Data" fill="#3b82f6" barSize={30} radius={[0, 4, 4, 0]} />
                    <Line dataKey="percentage" name="Persentase (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regional Bar Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Regional Success Rates (Top 10)</CardTitle>
                <CardDescription>Rasio sukses provisioning & instalasi per area.</CardDescription>
              </div>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="district">Kecamatan</SelectItem>
                  <SelectItem value="city">Kota</SelectItem>
                  <SelectItem value="province">Provinsi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isRegionalLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : topRegional.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                Data tidak tersedia
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topRegional} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => [`${value}%`, '']} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="provisioning_success_rate" name="Provisioning %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="installation_completion_rate" name="Installation %" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regional Full Data Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Data Detail Regional</CardTitle>
          <CardDescription>Tabel distribusi submission pada seluruh area.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isRegionalLoading ? (
            <div className="p-6 space-y-4">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
            </div>
          ) : sortedRegional.length === 0 ? (
             <div className="py-12 text-center text-gray-500">Tidak ada data regional.</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Region ({groupBy})</TableHead>
                    <TableHead className="text-right">Total Submissions</TableHead>
                    <TableHead className="text-right">Provisioning Success</TableHead>
                    <TableHead className="text-right">Installation Complete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRegional.map((row: any) => (
                    <TableRow key={row.region}>
                      <TableCell className="font-medium text-gray-900">{row.region}</TableCell>
                      <TableCell className="text-right">{row.total_submissions}</TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${row.provisioning_success_rate >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.provisioning_success_rate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`px-2 py-1 rounded text-xs ${row.installation_completion_rate >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {row.installation_completion_rate}%
                        </span>
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
  );
};
