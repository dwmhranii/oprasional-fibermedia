import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import {
  User,
  Shield,
  Phone,
  Mail,
  MapPin,
  Wifi,
  Server,
  DollarSign,
  Calendar,
  AlertTriangle,
  Compass,
  HardDrive,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: any | null;
  onSuccess?: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEdit = !!customer;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nik: '',
    phone: '',
    email: '',
    address: '',
    latitude: '',
    longitude: '',
    service_type: 'pppoe',
    bras_id: '',
    collector: '',
    username: '',
    password: '',
    package_id: '',
    monthly_price: '',
    local_address: '',
    remote_address: '',
    parent_queue: '',
    rate_limit: '',
    subscribed_at: '',
    expires_at: '',
    status: 'active',
    onu_index: '',
    odp_id: '',
    odp_port: '',
    debt: '0',
    wilayah: '',
    installed_by_team_id: '',
    sales_id: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Populate data if editing
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        nik: customer.nik || customer.nik_masked || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        latitude: customer.latitude !== null && customer.latitude !== undefined ? String(customer.latitude) : '',
        longitude: customer.longitude !== null && customer.longitude !== undefined ? String(customer.longitude) : '',
        service_type: customer.service_type || 'pppoe',
        bras_id: customer.bras_id ? String(customer.bras_id) : '',
        collector: customer.collector || '',
        username: customer.username || '',
        password: '', // Password tidak dipopulate demi keamanan
        package_id: customer.package_id ? String(customer.package_id) : '',
        monthly_price: customer.monthly_price !== undefined ? String(customer.monthly_price) : '',
        local_address: customer.local_address || '',
        remote_address: customer.remote_address || '',
        parent_queue: customer.parent_queue || '',
        rate_limit: customer.rate_limit || '',
        subscribed_at: customer.subscribed_at ? customer.subscribed_at.slice(0, 10) : '',
        expires_at: customer.expires_at ? customer.expires_at.slice(0, 10) : '',
        status: customer.status || 'active',
        onu_index: customer.onu_index || '',
        odp_id: customer.odp_id ? String(customer.odp_id) : '',
        odp_port: customer.odp_port ? String(customer.odp_port) : '',
        debt: customer.debt !== undefined ? String(customer.debt) : '0',
        wilayah: customer.wilayah || '',
        installed_by_team_id: customer.installed_by_team_id ? String(customer.installed_by_team_id) : '',
        sales_id: customer.sales_id ? String(customer.sales_id) : '',
        notes: customer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        nik: '',
        phone: '',
        email: '',
        address: '',
        latitude: '',
        longitude: '',
        service_type: 'pppoe',
        bras_id: '',
        collector: '',
        username: '',
        password: '',
        package_id: '',
        monthly_price: '',
        local_address: '',
        remote_address: '',
        parent_queue: '',
        rate_limit: '',
        subscribed_at: new Date().toISOString().slice(0, 10),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'active',
        onu_index: '',
        odp_id: '',
        odp_port: '',
        debt: '0',
        wilayah: '',
        installed_by_team_id: '',
        sales_id: '',
        notes: '',
      });
    }
    setFormErrors({});
  }, [customer, isOpen]);

  // Fetch Packages catalog
  const { data: packagesData } = useQuery({
    queryKey: ['packages', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/packages');
      return res.data || res;
    },
    enabled: isOpen,
  });

  const packagesList: any[] = Array.isArray(packagesData)
    ? packagesData
    : packagesData?.data || [];

  // Fetch ODP & Network info
  const { data: networkData } = useQuery({
    queryKey: ['network', 'sync', 'form'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/network/sync');
      return res.data || res;
    },
    enabled: isOpen,
  });

  const odpsList: any[] = networkData?.odps || [];

  // Fetch Teams
  const { data: teamsData } = useQuery({
    queryKey: ['adminTeams', 'form'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/admin/teams');
        return res.data || res;
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  const teamsList: any[] = Array.isArray(teamsData)
    ? teamsData
    : teamsData?.data || [];

  // Fetch Users / Sales
  const { data: usersData } = useQuery({
    queryKey: ['adminUsers', 'form'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/admin/users');
        return res.data || res;
      } catch {
        return [];
      }
    },
    enabled: isOpen,
  });

  const usersList: any[] = Array.isArray(usersData)
    ? usersData
    : usersData?.data || [];

  // Handle Package Selection & auto-fill price
  const handlePackageChange = (packageId: string) => {
    const selectedPkg = packagesList.find((p) => String(p.id) === packageId);
    setFormData((prev) => ({
      ...prev,
      package_id: packageId,
      monthly_price: selectedPkg?.price ? String(selectedPkg.price) : prev.monthly_price,
      rate_limit: selectedPkg?.speed ? `${selectedPkg.speed}M/${selectedPkg.speed}M` : prev.rate_limit,
    }));
  };

  // GPS Location Pin
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung geolokasi GPS.');
      return;
    }
    toast.info('Mengambil koordinat GPS perangkat...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(7),
          longitude: pos.coords.longitude.toFixed(7),
        }));
        toast.success(`Koordinat ditemukan: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      (err) => {
        toast.error(`Gagal mendapatkan lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit) {
        return await apiClient.put(`/admin/customers/${customer.id}`, payload);
      }
      return await apiClient.post('/admin/customers', payload);
    },
    onSuccess: (res: any) => {
      toast.success(
        res?.message || (isEdit ? 'Data pelanggan berhasil diperbarui' : 'Pelanggan baru berhasil ditambahkan')
      );
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      queryClient.invalidateQueries({ queryKey: ['adminCustomer', 'detail', customer?.id] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      if (err instanceof ApiError) {
        const validationErrors = err.errors || {};
        const formattedErrors: Record<string, string> = {};
        Object.entries(validationErrors).forEach(([k, v]) => {
          formattedErrors[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setFormErrors(formattedErrors);
        toast.error(err.getFirstError() || 'Gagal menyimpan data pelanggan');
      } else {
        toast.error(err?.message || 'Terjadi kesalahan sistem');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Client validation
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nama pelanggan wajib diisi';
    if (!formData.phone.trim()) errors.phone = 'Nomor telepon wajib diisi';
    if (!formData.address.trim()) errors.address = 'Alamat wajib diisi';
    if (formData.nik.trim() && !/^\d{16}$/.test(formData.nik.trim())) {
      errors.nik = 'NIK harus tepat 16 digit angka';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Mohon perbaiki data yang belum sesuai validasi.');
      return;
    }

    // Build payload
    const payload: Record<string, any> = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      service_type: formData.service_type,
      status: formData.status,
    };

    if (formData.nik.trim() && !formData.nik.includes('•')) {
      payload.nik = formData.nik.trim();
    }
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.latitude) payload.latitude = parseFloat(formData.latitude);
    if (formData.longitude) payload.longitude = parseFloat(formData.longitude);
    if (formData.bras_id) payload.bras_id = parseInt(formData.bras_id, 10);
    if (formData.collector.trim()) payload.collector = formData.collector.trim();
    if (formData.username.trim()) payload.username = formData.username.trim();
    if (formData.password.trim()) payload.password = formData.password.trim();
    if (formData.package_id) payload.package_id = parseInt(formData.package_id, 10);
    if (formData.monthly_price) payload.monthly_price = parseFloat(formData.monthly_price);
    if (formData.local_address.trim()) payload.local_address = formData.local_address.trim();
    if (formData.remote_address.trim()) payload.remote_address = formData.remote_address.trim();
    if (formData.parent_queue.trim()) payload.parent_queue = formData.parent_queue.trim();
    if (formData.rate_limit.trim()) payload.rate_limit = formData.rate_limit.trim();
    if (formData.subscribed_at) payload.subscribed_at = formData.subscribed_at;
    if (formData.expires_at) payload.expires_at = formData.expires_at;
    if (formData.onu_index.trim()) payload.onu_index = formData.onu_index.trim();
    if (formData.odp_id) payload.odp_id = parseInt(formData.odp_id, 10);
    if (formData.odp_port) payload.odp_port = parseInt(formData.odp_port, 10);
    if (formData.debt) payload.debt = parseFloat(formData.debt);
    if (formData.wilayah.trim()) payload.wilayah = formData.wilayah.trim();
    if (formData.installed_by_team_id) payload.installed_by_team_id = parseInt(formData.installed_by_team_id, 10);
    if (formData.sales_id) payload.sales_id = parseInt(formData.sales_id, 10);
    if (formData.notes.trim()) payload.notes = formData.notes.trim();

    saveMutation.mutate(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              {isEdit ? `Ubah Data Pelanggan (${customer.customer_code})` : 'Tambah Pelanggan Baru'}
            </DialogTitle>
            {isEdit && (
              <Badge variant="outline" className="text-xs font-mono">
                ID: {customer.customer_code} (Permanen)
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* SEKSI 1: IDENTITAS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Shield className="w-4 h-4 text-indigo-600" /> 1. Identitas Pelanggan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cust-name" className="text-xs font-medium text-slate-700">
                  Nama Lengkap <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cust-name"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <Label htmlFor="cust-nik" className="text-xs font-medium text-slate-700">
                  NIK (16 Digit) {isEdit && <span className="text-slate-400 font-normal">(Tersimpan terenkripsi)</span>}
                </Label>
                <Input
                  id="cust-nik"
                  maxLength={16}
                  placeholder="Contoh: 3507123456780001"
                  value={formData.nik}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, nik: val });
                  }}
                  className={formErrors.nik ? 'border-red-500 font-mono' : 'font-mono'}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.nik ? (
                    <p className="text-xs text-red-500">{formErrors.nik}</p>
                  ) : (
                    <span className="text-[11px] text-slate-500">Tepat 16 digit KTP</span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono">{formData.nik.length}/16</span>
                </div>
              </div>

              <div>
                <Label htmlFor="cust-phone" className="text-xs font-medium text-slate-700">
                  Nomor Telepon / WhatsApp <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cust-phone"
                  placeholder="08123456789 atau 628123456789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={formErrors.phone ? 'border-red-500' : ''}
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <Label htmlFor="cust-email" className="text-xs font-medium text-slate-700">
                  Alamat Email (Opsional)
                </Label>
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="budi@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={formErrors.email ? 'border-red-500' : ''}
                />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cust-address" className="text-xs font-medium text-slate-700">
                  Alamat Pemasangan Lengkap <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="cust-address"
                  rows={2}
                  placeholder="Nama jalan, RT/RW, Dusun, Desa/Kelurahan, Kecamatan"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={formErrors.address ? 'border-red-500' : ''}
                />
                {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
              </div>

              <div>
                <Label htmlFor="cust-lat" className="text-xs font-medium text-slate-700">
                  Latitude
                </Label>
                <Input
                  id="cust-lat"
                  type="number"
                  step="0.0000001"
                  placeholder="-8.1234567"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="cust-lng" className="text-xs font-medium text-slate-700">
                  Longitude
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cust-lng"
                    type="number"
                    step="0.0000001"
                    placeholder="112.1234567"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGetLocation}
                    title="Ambil titik GPS lokasi sekarang"
                    className="shrink-0 flex items-center gap-1 text-xs"
                  >
                    <Compass className="w-3.5 h-3.5 text-indigo-600" /> GPS Pin
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* SEKSI 2: LAYANAN */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Wifi className="w-4 h-4 text-emerald-600" /> 2. Konfigurasi Layanan & Server
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">Tipe Layanan</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(val) => setFormData({ ...formData, service_type: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pppoe">PPPoE (Dial-up)</SelectItem>
                    <SelectItem value="ipoe">IPoE (DHCP)</SelectItem>
                    <SelectItem value="static">Static IP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Server BRAS / Router</Label>
                <Input
                  placeholder="ID atau Nama BRAS"
                  value={formData.bras_id}
                  onChange={(e) => setFormData({ ...formData, bras_id: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Kolektor Pembayaran</Label>
                <Input
                  placeholder="Nama kolektor penagih"
                  value={formData.collector}
                  onChange={(e) => setFormData({ ...formData, collector: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Username PPPoE / Layanan</Label>
                <Input
                  placeholder="user@fibermedia"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={formErrors.username ? 'border-red-500 font-mono' : 'font-mono'}
                />
                {formErrors.username && <p className="text-xs text-red-500 mt-1">{formErrors.username}</p>}
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">
                  Password Layanan {isEdit && <span className="text-slate-400 font-normal">(Kosongkan jika tetap)</span>}
                </Label>
                <Input
                  type="password"
                  placeholder={isEdit ? '••••••••' : 'Password kredensial'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Paket Layanan</Label>
                <Select
                  value={formData.package_id}
                  onValueChange={handlePackageChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Paket" />
                  </SelectTrigger>
                  <SelectContent>
                    {packagesList.map((pkg) => (
                      <SelectItem key={pkg.id} value={String(pkg.id)}>
                        {pkg.name} — Rp {Number(pkg.price).toLocaleString('id-ID')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Harga Bulanan (Rp)</Label>
                <Input
                  type="number"
                  placeholder="Biaya bulanan pelanggan"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: e.target.value })}
                  className="font-mono"
                />
                <span className="text-[11px] text-slate-500">Dapat disesuaikan jika ada diskon</span>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Rate Limit (Up/Down)</Label>
                <Input
                  placeholder="Contoh: 20M/20M"
                  value={formData.rate_limit}
                  onChange={(e) => setFormData({ ...formData, rate_limit: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Parent Queue</Label>
                <Input
                  placeholder="Contoh: ALL-CLIENTS"
                  value={formData.parent_queue}
                  onChange={(e) => setFormData({ ...formData, parent_queue: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Local Address (IP)</Label>
                <Input
                  placeholder="10.0.0.1"
                  value={formData.local_address}
                  onChange={(e) => setFormData({ ...formData, local_address: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Remote Address (IP)</Label>
                <Input
                  placeholder="10.0.0.100"
                  value={formData.remote_address}
                  onChange={(e) => setFormData({ ...formData, remote_address: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">ONU Index / Serial</Label>
                <Input
                  placeholder="gpon-onu_1/1/1:1"
                  value={formData.onu_index}
                  onChange={(e) => setFormData({ ...formData, onu_index: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Tanggal Berlangganan</Label>
                <Input
                  type="date"
                  value={formData.subscribed_at}
                  onChange={(e) => setFormData({ ...formData, subscribed_at: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Tanggal Jatuh Tempo (Expired)</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Status Layanan</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Aktif)</SelectItem>
                    <SelectItem value="suspended">Suspended (Isolir)</SelectItem>
                    <SelectItem value="inactive">Inactive (Non-Aktif)</SelectItem>
                    <SelectItem value="terminated">Terminated (Putus)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SEKSI 3: JARINGAN (ODP & PORT) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <HardDrive className="w-4 h-4 text-amber-600" /> 3. Sambungan Jaringan & Port ODP
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium text-slate-700">ODP Distribusi</Label>
                <Select
                  value={formData.odp_id}
                  onValueChange={(val) => setFormData({ ...formData, odp_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih ODP" />
                  </SelectTrigger>
                  <SelectContent>
                    {odpsList.map((odp) => (
                      <SelectItem key={odp.id} value={String(odp.id)}>
                        {odp.code} - {odp.name} (Kapasitas: {odp.port_capacity || 8} port)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cust-odp-port" className="text-xs font-medium text-slate-700">
                  Nomor Port ODP (Unik per ODP)
                </Label>
                <Input
                  id="cust-odp-port"
                  type="number"
                  min={1}
                  max={64}
                  placeholder="Contoh: 1, 2, 3..."
                  value={formData.odp_port}
                  onChange={(e) => setFormData({ ...formData, odp_port: e.target.value })}
                  className={formErrors.odp_port ? 'border-red-500 font-mono' : 'font-mono'}
                />
                {formErrors.odp_port && <p className="text-xs text-red-500 mt-1">{formErrors.odp_port}</p>}
              </div>
            </div>
          </div>

          {/* SEKSI 4: PENAGIHAN & PENEMPATAN */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2 uppercase tracking-wider">
              <Users className="w-4 h-4 text-blue-600" /> 4. Penagihan & Penempatan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cust-debt" className="text-xs font-medium text-slate-700">
                  Total Hutang / Tunggakan (Rp)
                </Label>
                <Input
                  id="cust-debt"
                  type="number"
                  placeholder="0"
                  value={formData.debt}
                  onChange={(e) => setFormData({ ...formData, debt: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="cust-wilayah" className="text-xs font-medium text-slate-700">
                  Wilayah / Area
                </Label>
                <Input
                  id="cust-wilayah"
                  placeholder="Contoh: Gondanglegi, Kepanjen..."
                  value={formData.wilayah}
                  onChange={(e) => setFormData({ ...formData, wilayah: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Tim Pemasang (Teknisi)</Label>
                <Select
                  value={formData.installed_by_team_id}
                  onValueChange={(val) => setFormData({ ...formData, installed_by_team_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Tim Pemasang" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamsList.map((tm) => (
                      <SelectItem key={tm.id} value={String(tm.id)}>
                        {tm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-700">Sales / Marketing</Label>
                <Select
                  value={formData.sales_id}
                  onValueChange={(val) => setFormData({ ...formData, sales_id: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Pilih Sales" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name} ({u.role || 'User'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="cust-notes" className="text-xs font-medium text-slate-700">
                  Catatan Tambahan
                </Label>
                <Textarea
                  id="cust-notes"
                  rows={2}
                  placeholder="Informasi instalasi, jalur dropcore, atau catatan khusus penagihan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saveMutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
