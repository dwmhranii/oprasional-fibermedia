import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../lib/authService';
import { API_BASE_URL } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
  HelpCircle,
  XCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '../common/ThemeToggle';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Failure & UI feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState<'credentials' | 'inactive' | 'network' | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorType(null);
    setLoading(true);

    const result = await login(email, password, rememberMe);

    if (!result.success) {
      const rawError = result.error || '';
      
      // Determine contextual failure cause for intuitive guidance
      if (rawError.includes('Sesi') || rawError.includes('koneksi') || rawError.includes('Failed to fetch')) {
        setErrorType('network');
        setErrorMsg('Gagal menyambung ke server API. Pastikan koneksi internet atau server backend aktif.');
      } else if (rawError.includes('nonaktif') || rawError.includes('suspended')) {
        setErrorType('inactive');
        setErrorMsg('Akun Anda saat ini tidak aktif atau dinonaktifkan. Silakan hubungi Administrator.');
      } else {
        setErrorType('credentials');
        setErrorMsg('Email, username, nomor telepon, atau kata sandi tidak sesuai.');
      }

      // Trigger visual shake feedback
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Masukkan alamat email Anda');
      return;
    }

    setForgotLoading(true);
    try {
      // Call /api/forgot-password endpoint
      await authService.forgotPassword(forgotEmail.trim());
      setForgotSuccess(true);
      toast.success('Link reset kata sandi telah dikirim ke email!');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengirim email reset. Pastikan email terdaftar.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 transition-colors relative">
      {/* Day / Night Slider Switch Toggle on Login Screen */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50/50 dark:bg-slate-900/60">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/logo-fibermedia.png"
              alt="Fibermedia Play Logo"
              className="h-14 object-contain"
            />
          </div>

          {/* Welcome Text */}
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Selamat Datang
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
              Masuk ke akun staf & administrator Fibermedia Play
            </p>
          </div>

          {/* Intuitive Error Banner */}
          {errorMsg && (
            <div
              className={`p-4 rounded-xl border transition-all animate-in fade-in zoom-in-95 duration-200 ${
                errorType === 'credentials'
                  ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
                  : errorType === 'network'
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                  : 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-bold text-xs leading-snug">{errorMsg}</p>

                  {/* Contextual Actionable Tips for User */}
                  {errorType === 'credentials' && (
                    <div className="text-[11px] bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-red-100 dark:border-red-900/40 space-y-1.5 text-gray-700 dark:text-slate-300">
                      <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-red-500" />
                        Petunjuk Penyelesaian:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-slate-400">
                        <li>Periksa kembali huruf besar/kecil (Caps Lock aktif?).</li>
                        <li>Pastikan penulisan email, username, atau nomor telepon sudah benar.</li>
                        <li>
                          Lupa kata sandi?{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setForgotEmail(email);
                              setShowForgotModal(true);
                            }}
                            className="text-blue-600 dark:text-indigo-400 font-bold underline hover:text-blue-800 dark:hover:text-indigo-300"
                          >
                            Reset di sini
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}

                  {errorType === 'network' && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
                      Pastikan API Server backend Laravel di <code className="font-mono bg-amber-100 dark:bg-amber-950 px-1 rounded text-amber-900 dark:text-amber-300">{API_BASE_URL}</code> sedang berjalan.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Form Container with Shake Animation */}
          <form
            onSubmit={handleSubmit}
            className={`space-y-5 bg-white dark:bg-slate-900/90 p-7 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm dark:shadow-2xl transition-all ${
              isShaking ? 'animate-shake border-red-300 ring-2 ring-red-100 dark:ring-red-900/30' : ''
            }`}
          >
            {/* Email / Username / Phone Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-gray-700 dark:text-slate-200">
                Email / Username / No. Telepon <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 dark:text-slate-500" />
                <Input
                  id="email"
                  type="text"
                  placeholder="Email, username, atau No. WhatsApp"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  required
                  className={`h-11 pl-10 text-xs transition-all dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500 ${
                    errorType === 'credentials' ? 'border-red-500 bg-red-50/20 focus:ring-red-500' : ''
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold text-gray-700 dark:text-slate-200">
                  Kata Sandi <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-blue-600 dark:text-indigo-400 hover:text-blue-800 dark:hover:text-indigo-300 font-semibold hover:underline focus:outline-none"
                >
                  Lupa kata sandi?
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400 dark:text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan kata sandi Anda"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  required
                  className={`h-11 pl-10 pr-10 text-xs transition-all dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500 ${
                    errorType === 'credentials' ? 'border-red-500 bg-red-50/20 focus:ring-red-500' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 focus:outline-none transition-colors"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label
                htmlFor="remember"
                className="text-xs text-gray-600 dark:text-slate-300 cursor-pointer select-none font-medium"
              >
                Ingat sesi login saya di perangkat ini
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi Akun...
                </>
              ) : (
                'Masuk Ke Sistem'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side - Hero Illustration */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <div className="max-w-lg text-white space-y-6 relative z-10">
          <div className="inline-block bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide text-blue-100 border border-white/20">
            ⚡ Fibermedia Provisioning System API
          </div>
          <h2 className="text-4xl font-black leading-tight">
            Sistem Terintegrasi Layanan Internet High-Speed
          </h2>
          <p className="text-sm opacity-90 leading-relaxed">
            Kelola seluruh alur kerja operasional: Pendaftaran Sales, Validasi Admin, Provisi Mikrotik/BFASS, hingga Penyelesaian Tugas Instalasi Teknisi.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">📊</div>
              <p className="font-bold text-sm">Dashboard Admin</p>
              <p className="text-[11px] opacity-80 mt-0.5">Monitoring real-time pengajuan</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">✅</div>
              <p className="font-bold text-sm">Validasi Otomatis</p>
              <p className="text-[11px] opacity-80 mt-0.5">Verifikasi berkas & GPS</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">🔧</div>
              <p className="font-bold text-sm">Field Technician</p>
              <p className="text-[11px] opacity-80 mt-0.5">Aplikasi tugas & bukti foto</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-1">🚀</div>
              <p className="font-bold text-sm">BFASS Provisioning</p>
              <p className="text-[11px] opacity-80 mt-0.5">Integrasi PPPoE & NAS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Dialog */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-blue-700">
                <KeyRound className="w-5 h-5 text-blue-600" />
                Lupa / Reset Kata Sandi
              </DialogTitle>
              <DialogDescription className="text-xs">
                Masukkan alamat email Anda. Sistem akan mengirimkan instruksi reset kata sandi.
              </DialogDescription>
            </DialogHeader>

            {forgotSuccess ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
                <p className="font-bold text-xs text-green-900">Email Permintaan Reset Telah Dikirim!</p>
                <p className="text-[11px] text-green-700">
                  Silakan periksa kotak masuk (inbox) atau folder spam email Anda untuk petunjuk pemulihan kata sandi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="forgot_email" className="text-xs font-bold text-gray-700">
                    Alamat Email Terdaftar
                  </Label>
                  <Input
                    id="forgot_email"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={forgotLoading}
                    className="h-10 text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotModal(false)}
                className="h-9 text-xs"
              >
                Tutup
              </Button>
              {!forgotSuccess && (
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-semibold"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Mengirim...
                    </>
                  ) : (
                    'Kirim Link Reset'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
