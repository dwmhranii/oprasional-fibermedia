import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Radio,
  UserCheck,
  Wifi,
  WifiOff,
  Inbox,
  ChevronDown,
  Palette,
  Sun,
  Moon,
  Check,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  onOpenOutbox: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenOutbox }) => {
  const {
    currentUser,
    setCurrentUser,
    logout,
    allUsers,
    isOnline,
    setIsOnline,
    offlineQueue,
    isTeamReady,
    teams,
    themeMode,
    setThemeMode,
    accentPreset,
    setAccentPreset,
    accentConfig,
    allAccentPresets,
  } = useApp();

  const [timeStr, setTimeStr] = useState<string>('');
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);

  // Live WIB clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      }).format(now);
      setTimeStr(`${formatted} WIB`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate ready teams
  const readyTeamsCount = teams.filter((t) => isTeamReady(t.id).isReady).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[#050C1B]/95 backdrop-blur-md border-b border-blue-900/50 text-white shadow-lg">
      {/* Zone 1: Brand Wordmark with Optical Accent */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-950 font-bold shadow-md"
          style={{
            background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
            boxShadow: `0 0 14px ${accentConfig.glowRgba}`,
          }}
        >
          <Radio className="w-4 h-4 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <a
              href="/"
              className="text-sm sm:text-base font-extrabold tracking-wider text-white hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              FIBERMEDIA
            </a>
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border"
              style={{
                color: accentConfig.secondaryHex,
                borderColor: `${accentConfig.primaryHex}55`,
                backgroundColor: `${accentConfig.primaryHex}18`,
              }}
            >
              LAPANGAN
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5">
            {timeStr || 'WIB'}
          </span>
        </div>
      </div>

      {/* Zone 2: Contextual Info (Desktop/Tablet) */}
      <div className="hidden md:flex items-center gap-3 text-xs text-slate-300 font-mono">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1730] border border-blue-900/60">
          <span className="font-semibold" style={{ color: accentConfig.secondaryHex }}>
            {timeStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B1730] border border-blue-900/60">
          <span className="text-slate-400 text-[11px]">Tim Siap:</span>
          <span className="text-emerald-400 font-bold tabular-nums">
            {readyTeamsCount}/{teams.length}
          </span>
        </div>
      </div>

      {/* Zone 3: Theme Picker, Network Toggle, Outbox, & Role Switcher */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Theme & 5 ISP Color Presets Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu);
              setShowRoleMenu(false);
            }}
            className="flex items-center gap-1 h-8 px-2 rounded-lg bg-[#0C1933] border border-blue-800/70 text-slate-200 hover:bg-[#122449] transition text-xs cursor-pointer"
            title="Pengaturan Tema Dark/Day & 5 Warna ISP"
            aria-label="Pengaturan Tema"
          >
            <Palette className="w-3.5 h-3.5" style={{ color: accentConfig.secondaryHex }} />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accentConfig.primaryHex }}
            />
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#081329] border border-blue-800/80 p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs space-y-3">
              {/* Mode Toggle: Dark vs Day */}
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mode Layar (Dark / Day)
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#050C1B] border border-blue-900/60">
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-blue-950 text-white border border-blue-700/70 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dark ISP</span>
                  </button>
                  <button
                    onClick={() => setThemeMode('day')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                      themeMode === 'day'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Day Mode</span>
                  </button>
                </div>
              </div>

              {/* 5 Color Presets */}
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  5 Warna Aksen Telemetri ISP
                </span>
                <div className="space-y-1">
                  {allAccentPresets.map((preset) => {
                    const isSelected = accentPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setAccentPreset(preset.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#102347] border-blue-500/60 text-white'
                            : 'bg-[#0B1730]/60 border-blue-950/60 text-slate-300 hover:bg-[#102040]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full shrink-0 border border-white/20 shadow-xs"
                            style={{
                              background: `linear-gradient(135deg, ${preset.primaryHex}, ${preset.secondaryHex})`,
                            }}
                          />
                          <div>
                            <p className="font-bold text-xs text-white leading-tight">
                              {preset.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{preset.subtitle}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check
                            className="w-4 h-4 shrink-0"
                            style={{ color: preset.secondaryHex }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Offline Toggle Simulation */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center justify-center h-8 w-8 rounded-lg border transition cursor-pointer ${
            isOnline
              ? 'border-blue-800/70 bg-[#0C1933] text-emerald-400 hover:bg-[#122449]'
              : 'border-amber-500/70 bg-amber-500/20 text-amber-300'
          }`}
          title={isOnline ? 'Online (Klik untuk uji offline outbox)' : 'Offline (Klik untuk online)'}
          aria-label={isOnline ? 'Jaringan Online' : 'Jaringan Offline'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
        </button>

        {/* Outbox Badge */}
        {offlineQueue.length > 0 && (
          <button
            onClick={onOpenOutbox}
            className="relative flex items-center justify-center h-8 px-2 rounded-lg bg-[#0C1933] border border-cyan-500/50 text-cyan-300 hover:bg-[#122449] transition text-xs font-mono font-bold cursor-pointer"
            title="Antrean Offline Outbox"
          >
            <Inbox className="w-3.5 h-3.5 mr-1" />
            <span>{offlineQueue.length}</span>
          </button>
        )}

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Mode Layar (Day / Dark Mode 1-Click Toggle) */}
        <button
          onClick={() => setThemeMode(themeMode === 'dark' ? 'day' : 'dark')}
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-blue-800/70 bg-[#0C1933] text-slate-200 hover:bg-[#122449] transition cursor-pointer"
          title={themeMode === 'dark' ? 'Ganti ke Day Mode (Terang)' : 'Ganti ke Dark Mode (Gelap)'}
          aria-label="Mode Layar Day atau Dark"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* User Profile & Logout Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRoleMenu(!showRoleMenu);
              setShowThemeMenu(false);
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-[#0C1933] border border-blue-800/70 text-slate-100 hover:bg-[#122449] transition text-xs cursor-pointer font-semibold"
            aria-label="Menu Pengguna PWA"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: accentConfig.secondaryHex }}
            />
            <span className="max-w-[90px] sm:max-w-[130px] truncate">
              {currentUser.name.split(' ')[0]} ({currentUser.role})
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#081329] border border-blue-800/80 p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs space-y-3">
              {/* User Identity Card */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-blue-900/60">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-xl object-cover border border-blue-500/50 shrink-0"
                />
                <div className="truncate">
                  <p className="font-extrabold text-white truncate text-xs">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-blue-950 text-cyan-300 border border-blue-800/60">
                    {currentUser.role} {currentUser.team_name ? `· ${currentUser.team_name}` : ''}
                  </span>
                </div>
              </div>

              {/* Day / Dark Mode Switcher in Menu */}
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Pengaturan Mode Tampilan
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#050C1B] border border-blue-900/60">
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-blue-950 text-white border border-blue-700/70 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setThemeMode('day')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                      themeMode === 'day'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Day</span>
                  </button>
                </div>
              </div>

              {/* Device Binding Info */}
              <div className="text-[10px] font-mono text-slate-400 pt-1 border-t border-blue-900/60 space-y-0.5">
                <p>ID Perangkat: #{currentUser.device_uuid || 'DEV-PWA-OK'}</p>
                <p className="text-emerald-400">Sesi Sanksi: 12 Jam Aktif</p>
              </div>

              {/* Logout Button */}
              <div className="pt-2 border-t border-blue-900/60">
                <button
                  onClick={() => {
                    setShowRoleMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
                >
                  <span className="font-extrabold">Keluar Akun PWA</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
