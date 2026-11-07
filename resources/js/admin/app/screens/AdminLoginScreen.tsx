import React, { useState } from 'react';
import {
  BrandLogo,
  Button,
  Input,
  FormField,
  Checkbox,
} from '@shared/ui';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Smartphone,
  Laptop,
  CheckCircle2,
  HardHat,
  Radio,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export interface AdminLoginScreenProps {
  onLoginSuccess?: (role: string) => void;
  className?: string;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onLoginSuccess,
  className = '',
}) => {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Optional router & auth integration
  let auth: ReturnType<typeof useAuth> | null = null;
  try {
    auth = useAuth();
  } catch {
    auth = null;
  }

  let navigate: ReturnType<typeof useNavigate> | null = null;
  let location: ReturnType<typeof useLocation> | null = null;
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch {
    navigate = null;
    location = null;
  }

  // Akun cepat untuk pengujian multi-peran
  const demoAccounts = [
    { label: 'Super Admin', email: 'superadmin@example.com', pass: 'password', role: 'Superadmin (Akses Penuh)', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
    { label: 'Admin CS', email: 'admin@example.com', pass: 'password', role: 'Admin / Operasional Web', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    { label: 'NOC Dispatcher', email: 'noc@example.com', pass: 'password', role: 'NOC / Dispatcher Web', badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
    { label: 'Teknisi Lapangan', email: 'teknisi.a1@fibermedia.test', pass: 'password', role: 'Teknisi (Aplikasi PWA)', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    { label: 'Staf Sales', email: 'sales@example.com', pass: 'password', role: 'Sales (Aplikasi PWA)', badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200 dark:border-sky-800' },
    { label: 'Field Collector', email: 'collector@example.com', pass: 'password', role: 'Kolektor (Aplikasi PWA)', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  ];

  const handleSelectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setLoginInput(acc.email);
    setPassword(acc.pass);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (targetPortal: 'admin' | 'pwa') => {
    if (targetPortal === 'pwa') {
      const pwaUrl = loginInput.trim() ? `/pwa?login=${encodeURIComponent(loginInput.trim())}` : '/pwa';
      window.location.href = pwaUrl;
      return;
    }

    if (!loginInput.trim() || !password) {
      setErrorMessage('Email, username, atau nomor telepon serta kata sandi wajib diisi.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    if (auth) {
      try {
        const result = await auth.login(loginInput.trim(), password, rememberMe);
        if (!result.success) {
          setErrorMessage(result.error || 'Kredensial login tidak sesuai atau akun tidak aktif.');
          setIsLoading(false);
          return;
        }

        const loggedUser = auth.user;
        const role = (loggedUser?.role || '').toLowerCase();
        const isFieldRole = role === 'teknisi' || role === 'sales' || role === 'collector';

        setIsLoading(false);

        if (isFieldRole) {
          window.location.href = `/pwa?login=${encodeURIComponent(loginInput.trim())}`;
          return;
        }

        if (onLoginSuccess) {
          onLoginSuccess(loggedUser?.role || 'Superadmin');
        } else if (navigate) {
          const from = location?.state?.from?.pathname || '/dashboard';
          navigate(from, { replace: true });
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Terjadi kesalahan sistem saat memproses login.');
        setIsLoading(false);
      }
    } else {
      setTimeout(() => {
        setIsLoading(false);
        if (targetPortal === 'pwa') {
          window.location.href = '/pwa';
        } else if (onLoginSuccess) {
          onLoginSuccess('Superadmin');
        }
      }, 500);
    }
  };

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 bg-background overflow-hidden ${className}`}>
      {/* Optical Topology Node Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="topologyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="85%" cy="15%" r="300" fill="url(#topologyGlow)" />
          <circle cx="15%" cy="85%" r="250" fill="url(#topologyGlow)" />
          <g stroke="#0891b2" strokeWidth="1" strokeDasharray="5,5">
            <line x1="100" y1="120" x2="350" y2="280" />
            <line x1="350" y1="280" x2="620" y2="190" />
            <line x1="620" y1="190" x2="880" y2="340" />
            <line x1="880" y1="340" x2="1100" y2="200" />
            <line x1="350" y1="280" x2="420" y2="550" />
          </g>
          <circle cx="100" cy="120" r="4" fill="#22d3ee" />
          <circle cx="350" cy="280" r="6" fill="#0891b2" />
          <circle cx="620" cy="190" r="5" fill="#22d3ee" />
          <circle cx="880" cy="340" r="6" fill="#06b6d4" />
          <circle cx="1100" cy="200" r="4" fill="#22d3ee" />
          <circle cx="420" cy="550" r="5" fill="#0e7490" />
        </svg>
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-5 z-10 backdrop-blur-md">
        <div className="space-y-1.5 text-center flex flex-col items-center">
          <BrandLogo variant="admin" size="lg" />
          <h2 className="text-xl font-bold tracking-tight text-foreground pt-2">
            Portal Masuk Fibermedia-Ops
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            Pilih portal tujuan Anda: Web Administrator (NOC &amp; Manajemen) atau PWA Lapangan (Teknisi &amp; Sales).
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in-0 duration-150"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLoginSubmit('admin');
          }}
          className="space-y-4"
        >
          <FormField
            label="Email / Username / No. Telepon"
            required
            density="comfortable"
          >
            <Input
              type="text"
              value={loginInput}
              onChange={(e) => {
                setLoginInput(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="superadmin / admin / noc / teknisi / sales"
              leftIcon={<User className="w-4 h-4" />}
              density="comfortable"
              autoFocus
            />
          </FormField>

          <FormField
            label="Kata Sandi"
            required
            density="comfortable"
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Masukkan kata sandi..."
              leftIcon={<Lock className="w-4 h-4" />}
              density="comfortable"
            />
          </FormField>

          <div className="flex items-center justify-between pt-1">
            <Checkbox
              label="Ingat sesi masuk ini"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              density="compact"
            />
            <button
              type="button"
              className="text-xs text-primary hover:underline font-medium"
              onClick={() => alert('Silakan hubungi Superadmin NOC untuk mereset kata sandi.')}
            >
              Lupa sandi?
            </button>
          </div>

          {/* DUA TOMBOL MASUK: ATAS BAWAH (STACKED VERTICALLY) */}
          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              density="comfortable"
              isLoading={isLoading}
              className="w-full flex items-center justify-center gap-2 shadow-md py-3 text-sm font-bold"
              leftIcon={<Laptop className="w-4 h-4" />}
            >
              Masuk Administrator
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              density="comfortable"
              disabled={isLoading}
              onClick={() => handleLoginSubmit('pwa')}
              className="w-full border-sky-500/40 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold flex items-center justify-center gap-2 py-3 text-sm"
              leftIcon={<Smartphone className="w-4 h-4 text-sky-500" />}
            >
              Masuk PWA Lapangan
            </Button>
          </div>
        </form>

        {/* Quick Demo Account Selector (Memudahkan Pengujian Seluruh Peran) */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Pilih Akun Uji Coba Cepat:
            </span>
            <span className="text-[10px] text-muted-foreground">Sandi: password</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleSelectDemoAccount(acc)}
                className={`text-left p-1.5 rounded-lg border text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98] ${acc.badge} ${
                  loginInput === acc.email ? 'ring-2 ring-primary font-bold' : 'opacity-85 hover:opacity-100'
                }`}
                title={`${acc.email} (${acc.role})`}
              >
                <div className="truncate font-semibold">{acc.label}</div>
                <div className="text-[9px] opacity-75 truncate">{acc.email.split('@')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Sesi aman terisolasi</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Radio className="w-3 h-3 text-cyan-500 animate-pulse" />
            <span>Node: Bululawang FTTH</span>
          </div>
        </div>
      </div>
    </div>
  );
};
