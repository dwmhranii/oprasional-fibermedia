import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import {
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileX,
  ServerCrash,
  Eye,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';

export const SlaDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Filters state
  const [breachType, setBreachType] = useState<string>('all');
  const [resolved, setResolved] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // 1. Fetch SLA Summary
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['sla', 'summary'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/admin/sla-breaches/summary');
      return response.data;
    }
  });

  // 2. Fetch Paginated List
  const {
    data: listData,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isError: isListError,
    error: listError,
    refetch: refetchList
  } = useQuery({
    queryKey: ['sla', 'list', { breachType, resolved, startDate, endDate, page }],
    queryFn: async () => {
      let url = `/admin/sla-breaches?page=${page}`;
      const params = new URLSearchParams();
      if (breachType !== 'all') params.append('breach_type', breachType);
      if (resolved !== 'all') params.append('resolved', resolved);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (params.toString()) url += `&${params.toString()}`;
      
      const response = await apiClient.get<any>(url);
      return response.data;
    },
    placeholderData: keepPreviousData, // Prevents flicker when paginating/filtering
  });

  const handleResetFilters = () => {
    setBreachType('all');
    setResolved('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const getBreachTypeLabel = (type: string) => {
    switch (type) {
      case 'pending_validation': return 'Validasi Terlambat';
      case 'provisioning_failure': return 'Gagal Provisioning';
      case 'delayed_installation': return 'Instalasi Terlambat';
      default: return type.replace('_', ' ');
    }
  };

  const getBreachTypeBadge = (type: string) => {
    switch (type) {
      case 'pending_validation': return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200"><FileX className="w-3 h-3 mr-1"/> Validasi</Badge>;
      case 'provisioning_failure': return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200"><ServerCrash className="w-3 h-3 mr-1"/> Provisioning</Badge>;
      case 'delayed_installation': return <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200"><Clock className="w-3 h-3 mr-1"/> Instalasi</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">SLA Monitoring</h1>
        <p className="text-gray-500 dark:text-slate-400">Pantau pelanggaran Service Level Agreement (SLA) pada setiap tahapan operasional.</p>
      </div>

      {/* SLA Summary Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Summary Breaches</h2>
          {isSummaryError && (
            <Button variant="ghost" size="sm" onClick={() => refetchSummary()} className="text-red-600">
              <RefreshCw className="w-4 h-4 mr-2" /> Gagal memuat summary
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-4 flex flex-col justify-center items-center h-24">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Total Open</p>
              {isSummaryLoading ? <Skeleton className="h-8 w-16 bg-red-200" /> : <p className="text-3xl font-bold text-red-700">{summaryData?.open_count || 0}</p>}
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4 flex flex-col justify-center items-center h-24">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Resolved</p>
              {isSummaryLoading ? <Skeleton className="h-8 w-16 bg-green-200" /> : <p className="text-3xl font-bold text-green-700">{summaryData?.resolved_count || 0}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center h-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 text-center">Validasi<br/>Terlambat</p>
              {isSummaryLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-gray-900">{summaryData?.pending_validation_count || 0}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center h-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 text-center">Gagal<br/>Provisioning</p>
              {isSummaryLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-gray-900">{summaryData?.provisioning_failure_count || 0}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-col justify-center items-center h-24">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 text-center">Instalasi<br/>Terlambat</p>
              {isSummaryLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-gray-900">{summaryData?.delayed_installation_count || 0}</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Tipe Pelanggaran</Label>
              <Select value={breachType} onValueChange={(val) => { setBreachType(val); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="pending_validation">Validasi Terlambat</SelectItem>
                  <SelectItem value="provisioning_failure">Gagal Provisioning</SelectItem>
                  <SelectItem value="delayed_installation">Instalasi Terlambat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Status Penyelesaian</Label>
              <Select value={resolved} onValueChange={(val) => { setResolved(val); setPage(1); }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="false">Open (Belum Selesai)</SelectItem>
                  <SelectItem value="true">Resolved (Selesai)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Tanggal Mulai (Deteksi)</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Tanggal Akhir (Deteksi)</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <Button variant="outline" size="sm" className="h-9" onClick={handleResetFilters}>
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List Error State */}
      {isListError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Daftar SLA</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{listError instanceof Error ? listError.message : 'Terjadi kesalahan saat memuat data.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetchList()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table Section */}
      <Card className="shadow-sm overflow-hidden relative">
        {isListFetching && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-10">
            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '100%' }}></div>
          </div>
        )}
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Tipe Pelanggaran</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waktu Deteksi</TableHead>
              <TableHead>Waktu Penyelesaian</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isListLoading && !listData ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : listData?.data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                    <p>Tidak ada pelanggaran SLA yang ditemukan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              listData?.data?.map((breach: any) => (
                <TableRow key={breach.id} className={!breach.resolved_at ? 'bg-red-50/30' : ''}>
                  <TableCell className="font-medium text-gray-900">#{breach.id}</TableCell>
                  <TableCell>{getBreachTypeBadge(breach.breach_type)}</TableCell>
                  <TableCell>
                    {breach.resolved_at ? (
                      <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">Resolved</Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">Open</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {breach.detected_at ? format(new Date(breach.detected_at), 'dd MMM yyyy, HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {breach.resolved_at ? format(new Date(breach.resolved_at), 'dd MMM yyyy, HH:mm') : <span className="text-red-500 text-xs italic">Menunggu...</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/admin/sla-breaches/${breach.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {listData && listData.last_page > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Menampilkan {((listData.current_page - 1) * 15) + 1} - {Math.min(listData.current_page * 15, listData.total)} dari {listData.total} data
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= listData.last_page}
                onClick={() => setPage(p => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
