import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../lib/profileService';
import { ApiError } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useTheme } from 'next-themes';
import {
  User as UserIcon,
  Lock,
  Shield,
  Mail,
  Phone,
  Save,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Sparkles,
  UserCheck,
  CheckCircle2,
  Briefcase,
  Wrench,
  UserCog,
  FileSpreadsheet,
  Sun,
  Moon,
  Laptop,
  Palette,
  Check,
  AtSign,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    username: user?.username || (user?.email ? user.email.split('@')[0] : ''),
    email: user?.email || '',
    phone: (user as any)?.phone || '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [isAvatarDirty, setIsAvatarDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        username: user.username || (user.email ? user.email.split('@')[0] : ''),
        email: user.email || '',
        phone: (user as any)?.phone || '',
      });
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File Tidak Valid', {
        description: 'Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan.',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran File Terlalu Besar', {
        description: 'Ukuran foto profil maksimal 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
      setIsAvatarDirty(true);
      toast.success('Foto Profil Dipilih', {
        description: 'Foto profil baru siap disimpan. Klik "Simpan Profil" untuk menerapkan.',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setIsAvatarDirty(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.info('Foto Profil Dihapus', {
      description: 'Klik "Simpan Profil" untuk menerapkan perubahan.',
    });
  };

  // Security Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Role Metadata & Visual Styling
  const getRoleDetails = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'sales':
        return {
          title: 'Sales Representative',
          badgeStyle: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Briefcase className="w-5 h-5 text-blue-600" />,
          cardBg: 'bg-blue-50/50 border-blue-100',
          description:
            'Bertanggung jawab atas entri pengajuan layanan baru pelanggan, pemantauan status persetujuan/validasi, dan pelaporan pencapaian penjualan.',
          capabilities: [
            'Input Pengajuan Pelanggan Baru',
            'Monitoring Status Submissions',
            'Laporan Kinerja Sales',
            'Revisi Pengajuan Berkas',
          ],
        };
      case 'admin':
        return {
          title: 'Operational Admin',
          badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
          cardBg: 'bg-emerald-50/50 border-emerald-100',
          description:
            'Mengelola validasi berkas pengajuan sales, penjadwalan work order provisioning, penanganan laporan gangguan (maintenance), dan pemantauan SLA.',
          capabilities: [
            'Validasi Dokumen Submissions',
            'Manajemen Work Order Provisioning',
            'Penanganan Tiket Gangguan',
            'Analisis Matriks SLA & Breaches',
          ],
        };
      case 'teknisi':
        return {
          title: 'Teknisi Lapangan (Field Installer)',
          badgeStyle: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <Wrench className="w-5 h-5 text-amber-600" />,
          cardBg: 'bg-amber-50/50 border-amber-100',
          description:
            'Bertanggung jawab melaksanakan instalasi perangkat di lokasi pelanggan, pengambilan bukti foto, deteksi lokasi GPS, dan tanda tangan pelanggan.',
          capabilities: [
            'Daftar Tugas Instalasi Lapangan',
            'Pengambilan Koordinat GPS Presisi',
            'Unggah Foto Dokumentasi Perangkat',
            'Pengambilan Tanda Tangan Digital',
          ],
        };
      case 'superadmin':
        return {
          title: 'System Administrator (Superadmin)',
          badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: <UserCog className="w-5 h-5 text-purple-600" />,
          cardBg: 'bg-purple-50/50 border-purple-100',
          description:
            'Akses tingkat tertinggi sistem untuk mengelola seluruh akun pengguna, matriks hak akses & peran (RBAC), audit log aktivitas, serta konfigurasi global.',
          capabilities: [
            'Manajemen Akun Pengguna (CRUD)',
            'Manajemen Peran & Izin Akses',
            'Audit Trail Log System',
            'Akses Penuh Seluruh Modul Sistem',
          ],
        };
      default:
        return {
          title: 'Pengguna Sistem',
          badgeStyle: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Shield className="w-5 h-5 text-gray-600" />,
          cardBg: 'bg-gray-50/50 border-gray-100',
          description: 'Pengguna terdaftar pada sistem provisioning Fibermedia.',
          capabilities: ['Akses Dashboard Dasar', 'Kelola Profil & Password Akun'],
        };
    }
  };

  const roleInfo = getRoleDetails(user?.role);

  // Profile Save Handler
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!profileData.name.trim()) {
      toast.error('Gagal Menyimpan', { description: 'Nama lengkap wajib diisi.' });
      return;
    }

    if (!profileData.username.trim()) {
      toast.error('Gagal Menyimpan', { description: 'Username wajib diisi.' });
      return;
    }

    try {
      setIsSavingProfile(true);
      const updatedUser = await profileService.updateProfile({
        name: profileData.name.trim(),
        phone: profileData.phone.trim(),
        username: profileData.username.trim(),
        avatar: avatarPreview,
      });

      updateUser({
        name: updatedUser?.name || profileData.name.trim(),
        username: profileData.username.trim(),
        phone: (updatedUser as any)?.phone || profileData.phone.trim(),
        avatar: avatarPreview || undefined,
      });

      setIsAvatarDirty(false);

      toast.success('Profil Diperbarui', {
        description: 'Informasi profil dan foto Anda telah berhasil disimpan.',
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error('Gagal Menyimpan Profil', { description: error.getFirstError() });
      } else {
        toast.error('Gagal Menyimpan Profil', { description: 'Terjadi kesalahan sistem.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!passwordData.currentPassword) {
      toast.error('Validasi Gagal', { description: 'Password saat ini wajib diisi.' });
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) {
      toast.error('Validasi Gagal', { description: 'Password baru minimal 8 karakter.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Password Tidak Cocok', {
        description: 'Password baru dan konfirmasi password tidak sama.',
      });
      return;
    }

    try {
      setIsChangingPassword(true);
      await profileService.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirmation: passwordData.confirmPassword,
      });

      toast.success('Password Diubah', {
        description: 'Password Anda telah berhasil diperbarui.',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error('Gagal Mengubah Password', { description: error.getFirstError() });
      } else {
        toast.error('Gagal Mengubah Password', { description: 'Terjadi kesalahan sistem.' });
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-8 pointer-events-none">
          <Sparkles className="w-48 h-48" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 border-2 border-white/30 shadow-md">
              {(avatarPreview || user?.avatar) && (
                <AvatarImage src={avatarPreview || user?.avatar} alt={profileData.name} className="object-cover" />
              )}
              <AvatarFallback className="bg-white text-blue-700 font-bold text-xl">
                {getInitials(profileData.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">{profileData.name || 'Pengguna'}</h1>
                <Badge className={`capitalize border ${roleInfo.badgeStyle}`}>
                  {user?.role || 'User'}
                </Badge>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                Kelola informasi akun, kontak profil, dan keamanan password Anda.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
            <UserCheck className="w-4 h-4 text-emerald-300" />
            <span>Akun Terverifikasi</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-lg bg-slate-100 dark:bg-gray-800 p-1.5 rounded-xl h-auto items-center shadow-inner">
          <TabsTrigger
            value="profile"
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all text-gray-600 dark:text-gray-300"
          >
            <UserIcon className="w-4 h-4" />
            <span className="font-semibold text-sm">Profil Saya</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-sm transition-all text-gray-600 dark:text-gray-300"
          >
            <Lock className="w-4 h-4" />
            <span className="font-semibold text-sm">Keamanan</span>
          </TabsTrigger>
          <TabsTrigger
            value="appearance"
            className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-indigo-700 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm transition-all text-gray-600 dark:text-gray-300"
          >
            <Palette className="w-4 h-4" />
            <span className="font-semibold text-sm">Tampilan</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: PROFIL SAYA ==================== */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg font-semibold flex items-center text-gray-800">
                <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                Informasi Profil
              </CardTitle>
              <CardDescription>
                Perbarui rincian identitas dan informasi kontak akun Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Photo Avatar Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center space-x-4">
                  <div className="relative group shrink-0">
                    <Avatar className="w-16 h-16 shadow-md border-2 border-white dark:border-slate-700 ring-2 ring-blue-100 dark:ring-blue-900/40">
                      {(avatarPreview || user?.avatar) && (
                        <AvatarImage
                          src={avatarPreview || user?.avatar}
                          alt={profileData.name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-blue-600 text-white font-bold text-lg">
                        {getInitials(profileData.name)}
                      </AvatarFallback>
                    </Avatar>
                    {isAvatarDirty && (
                      <span
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-slate-800"
                        title="Ada perubahan foto belum tersimpan"
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Foto Profil Akun
                      </h4>
                      {avatarPreview && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px]">
                          Foto Kustom
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {avatarPreview
                        ? 'Foto profil terpasang. Format: JPG, PNG, atau WebP (Maks. 5MB).'
                        : 'Avatar digenerate otomatis berdasarkan nama Anda.'}
                    </p>
                    {isAvatarDirty && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                        * Foto baru telah dipilih. Klik "Simpan Profil" di bawah untuk menerapkan.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold h-9 px-3.5 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5" />
                    Ubah Foto Profil
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="text-xs font-semibold h-9 px-3 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Hapus foto profil dan gunakan avatar inisial otomatis"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Hapus
                    </Button>
                  )}
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) =>
                          setProfileData({ ...profileData, name: e.target.value })
                        }
                        placeholder="Nama lengkap Anda"
                        className="pl-9 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Email (Disabled) */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Alamat Email
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="pl-9 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Email terikat dengan identitas akun dan tidak dapat diubah secara langsung.
                    </p>
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Username <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <AtSign className="w-4 h-4" />
                      </div>
                      <Input
                        id="username"
                        value={profileData.username}
                        onChange={(e) =>
                          setProfileData({ ...profileData, username: e.target.value })
                        }
                        placeholder="Username akun Anda"
                        className="pl-9 focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Username dapat digunakan untuk login multi-credential ke dalam sistem.
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nomor Telepon / WhatsApp
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                        placeholder="081234567890"
                        className="pl-9 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Digunakan untuk kontak konfirmasi dan koordinasi teknis.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan Profil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Role & Access Info Card (Tailored per Role) */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg font-semibold flex items-center text-gray-800">
                {roleInfo.icon}
                <span className="ml-2">Peran & Wewenang Akses</span>
              </CardTitle>
              <CardDescription>
                Ringkasan modul dan hak akses aktif untuk peran Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className={`p-4 rounded-xl border ${roleInfo.cardBg} space-y-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{roleInfo.title}</span>
                    <Badge className={`capitalize border ${roleInfo.badgeStyle}`}>
                      {user?.role || 'User'}
                    </Badge>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    Akses Aktif
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{roleInfo.description}</p>
                <div className="pt-2 border-t border-gray-200/60">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Kemampuan & Wewenang Akses:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {roleInfo.capabilities.map((cap, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-2 text-xs text-gray-700 bg-white/80 p-2 rounded-lg border border-gray-200/60"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center sm:text-right">
                Butuh penyesuaian hak akses atau pergantian peran? Silakan hubungi Superadmin.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 2: KEAMANAN & PASSWORD ==================== */}
        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-lg font-semibold flex items-center text-gray-800">
                <KeyRound className="w-5 h-5 mr-2 text-amber-600" />
                Ubah Kata Sandi
              </CardTitle>
              <CardDescription>
                Pastikan akun Anda tetap aman dengan memperbarui kata sandi secara berkala.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-5">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700">
                    Password Saat Ini <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      placeholder="Masukkan password saat ini"
                      className="pr-10 focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      Password Baru <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        placeholder="Minimal 8 karakter"
                        className="pr-10 focus:ring-2 focus:ring-amber-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Konfirmasi Password Baru <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        placeholder="Ulangi password baru"
                        className="pr-10 focus:ring-2 focus:ring-amber-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Requirements Guide */}
                <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 space-y-1">
                  <p className="font-semibold flex items-center text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Ketentuan Password Aman:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800/80 pl-1">
                    <li>Minimal 8 karakter</li>
                    <li>Kombinasi huruf besar, huruf kecil, dan angka disarankan</li>
                    <li>Jangan menggunakan password yang sama dengan akun lain</li>
                  </ul>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white min-w-[160px]"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Perbarui...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Perbarui Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 3: TAMPILAN & TEMA ==================== */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="shadow-sm border-gray-200 dark:border-gray-800 dark:bg-gray-900">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
              <CardTitle className="text-lg font-semibold flex items-center text-gray-800 dark:text-gray-100">
                <Palette className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                Preferensi Tampilan & Tema
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Pilih tema tampilan antarmuka sistem sesuai kenyamanan visual Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-5 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-40 ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 rounded-lg bg-amber-100 text-amber-600">
                      <Sun className="w-5 h-5" />
                    </div>
                    {theme === 'light' && (
                      <span className="p-1 rounded-full bg-indigo-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Mode Terang</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tampilan bersih dengan latar belakang cerah.
                    </p>
                  </div>
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-5 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-40 ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                      <Moon className="w-5 h-5" />
                    </div>
                    {theme === 'dark' && (
                      <span className="p-1 rounded-full bg-indigo-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Mode Gelap</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Mengurangi silau dan nyaman di mata saat minim cahaya.
                    </p>
                  </div>
                </button>

                {/* System Mode */}
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`p-5 rounded-xl border-2 text-left transition-all flex flex-col justify-between h-40 ${
                    theme === 'system'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      <Laptop className="w-5 h-5" />
                    </div>
                    {theme === 'system' && (
                      <span className="p-1 rounded-full bg-indigo-600 text-white">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Sesuai Sistem</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Menyesuaikan otomatis dengan tema perangkat Anda.
                    </p>
                  </div>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <Sun className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                  <p className="font-semibold mb-0.5">Akses Cepat di Navbar</p>
                  <p className="text-indigo-700 dark:text-indigo-300">
                    Anda juga dapat mengganti tema secara instan kapan saja melalui tombol ikon Matahari/Bulan yang ada di pojok kanan atas Navbar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
