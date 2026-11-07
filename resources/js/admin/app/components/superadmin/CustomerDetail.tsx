import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ArrowLeft,
  User,
  MapPin,
  Wifi,
  FileCheck,
  FileText,
  Phone,
  Mail,
  Shield,
  Clock,
  Calendar,
  CheckCircle2,
  Server,
  Activity,
  Copy,
  Check,
  RefreshCw,
  Edit,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Eye,
  Lock,
  HardDrive,
  Users,
  DollarSign,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { formatDate, formatCurrency, formatDateOnly } from '../../lib/formatters';
import { ServiceChainCard } from '../common/ServiceChainCard';
import { PrintableSpkModal } from '../common/PrintableSpkModal';
import { PrintableBastModal } from '../common/PrintableBastModal';
import { CustomerFormModal } from './CustomerFormModal';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperadmin =
    user?.role === 'superadmin' ||
    user?.roles?.includes('Superadmin') ||
    user?.roles?.includes('superadmin');

  const canUpdate = isSuperadmin || user?.permissions?.includes('customers.update');
  const canDelete = isSuperadmin || user?.permissions?.includes('customers.delete');
  const canViewSecret = isSuperadmin || user?.permissions?.includes('customers.view_secret');

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSpkModal, setShowSpkModal] = useState(false);
  const [showBastModal, setShowBastModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Status Change Dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('active');
  const [statusNotes, setStatusNotes] = useState('');

  // Delete Customer Dialog (Superadmin only)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Secret Credentials Modal
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);
  const [secretData, setSecretData] = useState<any | null>(null);
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);

  // Fetch Customer details
  const { data: customerResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminCustomer', 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/customers/${id}`);
      return res.data || res;
    },
    enabled: !!id,
  });

  const customer = customerResponse?.data || customerResponse;

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes: string }) => {
      return await apiClient.patch(`/customers/${id}/status`, { status, notes });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Status pelanggan berhasil diperbarui');
      setIsStatusDialogOpen(false);
      setStatusNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminCustomer', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      refetch();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.getFirstError() || 'Gagal mengubah status');
      } else {
        toast.error('Terjadi kesalahan koneksi');
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      toast.success('Data pelanggan berhasil dihapus dari sistem');
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      navigate('/customers');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus data pelanggan');
    },
  });

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} berhasil disalin ke clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // View Secret Credentials
  const handleViewSecrets = async () => {
    setIsLoadingSecret(true);
    try {
      const res = await apiClient.get<any>(`/customers/${id}/secrets`);
      const payload = res.data || res;
      setSecretData(payload);
      setIsSecretModalOpen(true);
      toast.info('Kredensial sensitif dimuat. Akses Anda dicatat dalam log audit keamanan.');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error('Anda tidak memiliki izin (customers.view_secret) untuk melihat data rahasia.');
      } else {
        toast.error(err?.message || 'Gagal memuat kredensial rahasia.');
      }
    } finally {
      setIsLoadingSecret(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Aktif
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2.5 py-0.5 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Ditangguhkan (Isolir)
          </Badge>
        );
      case 'terminated':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs px-2.5 py-0.5 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Non-Aktif (Putus)
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200 text-xs px-2.5 py-0.5 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Tidak Aktif
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Memuat detail pelanggan...</p>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar Pelanggan
        </Button>
        <Card className="p-8 text-center border-rose-200 bg-rose-50/50">
          <p className="text-rose-700 font-medium">Data pelanggan tidak ditemukan atau terjadi kesalahan.</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-3 text-xs">
            Coba Lagi
          </Button>
        </Card>
      </div>
    );
  }

  const submissionMock = {
    id: customer.submission?.id || String(customer.id),
    submissionNumber: customer.submission?.submission_number || `SUB-${customer.id}`,
    customerCode: customer.customer_code,
    status: 'completed',
    serviceChain: customer.service_chain,
    customer: {
      name: customer.name,
      phone: customer.phone,
      ktp: customer.nik || customer.nik_masked || '-',
      email: customer.email || '',
      whatsapp: true,
    },
    address: {
      installAddress: customer.address,
      ktpAddress: customer.address,
      sameAsKtp: true,
      city: '',
      district: '',
      province: '',
      subDistrict: '',
      postalCode: '',
    },
    package: {
      name: customer.package_name || customer.package,
      speed: customer.rate_limit || customer.submission?.package_speed || 'Up to 50 Mbps',
      price: customer.monthly_price || customer.submission?.package_price || 0,
      installationFee: 0,
      description: '',
    },
    totalPrice: customer.monthly_price || customer.submission?.total_price || 0,
    signature_url: customer.signature_url,
  };

  const odp = customer.odp || {};
  const odc = odp.odc || {};
  const tickets = customer.tickets || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{customer.name}</h1>
              {getStatusBadge(customer.status)}
              {customer.is_online ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Online</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 text-xs">Offline</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              ID Pelanggan:{' '}
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                {customer.customer_code}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(customer.customer_code, 'ID Pelanggan')}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                title="Salin ID"
              >
                {copiedField === 'ID Pelanggan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {customer.external_ref && (
                <span className="text-slate-400">Ref: {customer.external_ref}</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Edit className="w-3.5 h-3.5" /> Ubah Data
            </Button>
          )}

          {canViewSecret && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewSecrets}
              disabled={isLoadingSecret}
              className="flex items-center gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
              title="Buka NIK mentah dan password kredensial"
            >
              {isLoadingSecret ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-amber-600" />}
              Buka Kredensial Rahasia
            </Button>
          )}

          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus(customer.status || 'active');
                setIsStatusDialogOpen(true);
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-slate-500" /> Ubah Status
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpkModal(true)}
            className="text-xs flex items-center gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <FileText className="w-3.5 h-3.5" /> Cetak Work Order
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBastModal(true)}
            className="text-xs flex items-center gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <FileCheck className="w-3.5 h-3.5" /> Cetak BAST
          </Button>

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Service Traceability Chain Card */}
      <ServiceChainCard submission={submissionMock as any} />

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Identitas, Layanan, Jaringan, Penempatan */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEKSI 1: IDENTITAS */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                1. Identitas Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Nama Lengkap</span>
                  <p className="font-semibold text-slate-800 text-sm">{customer.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">NIK (KTP)</span>
                  <p className="font-mono font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    {customer.nik_masked || customer.nik || '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nomor Telepon / WhatsApp</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customer.phone}
                    {customer.phone_normalized && (
                      <span className="text-[10px] text-slate-400 font-normal">({customer.phone_normalized})</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Alamat Email</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {customer.email || '-'}
                  </p>
                </div>
                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Alamat Lengkap</span>
                  <p className="font-medium text-slate-800 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    {customer.address}
                  </p>
                </div>
                {(customer.latitude || customer.longitude) && (
                  <div className="md:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Titik Koordinat GPS</span>
                      <p className="font-mono text-slate-700">
                        Lat: {customer.latitude ?? '-'} | Lng: {customer.longitude ?? '-'}
                      </p>
                    </div>
                    {customer.latitude && customer.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline font-medium"
                      >
                        Buka Google Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEKSI 2: LAYANAN */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-600" />
                2. Informasi Layanan &amp; Konfigurasi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                  <span className="text-indigo-600/80 font-medium block">Paket Layanan</span>
                  <h4 className="text-base font-bold text-indigo-900 mt-0.5">
                    {customer.package_name || customer.package || '-'}
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-1 font-mono">
                    Harga: Rp {Number(customer.monthly_price || 0).toLocaleString('id-ID')} / bulan
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium block">Tipe Layanan &amp; Server</span>
                  <h4 className="text-base font-bold text-slate-800 mt-0.5 uppercase">
                    {customer.service_type || 'PPPoE'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    BRAS: {customer.bras_name || (customer.bras_id ? `BRAS #${customer.bras_id}` : '-')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Username PPPoE</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                    {customer.username || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Password Layanan</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    {customer.password_masked || '••••••••'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Rate Limit</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                    {customer.rate_limit || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Parent Queue</span>
                  <span className="font-mono text-slate-800 mt-0.5 block truncate">
                    {customer.parent_queue || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Local IP</span>
                  <span className="font-mono text-slate-800 mt-0.5 block truncate">
                    {customer.local_address || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Remote IP</span>
                  <span className="font-mono text-slate-800 mt-0.5 block truncate">
                    {customer.remote_address || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">ONU Index / Serial</span>
                  <span className="font-mono text-slate-800 mt-0.5 block truncate">
                    {customer.onu_index || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Tanggal Berlangganan</span>
                  <span className="font-medium text-slate-800 mt-0.5 block">
                    {customer.subscribed_at ? formatDateOnly(customer.subscribed_at) : '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Jatuh Tempo (Expired)</span>
                  <span className="font-bold text-indigo-700 mt-0.5 block">
                    {customer.expires_at ? formatDateOnly(customer.expires_at) : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEKSI 3: JARINGAN (ODP & ODC INDUK) */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-600" />
                3. Sambungan Jaringan (ODP &amp; ODC)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 text-sm">
                      ODP: {odp.code || customer.odp_code || '-'}
                    </span>
                    <Badge variant="outline" className="bg-amber-100/50 font-mono text-[11px]">
                      Port #{customer.odp_port || odp.port || '-'}
                    </Badge>
                  </div>
                  <p className="text-slate-600">Nama: {odp.name || customer.odp_name || '-'}</p>
                  <p className="text-slate-600">Alamat: {odp.address || '-'}</p>
                  {odp.latitude && odp.longitude && (
                    <p className="font-mono text-[11px] text-slate-500">
                      GPS: {odp.latitude}, {odp.longitude}
                    </p>
                  )}
                  {odp.notes && <p className="text-slate-500 italic">Catatan: {odp.notes}</p>}
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 text-sm block">
                    ODC Induk (Feeder)
                  </span>
                  <p className="text-slate-600">Kode ODC: <span className="font-mono font-semibold">{odc.code || '-'}</span></p>
                  <p className="text-slate-600">Nama ODC: {odc.name || '-'}</p>
                  <p className="text-slate-600">Alamat: {odc.address || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEKSI 4: RIWAYAT TIKET & GANGGUAN */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-purple-600" />
                Riwayat Tiket &amp; Pengaduan ({tickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {tickets.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Belum ada riwayat tiket atau keluhan untuk pelanggan ini.
                </p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-3 border rounded-lg bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800 block">{t.ticket_number}</span>
                        <p className="text-slate-600 mt-0.5">{t.title}</p>
                        <span className="text-[11px] text-slate-400">{formatDate(t.created_at)}</span>
                      </div>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Penagihan, Penempatan, BAST */}
        <div className="space-y-6">
          {/* Card: Penagihan & Hutang */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Penagihan &amp; Keuangan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                <span className="text-slate-500 font-medium">Tagihan Bulanan</span>
                <span className="font-bold text-slate-800 text-sm">
                  Rp {Number(customer.monthly_price || 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  Number(customer.debt || 0) > 0
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold ${
                      Number(customer.debt || 0) > 0 ? 'text-rose-800' : 'text-emerald-800'
                    }`}
                  >
                    Tunggakan / Hutang
                  </span>
                  <span
                    className={`font-bold font-mono text-base ${
                      Number(customer.debt || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    Rp {Number(customer.debt || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                {Number(customer.debt || 0) > 0 && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Pelanggan memiliki tunggakan yang perlu ditagih.
                  </p>
                )}
              </div>

              {customer.collector && (
                <div className="text-[11px] text-slate-500 pt-1">
                  Kolektor Ditugaskan: <span className="font-semibold text-slate-700">{customer.collector}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Penempatan & Tim */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Penempatan &amp; Petugas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Wilayah Pemasangan</span>
                <p className="font-semibold text-slate-800">{customer.wilayah || '-'}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">Tim Pemasang (Teknisi)</span>
                <p className="font-semibold text-slate-800">{customer.installed_by_team_name || '-'}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block mb-0.5">Sales / Agen Marketing</span>
                <p className="font-semibold text-slate-800">{customer.sales_name || customer.submission?.sales_name || '-'}</p>
              </div>
              {customer.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Catatan Khusus</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                    {customer.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: BAST & Dokumentasi */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Dokumentasi &amp; BAST
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">Status Serah Terima</span>
                </div>
                <Badge className="bg-emerald-600 text-white font-semibold text-[11px]">
                  Terverifikasi
                </Badge>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-2">Tanda Tangan Digital Pelanggan</span>
                {customer.signature_url ? (
                  <div className="p-3 bg-slate-50 border rounded-xl flex flex-col items-center justify-center">
                    <img
                      src={customer.signature_url}
                      alt="Tanda Tangan Pelanggan"
                      className="max-h-32 object-contain bg-white p-2 rounded-lg border border-slate-200 shadow-xs"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">
                      Ditandatangani saat serah terima perangkat
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border rounded-lg text-center text-slate-400 italic">
                    Tanda tangan digital terekam pada BAST fisik / sistem teknisi.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secret Credentials Modal (Unmask NIK & Password) */}
      <Dialog open={isSecretModalOpen} onOpenChange={setIsSecretModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-700">
              <Shield className="w-5 h-5 text-amber-600" />
              Kredensial Sensitif Pelanggan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Data rahasia ini didekripsi dari penyimpanan terenkripsi database. Pembukaan data ini telah dicatat di log audit keamanan.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium block">Nomor KTP (NIK Asli)</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                  {secretData?.nik || '(Tidak tercatat)'}
                </span>
                {secretData?.nik && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(secretData.nik, 'NIK')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200">
              <span className="text-slate-500 font-medium block">Username Layanan</span>
              <span className="font-mono text-sm font-semibold text-slate-800">
                {secretData?.username || customer.username || '-'}
              </span>
            </div>

            <div className="pt-2 border-t border-amber-200">
              <span className="text-slate-500 font-medium block">Password Layanan (Terkonfigurasi)</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono text-base font-bold text-indigo-900 tracking-wider">
                  {secretData?.password || '(Kosong / Belum diset)'}
                </span>
                {secretData?.password && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(secretData.password, 'Password')}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsSecretModalOpen(false)} className="w-full">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Form Modal */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
        onSuccess={() => refetch()}
      />

      {/* Status Change Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Status Pelanggan</DialogTitle>
            <DialogDescription>
              Ubah status operasional layanan pelanggan {customer.name} ({customer.customer_code}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Pilih Status Baru</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Aktif)</SelectItem>
                  <SelectItem value="suspended">Suspended (Ditangguhkan / Isolir)</SelectItem>
                  <SelectItem value="inactive">Inactive (Tidak Aktif)</SelectItem>
                  <SelectItem value="terminated">Terminated (Putus Berlangganan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catatan / Alasan Perubahan</Label>
              <Textarea
                placeholder="Contoh: Permintaan pelanggan berhenti sementara karena renovasi rumah..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="mt-1.5 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={updateStatusMutation.isPending}
              onClick={() => updateStatusMutation.mutate({ status: newStatus, notes: statusNotes })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-rose-600">Hapus Data Pelanggan</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus data pelanggan{' '}
              <span className="font-bold text-slate-900">{customer.name}</span> ({customer.customer_code})?
              Data yang dihapus akan dipindahkan ke arsip dan tautan pengajuan akan dilepaskan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Pelanggan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Order Modal */}
      <PrintableSpkModal
        isOpen={showSpkModal}
        onClose={() => setShowSpkModal(false)}
        customer={customer}
      />

      {/* BAST Modal */}
      <PrintableBastModal
        isOpen={showBastModal}
        onClose={() => setShowBastModal(false)}
        customer={customer}
      />
    </div>
  );
};
