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
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { ServiceChainCard } from '../common/ServiceChainCard';
import { PrintableSpkModal } from '../common/PrintableSpkModal';
import { PrintableBastModal } from '../common/PrintableBastModal';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperadmin =
    user?.role === 'superadmin' ||
    user?.roles?.includes('Superadmin') ||
    user?.roles?.includes('superadmin');

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSpkModal, setShowSpkModal] = useState(false);
  const [showBastModal, setShowBastModal] = useState(false);

  // Status Change Dialog
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('active');
  const [statusNotes, setStatusNotes] = useState('');

  // Delete Customer Dialog (Superadmin only)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch Customer details
  const { data: customerResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminCustomer', 'detail', id],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/admin/customers/${id}`);
      return res.data || res;
    },
    enabled: !!id,
  });

  const customer = customerResponse?.data || customerResponse;

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes: string }) => {
      return await apiClient.patch(`/admin/customers/${id}/status`, { status, notes });
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

  // Delete Customer mutation (Superadmin only)
  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.delete(`/superadmin/customers/${id}`);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Data pelanggan berhasil dihapus');
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      navigate('/admin/customers');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.getFirstError() || 'Gagal menghapus pelanggan');
      } else {
        toast.error('Terjadi kesalahan koneksi');
      }
    },
  });

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(`${field} disalin`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2.5 py-0.5 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Layanan Aktif
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
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/customers')}>
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
      ktp: customer.submission?.nik || '-',
      email: customer.submission?.email || '',
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
      name: customer.package,
      speed: customer.submission?.package_speed || 'Up to 50 Mbps',
      price: customer.submission?.package_price || 0,
      installationFee: 0,
      description: '',
    },
    totalPrice: customer.submission?.total_price || 0,
    signature_url: customer.signature_url,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/customers')}>
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{customer.name}</h1>
              {getStatusBadge(customer.status)}
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
                {copiedField === 'ID Pelanggan' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setNewStatus(customer.status);
              setStatusNotes('');
              setIsStatusDialogOpen(true);
            }}
            className="text-xs h-9 font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            Ubah Status
          </Button>

          {/* SPK Button */}
          <Button
            onClick={() => setShowSpkModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 shadow-xs flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            Cetak SPK (.pdf)
          </Button>

          {/* BAST Button */}
          <Button
            onClick={() => setShowBastModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs flex items-center gap-1.5"
          >
            <FileCheck className="w-4 h-4" />
            Cetak BAST Resmi
          </Button>

          {/* Superadmin Delete Button */}
          {isSuperadmin && (
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-xs h-9 font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Pelanggan
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Service Traceability Chain Card */}
      <ServiceChainCard submission={submissionMock as any} />

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal & Technical */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Data Pribadi & Kontak */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Profil &amp; Kontak Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Nama Lengkap</span>
                  <p className="font-semibold text-slate-800 text-sm">{customer.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nomor KTP (NIK)</span>
                  <p className="font-mono font-semibold text-slate-800 text-sm">
                    {customer.submission?.nik || '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nomor Telepon / WhatsApp</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {customer.phone}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Alamat Email</span>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {customer.submission?.email || '-'}
                  </p>
                </div>
                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Alamat Lengkap Pemasangan</span>
                  <p className="font-medium text-slate-800 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    {customer.address}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Layanan & Konfigurasi Jaringan */}
          <Card className="border shadow-xs bg-white">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-indigo-600" />
                Informasi Layanan &amp; Jaringan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                  <span className="text-indigo-600/80 font-medium block">Paket Berlangganan</span>
                  <h4 className="text-base font-bold text-indigo-900 mt-0.5">{customer.package}</h4>
                  <p className="text-[11px] text-indigo-700 mt-1 font-mono">
                    Kecepatan: {customer.submission?.package_speed || 'Up to 50 Mbps'}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium block">Kode ODP / FAT Port</span>
                  <h4 className="text-base font-bold text-slate-800 font-mono mt-0.5">
                    {customer.odp_code || customer.technical?.odp || '-'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-mono">
                    VLAN: {customer.technical?.vlan || '100'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Akun BFASS / PPPoE</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                    {customer.technical?.bfass_username || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">Serial Number ONU</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                    {customer.technical?.onu_serial_number || '-'}
                  </span>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50/50">
                  <span className="text-[11px] text-slate-400 block">IP Address Dial</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block truncate">
                    {customer.technical?.ip_address || 'Dynamic IP'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: BAST & Dokumentasi */}
        <div className="space-y-6">
          {/* Card 3: Status BAST & Tanda Tangan */}
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

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Sales Pengaju:</span>
                  <span className="font-semibold text-slate-800">{customer.submission?.sales_name || '-'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Teknisi Pelaksana:</span>
                  <span className="font-semibold text-slate-800">{customer.task?.teknisi_name || 'Tim Teknisi'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tanggal Pemasangan:</span>
                  <span className="font-semibold text-slate-800">{formatDate(customer.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Dialog Modal */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Ubah Status Pelanggan</DialogTitle>
            <DialogDescription>
              Perbarui status pelanggan <strong>{customer.name}</strong> ({customer.customer_code}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Status Layanan</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="text-emerald-700 font-semibold">Aktif</span> — Layanan berjalan normal
                  </SelectItem>
                  <SelectItem value="suspended">
                    <span className="text-amber-700 font-semibold">Ditangguhkan (Isolir)</span> — Isolir sementara
                  </SelectItem>
                  <SelectItem value="terminated">
                    <span className="text-rose-700 font-semibold">Non-Aktif (Putus)</span> — Berhenti berlangganan
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Catatan / Alasan Perubahan</Label>
              <Textarea
                placeholder="Tambahkan catatan perubahan status..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={updateStatusMutation.isPending}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              onClick={() => updateStatusMutation.mutate({ status: newStatus, notes: statusNotes })}
              disabled={updateStatusMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Modals */}
      <PrintableSpkModal
        isOpen={showSpkModal}
        onClose={() => setShowSpkModal(false)}
        submission={submissionMock as any}
      />

      <PrintableBastModal
        isOpen={showBastModal}
        onClose={() => setShowBastModal(false)}
        submission={submissionMock as any}
      />

      {/* Delete Customer Confirmation Modal (Superadmin Only) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Konfirmasi Hapus Pelanggan
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data pelanggan{' '}
              <strong>{customer.name}</strong> (
              <span className="font-mono font-semibold">{customer.customer_code}</span>)?
              <br />
              <span className="text-rose-600 font-medium mt-2 block text-xs">
                Perhatian: Tindakan ini hanya dapat dilakukan oleh Superadmin dan akan menghapus data pelanggan dari database secara permanen.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteCustomerMutation.isPending}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteCustomerMutation.mutate()}
              disabled={deleteCustomerMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleteCustomerMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Pelanggan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
