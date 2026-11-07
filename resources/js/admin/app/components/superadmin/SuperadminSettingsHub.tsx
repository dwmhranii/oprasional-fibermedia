import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { PageHeader } from '@shared/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Copy,
  Check,
  History,
  Lock,
  Smartphone,
  Eye,
  KeyRound,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { TERMS, ACTIONS, MESSAGES } from '@shared/i18n/id';

export type SuperadminSettingTab = 'sla' | 'complaint_types' | 'offices' | 'holidays' | '2fa';

export const SuperadminSettingsHub: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getInitialTab = (): SuperadminSettingTab => {
    const path = location.pathname;
    if (path.includes('/complaint-types')) return 'complaint_types';
    if (path.includes('/offices')) return 'offices';
    if (path.includes('/holidays')) return 'holidays';
    if (path.includes('/2fa')) return '2fa';
    return 'sla';
  };

  const [activeTab, setActiveTab] = useState<SuperadminSettingTab>(getInitialTab());

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SLA SETTINGS
  // ──────────────────────────────────────────────────────────────────────────
  const { data: slaData, isLoading: loadingSla } = useQuery({
    queryKey: ['superadmin-sla-settings'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/sla-settings');
      return res?.data || [];
    },
  });

  const [editSlaModalOpen, setEditSlaModalOpen] = useState(false);
  const [selectedSla, setSelectedSla] = useState<any>(null);
  const [slaHours, setSlaHours] = useState<number>(3);
  const [slaDescription, setSlaDescription] = useState<string>('');

  const updateSlaMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.put(`/sla-settings/${selectedSla.id}`, {
        resolution_hours: Number(slaHours),
        description: slaDescription.trim() || undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Target durasi SLA berhasil diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-sla-settings'] });
      setEditSlaModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memperbarui target SLA.');
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. JENIS GANGGUAN (COMPLAINT TYPES)
  // ──────────────────────────────────────────────────────────────────────────
  const { data: complaintTypesData, isLoading: loadingComplaintTypes } = useQuery({
    queryKey: ['superadmin-complaint-types'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/complaint-types');
      return res?.data || [];
    },
  });

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [typePriority, setTypePriority] = useState('medium');
  const [typeActive, setTypeActive] = useState(true);

  const saveTypeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: typeName.trim(),
        description: typeDesc.trim() || undefined,
        default_priority: typePriority,
        is_active: typeActive,
      };
      if (isEditingType && selectedType) {
        return await apiClient.put(`/complaint-types/${selectedType.id}`, payload);
      }
      return await apiClient.post('/complaint-types', payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Jenis gangguan berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-complaint-types'] });
      setTypeModalOpen(false);
      resetTypeForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan jenis gangguan.');
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/complaint-types/${id}`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Aksi jenis gangguan berhasil.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-complaint-types'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memproses jenis gangguan.');
    },
  });

  const resetTypeForm = () => {
    setSelectedType(null);
    setIsEditingType(false);
    setTypeName('');
    setTypeDesc('');
    setTypePriority('medium');
    setTypeActive(true);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. LOKASI KANTOR & WI-FI (OFFICE LOCATIONS)
  // ──────────────────────────────────────────────────────────────────────────
  const { data: officesData, isLoading: loadingOffices } = useQuery({
    queryKey: ['superadmin-offices'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/office-locations');
      return res?.data || [];
    },
  });

  const [officeModalOpen, setOfficeModalOpen] = useState(false);
  const [isEditingOffice, setIsEditingOffice] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<any>(null);
  const [officeName, setOfficeName] = useState('');
  const [officeLat, setOfficeLat] = useState<string>('-8.1132000');
  const [officeLng, setOfficeLng] = useState<string>('112.6415000');
  const [officeRadius, setOfficeRadius] = useState<number>(50);
  const [officeIps, setOfficeIps] = useState<string>('192.168.1.1, 10.10.0.1');

  const saveOfficeMutation = useMutation({
    mutationFn: async () => {
      const parsedIps = officeIps
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);

      const payload = {
        name: officeName.trim(),
        latitude: parseFloat(officeLat),
        longitude: parseFloat(officeLng),
        radius_meters: Number(officeRadius),
        valid_wifi_ips: parsedIps,
      };

      if (isEditingOffice && selectedOffice) {
        return await apiClient.put(`/office-locations/${selectedOffice.id}`, payload);
      }
      return await apiClient.post('/office-locations', payload);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Lokasi kantor berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-offices'] });
      setOfficeModalOpen(false);
      resetOfficeForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan lokasi kantor.');
    },
  });

  const toggleWifiIncidentMutation = useMutation({
    mutationFn: async ({ id, active, note }: { id: number; active: boolean; note?: string }) => {
      return await apiClient.post(`/office-locations/${id}/toggle-incident`, {
        wifi_incident_active: active,
        wifi_incident_note: note || undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Status insiden Wi-Fi diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-offices'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengubah status insiden Wi-Fi.');
    },
  });

  const resetOfficeForm = () => {
    setSelectedOffice(null);
    setIsEditingOffice(false);
    setOfficeName('');
    setOfficeLat('-8.1132000');
    setOfficeLng('112.6415000');
    setOfficeRadius(50);
    setOfficeIps('192.168.1.1, 10.10.0.1');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. HARI LIBUR & ALASAN JEDA SLA (HOLIDAYS & PAUSE REASONS)
  // ──────────────────────────────────────────────────────────────────────────
  const { data: holidaysData, isLoading: loadingHolidays } = useQuery({
    queryKey: ['superadmin-holidays'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/holidays');
      return res?.data || [];
    },
  });

  const { data: pauseReasonsData, isLoading: loadingPauseReasons } = useQuery({
    queryKey: ['superadmin-pause-reasons'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/pause-reasons');
      return res?.data || [];
    },
  });

  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');

  const saveHolidayMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/holidays', {
        name: holidayName.trim(),
        holiday_date: holidayDate,
        description: holidayDesc.trim() || undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Hari libur berhasil ditambahkan.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-holidays'] });
      setHolidayModalOpen(false);
      setHolidayName('');
      setHolidayDate('');
      setHolidayDesc('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan hari libur.');
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiClient.delete(`/holidays/${id}`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Hari libur berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-holidays'] });
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. 2FA TOTP AUTHENTICATOR
  // ──────────────────────────────────────────────────────────────────────────
  const { data: twoFactorStatus, refetch: refetch2FA } = useQuery({
    queryKey: ['superadmin-2fa-status'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/user/2fa/status');
      return res?.data || { enabled: false };
    },
  });

  const [setup2FAModalOpen, setSetup2FAModalOpen] = useState(false);
  const [disable2FAModalOpen, setDisable2FAModalOpen] = useState(false);
  const [setup2FAData, setSetup2FAData] = useState<any>(null);
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  const init2FAMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post<any>('/user/2fa/setup');
    },
    onSuccess: (res: any) => {
      setSetup2FAData(res?.data);
      setSetup2FAModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memulai penyiapan 2FA.');
    },
  });

  const confirm2FAMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post<any>('/user/2fa/confirm', {
        code: totpCodeInput.trim(),
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Autentikasi dua faktor berhasil diaktifkan.');
      setRecoveryCodes(res?.data?.recovery_codes || []);
      refetch2FA();
      setTotpCodeInput('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kode verifikasi 6 digit tidak sesuai.');
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post<any>('/user/2fa/disable', {
        password: disablePassword,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || '2FA berhasil dinonaktifkan.');
      refetch2FA();
      setDisable2FAModalOpen(false);
      setDisablePassword('');
      setRecoveryCodes([]);
      setSetup2FAData(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kata sandi saat ini tidak sesuai.');
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
    toast.success('Kunci rahasia disalin ke papan klip');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem & Operasional"
        subtitle="Konfigurasi target SLA, jenis gangguan, titik absensi kantor, hari libur nasional, dan keamanan 2FA"
      />

      <Tabs
        value={activeTab}
        onValueChange={(val: any) => {
          setActiveTab(val);
          navigate(`/settings/${val === 'complaint_types' ? 'complaint-types' : val}`);
        }}
        className="space-y-6"
      >
        <TabsList className="bg-muted p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger value="sla" className="flex items-center gap-2 py-2 px-4 rounded-lg">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Target Durasi SLA</span>
          </TabsTrigger>

          <TabsTrigger value="complaint_types" className="flex items-center gap-2 py-2 px-4 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Jenis Gangguan</span>
          </TabsTrigger>

          <TabsTrigger value="offices" className="flex items-center gap-2 py-2 px-4 rounded-lg">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span>Lokasi Kantor & Wi-Fi</span>
          </TabsTrigger>

          <TabsTrigger value="holidays" className="flex items-center gap-2 py-2 px-4 rounded-lg">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>Hari Libur & Jeda SLA</span>
          </TabsTrigger>

          <TabsTrigger value="2fa" className="flex items-center gap-2 py-2 px-4 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Keamanan 2FA TOTP</span>
          </TabsTrigger>
        </TabsList>

        {/* ================================================================= */}
        {/* TAB 1: PENGATURAN SLA */}
        {/* ================================================================= */}
        <TabsContent value="sla" className="space-y-5">
          <Card className="border-border shadow-xs bg-card">
            <CardHeader className="border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Target Durasi Resolusi SLA Pengaduan
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    Jam operasional SLA dihitung aktif pada 08.00 - 20.00 WIB, Senin - Sabtu (di luar hari libur nasional).
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(slaData || []).map((sla: any) => (
                  <div
                    key={sla.id}
                    className="p-5 rounded-2xl border border-border bg-card/60 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`text-xs font-bold px-2.5 py-1 ${
                          sla.priority === 'critical'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-300'
                            : sla.priority === 'high'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-300'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-300'
                        }`}
                      >
                        Prioritas {sla.priority_label}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {sla.resolution_minutes} menit
                      </span>
                    </div>

                    <div>
                      <p className="text-3xl font-black text-foreground">
                        {sla.resolution_hours}{' '}
                        <span className="text-sm font-normal text-muted-foreground">Jam Operasional</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {sla.description || `Target penyelesaian pengaduan prioritas ${sla.priority_label}.`}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSla(sla);
                        setSlaHours(sla.resolution_hours);
                        setSlaDescription(sla.description || '');
                        setEditSlaModalOpen(true);
                      }}
                      className="w-full text-xs font-semibold h-9"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      Ubah Target
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-300 dark:border-amber-900/60 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                  <p className="font-semibold">Aturan Sinkronisasi SLA (PRD Final v1.2):</p>
                  <p>
                    Nilai target dalam menit (<code className="font-mono">sla_target_minutes</code>) disalin ke tiket saat
                    dibuat. Mengubah pengaturan SLA di atas hanya memengaruhi tiket baru dan tidak memengaruhi tiket yang sedang berjalan. Setiap perubahan tercatat secara permanen di Audit Log.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 2: JENIS GANGGUAN */}
        {/* ================================================================= */}
        <TabsContent value="complaint_types" className="space-y-5">
          <Card className="border-border shadow-xs bg-card">
            <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Katalog Jenis Gangguan
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Kelola master jenis pengaduan dan prioritas bawaan untuk tiket baru.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  resetTypeForm();
                  setTypeModalOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Tambah Jenis Gangguan
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Nama Jenis Gangguan</TableHead>
                    <TableHead className="text-xs">Deskripsi</TableHead>
                    <TableHead className="text-xs">Prioritas Bawaan</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Tiket Terkait</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(complaintTypesData || []).map((t: any) => (
                    <TableRow key={t.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs">{t.description || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${
                            t.default_priority === 'critical'
                              ? 'text-rose-600 border-rose-300'
                              : t.default_priority === 'high'
                              ? 'text-amber-600 border-amber-300'
                              : 'text-blue-600 border-blue-300'
                          }`}
                        >
                          {t.default_priority_label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {t.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-300 text-[11px]">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">
                            Nonaktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {t.complaints_count || 0} Tiket
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedType(t);
                            setIsEditingType(true);
                            setTypeName(t.name);
                            setTypeDesc(t.description || '');
                            setTypePriority(t.default_priority);
                            setTypeActive(t.is_active);
                            setTypeModalOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="Ubah"
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`Yakin ingin memproses jenis gangguan '${t.name}'?`)) {
                              deleteTypeMutation.mutate(t.id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          title="Hapus / Nonaktifkan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 3: LOKASI KANTOR & WI-FI */}
        {/* ================================================================= */}
        <TabsContent value="offices" className="space-y-5">
          <Card className="border-border shadow-xs bg-card">
            <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Daftar Titik Kantor & Validasi Wi-Fi Absensi
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Aturan absensi staf kantor: radius maksimal 50 m dan terhubung ke alamat IP Wi-Fi kantor yang sah.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  resetOfficeForm();
                  setOfficeModalOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Tambah Titik Kantor
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Nama Kantor</TableHead>
                    <TableHead className="text-xs">Koordinat (Lat, Lng)</TableHead>
                    <TableHead className="text-xs">Radius Absensi</TableHead>
                    <TableHead className="text-xs">IP Wi-Fi Sah</TableHead>
                    <TableHead className="text-xs">Status Insiden Wi-Fi</TableHead>
                    <TableHead className="text-xs text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(officesData || []).map((o: any) => (
                    <TableRow key={o.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">{o.name}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {o.latitude}, {o.longitude}
                      </TableCell>
                      <TableCell>{o.radius_meters} Meter</TableCell>
                      <TableCell className="font-mono text-xs max-w-xs">
                        {o.valid_wifi_ips && o.valid_wifi_ips.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {o.valid_wifi_ips.map((ip: string) => (
                              <Badge key={ip} variant="outline" className="text-[10px]">
                                {ip}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {o.wifi_incident_active ? (
                          <div className="space-y-1">
                            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-300 text-[10px]">
                              Insiden Darurat Aktif
                            </Badge>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {o.wifi_incident_note || 'Bypass Wi-Fi aktif'}
                            </p>
                          </div>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-300 text-[10px]">
                            Normal (Wajib Wi-Fi)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newActive = !o.wifi_incident_active;
                            const note = newActive ? window.prompt('Masukkan catatan gangguan router kantor:', 'Router Wi-Fi kantor bermasalah / perbaikan teknis') : '';
                            if (newActive && note === null) return;
                            toggleWifiIncidentMutation.mutate({ id: o.id, active: newActive, note: note || undefined });
                          }}
                          className={`text-[11px] h-8 px-2.5 ${
                            o.wifi_incident_active ? 'border-emerald-300 text-emerald-700' : 'border-rose-300 text-rose-700'
                          }`}
                        >
                          {o.wifi_incident_active ? (
                            <>
                              <Wifi className="w-3 h-3 mr-1" /> Matikan Darurat
                            </>
                          ) : (
                            <>
                              <WifiOff className="w-3 h-3 mr-1" /> Saklar Darurat
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOffice(o);
                            setIsEditingOffice(true);
                            setOfficeName(o.name);
                            setOfficeLat(String(o.latitude));
                            setOfficeLng(String(o.longitude));
                            setOfficeRadius(o.radius_meters);
                            setOfficeIps((o.valid_wifi_ips || []).join(', '));
                            setOfficeModalOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                          title="Ubah"
                        >
                          <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 4: HARI LIBUR & ALASAN JEDA SLA */}
        {/* ================================================================= */}
        <TabsContent value="holidays" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kartu Hari Libur Nasional */}
            <Card className="border-border shadow-xs bg-card">
              <CardHeader className="border-b border-border bg-muted/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    Hari Libur Nasional 2026
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Penghitungan SLA dijeda penuh pada hari libur nasional.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => setHolidayModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-2.5"
                >
                  <Plus className="w-3 h-3 mr-1" /> Tambah
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs">Tanggal</TableHead>
                      <TableHead className="text-xs">Nama Libur Nasional</TableHead>
                      <TableHead className="text-xs text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(holidaysData || []).map((h: any) => (
                      <TableRow key={h.id} className="text-xs hover:bg-muted/20">
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {h.holiday_date}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">{h.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Hapus hari libur '${h.name}'?`)) {
                                deleteHolidayMutation.mutate(h.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Kartu Alasan Jeda SLA */}
            <Card className="border-border shadow-xs bg-card">
              <CardHeader className="border-b border-border bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  5 Alasan Baku Jeda SLA (PRD Final v1.2)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Alasan baku yang dapat dipilih teknisi saat menghentikan sementara hitung mundur tiket.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs">Kode</TableHead>
                      <TableHead className="text-xs">Keterangan Alasan Jeda</TableHead>
                      <TableHead className="text-xs">Wajib Bukti Foto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pauseReasonsData || []).map((p: any) => (
                      <TableRow key={p.id} className="text-xs hover:bg-muted/20">
                        <TableCell className="font-mono text-muted-foreground">{p.code}</TableCell>
                        <TableCell className="font-semibold text-foreground">{p.reason}</TableCell>
                        <TableCell>
                          {p.requires_photo ? (
                            <Badge className="bg-rose-500/10 text-rose-600 border border-rose-300 text-[10px]">
                              Wajib Foto
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Opsional
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================================================================= */}
        {/* TAB 5: KEAMANAN & 2FA TOTP */}
        {/* ================================================================= */}
        <TabsContent value="2fa" className="space-y-6">
          <Card className="border-border shadow-xs bg-card max-w-3xl">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Autentikasi Dua Faktor (2FA TOTP)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Tingkatkan keamanan akun Superadmin & Admin dengan kode sandi satu kali (Google Authenticator / Aegis / Microsoft Authenticator).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30">
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-xl ${twoFactorStatus?.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Status 2FA Akun Anda:{' '}
                      {twoFactorStatus?.enabled ? (
                        <span className="text-emerald-600 font-bold">AKTIF</span>
                      ) : (
                        <span className="text-amber-600 font-bold">BELUM DIAKTIFKAN</span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {twoFactorStatus?.enabled
                        ? 'Akun Anda dilindungi oleh verifikasi TOTP saat login ke sistem.'
                        : 'Sangat disarankan mengaktifkan 2FA untuk akun tingkat administrator.'}
                    </p>
                  </div>
                </div>

                {twoFactorStatus?.enabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDisable2FAModalOpen(true)}
                    className="border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold h-9"
                  >
                    Nonaktifkan 2FA
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => init2FAMutation.mutate()}
                    disabled={init2FAMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9"
                  >
                    {init2FAMutation.isPending ? 'Menyiapkan...' : 'Aktifkan 2FA Sekarang'}
                  </Button>
                )}
              </div>

              {recoveryCodes.length > 0 && (
                <div className="p-5 rounded-2xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h5 className="font-bold text-xs uppercase tracking-wider">
                      Kode Pemulihan Darurat (Simpan Segera!)
                    </h5>
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    Jika Anda kehilangan akses ke aplikasi authenticator, gunakan salah satu kode ini untuk masuk. Setiap kode hanya dapat digunakan satu kali.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    {recoveryCodes.map((code, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-background border border-emerald-200 text-center font-bold">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* =================================================================== */}
      {/* MODALS */}
      {/* =================================================================== */}

      {/* Modal Ubah Target SLA */}
      <Dialog open={editSlaModalOpen} onOpenChange={setEditSlaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Ubah Target SLA {selectedSla?.priority_label}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan durasi jam operasional resolusi tiket untuk prioritas ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Durasi Target (Jam Operasional)</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="168"
                value={slaHours}
                onChange={(e) => setSlaHours(Number(e.target.value))}
                className="text-sm font-semibold"
              />
              <p className="text-[11px] text-muted-foreground font-mono">
                Setara dengan: {Math.round(slaHours * 60)} Menit
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan Keterangan</Label>
              <Input
                value={slaDescription}
                onChange={(e) => setSlaDescription(e.target.value)}
                placeholder="Deskripsi target SLA"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditSlaModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => updateSlaMutation.mutate()}
              disabled={updateSlaMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {updateSlaMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah/Ubah Jenis Gangguan */}
      <Dialog open={typeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              {isEditingType ? 'Ubah Jenis Gangguan' : 'Tambah Jenis Gangguan Baru'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Jenis Gangguan *</Label>
              <Input
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                placeholder="Contoh: LOS Merah / Kabel Putus"
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Prioritas Bawaan *</Label>
              <select
                value={typePriority}
                onChange={(e) => setTypePriority(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs"
              >
                <option value="critical">Kritis (3 Jam)</option>
                <option value="high">Tinggi (6 Jam)</option>
                <option value="medium">Sedang (24 Jam)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Deskripsi</Label>
              <Input
                value={typeDesc}
                onChange={(e) => setTypeDesc(e.target.value)}
                placeholder="Penjelasan ringkas penyebab atau gejala"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTypeModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => saveTypeMutation.mutate()}
              disabled={!typeName.trim() || saveTypeMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saveTypeMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah/Ubah Kantor */}
      <Dialog open={officeModalOpen} onOpenChange={setOfficeModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              {isEditingOffice ? 'Ubah Titik Kantor' : 'Tambah Titik Kantor Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Konfigurasi koordinat GPS dan daftar IP Wi-Fi untuk absensi harian staf.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Kantor *</Label>
              <Input
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="Contoh: Kantor Pusat Fibermedia Bululawang"
                className="text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Latitude *</Label>
                <Input
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                  placeholder="-8.1132000"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Longitude *</Label>
                <Input
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                  placeholder="112.6415000"
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Radius Absensi (Meter)</Label>
              <Input
                type="number"
                min="20"
                max="1000"
                value={officeRadius}
                onChange={(e) => setOfficeRadius(Number(e.target.value))}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Bawaan PRD: 50 Meter</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Daftar IP Wi-Fi yang Sah (Pisahkan Koma)</Label>
              <Input
                value={officeIps}
                onChange={(e) => setOfficeIps(e.target.value)}
                placeholder="192.168.1.1, 10.10.0.1"
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Staf kantor wajib terhubung ke salah satu IP Wi-Fi di atas saat melakukan absensi.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOfficeModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => saveOfficeMutation.mutate()}
              disabled={!officeName.trim() || saveOfficeMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saveOfficeMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Hari Libur */}
      <Dialog open={holidayModalOpen} onOpenChange={setHolidayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Tambah Hari Libur Nasional
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Hari Libur *</Label>
              <Input
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="Contoh: Hari Raya Idul Fitri"
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal Libur *</Label>
              <Input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Keterangan Tambahan</Label>
              <Input
                value={holidayDesc}
                onChange={(e) => setHolidayDesc(e.target.value)}
                placeholder="Keterangan opsional"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setHolidayModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => saveHolidayMutation.mutate()}
              disabled={!holidayName.trim() || !holidayDate || saveHolidayMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saveHolidayMutation.isPending ? 'Menyimpan...' : 'Simpan Hari Libur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Setup 2FA */}
      <Dialog open={setup2FAModalOpen} onOpenChange={setSetup2FAModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Penyiapan Autentikasi Dua Faktor (2FA)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Buka aplikasi Google Authenticator, pilih Tambah Akun &gt; Masukkan Kunci Penyiapan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider block">
                Kunci Rahasia Penyiapan (Secret Key):
              </Label>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono font-bold text-foreground break-all">
                  {setup2FAData?.secret || 'Membuat kunci...'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(setup2FAData?.secret || '')}
                  className="h-8 shrink-0 text-xs"
                >
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Masukkan Kode Verifikasi 6 Digit</Label>
              <Input
                type="text"
                maxLength={6}
                value={totpCodeInput}
                onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 123456"
                className="text-center font-mono tracking-widest text-lg font-bold"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSetup2FAModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => confirm2FAMutation.mutate()}
              disabled={totpCodeInput.length !== 6 || confirm2FAMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              {confirm2FAMutation.isPending ? 'Memverifikasi...' : 'Verifikasi & Aktifkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Disable 2FA */}
      <Dialog open={disable2FAModalOpen} onOpenChange={setDisable2FAModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Nonaktifkan Autentikasi 2FA
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan kata sandi akun Anda untuk mengonfirmasi penonaktifan 2FA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kata Sandi Saat Ini</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Kata sandi akun"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisable2FAModalOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => disable2FAMutation.mutate()}
              disabled={!disablePassword || disable2FAMutation.isPending}
            >
              {disable2FAMutation.isPending ? 'Memproses...' : 'Nonaktifkan 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

