import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ArrowLeft,
  Server,
  User,
  Wifi,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { submissionToFrontend } from '../../lib/mappers';

export const ProvisioningCreate: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<Record<string, string[]>>({});

  // Form states
  const [serviceType, setServiceType] = useState('PPPOE');
  const [nasServer, setNasServer] = useState('');
  const [nasIp, setNasIp] = useState('');
  const [ipPool, setIpPool] = useState('');
  const [bandwidthProfile, setBandwidthProfile] = useState('');
  const [bandwidthUp, setBandwidthUp] = useState<number>(51200);
  const [bandwidthDown, setBandwidthDown] = useState<number>(51200);

  // Auto-focus first invalid field
  useEffect(() => {
    const errorKeys = Object.keys(backendErrors);
    if (errorKeys.length > 0) {
      const firstError = errorKeys[0];
      // Map error keys to element IDs if they differ
      const idMapping: Record<string, string> = {
        bandwidth_profile: 'bw_profile',
        bandwidth_up: 'bw_up',
        bandwidth_down: 'bw_down'
      };
      
      const fieldId = idMapping[firstError] || firstError;
      const element = document.getElementById(fieldId);
      if (element) {
        element.focus();
      }
    }
  }, [backendErrors]);

  // Fetch completed submissions that are ready to be provisioned
  const { data: approvedSubmissions, isLoading: isSubsLoading, isError: isSubsError, refetch: refetchSubs } = useQuery({
    queryKey: ['adminSubmissions', 'completedList'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/admin/submissions?status=completed&per_page=100');
      return (response.data || []).map(submissionToFrontend);
    },
  });

  // Query selected submission details to display info cards
  const { data: selectedSubDetail, isLoading: isDetailLoading, isError: isDetailError, refetch: refetchDetail } = useQuery({
    queryKey: ['adminSubmissions', 'detail', selectedSubId],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/admin/submissions/${selectedSubId}`);
      return submissionToFrontend(response);
    },
    enabled: !!selectedSubId,
  });

  // Watch selected submission to auto-fill bandwidth specs if selected
  React.useEffect(() => {
    if (selectedSubDetail) {
      // Parse packages name/speed to establish a profile name
      const speedStr = selectedSubDetail.package.speed;
      const speedVal = parseFloat(speedStr) || 20;
      setBandwidthProfile(`${selectedSubDetail.package.name}_${speedStr}`);
      
      // Auto populate: speedMbps * 1024 to convert to Kbps
      const kbpsVal = Math.round(speedVal * 1024);
      setBandwidthUp(kbpsVal);
      setBandwidthDown(kbpsVal);
    }
  }, [selectedSubDetail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) {
      toast.error('Silakan pilih pengajuan pelanggan yang disetujui');
      return;
    }
    if (!nasServer.trim() || !nasIp.trim() || !bandwidthProfile.trim()) {
      toast.error('Mohon lengkapi seluruh kolom konfigurasi server');
      return;
    }

    setIsSubmitting(true);
    setBackendErrors({});

    const payload = {
      submission_id: Number(selectedSubId),
      service_type: serviceType,
      nas_server: nasServer.trim(),
      nas_ip: nasIp.trim(),
      ip_pool: ipPool.trim() || null,
      bandwidth_profile: bandwidthProfile.trim(),
      bandwidth_up: Number(bandwidthUp),
      bandwidth_down: Number(bandwidthDown),
    };

    try {
      const response = await apiClient.post<any>('/admin/provisionings', payload);
      toast.success('Provisioning berhasil dikonfigurasi dan dikirim ke antrean BFASS!');
      
      // Invalidate react-query cache and refresh
      queryClient.invalidateQueries({ queryKey: ['adminProvisionings'] });
      
      // Navigate to listing view
      navigate('/admin/provisionings');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menyimpan konfigurasi provisioning');
        if (err.errors) {
          setBackendErrors(err.errors);
        }
      } else {
        toast.error('Terjadi kesalahan koneksi saat menyimpan data.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button variant="outline" size="icon" onClick={() => navigate('/admin/provisionings')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1f2937' }}>
            Konfigurasi Provisi Jaringan
          </h1>
          <p style={{ color: '#6b7280' }}>
            Hubungkan pengajuan disetujui ke server NAS dan tentukan profil bandwidth BFASS.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Approved Submissions Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              Pilih Pengajuan Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="submission_select">Pengajuan Disetujui (Approved)</Label>
              {isSubsError ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Gagal Memuat Daftar Pengajuan</AlertTitle>
                  <AlertDescription className="flex flex-col gap-3 items-start mt-2">
                    <p>Terjadi kesalahan saat memuat daftar pengajuan dari backend.</p>
                    <Button variant="outline" size="sm" onClick={() => refetchSubs()}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : isSubsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : !approvedSubmissions || approvedSubmissions.length === 0 ? (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <AlertTitle className="text-amber-800">Antrean Kosong</AlertTitle>
                  <AlertDescription className="text-amber-600">
                    Tidak ada pengajuan berstatus disetujui (approved) yang membutuhkan provisi baru saat ini.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedSubId} onValueChange={setSelectedSubId} disabled={isSubmitting}>
                  <SelectTrigger id="submission_select">
                    <SelectValue placeholder="Pilih nomor pengajuan / nama pelanggan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedSubmissions.map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.submissionNumber} - {sub.customer.name} ({sub.package.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Selected customer & package card info */}
            {isDetailError ? (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Gagal Memuat Detail Pengajuan</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 items-start mt-2">
                  <p>Tidak dapat mengambil detail pengajuan yang dipilih.</p>
                  <Button variant="outline" size="sm" onClick={() => refetchDetail()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
                  </Button>
                </AlertDescription>
              </Alert>
            ) : isDetailLoading ? (
              <Skeleton className="h-32 w-full mt-4" />
            ) : selectedSubDetail ? (
              <div className="bg-gray-50 border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Nama Pelanggan</p>
                  <p className="font-semibold text-gray-800 mt-1">{selectedSubDetail.customer.name}</p>
                  <p className="text-xs text-gray-500 mt-1">NIK: {selectedSubDetail.customer.ktp}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Alamat Pemasangan</p>
                  <p className="text-gray-800 mt-1 font-medium">{selectedSubDetail.address.installAddress}</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedSubDetail.address.district}, {selectedSubDetail.address.city}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase">Paket Layanan</p>
                  <p className="font-semibold text-gray-800 mt-1">{selectedSubDetail.package.name}</p>
                  <p className="text-xs text-gray-500 mt-1">Kecepatan Kontrak: {selectedSubDetail.package.speed}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Configurations Fields */}
        {selectedSubId && selectedSubDetail && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                Parameter Konfigurasi Server
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Type */}
                <div className="space-y-2">
                  <Label>Tipe Layanan</Label>
                  <Select value={serviceType} onValueChange={setServiceType} disabled={isSubmitting}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PPPOE">PPPOE</SelectItem>
                      <SelectItem value="Static IP">Static IP / Route</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* NAS Server */}
                <div className="space-y-2">
                  <Label htmlFor="nas_server">Nama Server NAS</Label>
                  <Input
                    id="nas_server"
                    placeholder="Contoh: NAS-JKT-01"
                    value={nasServer}
                    onChange={(e) => setNasServer(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {backendErrors.nas_server && (
                    <p className="text-xs text-red-500 font-medium">{backendErrors.nas_server[0]}</p>
                  )}
                </div>

                {/* NAS IP */}
                <div className="space-y-2">
                  <Label htmlFor="nas_ip">IP Server NAS</Label>
                  <Input
                    id="nas_ip"
                    placeholder="Contoh: 172.16.1.1"
                    value={nasIp}
                    onChange={(e) => setNasIp(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {backendErrors.nas_ip && (
                    <p className="text-xs text-red-500 font-medium">{backendErrors.nas_ip[0]}</p>
                  )}
                </div>

                {/* IP Pool */}
                <div className="space-y-2">
                  <Label htmlFor="ip_pool">IP Pool (Opsional)</Label>
                  <Input
                    id="ip_pool"
                    placeholder="Contoh: pool-home-50m"
                    value={ipPool}
                    onChange={(e) => setIpPool(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {backendErrors.ip_pool && (
                    <p className="text-xs text-red-500 font-medium">{backendErrors.ip_pool[0]}</p>
                  )}
                </div>
              </div>

              {/* Bandwidth configurations */}
              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-gray-400" />
                  Alokasi Bandwidth (Profiles)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bw_profile">Nama Profile Bandwidth</Label>
                    <Input
                      id="bw_profile"
                      placeholder="Contoh: 50M_Symmetric"
                      value={bandwidthProfile}
                      onChange={(e) => setBandwidthProfile(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {backendErrors.bandwidth_profile && (
                      <p className="text-xs text-red-500 font-medium">{backendErrors.bandwidth_profile[0]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bw_up">Bandwidth Upload (Kbps)</Label>
                    <Input
                      id="bw_up"
                      type="number"
                      placeholder="Upload speed in Kbps"
                      value={bandwidthUp}
                      onChange={(e) => setBandwidthUp(Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                    {backendErrors.bandwidth_up && (
                      <p className="text-xs text-red-500 font-medium">{backendErrors.bandwidth_up[0]}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bw_down">Bandwidth Download (Kbps)</Label>
                    <Input
                      id="bw_down"
                      type="number"
                      placeholder="Download speed in Kbps"
                      value={bandwidthDown}
                      onChange={(e) => setBandwidthDown(Number(e.target.value))}
                      disabled={isSubmitting}
                    />
                    {backendErrors.bandwidth_down && (
                      <p className="text-xs text-red-500 font-medium">{backendErrors.bandwidth_down[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/provisionings')}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  style={{ backgroundColor: '#10b981' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Kirim ke Antrean Provisi
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
};
