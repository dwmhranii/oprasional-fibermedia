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
import { PageHeader, StatCards, StatusBadge } from '@shared/ui';
import { formatDateTime } from '@shared/lib/formatters';

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
      const response = await apiClient.get<any>('/sla-breaches/summary');
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
      let url = `/sla-breaches?page=${page}`;
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
      {/* Page Header */}
      <PageHeader
        title="Pemantauan SLA"
        description="Pantau pelanggaran Service Level Agreement (SLA) pada setiap tahapan operasional."
        breadcrumb={[
          { label: 'Admin', href: '#' },
          { label: 'Pemantauan SLA' },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSummary();
              refetchList();
            }}
            disabled={isSummaryLoading || isListFetching}
            className="text-xs font-semibold h-9 px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isListFetching ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        }
      />

      {/* SLA Summary Section */}
      <StatCards
        isLoading={isSummaryLoading}
        items={[
          {
            title: 'Pelanggaran Terbuka',
            value: summaryData?.open_count || 0,
            description: 'Perlu penanganan segera',
            icon: AlertTriangle,
          },
          {
            title: 'Selesai Ditangani',
            value: summaryData?.resolved_count || 0,
            description: 'Telah diselesaikan',
            icon: CheckCircle2,
            trend: { value: 100, label: 'Tuntas', isPositive: true },
          },
          {
            title: 'Validasi Terlambat',
            value: summaryData?.pending_validation_count || 0,
            description: 'Tahap verifikasi',
            icon: FileX,
          },
          {
            title: 'Gagal Provisioning',
            value: summaryData?.provisioning_failure_count || 0,
            description: 'Kendala teknis OLT/BRAS',
            icon: ServerCrash,
          },
          {
            title: 'Instalasi Terlambat',
            value: summaryData?.delayed_installation_count || 0,
            description: 'Pemasangan lapangan',
            icon: Clock,
          },
        ]}
      />

      {/* Filter Section */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipe Pelanggaran</Label>
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
              <Label className="text-xs text-muted-foreground">Status Penyelesaian</Label>
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
              <Label className="text-xs text-muted-foreground">Tanggal Mulai (Deteksi)</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tanggal Akhir (Deteksi)</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
          <TableHeader className="bg-muted/50">
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
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                    <p>Tidak ada pelanggaran SLA yang ditemukan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              listData?.data?.map((breach: any) => (
                <TableRow key={breach.id} className={!breach.resolved_at ? 'bg-red-50/30' : ''}>
                  <TableCell className="font-medium text-foreground">#{breach.id}</TableCell>
                  <TableCell>{getBreachTypeBadge(breach.breach_type)}</TableCell>
                  <TableCell>
                    {breach.resolved_at ? (
                      <StatusBadge status="completed" label="Selesai" />
                    ) : (
                      <StatusBadge status="rejected" label="Belum Selesai" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {breach.detected_at ? formatDateTime(breach.detected_at) : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {breach.resolved_at ? formatDateTime(breach.resolved_at) : <span className="text-destructive text-xs italic">Menunggu...</span>}
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
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
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
