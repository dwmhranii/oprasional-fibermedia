import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Smartphone,
  ShieldCheck,
  Award,
  Users,
  MapPin,
  Database,
  LogOut,
  TrendingUp,
  Palette,
  Sun,
  Moon,
  Check,
} from 'lucide-react';

interface ProfileScreenProps {
  onOpenOutbox: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenOutbox }) => {
  const {
    currentUser,
    logout,
    kpiTeams,
    kpiTeknisi,
    kpiSales,
    currentGps,
    gpsSimulationMode,
    setGpsSimulationMode,
    offlineQueue,
    showToast,
    themeMode,
    setThemeMode,
    accentPreset,
    setAccentPreset,
    accentConfig,
    allAccentPresets,
  } = useApp();

  const isDark = themeMode === 'dark';

  const cardSurfaceClass = isDark
    ? 'bg-[#0B1730]/90 border-blue-900/60 text-slate-100 shadow-lg'
    : 'bg-white border-slate-200 text-slate-900 shadow-xs';

  const subSurfaceClass = isDark
    ? 'bg-[#071022] border-blue-950/80 text-slate-300'
    : 'bg-slate-50 border-slate-200/70 text-slate-700';

  // Lookup role-specific KPI
  const myTechKpi =
    kpiTeknisi.find((k) => k.user_id === currentUser.id) || kpiTeknisi[0];
  const myTeamKpi =
    kpiTeams.find((k) => k.team_id === currentUser.team_id) || kpiTeams[0];
  const mySalesKpi =
    kpiSales.find((k) => k.user_id === currentUser.id) || kpiSales[0];

  const handleLogoutAttempt = () => {
    if (offlineQueue.length > 0) {
      alert(
        `Tidak dapat keluar akun: Masih ada ${offlineQueue.length} data di Antrean Offline (Outbox) yang belum terkirim ke server.`
      );
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin keluar dari sesi PWA ini?')) {
      logout();
      showToast('Sesi PWA telah diakhiri.');
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* User Identity & Registered Device Card */}
      <div
        className="rounded-2xl bg-gradient-to-br from-[#071229] via-[#0B1B3B] to-[#08132B] text-white p-4 border shadow-xl space-y-4"
        style={{
          borderColor: `${accentConfig.primaryHex}55`,
          boxShadow: `0 10px 30px -10px ${accentConfig.glowRgba}`,
        }}
      >
        <div className="flex items-center gap-3.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-14 h-14 rounded-2xl object-cover border-2"
            style={{ borderColor: accentConfig.secondaryHex }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold text-white truncate">
              {currentUser.name}
            </h1>
            <p
              className="text-xs font-bold capitalize"
              style={{ color: accentConfig.secondaryHex }}
            >
              {currentUser.role} {currentUser.team_name ? `· ${currentUser.team_name}` : ''}
            </p>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {currentUser.email} · {currentUser.phone}
            </p>
          </div>
        </div>

        {/* Registered Device Box */}
        <div className="p-3 rounded-xl bg-[#050C1B]/90 border border-blue-900/70 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone
                className="w-4 h-4 shrink-0"
                style={{ color: accentConfig.secondaryHex }}
              />
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">
                  Perangkat Terdaftar
                </span>
                <span className="font-medium text-white">
                  {currentUser.device_model || 'Perangkat Lapangan'}
                </span>
              </div>
            </div>
            <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              Aktif
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ISP THEME & 5-COLOR PRESET CUSTOMIZATION PANEL
         ===================================================================== */}
      <div className={`rounded-2xl p-4 border space-y-3.5 ${cardSurfaceClass}`}>
        <div
          className={`flex items-center justify-between pb-2.5 border-b ${
            isDark ? 'border-blue-900/60' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Palette
              className="w-4 h-4"
              style={{ color: accentConfig.secondaryHex }}
            />
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider">
                Pengaturan Tampilan & Tema ISP
              </h2>
              <p className="text-[11px] text-slate-400">
                Mode Dark / Day & 5 Pilihan Warna Aksen Telemetri
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded uppercase"
            style={{
              backgroundColor: `${accentConfig.primaryHex}22`,
              color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex,
            }}
          >
            {accentConfig.name}
          </span>
        </div>

        {/* Dark vs Day Mode Selector */}
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            1. Mode Pencahayaan Layar
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setThemeMode('dark')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-[#102348] border-cyan-400/60 text-white shadow-sm'
                  : subSurfaceClass
              }`}
            >
              <Moon className="w-4 h-4 text-cyan-400" />
              <span>Dark Blue ISP (Default)</span>
            </button>
            <button
              onClick={() => setThemeMode('day')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                themeMode === 'day'
                  ? 'bg-sky-50 border-sky-500 text-slate-900 shadow-sm'
                  : subSurfaceClass
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Day Mode (Terang)</span>
            </button>
          </div>
        </div>

        {/* 5 Color Presets Selector */}
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            2. Pilih 5 Warna Aksen Identitas Fibermedia
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allAccentPresets.map((preset) => {
              const isSelected = accentPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setAccentPreset(preset.id)}
                  style={
                    isSelected
                      ? {
                          borderColor: preset.primaryHex,
                          boxShadow: `0 0 14px ${preset.glowRgba}`,
                        }
                      : undefined
                  }
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${subSurfaceClass}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full shrink-0 border border-white/30 shadow-xs"
                      style={{
                        background: `linear-gradient(135deg, ${preset.primaryHex}, ${preset.secondaryHex})`,
                      }}
                    />
                    <div>
                      <p className="text-xs font-extrabold leading-tight">
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

      {/* =====================================================================
          KPI SECTION FOR TEKNISI (KPI Individu + KPI Tim Saya)
         ===================================================================== */}
      {currentUser.role === 'teknisi' && (
        <>
          {/* KPI Individu Teknisi */}
          <div className={`rounded-2xl p-4 border space-y-3 ${cardSurfaceClass}`}>
            <div
              className={`flex items-center justify-between pb-2.5 border-b ${
                isDark ? 'border-blue-900/60' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award
                  className="w-4 h-4"
                  style={{ color: accentConfig.secondaryHex }}
                />
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider">
                    KPI Individu Saya (Bulan Ini)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Kehadiran {myTechKpi.present_days}/{myTechKpi.work_days} hari kerja
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span
                  className="text-xl font-extrabold tabular-nums"
                  style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
                >
                  {myTechKpi.total_score}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans font-bold">
                  SKOR PRIBADI
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Kehadiran (Bobot 30%)</span>
                <strong className="text-sm font-mono font-extrabold tabular-nums">
                  {myTechKpi.attendance_rate}%
                </strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Step 2 Selesai (30%)</span>
                <strong className="text-sm font-mono font-extrabold tabular-nums">
                  {myTechKpi.phase2_completion_rate}%
                </strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Validitas Lokasi ≤50m (20%)</span>
                <strong className="text-sm font-mono font-extrabold text-emerald-400 tabular-nums">
                  {myTechKpi.location_validity_rate}%
                </strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Ketepatan Waktu SLA (20%)</span>
                <strong className="text-sm font-mono font-extrabold tabular-nums">
                  {myTechKpi.sla_timeliness_rate}%
                </strong>
              </div>
            </div>
          </div>

          {/* KPI Tim Saya */}
          <div className={`rounded-2xl p-4 border space-y-3 ${cardSurfaceClass}`}>
            <div
              className={`flex items-center justify-between pb-2.5 border-b ${
                isDark ? 'border-blue-900/60' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users
                  className="w-4 h-4"
                  style={{ color: accentConfig.secondaryHex }}
                />
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider">
                    KPI {myTeamKpi.team_name}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Total {myTeamKpi.total_tickets} WO diselesaikan bersama
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-xl font-extrabold text-emerald-400 tabular-nums">
                  {myTeamKpi.total_score}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans font-bold">
                  SKOR TIM
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Ketepatan SLA (30%)</span>
                <strong className="text-sm font-mono font-extrabold tabular-nums">
                  {myTeamKpi.sla_ontime_rate}%
                </strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Repeat Ticket 7h (25%)</span>
                <strong className="text-sm font-mono font-extrabold text-emerald-400 tabular-nums">
                  {myTeamKpi.repeat_ticket_rate}%
                </strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Kualitas Bukti Foto (20%)</span>
                <strong className="text-sm font-mono font-extrabold tabular-nums">
                  {myTeamKpi.proof_quality_rate}%
                </strong>
              </div>
              <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
                <span className="text-[11px] text-slate-400 block">Kepuasan Pelanggan (15%)</span>
                <strong className="text-sm font-mono font-extrabold text-amber-400 tabular-nums">
                  {myTeamKpi.satisfaction_score}/100
                </strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =====================================================================
          KPI SECTION FOR SALES (KPI Sales Saya)
         ===================================================================== */}
      {currentUser.role === 'sales' && (
        <div className={`rounded-2xl p-4 border space-y-3 ${cardSurfaceClass}`}>
          <div
            className={`flex items-center justify-between pb-2.5 border-b ${
              isDark ? 'border-blue-900/60' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp
                className="w-4 h-4"
                style={{ color: accentConfig.secondaryHex }}
              />
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider">
                  KPI Sales Saya (Bulan Ini)
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  Total {mySalesKpi.total_submissions} pengajuan PSB masuk
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span
                className="text-xl font-extrabold tabular-nums"
                style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
              >
                {mySalesKpi.total_score}
              </span>
              <span className="text-[10px] text-slate-400 block font-sans font-bold">
                SKOR SALES
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
              <span className="text-[11px] text-slate-400 block">Konversi Terpasang (30%)</span>
              <strong className="text-sm font-mono font-extrabold text-emerald-400 tabular-nums">
                {mySalesKpi.conversion_rate}%
              </strong>
            </div>
            <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
              <span className="text-[11px] text-slate-400 block">Retensi 3 Bulan (25%)</span>
              <strong className="text-sm font-mono font-extrabold tabular-nums">
                {mySalesKpi.retention_3month_rate}%
              </strong>
            </div>
            <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
              <span className="text-[11px] text-slate-400 block">Bayar Tepat Bulan 1 (20%)</span>
              <strong className="text-sm font-mono font-extrabold tabular-nums">
                {mySalesKpi.ontime_payment_first_month}%
              </strong>
            </div>
            <div className={`p-2.5 rounded-xl border ${subSurfaceClass}`}>
              <span className="text-[11px] text-slate-400 block">Kualitas Data Valid (15%)</span>
              <strong className="text-sm font-mono font-extrabold tabular-nums">
                {mySalesKpi.data_quality_rate}%
              </strong>
            </div>
            <div className={`p-2.5 rounded-xl border col-span-2 flex items-center justify-between ${subSurfaceClass}`}>
              <span className="text-[11px] text-slate-400">Kehadiran Harian (Bobot 10%)</span>
              <strong className="text-sm font-mono font-extrabold tabular-nums">
                {mySalesKpi.attendance_rate}%
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* GPS Location Simulator */}
      <div className={`rounded-2xl p-4 border space-y-3 ${cardSurfaceClass}`}>
        <div
          className={`flex items-center justify-between pb-2 border-b ${
            isDark ? 'border-blue-900/60' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin
              className="w-4 h-4"
              style={{ color: accentConfig.secondaryHex }}
            />
            <h3 className="text-xs font-extrabold uppercase tracking-wider">
              Simulator Posisi GPS (Uji Geofence 50m)
            </h3>
          </div>
          <span
            className="font-mono text-xs font-bold tabular-nums"
            style={{ color: accentConfig.secondaryHex }}
          >
            ±{currentGps.accuracy}m
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
          <button
            onClick={() => setGpsSimulationMode('office_valid')}
            className={`p-2 rounded-xl border text-left transition cursor-pointer ${
              gpsSimulationMode === 'office_valid'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                : subSurfaceClass
            }`}
          >
            Di Kantor (12m · Sah)
          </button>
          <button
            onClick={() => setGpsSimulationMode('office_outside')}
            className={`p-2 rounded-xl border text-left transition cursor-pointer ${
              gpsSimulationMode === 'office_outside'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                : subSurfaceClass
            }`}
          >
            Luar Kantor (180m)
          </button>
          <button
            onClick={() => setGpsSimulationMode('customer_valid')}
            className={`p-2 rounded-xl border text-left transition cursor-pointer ${
              gpsSimulationMode === 'customer_valid'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                : subSurfaceClass
            }`}
          >
            Di Rumah Pelanggan (6m)
          </button>
          <button
            onClick={() => setGpsSimulationMode('real_device')}
            className={`p-2 rounded-xl border text-left transition cursor-pointer ${
              gpsSimulationMode === 'real_device'
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-bold'
                : subSurfaceClass
            }`}
          >
            Sensor GPS Asli HP
          </button>
        </div>
      </div>

      {/* Offline Outbox & Logout Protection */}
      <div className={`rounded-2xl p-4 border space-y-2.5 ${cardSurfaceClass}`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database
              className="w-4 h-4"
              style={{ color: accentConfig.secondaryHex }}
            />
            <span className="font-extrabold">Antrean Offline (Outbox)</span>
          </div>
          <span className="font-mono text-slate-400 tabular-nums">
            {offlineQueue.length} antrean
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onOpenOutbox}
            className={`py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${subSurfaceClass}`}
          >
            Lihat Antrean Outbox
          </button>
          <button
            onClick={handleLogoutAttempt}
            className="py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-xs font-bold text-rose-400 hover:bg-rose-500/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>
        </div>
      </div>
    </div>
  );
};
