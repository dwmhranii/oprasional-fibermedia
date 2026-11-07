import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
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
  Users,
  UserCheck,
  UserX,
  AlertOctagon,
  Search,
  RefreshCw,
  Copy,
  Check,
  Eye,
  FileCheck,
  MoreHorizontal,
  Wifi,
  MapPin,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Trash2,
  AlertTriangle,
  Download,
  Upload,
  Plus,
  Columns,
  ArrowUpDown,
  FileSpreadsheet,
  CheckSquare,
  Square,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError, API_BASE_URL, getToken } from '../../lib/api';
import { formatDate, formatCurrency, formatDateOnly } from '../../lib/formatters';
import { CustomerFormModal } from './CustomerFormModal';

// List 35 Selectable Columns
export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'no', label: 'No', defaultVisible: true },
  { key: 'customer_code', label: 'ID Pelanggan', defaultVisible: true },
  { key: 'external_ref', label: 'Ref Eksternal', defaultVisible: false },
  { key: 'name_contact', label: 'Nama & Kontak', defaultVisible: true },
  { key: 'nik_masked', label: 'NIK (Bertopeng)', defaultVisible: false },
  { key: 'address', label: 'Alamat Pemasangan', defaultVisible: true },
  { key: 'coordinates', label: 'Koordinat (GPS)', defaultVisible: false },
  { key: 'package_price', label: 'Paket & Harga', defaultVisible: true },
  { key: 'service_type', label: 'Tipe Layanan', defaultVisible: false },
  { key: 'bras_name', label: 'Server BRAS', defaultVisible: false },
  { key: 'collector', label: 'Kolektor', defaultVisible: false },
  { key: 'username', label: 'Username PPPoE', defaultVisible: false },
  { key: 'local_address', label: 'Local Address', defaultVisible: false },
  { key: 'remote_address', label: 'Remote Address', defaultVisible: false },
  { key: 'parent_queue', label: 'Parent Queue', defaultVisible: false },
  { key: 'rate_limit', label: 'Rate Limit', defaultVisible: false },
  { key: 'subscribed_at', label: 'Tgl Berlangganan', defaultVisible: false },
  { key: 'odp', label: 'ODP (Nama & Port)', defaultVisible: true },
  { key: 'status', label: 'Status Layanan', defaultVisible: true },
  { key: 'is_online', label: 'Status Online', defaultVisible: false },
  { key: 'expires_at', label: 'Expired Date', defaultVisible: true },
  { key: 'debt', label: 'Hutang / Tagihan', defaultVisible: true },
  { key: 'wilayah', label: 'Wilayah', defaultVisible: false },
  { key: 'installed_by_team', label: 'Tim Pemasang', defaultVisible: false },
  { key: 'sales_name', label: 'Sales', defaultVisible: false },
  { key: 'onu_index', label: 'ONU Index', defaultVisible: false },
  { key: 'session_uptime', label: 'Session Uptime', defaultVisible: false },
  { key: 'current_ip', label: 'IP Saat Ini', defaultVisible: false },
  { key: 'current_mac', label: 'MAC Address', defaultVisible: false },
  { key: 'last_online_at', label: 'Terakhir Online', defaultVisible: false },
  { key: 'last_offline_at', label: 'Terakhir Offline', defaultVisible: false },
  { key: 'notes', label: 'Catatan', defaultVisible: false },
];

export const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperadmin =
    user?.role === 'superadmin' ||
    user?.roles?.includes('Superadmin') ||
    user?.roles?.includes('superadmin');

  const canCreate = isSuperadmin || user?.permissions?.includes('customers.create');
  const canUpdate = isSuperadmin || user?.permissions?.includes('customers.update');
  const canDelete = isSuperadmin || user?.permissions?.includes('customers.delete');
  const canImport = isSuperadmin || user?.permissions?.includes('customers.import');
  const canExport = isSuperadmin || user?.permissions?.includes('customers.export');

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') || 'all');
  const [wilayahFilter, setWilayahFilter] = useState<string>(() => searchParams.get('wilayah') || 'all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [odpFilter, setOdpFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [salesFilter, setSalesFilter] = useState<string>('all');
  const [debtOnly, setDebtOnly] = useState<boolean>(() => searchParams.get('has_debt') === '1');
  const [expiresFrom, setExpiresFrom] = useState<string>(() => searchParams.get('expires_from') || '');
  const [expiresTo, setExpiresTo] = useState<string>(() => searchParams.get('expires_to') || '');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Sync state if URL search params change
  useEffect(() => {
    const s = searchParams.get('status');
    if (s) setStatusFilter(s);

    if (searchParams.has('has_debt')) {
      setDebtOnly(searchParams.get('has_debt') === '1');
    }

    const expFrom = searchParams.get('expires_from');
    if (expFrom !== null && expFrom !== undefined) setExpiresFrom(expFrom);

    const expTo = searchParams.get('expires_to');
    if (expTo !== null && expTo !== undefined) setExpiresTo(expTo);

    const search = searchParams.get('search');
    if (search !== null && search !== undefined) setSearchTerm(search);
  }, [searchParams]);

  // Pagination & Display
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Column Picker State
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCustomerForStatus, setSelectedCustomerForStatus] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('active');
  const [statusNotes, setStatusNotes] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);

  // Export & Import States
  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDryRunMode, setIsDryRunMode] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Download Blob Helper
  const downloadBlob = async (endpoint: string, defaultFilename: string, params?: Record<string, any>) => {
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          queryParams.append(key, String(value));
        }
      });
      const qs = queryParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error('Gagal mengunduh file dari server.');
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Menyiapkan file ekspor 35 kolom data pelanggan...');
      const params: Record<string, any> = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
      };
      const filename = `data-pelanggan-fibermedia-${new Date().toISOString().slice(0, 10)}.xlsx`;
      await downloadBlob('/customers/export', filename, params);
      toast.success('Data pelanggan 35 kolom berhasil diekspor ke Excel (.xlsx)');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      toast.info(`Mengunduh template impor 35 kolom (${ext.toUpperCase()})...`);
      await downloadBlob('/customers/import-template', `template-import-pelanggan-35-kolom.${ext}`, { format });
      toast.success(`Template ${ext.toUpperCase()} berhasil diunduh`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunduh template');
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Pilih berkas Excel atau CSV terlebih dahulu');
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);
      if (isDryRunMode) {
        formData.append('dry_run', '1');
      }

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/customers/import`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memproses berkas impor');
      }

      toast.success(json.message || 'Proses impor berhasil diselesaikan');
      setImportSummary(json.data);
      if (!isDryRunMode) {
        queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
        refetchStats();
        refetch();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses berkas impor');
    } finally {
      setIsImporting(false);
    }
  };

  // Fetch Stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['adminCustomers', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/customers/stats');
      return response.data || response;
    },
  });

  // Fetch Auxiliary Filter Data (Packages, ODPs, Teams, Users)
  const { data: packagesData } = useQuery({
    queryKey: ['packages', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/packages');
      return res.data || res;
    },
  });
  const packagesList = Array.isArray(packagesData) ? packagesData : packagesData?.data || [];

  const { data: networkSyncData } = useQuery({
    queryKey: ['network', 'sync', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/network/sync');
      return res.data || res;
    },
  });
  const odpsList = networkSyncData?.odps || [];

  const { data: teamsData } = useQuery({
    queryKey: ['adminTeams', 'list'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/teams');
        return res.data || res;
      } catch {
        return [];
      }
    },
  });
  const teamsList = Array.isArray(teamsData) ? teamsData : teamsData?.data || [];

  // Fetch Customers List with Server-side Filtering & Pagination
  const { data: customersData, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'adminCustomers',
      'list',
      page,
      perPage,
      searchTerm,
      statusFilter,
      wilayahFilter,
      serviceTypeFilter,
      packageFilter,
      odpFilter,
      teamFilter,
      salesFilter,
      debtOnly,
      expiresFrom,
      expiresTo,
      sortBy,
      sortDir,
    ],
    queryFn: async () => {
      const params: Record<string, any> = { page, per_page: perPage };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (wilayahFilter !== 'all') params.wilayah = wilayahFilter;
      if (serviceTypeFilter !== 'all') params.service_type = serviceTypeFilter;
      if (packageFilter !== 'all') params.package_id = packageFilter;
      if (odpFilter !== 'all') params.odp_id = odpFilter;
      if (teamFilter !== 'all') params.installed_by_team_id = teamFilter;
      if (salesFilter !== 'all') params.sales_id = salesFilter;
      if (debtOnly) params.has_debt = 'true';
      if (expiresFrom) params.expires_from = expiresFrom;
      if (expiresTo) params.expires_to = expiresTo;
      params.sort_by = sortBy;
      params.sort_dir = sortDir;

      const response = await apiClient.get<any>('/customers', { params });
      return response;
    },
  });

  const customers = customersData?.data || [];
  const meta = customersData?.meta || { current_page: page, last_page: 1, total: customers.length };

  // Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number | string; status: string; notes: string }) => {
      return await apiClient.patch(`/customers/${id}/status`, { status, notes });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Status pelanggan berhasil diperbarui');
      setSelectedCustomerForStatus(null);
      setStatusNotes('');
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      refetchStats();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.getFirstError() || 'Gagal mengubah status');
      } else {
        toast.error('Terjadi kesalahan koneksi');
      }
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      toast.success('Data pelanggan berhasil dihapus');
      setCustomerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['adminCustomers'] });
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus pelanggan');
    },
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('ID Pelanggan disalin ke clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetColumns = () => {
    setVisibleColumns(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-2 py-0.5 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-2 py-0.5 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Isolir
          </Badge>
        );
      case 'terminated':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs px-2 py-0.5 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Putus
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Kelola Data Pelanggan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen 35 kolom data pelanggan, integrasi ODP &amp; ODC, kredensial rahasia, serta ekspor/impor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Tambah Pelanggan
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setIsColumnPickerOpen(true)}
            className="flex items-center gap-1.5 text-xs"
            title="Pilih dari 35 kolom yang ingin ditampilkan"
          >
            <Columns className="w-3.5 h-3.5 text-slate-600" />
            Pilih Kolom ({visibleColumns.length}/35)
          </Button>

          {canImport && (
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Upload className="w-3.5 h-3.5" /> Impor Excel
            </Button>
          )}

          {canExport && (
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              {isExporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Ekspor Excel (35 Kolom)
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation Satu Pintu Pelanggan */}
      <div className="flex border-b border-border space-x-2">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors border-primary text-primary"
        >
          <Users className="w-4 h-4" />
          <span>Daftar Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/customers/submissions')}
          className="flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors border-transparent text-muted-foreground hover:text-foreground"
        >
          <FileCheck className="w-4 h-4" />
          <span>Pengajuan</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total Pelanggan</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{statsData?.total ?? '-'}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Pelanggan Aktif</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{statsData?.active ?? '-'}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Ditangguhkan (Isolir)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{statsData?.suspended ?? '-'}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Non-Aktif (Putus)</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{statsData?.terminated ?? '-'}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <UserX className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Advanced Filters Bar */}
      <Card className="border shadow-xs bg-white p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Cari nama, ID Pelanggan, telepon, username PPPoE, atau ODP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="suspended">Isolir</SelectItem>
                <SelectItem value="inactive">Non-Aktif</SelectItem>
                <SelectItem value="terminated">Putus</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={packageFilter}
              onValueChange={(val) => {
                setPackageFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] text-xs">
                <SelectValue placeholder="Paket Layanan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Paket</SelectItem>
                {packagesList.map((pkg) => (
                  <SelectItem key={pkg.id} value={String(pkg.id)}>
                    {pkg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={debtOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setDebtOnly(!debtOnly);
                setPage(1);
              }}
              className={`text-xs flex items-center gap-1.5 ${
                debtOnly ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'text-slate-700'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Hutang &gt; 0
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className="text-xs flex items-center gap-1.5 text-slate-600"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter Lanjutan {isFilterDrawerOpen ? '▲' : '▼'}
            </Button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {isFilterDrawerOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <Label className="text-[11px] text-slate-500">Tipe Layanan</Label>
              <Select
                value={serviceTypeFilter}
                onValueChange={(val) => {
                  setServiceTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Tipe Layanan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="pppoe">PPPoE</SelectItem>
                  <SelectItem value="ipoe">IPoE</SelectItem>
                  <SelectItem value="static">Static IP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Filter ODP</Label>
              <Select
                value={odpFilter}
                onValueChange={(val) => {
                  setOdpFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Pilih ODP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua ODP</SelectItem>
                  {odpsList.map((odp) => (
                    <SelectItem key={odp.id} value={String(odp.id)}>
                      {odp.code} - {odp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Tim Pemasang</Label>
              <Select
                value={teamFilter}
                onValueChange={(val) => {
                  setTeamFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Pilih Tim" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tim</SelectItem>
                  {teamsList.map((tm) => (
                    <SelectItem key={tm.id} value={String(tm.id)}>
                      {tm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Urutkan Berdasarkan</Label>
              <div className="flex gap-2 mt-1">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="text-xs flex-1">
                    <SelectValue placeholder="Urutan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">ID</SelectItem>
                    <SelectItem value="name">Nama</SelectItem>
                    <SelectItem value="expires_at">Jatuh Tempo</SelectItem>
                    <SelectItem value="debt">Hutang</SelectItem>
                    <SelectItem value="monthly_price">Harga</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
                  className="px-2"
                  title="Balik arah urutan"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Expired Mulai Dari</Label>
              <Input
                type="date"
                value={expiresFrom}
                onChange={(e) => {
                  setExpiresFrom(e.target.value);
                  setPage(1);
                }}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Expired Sampai Dengan</Label>
              <Input
                type="date"
                value={expiresTo}
                onChange={(e) => {
                  setExpiresTo(e.target.value);
                  setPage(1);
                }}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">Wilayah</Label>
              <Input
                placeholder="Ketik nama wilayah..."
                value={wilayahFilter === 'all' ? '' : wilayahFilter}
                onChange={(e) => {
                  setWilayahFilter(e.target.value || 'all');
                  setPage(1);
                }}
                className="mt-1 text-xs"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setWilayahFilter('all');
                  setServiceTypeFilter('all');
                  setPackageFilter('all');
                  setOdpFilter('all');
                  setTeamFilter('all');
                  setDebtOnly(false);
                  setExpiresFrom('');
                  setExpiresTo('');
                  setSearchTerm('');
                  setPage(1);
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Reset Semua Filter
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Table */}
      <Card className="border shadow-xs bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                {visibleColumns.includes('no') && <th className="p-3 w-12 text-center">No</th>}
                {visibleColumns.includes('customer_code') && <th className="p-3">ID Pelanggan</th>}
                {visibleColumns.includes('external_ref') && <th className="p-3">Ref Eksternal</th>}
                {visibleColumns.includes('name_contact') && <th className="p-3">Nama &amp; Kontak</th>}
                {visibleColumns.includes('nik_masked') && <th className="p-3">NIK</th>}
                {visibleColumns.includes('address') && <th className="p-3 min-w-[200px]">Alamat Lengkap</th>}
                {visibleColumns.includes('coordinates') && <th className="p-3">Koordinat GPS</th>}
                {visibleColumns.includes('package_price') && <th className="p-3">Paket &amp; Harga</th>}
                {visibleColumns.includes('service_type') && <th className="p-3">Tipe Layanan</th>}
                {visibleColumns.includes('bras_name') && <th className="p-3">Server BRAS</th>}
                {visibleColumns.includes('collector') && <th className="p-3">Kolektor</th>}
                {visibleColumns.includes('username') && <th className="p-3">Username PPPoE</th>}
                {visibleColumns.includes('local_address') && <th className="p-3">Local IP</th>}
                {visibleColumns.includes('remote_address') && <th className="p-3">Remote IP</th>}
                {visibleColumns.includes('parent_queue') && <th className="p-3">Parent Queue</th>}
                {visibleColumns.includes('rate_limit') && <th className="p-3">Rate Limit</th>}
                {visibleColumns.includes('subscribed_at') && <th className="p-3">Tgl Berlangganan</th>}
                {visibleColumns.includes('odp') && <th className="p-3">ODP &amp; Port</th>}
                {visibleColumns.includes('status') && <th className="p-3">Status</th>}
                {visibleColumns.includes('is_online') && <th className="p-3">Koneksi</th>}
                {visibleColumns.includes('expires_at') && <th className="p-3">Jatuh Tempo</th>}
                {visibleColumns.includes('debt') && <th className="p-3">Hutang (Rp)</th>}
                {visibleColumns.includes('wilayah') && <th className="p-3">Wilayah</th>}
                {visibleColumns.includes('installed_by_team') && <th className="p-3">Tim Pemasang</th>}
                {visibleColumns.includes('sales_name') && <th className="p-3">Sales</th>}
                {visibleColumns.includes('onu_index') && <th className="p-3">ONU Index</th>}
                {visibleColumns.includes('session_uptime') && <th className="p-3">Session Uptime</th>}
                {visibleColumns.includes('current_ip') && <th className="p-3">IP Terkini</th>}
                {visibleColumns.includes('current_mac') && <th className="p-3">MAC Address</th>}
                {visibleColumns.includes('last_online_at') && <th className="p-3">Terakhir Online</th>}
                {visibleColumns.includes('last_offline_at') && <th className="p-3">Terakhir Offline</th>}
                {visibleColumns.includes('notes') && <th className="p-3">Catatan</th>}
                <th className="p-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data pelanggan...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-slate-400">
                    Tidak ada data pelanggan yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                customers.map((c: any, idx: number) => {
                  const rowNumber = (meta.current_page - 1) * perPage + idx + 1;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {visibleColumns.includes('no') && (
                        <td className="p-3 text-center text-slate-400 font-mono">{rowNumber}</td>
                      )}
                      {visibleColumns.includes('customer_code') && (
                        <td className="p-3 font-mono font-bold text-indigo-600">
                          <div className="flex items-center gap-1.5">
                            <span>{c.customer_code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(c.customer_code)}
                              className="text-slate-400 hover:text-slate-600"
                              title="Salin ID"
                            >
                              {copiedId === c.customer_code ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      {visibleColumns.includes('external_ref') && (
                        <td className="p-3 font-mono text-slate-600">{c.external_ref || '-'}</td>
                      )}
                      {visibleColumns.includes('name_contact') && (
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block text-xs">{c.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('nik_masked') && (
                        <td className="p-3 font-mono text-slate-600">{c.nik_masked || c.nik || '-'}</td>
                      )}
                      {visibleColumns.includes('address') && (
                        <td className="p-3 text-slate-700 text-xs">
                          <span className="line-clamp-2">{c.address}</span>
                        </td>
                      )}
                      {visibleColumns.includes('coordinates') && (
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('package_price') && (
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block">
                            {c.package_name || c.package || '-'}
                          </span>
                          <span className="text-[11px] text-indigo-600 font-mono">
                            Rp {Number(c.monthly_price || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('service_type') && (
                        <td className="p-3 uppercase font-mono text-[11px] text-slate-700">
                          {c.service_type || 'PPPoE'}
                        </td>
                      )}
                      {visibleColumns.includes('bras_name') && (
                        <td className="p-3 text-slate-600">{c.bras_name || '-'}</td>
                      )}
                      {visibleColumns.includes('collector') && (
                        <td className="p-3 text-slate-600">{c.collector || '-'}</td>
                      )}
                      {visibleColumns.includes('username') && (
                        <td className="p-3 font-mono text-slate-700">{c.username || '-'}</td>
                      )}
                      {visibleColumns.includes('local_address') && (
                        <td className="p-3 font-mono text-slate-600">{c.local_address || '-'}</td>
                      )}
                      {visibleColumns.includes('remote_address') && (
                        <td className="p-3 font-mono text-slate-600">{c.remote_address || '-'}</td>
                      )}
                      {visibleColumns.includes('parent_queue') && (
                        <td className="p-3 text-slate-600">{c.parent_queue || '-'}</td>
                      )}
                      {visibleColumns.includes('rate_limit') && (
                        <td className="p-3 font-mono text-slate-600">{c.rate_limit || '-'}</td>
                      )}
                      {visibleColumns.includes('subscribed_at') && (
                        <td className="p-3 text-slate-600">
                          {c.subscribed_at ? formatDateOnly(c.subscribed_at) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('odp') && (
                        <td className="p-3 font-mono text-xs">
                          <span className="font-bold text-slate-800 block">
                            {c.odp?.code || c.odp_code || '-'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Port: {c.odp_port || c.odp?.port || '-'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('status') && (
                        <td className="p-3">{getStatusBadge(c.status)}</td>
                      )}
                      {visibleColumns.includes('is_online') && (
                        <td className="p-3">
                          {c.is_online ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                              Online
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 text-[10px]">
                              Offline
                            </Badge>
                          )}
                        </td>
                      )}
                      {visibleColumns.includes('expires_at') && (
                        <td className="p-3 text-xs font-semibold text-slate-700">
                          {c.expires_at ? formatDateOnly(c.expires_at) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('debt') && (
                        <td className="p-3 font-mono">
                          <span
                            className={
                              Number(c.debt || 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'
                            }
                          >
                            Rp {Number(c.debt || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                      )}
                      {visibleColumns.includes('wilayah') && (
                        <td className="p-3 text-slate-600">{c.wilayah || '-'}</td>
                      )}
                      {visibleColumns.includes('installed_by_team') && (
                        <td className="p-3 text-slate-600">{c.installed_by_team_name || '-'}</td>
                      )}
                      {visibleColumns.includes('sales_name') && (
                        <td className="p-3 text-slate-600">{c.sales_name || '-'}</td>
                      )}
                      {visibleColumns.includes('onu_index') && (
                        <td className="p-3 font-mono text-slate-600">{c.onu_index || '-'}</td>
                      )}
                      {visibleColumns.includes('session_uptime') && (
                        <td className="p-3 text-slate-600">{c.session_uptime || '-'}</td>
                      )}
                      {visibleColumns.includes('current_ip') && (
                        <td className="p-3 font-mono text-slate-600">{c.current_ip_address || '-'}</td>
                      )}
                      {visibleColumns.includes('current_mac') && (
                        <td className="p-3 font-mono text-slate-600">{c.current_mac_address || '-'}</td>
                      )}
                      {visibleColumns.includes('last_online_at') && (
                        <td className="p-3 text-slate-500">
                          {c.last_online_at ? formatDate(c.last_online_at) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('last_offline_at') && (
                        <td className="p-3 text-slate-500">
                          {c.last_offline_at ? formatDate(c.last_offline_at) : '-'}
                        </td>
                      )}
                      {visibleColumns.includes('notes') && (
                        <td className="p-3 text-slate-500 max-w-xs truncate">{c.notes || '-'}</td>
                      )}

                      {/* Aksi */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/customers/${c.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 p-1.5"
                            title="Buka Detail Pelanggan"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerForStatus(c);
                                setNewStatus(c.status || 'active');
                                setStatusNotes('');
                              }}
                              className="text-slate-500 hover:text-slate-800 p-1.5"
                              title="Ubah Status"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCustomerToDelete(c)}
                              className="text-rose-500 hover:text-rose-700 p-1.5"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <Select
              value={String(perPage)}
              onValueChange={(val) => {
                setPerPage(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-2 text-slate-500">
              Total {meta.total} pelanggan (Halaman {meta.current_page} dari {meta.last_page})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs h-8"
            >
              Sebelumnya
            </Button>
            <span className="px-2 font-semibold text-slate-800">{page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs h-8"
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </Card>

      {/* 35 Column Picker Modal */}
      <Dialog open={isColumnPickerOpen} onOpenChange={setIsColumnPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Columns className="w-5 h-5 text-indigo-600" />
              Pemilih Kolom Tampilan (Semua 35 Kolom)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Centang kolom yang ingin Anda tampilkan pada tabel data pelanggan. Kolom sensitif (NIK mentah dan password) tidak pernah ditampilkan di tabel.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-3">
            {ALL_COLUMNS.map((col) => {
              const isChecked = visibleColumns.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumn(col.key)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-colors ${
                    isChecked
                      ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300 shrink-0" />
                  )}
                  <span className="truncate">{col.label}</span>
                </button>
              );
            })}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center">
            <Button variant="ghost" size="sm" onClick={resetColumns} className="text-xs text-slate-500">
              Reset ke Kolom Default (9 Kolom)
            </Button>
            <Button
              onClick={() => setIsColumnPickerOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              Terapkan Kolom ({visibleColumns.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Customer Modal */}
      <CustomerFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch();
          refetchStats();
        }}
      />

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <Upload className="w-5 h-5" /> Import Data Pelanggan (Excel / CSV)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Unggah file spreadsheet 35 kolom data pelanggan. Baris yang memiliki error akan dilaporkan secara terinci.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleImportSubmit} className="space-y-4 pt-2">
            <div className="border-2 border-dashed border-border rounded-xl p-5 text-center bg-muted/30">
              <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground mt-2">
                Format didukung: .xlsx, .xls, .csv (Maksimal 20 MB). Pemisah koma, titik koma, atau tab dideteksi otomatis.
              </p>
            </div>

            {/* Checkbox Dry-Run */}
            <div className="flex items-center gap-2 p-3 bg-muted/20 border border-border rounded-lg">
              <input
                type="checkbox"
                id="dry_run_mode"
                checked={isDryRunMode}
                onChange={(e) => setIsDryRunMode(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
              />
              <label htmlFor="dry_run_mode" className="text-xs text-foreground cursor-pointer font-medium select-none">
                Mode Simulasi (Dry-Run): Uji validasi data dan bentrok port ODP tanpa menyimpan ke database
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="text-xs flex items-center gap-1.5 text-primary border-border"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh CSV (35 Kolom)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="text-xs flex items-center gap-1.5 text-primary border-border"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Excel (35 Kolom)
                </Button>
              </div>
            </div>

            {/* Rekap Hasil Impor / Dry-Run */}
            {importSummary && (
              <div className="p-3 bg-card border border-border rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold border-b border-border pb-1">
                  <span className="text-foreground">
                    {importSummary.dry_run ? 'Hasil Simulasi (Dry-Run)' : 'Hasil Impor Data Pelanggan'}
                  </span>
                  <span className="text-muted-foreground">Total: {importSummary.total_processed} baris</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                  <div className="p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Pelanggan Baru</p>
                    <p className="text-sm font-bold text-emerald-600">{importSummary.imported || 0}</p>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Diperbarui</p>
                    <p className="text-sm font-bold text-blue-600">{importSummary.updated || 0}</p>
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded border border-amber-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Bentrok Port</p>
                    <p className="text-sm font-bold text-amber-600">{importSummary.port_conflicts || 0}</p>
                  </div>
                  <div className="p-2 bg-rose-500/10 rounded border border-rose-500/20">
                    <p className="text-[10px] text-muted-foreground uppercase">Dilewati / Galat</p>
                    <p className="text-sm font-bold text-rose-600">{importSummary.skipped || 0}</p>
                  </div>
                </div>

                {importSummary.errors && importSummary.errors.length > 0 && (
                  <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded max-h-36 overflow-y-auto space-y-1">
                    <p className="font-semibold text-rose-700 text-xs">Laporan Galat Validasi ({importSummary.errors.length}):</p>
                    {importSummary.errors.map((err: string, i: number) => (
                      <p key={i} className="text-rose-600 text-[11px] leading-tight">• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsImportModalOpen(false)}>
                Tutup
              </Button>
              <Button
                type="submit"
                disabled={isImporting || !importFile}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isImporting
                  ? 'Memproses...'
                  : isDryRunMode
                  ? 'Mulai Simulasi (Dry-Run)'
                  : 'Mulai Impor Pelanggan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog
        open={!!selectedCustomerForStatus}
        onOpenChange={(open) => !open && setSelectedCustomerForStatus(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Status Pelanggan</DialogTitle>
            <DialogDescription className="text-xs">
              Ubah status operasional untuk {selectedCustomerForStatus?.name} ({selectedCustomerForStatus?.customer_code}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Pilih Status Baru</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Aktif)</SelectItem>
                  <SelectItem value="suspended">Suspended (Ditangguhkan / Isolir)</SelectItem>
                  <SelectItem value="inactive">Inactive (Non-Aktif)</SelectItem>
                  <SelectItem value="terminated">Terminated (Putus)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Catatan Perubahan</Label>
              <Textarea
                rows={3}
                placeholder="Alasan perubahan status..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomerForStatus(null)}>
              Batal
            </Button>
            <Button
              disabled={updateStatusMutation.isPending}
              onClick={() =>
                updateStatusMutation.mutate({
                  id: selectedCustomerForStatus.id,
                  status: newStatus,
                  notes: statusNotes,
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {updateStatusMutation.isPending ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-rose-600">Hapus Pelanggan</DialogTitle>
            </div>
            <DialogDescription className="text-xs pt-2">
              Hapus pelanggan <span className="font-bold text-slate-800">{customerToDelete?.name}</span> ({customerToDelete?.customer_code})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCustomerToDelete(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(customerToDelete.id)}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
