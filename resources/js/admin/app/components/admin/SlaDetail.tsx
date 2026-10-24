import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ServerCrash,
  FileX,
  FileText
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours } from 'date-fns';
import { id } from 'date-fns/locale';

export const SlaDetail: React.FC = () => {
  const { id: breachId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: breachResponse,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['sla', 'detail', breachId],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/admin/sla-breaches/${breachId}`);
      return response.data;
    },
    enabled: !!breachId,
  });

  const breach = breachResponse?.data;

  const getBreachTypeBadge = (type: string) => {
    switch (type) {
      case 'pending_validation': return <Badge variant="outline" className="text-yellow-700 bg-yellow-50 border-yellow-200"><FileX className="w-4 h-4 mr-1"/> Validasi Terlambat</Badge>;
      case 'provisioning_failure': return <Badge variant="outline" className="text-red-700 bg-red-50 border-red-200"><ServerCrash className="w-4 h-4 mr-1"/> Gagal Provisioning</Badge>;
      case 'delayed_installation': return <Badge variant="outline" className="text-orange-700 bg-orange-50 border-orange-200"><Clock className="w-4 h-4 mr-1"/> Instalasi Terlambat</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const calculateDuration = (detected: string, resolved: string | null) => {
    const start = new Date(detected);
    const end = resolved ? new Date(resolved) : new Date();
    const hours = differenceInHours(end, start);
    return `${hours} Jam${!resolved ? ' (Berjalan)' : ''}`;
  };

  if (isError) {
    return (
      <div className="space-y-6 pb-12">
        <Button variant="ghost" onClick={() => navigate('/admin/sla-breaches')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Detail SLA</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Data tidak ditemukan atau terjadi kesalahan server.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Coba Lagi</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sla-breaches')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SLA Breach #{breachId}</h1>
          <p className="text-gray-500">Detail investigasi pelanggaran Service Level Agreement</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent></Card>
        </div>
      ) : !breach ? (
         <Alert><AlertCircle className="w-4 h-4"/><AlertTitle>Data tidak ditemukan</AlertTitle></Alert>
      ) : (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Card */}
            <Card className="shadow-sm border-l-4" style={{ borderLeftColor: breach.resolved_at ? '#10b981' : '#ef4444' }}>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex justify-between items-center">
                  Status Resolusi
                  {breach.resolved_at ? (
                    <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1"/> Resolved</Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50"><AlertTriangle className="w-3 h-3 mr-1"/> Open</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Waktu Terdeteksi</p>
                    <p className="text-sm font-medium">{format(new Date(breach.detected_at), 'dd MMM yyyy, HH:mm')}</p>
                    <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(breach.detected_at), { addSuffix: true, locale: id })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-semibold uppercase">Waktu Diselesaikan</p>
                    {breach.resolved_at ? (
                      <>
                        <p className="text-sm font-medium">{format(new Date(breach.resolved_at), 'dd MMM yyyy, HH:mm')}</p>
                        <p className="text-xs text-green-600 font-medium">Clear</p>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-red-500 italic">Menunggu Tindakan...</p>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 border-t mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-600">Durasi Pelanggaran:</span>
                  <Badge variant="secondary" className="font-mono text-base bg-gray-100">
                    {calculateDuration(breach.detected_at, breach.resolved_at)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* General Info Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg">Informasi Pelanggaran</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Tipe Pelanggaran</p>
                  <div className="pt-1">{getBreachTypeBadge(breach.breach_type)}</div>
                </div>

                <div className="space-y-1 pt-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Penjelasan</p>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border">
                    {breach.breach_type === 'pending_validation' && 'Dokumen pengajuan telah melewati batas waktu SLA untuk divalidasi oleh Admin Provisioning (Standar: 1x24 Jam).'}
                    {breach.breach_type === 'provisioning_failure' && 'Proses provisioning ke OLT NAS gagal berulang kali dan belum di-resolve oleh engineer.'}
                    {breach.breach_type === 'delayed_installation' && 'Teknisi belum menyelesaikan tugas instalasi meskipun sudah melewati estimasi waktu wajar.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sub-Entity Details Payload */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b bg-gray-50">
              <CardTitle className="text-lg flex items-center">
                <FileText className="w-5 h-5 mr-2 text-gray-500" /> Referensi Entitas Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {breach.entity ? (
                 <div className="divide-y">
                   {Object.entries(breach.entity).map(([key, value]) => {
                     // Filter out highly verbose or internal keys if necessary, but rendering all for diagnostic purposes is good for Superadmin
                     if (typeof value === 'object' && value !== null) return null; // skip deep nested for table
                     
                     return (
                       <div key={key} className="flex flex-col sm:flex-row sm:items-center py-3 px-6 hover:bg-gray-50 transition-colors">
                         <span className="text-sm font-medium text-gray-500 sm:w-1/3 mb-1 sm:mb-0 capitalize">
                           {key.replace(/_/g, ' ')}
                         </span>
                         <span className="text-sm text-gray-900 font-mono sm:w-2/3 break-all">
                           {value !== null ? String(value) : '-'}
                         </span>
                       </div>
                     );
                   })}
                 </div>
               ) : (
                 <div className="p-6 text-center text-gray-500 italic">Data entitas tidak tersedia atau telah dihapus.</div>
               )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
