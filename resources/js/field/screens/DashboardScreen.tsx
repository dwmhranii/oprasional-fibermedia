import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TabKey } from '../components/BottomNav';
import { WorkOrderDetailModal, formatTicketStatusLabel } from './WorkOrderDetailModal';
import { formatSubmissionStatus } from './SalesScreen';
import { CreateComplaintModal } from '../components/CreateComplaintModal';
import { evaluateGeofence } from '../utils/geo';
import {
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronRight,
  ClipboardList,
  UserPlus,
  Users,
  Plus,
  Radio,
  Activity,
  Cpu,
  Wifi,
} from 'lucide-react';

interface DashboardScreenProps {
  onNavigateTab: (tab: TabKey, options?: { salesMode?: 'list' | 'new_form' }) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const {
    currentUser,
    todayAttendance,
    workOrders,
    salesSubmissions,
    collectorVisits,
    isConnectedOfficeWifi,
    teams,
    isTeamReady,
    allUsers,
    office,
    currentGps,
    themeMode,
    accentConfig,
    kpiSales,
  } = useApp();

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState<boolean>(false);

  const isDark = themeMode === 'dark';

  const selectedTicket = selectedTicketId
    ? workOrders.find((w) => w.id === selectedTicketId) || null
    : null;

  // Live office geofence distance for telemetry bar
  const officeGeo = evaluateGeofence(
    currentGps.lat,
    currentGps.lng,
    currentGps.accuracy,
    office.latitude,
    office.longitude,
    office.radius_meters
  );
  const distancePct = Math.min(100, Math.round((officeGeo.distanceMeters / office.radius_meters) * 100));

  // Shared card surface classes for Dark vs Day mode
  const cardSurfaceClass = isDark
    ? 'bg-[#0B1730]/90 border-blue-900/60 text-slate-100 shadow-lg'
    : 'bg-white border-slate-200/90 text-slate-900 shadow-xs';

  const subSurfaceClass = isDark
    ? 'bg-[#071022] border-blue-950/80 text-slate-300'
    : 'bg-slate-50 border-slate-200/70 text-slate-700';

  // ============================================================================
  // 1. TAMPILAN BERANDA TEKNISI (ISP TELEMETRY PANEL)
  // ============================================================================
  if (currentUser.role === 'teknisi') {
    const myTeam = teams.find((t) => t.id === currentUser.team_id);
    const teamReady = myTeam ? isTeamReady(myTeam.id) : null;

    const myTeamTickets = workOrders.filter(
      (wo) => wo.assigned_team_id === currentUser.team_id
    );
    const activeTeamTickets = myTeamTickets.filter(
      (wo) => wo.status !== 'closed' && wo.status !== 'resolved'
    );
    const completedTeamTickets = myTeamTickets.filter(
      (wo) => wo.status === 'closed' || wo.status === 'resolved'
    );
    const pendingMyPhase2Count = activeTeamTickets.filter((wo) =>
      wo.phase2_requirements.some(
        (req) => req.user_id === currentUser.id && !req.completed_at && !req.waived
      )
    ).length;

    return (
      <div className="space-y-4 pb-24">
        {/* ISP Hero Telemetry Card: Identity + Attendance + Geofence Range + Team Readiness */}
        <div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#071229] via-[#0B1B3B] to-[#08132B] text-white p-4 border shadow-xl space-y-3.5"
          style={{
            borderColor: `${accentConfig.primaryHex}55`,
            boxShadow: `0 10px 30px -10px ${accentConfig.glowRgba}`,
          }}
        >
          {/* Top Identity Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-xl object-cover border-2"
                  style={{ borderColor: accentConfig.secondaryHex }}
                />
                <span
                  className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold text-slate-950 uppercase"
                  style={{ backgroundColor: accentConfig.secondaryHex }}
                >
                  FO
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Teknisi Lapangan</span>
                </div>
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  {currentUser.name}
                </h1>
                <p
                  className="text-xs font-semibold"
                  style={{ color: accentConfig.secondaryHex }}
                >
                  {currentUser.team_name}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs shrink-0">
              <span className="text-slate-400 block text-[10px]">Operasional</span>
              <span className="font-medium text-slate-300 tabular-nums">
                08.00–20.00 WIB
              </span>
            </div>
          </div>

          {/* Attendance Status */}
          <div
            className={`p-3.5 rounded-xl border space-y-2.5 ${
              todayAttendance?.check_in_at
                ? 'bg-emerald-950/45 border-emerald-500/40'
                : 'bg-amber-950/45 border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  {todayAttendance?.check_in_at ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-300">
                        {todayAttendance.check_out_at
                          ? 'Shift Selesai'
                          : 'Sudah Absen Masuk'}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-300">Belum Absen Hari Ini</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 font-mono tabular-nums">
                  {todayAttendance?.check_in_at
                    ? `Masuk: ${new Date(todayAttendance.check_in_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} WIB · Kantor (${todayAttendance.office_distance_meters || 10}m)`
                    : `Jarak ke kantor: ${officeGeo.distanceMeters}m`}
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('absensi')}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer shrink-0 shadow-md"
                style={
                  todayAttendance?.check_in_at
                    ? {
                        backgroundColor: '#0F224A',
                        color: '#E2E8F0',
                        border: `1px solid ${accentConfig.primaryHex}55`,
                      }
                    : {
                        background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                        color: '#020617',
                      }
                }
              >
                {todayAttendance?.check_in_at
                  ? todayAttendance.check_out_at
                    ? 'Log Absen'
                    : 'Absen Pulang'
                  : 'Absen Kantor'}
              </button>
            </div>

            {/* Visual 50m Geofence Range Indicator Bar */}
            <div className="space-y-1 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-cyan-400" />
                  <span>GEOFENCE 50M + IP KANTOR ({office.allowed_wifi_ip})</span>
                </span>
                <span
                  className={`font-bold tabular-nums ${
                    officeGeo.distanceMeters <= office.radius_meters && isConnectedOfficeWifi
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {officeGeo.distanceMeters}m / {office.radius_meters}m · ±{currentGps.accuracy}m
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-950/90 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    officeGeo.distanceMeters <= office.radius_meters
                      ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                  style={{ width: `${Math.max(8, distancePct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Team Readiness HUD Bar */}
          {myTeam && teamReady && (
            <div className="pt-1 flex items-center justify-between text-xs text-slate-300 border-t border-blue-900/60">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Users className="w-3.5 h-3.5" style={{ color: accentConfig.secondaryHex }} />
                <span className="text-slate-400">{myTeam.name}:</span>
                <span className="font-semibold text-white">
                  {myTeam.member_ids
                    .map((id) => {
                      const u = allUsers.find((user) => user.id === id);
                      const isPresent = teamReady.presentMembers.some((m) => m.id === id);
                      return `${u?.name.split(' ')[0]} (${isPresent ? 'Hadir' : 'Off'})`;
                    })
                    .join(' · ')}
                </span>
              </div>
              <span
                className={`font-mono font-bold text-[11px] ${
                  teamReady.isReady ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {teamReady.isReady ? 'TIM SIAP DISPATCH' : 'TIM OFF'}
              </span>
            </div>
          )}
        </div>

        {/* 3 ISP Telemetry Metric Counters */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => onNavigateTab('tugas')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${cardSurfaceClass}`}
          >
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              WO Aktif Tim
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className="text-2xl font-extrabold font-mono tabular-nums"
                style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
              >
                {activeTeamTickets.length}
              </span>
              <span className="text-[10px] font-mono text-slate-400">TIKET</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('tugas')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${cardSurfaceClass}`}
          >
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Wajib Step 2
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-2xl font-extrabold font-mono tabular-nums ${
                  pendingMyPhase2Count > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {pendingMyPhase2Count}
              </span>
              <span className="text-[10px] font-mono text-slate-400">SELFIE</span>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('tugas')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer ${cardSurfaceClass}`}
          >
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              WO Selesai
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {completedTeamTickets.length}
              </span>
              <span className="text-[10px] font-mono text-slate-400">CLOSED</span>
            </div>
          </button>
        </div>

        {/* Top Active Work Orders Section (ISP Telemetry Panels with Optical Indicators) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList
                className="w-4 h-4"
                style={{ color: accentConfig.secondaryHex }}
              />
              <span>Daftar Tugas Teratas ({activeTeamTickets.length} WO Aktif)</span>
            </h2>
            <button
              onClick={() => onNavigateTab('tugas')}
              className="text-xs font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
            >
              <span>Semua Tugas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeTeamTickets.length === 0 ? (
            <div className={`rounded-2xl p-8 text-center border ${cardSurfaceClass}`}>
              <p className="text-sm font-bold">Belum Ada Tugas Aktif</p>
              <p className="text-xs text-slate-400 mt-1">
                Tugas baru akan otomatis masuk ke daftar WO saat giliran {currentUser.team_name}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTeamTickets.slice(0, 3).map((ticket) => {
                const needsMyPhase2 = ticket.phase2_requirements.some(
                  (r) => r.user_id === currentUser.id && !r.completed_at && !r.waived
                );
                const dbmVal = ticket.phase1_data?.optical_power_dbm ?? -18.4;
                const isDbmGood = dbmVal >= -24 && dbmVal <= -13;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`rounded-2xl p-4 border transition-all cursor-pointer space-y-3 hover:scale-[1.005] ${cardSurfaceClass}`}
                    style={
                      isDark
                        ? {
                            borderColor:
                              ticket.type === 'complaint'
                                ? 'rgba(244, 63, 94, 0.35)'
                                : `${accentConfig.primaryHex}40`,
                          }
                        : undefined
                    }
                  >
                    {/* Clean Unboxed Metadata Header */}
                    <div
                      className={`flex items-center justify-between text-xs pb-2.5 border-b ${
                        isDark ? 'border-blue-900/60' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-mono">
                        <span
                          className={`font-extrabold uppercase ${
                            ticket.type === 'psb'
                              ? isDark
                                ? 'text-cyan-400'
                                : 'text-sky-600'
                              : 'text-rose-400'
                          }`}
                        >
                          {ticket.type === 'psb' ? 'PSB FO' : 'GANGGUAN'}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="font-bold">{ticket.ticket_number}</span>
                        {ticket.type === 'complaint' && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] font-bold uppercase">
                            {ticket.priority}
                          </span>
                        )}
                      </div>

                      <span
                        className={`font-mono font-bold text-[11px] ${
                          ticket.status === 'phase1_completed'
                            ? 'text-amber-400'
                            : isDark
                            ? 'text-cyan-300'
                            : 'text-sky-700'
                        }`}
                      >
                        {formatTicketStatusLabel(ticket.status)}
                      </span>
                    </div>

                    {/* Customer & Title */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold leading-snug">{ticket.title}</h3>
                        <p className="text-xs font-semibold text-slate-400 mt-0.5">
                          {ticket.customer_name} ·{' '}
                          <span className="font-mono">{ticket.customer_code}</span> ·{' '}
                          <span className="font-mono text-[11px]">NIK {ticket.customer_nik_masked}</span>
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 ${subSurfaceClass}`}
                      >
                        {ticket.package_name}
                      </span>
                    </div>

                    {/* ISP Optical Node Topology Bar: [ODP] ─── [PORT] ─── [ONT / dBm] */}
                    <div className={`p-2.5 rounded-xl border font-mono text-[11px] ${subSurfaceClass}`}>
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <Radio
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: accentConfig.secondaryHex }}
                          />
                          <span className="font-bold">{ticket.odp_name}</span>
                        </div>

                        <div className="flex-1 border-t border-dashed border-blue-500/40 mx-1.5" />

                        <div className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold shrink-0">
                          PORT #{ticket.odp_port}
                        </div>

                        <div className="flex-1 border-t border-dashed border-blue-500/40 mx-1.5" />

                        <div className="flex items-center gap-1 shrink-0">
                          <Activity
                            className={`w-3.5 h-3.5 ${
                              isDbmGood ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          />
                          <span
                            className={`font-bold tabular-nums ${
                              isDbmGood ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {ticket.phase1_data ? `${dbmVal} dBm` : 'ONT READY'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Address & Direct Action Footer */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <MapPin
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: accentConfig.secondaryHex }}
                        />
                        <span className="truncate">{ticket.address}</span>
                      </div>

                      <span
                        className="font-extrabold flex items-center gap-1 shrink-0"
                        style={{
                          color: needsMyPhase2
                            ? '#fbbf24'
                            : isDark
                            ? accentConfig.secondaryHex
                            : accentConfig.primaryHex,
                        }}
                      >
                        {needsMyPhase2 ? 'Selfie Step 2' : 'Kerjakan WO'}
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Work Order Detail Modal */}
        {selectedTicket && (
          <WorkOrderDetailModal
            workOrder={selectedTicket}
            isOpen={!!selectedTicket}
            onClose={() => setSelectedTicketId(null)}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. TAMPILAN BERANDA SALES (ISP ACQUISITION TELEMETRY - JALUR LAPANGAN)
  // ============================================================================
  if (currentUser.role === 'sales') {
    const mySubmissions = salesSubmissions.filter((s) => s.sales_id === currentUser.id);
    const waitingValidationCount = mySubmissions.filter((s) => s.status === 'admin_validation').length;
    const scheduledCount = mySubmissions.filter((s) => s.status === 'scheduled').length;
    const installedCount = mySubmissions.filter((s) => s.status === 'installed').length;
    const mySalesMetric = kpiSales.find((k) => k.user_id === currentUser.id) || kpiSales[0];

    return (
      <div className="space-y-4 pb-24">
        {/* Greeting & Field Check-In Card for Sales */}
        <div
          className="rounded-2xl bg-gradient-to-br from-[#071229] via-[#0B1B3B] to-[#08132B] text-white p-4 border shadow-xl space-y-3.5"
          style={{
            borderColor: `${accentConfig.primaryHex}55`,
            boxShadow: `0 10px 30px -10px ${accentConfig.glowRgba}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-xl object-cover border-2"
                style={{ borderColor: accentConfig.secondaryHex }}
              />
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  FIBERMEDIA COMMERCIAL AE · FIELD CHECK-IN
                </p>
                <h1 className="text-base font-extrabold text-white">{currentUser.name}</h1>
                <p
                  className="text-xs font-semibold"
                  style={{ color: accentConfig.secondaryHex }}
                >
                  Sales Akuisisi PSB · Skor KPI {mySalesMetric.total_score}
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-slate-400 block text-[10px]">KONVERSI</span>
              <span className="font-extrabold text-emerald-400 text-sm tabular-nums">
                {mySalesMetric.conversion_rate}%
              </span>
            </div>
          </div>

          {/* Attendance Status Box (Jalur Lapangan field_checkin) */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              todayAttendance?.check_in_at
                ? 'bg-emerald-950/45 border-emerald-500/40'
                : 'bg-amber-950/45 border-amber-500/40'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {todayAttendance?.check_in_at ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Sudah Check-In Lapangan Hari Ini</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-amber-300">Belum Check-In Lapangan (field_checkin)</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono tabular-nums">
                {todayAttendance?.check_in_at
                  ? `Masuk pukul ${new Date(todayAttendance.check_in_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })} WIB · Jalur Lapangan (Tanpa Wi-Fi Kantor)`
                  : `Jalur Lapangan: Selfie + Geotag GPS (±${currentGps.accuracy}m) dari titik prospek`}
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('absensi')}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer shrink-0"
              style={
                todayAttendance?.check_in_at
                  ? {
                      backgroundColor: '#0F224A',
                      color: '#E2E8F0',
                      border: `1px solid ${accentConfig.primaryHex}55`,
                    }
                  : {
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                      color: '#020617',
                    }
              }
            >
              {todayAttendance?.check_in_at ? 'Detail Absen' : 'Check-In Lapangan'}
            </button>
          </div>
        </div>

        {/* Primary CTA: Buat Pengajuan PSB Baru */}
        <button
          onClick={() => onNavigateTab('sales', { salesMode: 'new_form' })}
          className="w-full py-3.5 px-4 rounded-2xl text-slate-950 font-extrabold text-xs active:scale-99 transition shadow-lg flex items-center justify-between cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
            boxShadow: `0 8px 24px -6px ${accentConfig.glowRgba}`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Input Pengajuan PSB Pelanggan Baru (Consent UU PDP)</span>
          </div>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Sales Submission Summary Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className={`p-3 rounded-2xl border ${cardSurfaceClass}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Validasi Admin
            </span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-0.5 block">
              {waitingValidationCount}
            </span>
          </div>
          <div className={`p-3 rounded-2xl border ${cardSurfaceClass}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Dijadwalkan
            </span>
            <span
              className="text-2xl font-extrabold font-mono tabular-nums mt-0.5 block"
              style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
            >
              {scheduledCount}
            </span>
          </div>
          <div className={`p-3 rounded-2xl border ${cardSurfaceClass}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Terpasang
            </span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5 block">
              {installedCount}
            </span>
          </div>
        </div>

        {/* Top / Latest PSB Submissions */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-xs font-extrabold uppercase tracking-wider">
              Pipeline Pengajuan PSB Terbaru
            </h2>
            <button
              onClick={() => onNavigateTab('sales', { salesMode: 'list' })}
              className="text-xs font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
              style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {mySubmissions.slice(0, 3).map((sub) => (
              <div
                key={sub.id}
                onClick={() => onNavigateTab('sales', { salesMode: 'list' })}
                className={`rounded-2xl p-4 border transition cursor-pointer space-y-2.5 text-xs ${cardSurfaceClass}`}
              >
                <div
                  className={`flex items-center justify-between pb-2 border-b ${
                    isDark ? 'border-blue-900/60' : 'border-slate-100'
                  }`}
                >
                  <span className="font-mono font-bold">
                    {sub.submission_code} · NIK {sub.nik_masked}
                  </span>
                  <span
                    className={`font-mono font-bold text-[11px] ${
                      sub.status === 'installed'
                        ? 'text-emerald-400'
                        : sub.status === 'scheduled'
                        ? 'text-cyan-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {formatSubmissionStatus(sub.status)}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm">{sub.customer_name}</h3>
                    <p className="text-slate-400 font-mono text-[11px]">{sub.phone}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className="font-bold font-mono"
                      style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
                    >
                      {sub.package_name}
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Rp {sub.package_price.toLocaleString('id-ID')}/bln
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] truncate">
                  <MapPin
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: accentConfig.secondaryHex }}
                  />
                  <span className="truncate">{sub.address}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. TAMPILAN BERANDA COLLECTOR (JALUR LAPANGAN & KUNJUNGAN PENAGIHAN)
  // ============================================================================
  if (currentUser.role === 'collector') {
    const pendingVisits = collectorVisits.filter((v) => !v.visited_at);
    const completedVisits = collectorVisits.filter((v) => !!v.visited_at);
    const totalPendingDebt = pendingVisits.reduce((sum, v) => sum + v.debt_amount, 0);

    return (
      <div className="space-y-4 pb-24">
        <div
          className="rounded-2xl bg-gradient-to-br from-[#071229] via-[#0B1B3B] to-[#08132B] text-white p-4 border shadow-xl space-y-3.5"
          style={{
            borderColor: `${accentConfig.primaryHex}55`,
            boxShadow: `0 10px 30px -10px ${accentConfig.glowRgba}`,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-xl object-cover border-2"
                style={{ borderColor: accentConfig.secondaryHex }}
              />
              <div>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  FIBERMEDIA BILLING COLLECTOR · FIELD CHECK-IN
                </p>
                <h1 className="text-base font-extrabold text-white">{currentUser.name}</h1>
                <p
                  className="text-xs font-semibold"
                  style={{ color: accentConfig.secondaryHex }}
                >
                  Petugas Penagihan Lapangan (Data Manual CSV/Form)
                </p>
              </div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              todayAttendance?.check_in_at
                ? 'bg-emerald-950/45 border-emerald-500/40'
                : 'bg-amber-950/45 border-amber-500/40'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {todayAttendance?.check_in_at ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">Sudah Check-In Lapangan (field_checkin)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-amber-300">Belum Check-In Lapangan Hari Ini</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono tabular-nums">
                Jalur Lapangan: Selfie + Geotag GPS + Anti-Fake GPS (Tanpa batasan radius kantor)
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('absensi')}
              className="px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer shrink-0 text-slate-950"
              style={{
                background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
              }}
            >
              Check-In
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className={`p-3 rounded-2xl border ${cardSurfaceClass}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Target Kunjungan
            </span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-0.5 block">
              {pendingVisits.length}
            </span>
          </div>
          <div className={`p-3 rounded-2xl border ${cardSurfaceClass}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Sudah Dikunjungi
            </span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-0.5 block">
              {completedVisits.length}
            </span>
          </div>
          <div className={`p-3 rounded-2xl border ${cardSurfaceClass}`}>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Total Tunggakan
            </span>
            <span className="text-sm font-extrabold text-rose-400 font-mono tabular-nums mt-1.5 block">
              Rp {(totalPendingDebt / 1000).toFixed(0)}rb
            </span>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('sales')}
          className="w-full py-3.5 px-4 rounded-2xl text-slate-950 font-extrabold text-xs transition shadow-lg flex items-center justify-between cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
          }}
        >
          <span>Buka Daftar Kunjungan Tagihan Pelanggan (`debt_amount`)</span>
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  // ============================================================================
  // 4. TAMPILAN BERANDA ADMIN / CS / SUPERADMIN DI PWA
  // ============================================================================
  return (
    <div className="space-y-4 pb-24">
      <div
        className="rounded-2xl bg-gradient-to-br from-[#071229] via-[#0B1B3B] to-[#08132B] text-white p-4 border shadow-xl space-y-3.5"
        style={{
          borderColor: `${accentConfig.primaryHex}55`,
          boxShadow: `0 10px 30px -10px ${accentConfig.glowRgba}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-xl object-cover border-2"
              style={{ borderColor: accentConfig.secondaryHex }}
            />
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                NOC & ADMIN ATTENDANCE NODE
              </p>
              <h1 className="text-base font-extrabold text-white">{currentUser.name}</h1>
              <p
                className="text-xs font-semibold capitalize"
                style={{ color: accentConfig.secondaryHex }}
              >
                Peran: {currentUser.role}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance Status */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            todayAttendance?.check_in_at
              ? 'bg-emerald-950/45 border-emerald-500/40'
              : 'bg-amber-950/45 border-amber-500/40'
          }`}
        >
          <div>
            <p className="text-xs font-bold text-white">
              {todayAttendance?.check_in_at
                ? 'Sudah Absen Masuk Hari Ini'
                : 'Belum Absen Masuk Hari Ini'}
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Sesuai PRD v1.2: Peran Kantor wajib absen Jalur Kantor (≤50m + Wi-Fi Kantor).
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('absensi')}
            className="px-3.5 py-2 rounded-xl text-slate-950 font-extrabold text-xs transition shrink-0 cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
            }}
          >
            Buka Absen
          </button>
        </div>
      </div>

      {/* Simulator Dispatch Round-Robin untuk menguji alur Admin -> Teknisi */}
      <div className={`rounded-2xl p-4 border space-y-3 ${cardSurfaceClass}`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4" style={{ color: accentConfig.secondaryHex }} />
              <span>Simulasi Dispatch Tiket ke Tim Teknisi</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Uji pembuatan tiket pengaduan baru yang otomatis masuk ke WO tim siap (Round-Robin)
            </p>
          </div>
          <button
            onClick={() => setIsComplaintModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Gangguan
          </button>
        </div>

        <div
          className={`grid grid-cols-2 gap-2 pt-2.5 border-t text-xs ${
            isDark ? 'border-blue-900/60' : 'border-slate-100'
          }`}
        >
          {teams.map((t) => {
            const ready = isTeamReady(t.id);
            return (
              <div
                key={t.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${subSurfaceClass}`}
              >
                <div>
                  <span className="font-bold block">{t.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {ready.presentCount}/2 Anggota Hadir
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold ${
                    ready.isReady ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {ready.isReady ? 'SIAP' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <CreateComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
      />
    </div>
  );
};
