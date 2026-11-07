import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Input } from '../ui/input';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Clock,
  Calendar,
  Loader2,
  Activity,
  AlertCircle,
  RefreshCw,
  Edit,
  KeyRound,
  Ban,
  CheckCircle2,
  Sparkles,
  Lock,
  Copy,
  Check,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { apiClient, ApiError } from '../../lib/api';
import { userToFrontend } from '../../lib/mappers';
import { formatDate } from '../../lib/formatters';
import { toast } from 'sonner';

export const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'sales',
    status: 'active',
  });

  const [passwordForm, setPasswordForm] = useState({
    password: '',
    password_confirmation: '',
  });

  // Query specific user
  const {
    data: user,
    isLoading: isUserLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<any>(`/users/${id}`);
        return userToFrontend(response);
      } catch {
        const response = await apiClient.get<any>('/users?per_page=100');
        const list = (response.data || []).map(userToFrontend);
        const matched = list.find((u: any) => String(u.id) === String(id));
        if (!matched) throw new Error('Pengguna tidak ditemukan.');
        return matched;
      }
    },
    enabled: !!id,
  });

  // Query activity history for this user with fail-safe try-catch
  const { data: auditLogs = [], isLoading: isAuditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['auditLogs', 'user', id],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>(`/audit-logs?causer_id=${id}`);
        return res.data || res.items || (Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn('Failed to fetch user audit logs:', err);
        return [];
      }
    },
    enabled: !!id,
  });

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} disalin ke clipboard`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleOpenEditModal = () => {
    if (!user) return;
    setEditForm({
      name: user.nama_lengkap || user.name || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'sales',
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await apiClient.put(`/users/${user.id}`, editForm);
      toast.success(`Profil '${editForm.name}' berhasil diperbarui`);
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      refetch();
    } catch (err: any) {
      toast.error('Gagal memperbarui profil pengguna', {
        description: err?.message || 'Periksa kembali kelengkapan data',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (passwordForm.password.length < 8) {
      toast.error('Password minimal 8 karakter');
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/users/${user.id}/reset-password`, {
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
      });
      toast.success(`Password untuk '@${user.username}' berhasil diperbarui!`);
      setShowPasswordModal(false);
      setPasswordForm({ password: '', password_confirmation: '' });
    } catch (err: any) {
      toast.error('Gagal mereset password', {
        description: err?.message || 'Terjadi kesalahan pada server',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.patch(`/users/${user.id}/status`, { status: newStatus });
      toast.success(
        `Status akun @${user.username} diubah menjadi ${newStatus === 'active' ? 'AKTIF' : 'NONAKTIF'}`
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
      refetch();
    } catch (err: any) {
      toast.error('Gagal mengubah status pengguna');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; bg: string; text: string }> = {
      sales: { label: 'Sales Staf', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
      admin: { label: 'Admin Provisioning', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
      teknisi: { label: 'Teknisi Lapangan', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
      superadmin: { label: 'Superadmin', bg: 'bg-red-50 border-red-200', text: 'text-red-700' },
    };
    const config = roleConfig[role] || { label: role || 'Staf', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.text}`}>
        <Shield className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const isAct = status === 'active';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isAct ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
        <span className={`w-2 h-2 rounded-full ${isAct ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
        {isAct ? 'Active' : 'Nonaktif'}
      </span>
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'US';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 text-sm font-medium">Memuat profil staf pengguna...</p>
      </div>
    );
  }

  if (isError || !user) {
    if (error instanceof ApiError && error.status === 403) {
      return <Navigate to="/403" replace />;
    }
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/access/users')} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar Staf
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Profil Pengguna</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Data pengguna tidak ditemukan di server.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header Card Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/access/users')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-white/20">
              {getInitials(user.nama_lengkap || user.name || user.username)}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {user.nama_lengkap || user.name || 'Profil Pengguna'}
                </h1>
                {getStatusBadge(user.status)}
                {getRoleBadge(user.role)}
              </div>
              <p className="text-sm text-blue-200 mt-1 flex items-center gap-2 font-mono">
                <span>@{user.username}</span>
                <span className="text-blue-400">•</span>
                <span className="text-xs text-blue-300 font-sans">ID Staf: #{user.id}</span>
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleOpenEditModal}
              className="bg-white text-gray-900 hover:bg-blue-50 text-xs font-semibold shadow-sm"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profil
            </Button>

            <Button
              onClick={() => setShowPasswordModal(true)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs font-semibold"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" /> Reset Password
            </Button>

            <Button
              onClick={handleToggleStatus}
              variant="outline"
              className={`text-xs font-semibold border-white/20 ${
                user.status === 'active'
                  ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-green-500/20 text-green-200 hover:bg-green-500/30'
              }`}
            >
              {user.status === 'active' ? (
                <>
                  <Ban className="w-3.5 h-3.5 mr-1.5" /> Nonaktifkan
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Aktifkan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Contact & Profile Details */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Informasi Kontak & Peran
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Detail identitas staf dan aksesibilitas akun pengguna
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Nama Lengkap
                  </p>
                  <p className="font-bold text-gray-900 text-sm mt-1">
                    {user.nama_lengkap || user.name || '-'}
                  </p>
                </div>

                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Peran Akses Sistem
                  </p>
                  <div className="mt-1">{getRoleBadge(user.role)}</div>
                </div>

                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Alamat Email
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      {user.email || '-'}
                    </p>
                    {user.email && (
                      <button
                        onClick={() => handleCopy(user.email, 'Email')}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Salin Email"
                      >
                        {copiedText === user.email ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Nomor Telepon
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="font-semibold text-gray-800 text-xs flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      {user.phone || '-'}
                    </p>
                    {user.phone && user.phone !== '-' && (
                      <button
                        onClick={() => handleCopy(user.phone, 'Nomor Telepon')}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Salin No Telepon"
                      >
                        {copiedText === user.phone ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Permissions Matrix */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Spesifikasi Izin Akses (Permissions)
              </CardTitle>
              <CardDescription className="text-xs text-gray-500">
                Hak akses khusus yang terdaftar pada akun staf ini
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {user.permissions && user.permissions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.permissions.map((perm: string) => (
                    <Badge
                      key={perm}
                      variant="outline"
                      className="font-mono text-xs border-indigo-200 text-indigo-700 bg-indigo-50/60 py-1 px-2.5 rounded-lg"
                    >
                      ✓ {perm}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Izin Default Diterapkan ({user.role?.toUpperCase()})</p>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                      Staf ini menggunakan hak akses bawaan untuk peran{' '}
                      <span className="font-semibold">{user.role}</span>. Tidak ada izin khusus yang dikesampingkan secara individual.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3) - Audit Trail */}
        <div className="space-y-6">
          <Card className="border-gray-200 shadow-sm h-full flex flex-col">
            <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Riwayat Aktivitas Staf
                </CardTitle>
                <CardDescription className="text-xs text-gray-500 mt-0.5">
                  Jejak audit pekerjaan terbaru
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchAudit()}
                disabled={isAuditLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>

            <CardContent className="p-5 flex-1 overflow-y-auto max-h-[480px]">
              {isAuditLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  <p className="text-xs text-gray-400">Memuat log aktivitas...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-gray-700">Belum ada riwayat aktivitas</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Staf ini belum memiliki log pengerjaan tugas atau perubahan data tercatat.
                  </p>
                </div>
              ) : (
                <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {auditLogs.map((log: any, idx: number) => (
                    <div key={log.id || idx} className="relative text-xs group">
                      <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-white bg-blue-600 shadow-xs"></div>
                      <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                        <p className="font-bold text-gray-800 leading-snug">
                          {log.description || log.action || 'Aktivitas Staf'}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {formatDate(log.created_at)}
                          </span>
                          {log.event && (
                            <span className="font-mono uppercase text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                              {log.event}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Edit User */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-200" />
                  Edit Profil Staf
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">Perbarui data informasi pengguna</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-blue-100 hover:text-white p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nama Lengkap</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-9"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Username</label>
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="h-9 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Email</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Telepon</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Peran Akses (Role)</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sales">Sales Staf</option>
                    <option value="admin">Admin Provisioning</option>
                    <option value="teknisi">Teknisi Lapangan</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active (Aktif)</option>
                    <option value="inactive">Inactive (Nonaktif)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-semibold px-4"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-200" />
                  Reset Password Staf
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">Ubah kata sandi akun @{user.username}</p>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-amber-100 hover:text-white p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Password Baru</label>
                <Input
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  className="h-9"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Konfirmasi Password Baru</label>
                <Input
                  type="password"
                  placeholder="Ulangi password baru"
                  value={passwordForm.password_confirmation}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })
                  }
                  className="h-9"
                  required
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                  className="h-9 text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs font-semibold px-4"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                  Update Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
