import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Radio,
  User,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Zap,
  MapPin,
  Camera,
} from 'lucide-react';

export const PwaLoginScreen: React.FC = () => {
  const { login, deviceUuid, accentConfig, allUsers, showToast } = useApp();

  const [loginInput, setLoginInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Prefill dari query string ?login= jika dialihkan dari portal login web
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const prefillLogin = params.get('login');
      if (prefillLogin) {
        setLoginInput(prefillLogin);
      }
    } catch {
      // Abaikan jika tidak didukung
    }
  }, []);

  const demoFieldAccounts = [
    {
      label: 'Teknisi A1',
      role: 'Teknisi Lapangan',
      email: 'teknisi.a1@fibermedia.test',
      pass: 'password',
      badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20',
    },
    {
      label: 'Staf Sales',
      role: 'Sales Lapangan',
      email: 'sales@example.com',
      pass: 'password',
      badge: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20',
    },
    {
      label: 'Field Collector',
      role: 'Penagihan Lapangan',
      email: 'collector@example.com',
      pass: 'password',
      badge: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20',
    },
    {
      label: 'NOC Dispatcher',
      role: 'Monitoring Jaringan',
      email: 'noc@example.com',
      pass: 'password',
      badge: 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20',
    },
  ];

  const handleSelectDemo = (acc: typeof demoFieldAccounts[0]) => {
    setLoginInput(acc.email);
    setPassword(acc.pass);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginInput.trim() || !password) {
      setErrorMessage('Email atau username serta kata sandi wajib diisi.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(loginInput.trim(), password, rememberMe);
      if (!res.success) {
        setErrorMessage(res.error || 'Kredensial login tidak sesuai atau akun tidak aktif.');
      } else {
        showToast('Login berhasil. Sesi PWA aktif.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat memproses login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#061126] to-[#040A18] text-slate-100 flex flex-col justify-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background Optical Node Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="fieldGlow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor={accentConfig.primaryHex} stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="20%" r="280" fill="url(#fieldGlow)" />
          <g stroke="#0369a1" strokeWidth="1" strokeDasharray="4,6" opacity="0.4">
            <line x1="50" y1="120" x2="200" y2="280" />
            <line x1="200" y1="280" x2="380" y2="200" />
            <line x1="380" y1="200" x2="520" y2="350" />
          </g>
        </svg>
      </div>

      <div className="max-w-md w-full mx-auto relative z-10 space-y-5">
        {/* Brand Wordmark & PWA Header */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-xl border mb-1"
            style={{
              background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
              boxShadow: `0 0 24px ${accentConfig.glowRgba}`,
              borderColor: `${accentConfig.secondaryHex}55`,
            }}
          >
            <Radio className="w-7 h-7 text-slate-950 stroke-[2.5] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>FIBERMEDIA</span>
              <span
                className="text-xs px-2 py-0.5 rounded-md font-mono font-bold tracking-wider uppercase border"
                style={{
                  color: accentConfig.secondaryHex,
                  backgroundColor: `${accentConfig.primaryHex}20`,
                  borderColor: `${accentConfig.primaryHex}60`,
                }}
              >
                FIELD PWA
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Aplikasi Operasional Lapangan
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-[#08152E]/90 border border-blue-900/60 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-white">
              Masuk ke Akun
            </h2>
            <p className="text-xs text-slate-400">
              Gunakan email atau nama pengguna yang telah terdaftar.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in-0 duration-150"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email atau Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="teknisi.a1@fibermedia.test atau username"
                  className="w-full bg-[#050C1B]/80 border border-blue-900/70 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#050C1B]/80 border border-blue-900/70 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] sm:text-xs">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-blue-900 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                />
                <span>Ingat sesi perangkat ini</span>
              </label>
              <span className="text-[10px] text-slate-500">Maks. 2 perangkat</span>
            </div>

            {/* DUA TOMBOL MASUK: ATAS BAWAH (STACKED VERTICALLY) */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all disabled:opacity-50 cursor-pointer text-slate-950"
                style={{
                  background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                  boxShadow: `0 8px 20px -4px ${accentConfig.glowRgba}`,
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Sesi Lapangan...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke PWA</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => (window.location.href = '/login')}
                className="w-full bg-[#050C1B]/90 hover:bg-[#091530] border border-blue-800/80 text-slate-300 hover:text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition cursor-pointer"
              >
                <Laptop className="w-4 h-4 text-sky-400" />
                <span>Masuk Portal Web Administrator</span>
              </button>
            </div>
          </form>

          {/* Quick Demo Selector for Field Operations */}
          <div className="pt-3 border-t border-blue-900/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Akun Uji Lapangan Cepat:
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Sandi: password</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoFieldAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className={`text-left p-2 rounded-xl border text-[11px] transition cursor-pointer ${acc.badge} ${
                    loginInput === acc.email ? 'ring-1 ring-cyan-400 font-bold' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="font-semibold truncate">{acc.label}</div>
                  <div className="text-[9px] opacity-75 truncate">{acc.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Device Binding & Node Info (PRD Security) */}
          <div className="pt-2 border-t border-blue-900/60 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">
                ID Perangkat: <span className="font-mono text-slate-300">{deviceUuid.substring(0, 16)}...</span>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sanctum 1 Sesi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
