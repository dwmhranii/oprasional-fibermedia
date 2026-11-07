import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Award,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';

export const KpiScreen: React.FC = () => {
  const {
    teams,
    isTeamReady,
    kpiTeams,
    kpiTeknisi,
    kpiSales,
    currentUser,
    workOrders,
    runDispatchQueue,
    showToast,
  } = useApp();

  const [activeKpiTab, setActiveKpiTab] = useState<'tim' | 'teknisi' | 'sales' | 'readiness'>('readiness');
  const [psbPointer, setPsbPointer] = useState<number>(1);
  const [complaintPointer, setComplaintPointer] = useState<number>(2);

  const isSuperadmin = currentUser.role === 'superadmin';

  const handleResetPointer = (type: 'psb' | 'complaint') => {
    if (type === 'psb') {
      setPsbPointer(1);
      showToast('Pointer giliran PSB di-reset ke Tim Alpha (#1)');
    } else {
      setComplaintPointer(1);
      showToast('Pointer giliran Gangguan di-reset ke Tim Alpha (#1)');
    }
  };

  const handleRecomputeKpi = () => {
    showToast('KPI bulan berjalan berhasil dihitung ulang dari database kejadian.');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
              OPERASIONAL & KINERJA
            </span>
            <h2 className="text-sm font-bold text-white">Dasbor KPI & Status Tim Siap</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Periode: Okt 2026</span>
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          Aturan PRD: KPI dihitung otomatis dari catatan log absensi, respons tiket, bukti foto, dan validitas lokasi geofence.
        </p>

        {isSuperadmin && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Mode Superadmin Aktif</span>
            <button
              onClick={handleRecomputeKpi}
              className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-[11px] hover:bg-sky-500 transition"
            >
              Hitung Ulang KPI (Recompute)
            </button>
          </div>
        )}
      </div>

      {/* Segmented Tab Controls */}
      <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
        <button
          onClick={() => setActiveKpiTab('readiness')}
          className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${
            activeKpiTab === 'readiness'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kesiapan Tim
        </button>
        <button
          onClick={() => setActiveKpiTab('tim')}
          className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${
            activeKpiTab === 'tim'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          KPI Tim
        </button>
        <button
          onClick={() => setActiveKpiTab('teknisi')}
          className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${
            activeKpiTab === 'teknisi'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          KPI Teknisi
        </button>
        <button
          onClick={() => setActiveKpiTab('sales')}
          className={`flex-1 py-2 text-center rounded-lg transition cursor-pointer ${
            activeKpiTab === 'sales'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          KPI Sales
        </button>
      </div>

      {/* TAB 1: KESIAPAN TIM & GILIRAN DISPATCH */}
      {activeKpiTab === 'readiness' && (
        <div className="space-y-3">
          {/* Dispatch Round Robin Pointers Panel (PRD Rule) */}
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                Status Pointer Giliran (TeamDispatchService)
              </span>
              <button
                onClick={runDispatchQueue}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Jalankan Scheduler Antrean
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="font-sans text-[10px] text-slate-400 font-semibold block">POINTER PSB TERAKHIR</span>
                  <span className="font-bold text-sky-700 text-sm">
                    {teams.find((t) => t.id === psbPointer)?.name || 'Tim Alpha'}
                  </span>
                </div>
                {isSuperadmin && (
                  <button
                    onClick={() => handleResetPointer('psb')}
                    className="mt-2 text-[10px] font-sans font-semibold text-sky-600 hover:underline text-left"
                  >
                    Reset Pointer PSB
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="font-sans text-[10px] text-slate-400 font-semibold block">POINTER GANGGUAN TERAKHIR</span>
                  <span className="font-bold text-rose-700 text-sm">
                    {teams.find((t) => t.id === complaintPointer)?.name || 'Tim Beta'}
                  </span>
                </div>
                {isSuperadmin && (
                  <button
                    onClick={() => handleResetPointer('complaint')}
                    className="mt-2 text-[10px] font-sans font-semibold text-rose-600 hover:underline text-left"
                  >
                    Reset Pointer Gangguan
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {teams.map((team) => {
              const check = isTeamReady(team.id);
              const activeTeamTickets = workOrders.filter(
                (w) => w.assigned_team_id === team.id && w.status !== 'closed'
              );

              return (
                <div
                  key={team.id}
                  className={`bg-white rounded-2xl p-4 border transition-all ${
                    check.isReady
                      ? 'border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'border-slate-200 opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                        #{team.order_index}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{team.name}</h4>
                    </div>

                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        check.isReady
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {check.isReady ? 'TIM SIAP (IKUT GILIRAN)' : 'TIDAK IKUT GILIRAN'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">{team.description}</p>

                  {/* Presence Row */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="w-4 h-4 text-sky-600" />
                      <span>
                        Kehadiran Hari Ini:{' '}
                        <strong className="text-slate-900">
                          {check.presentCount} / {team.member_ids.length} Anggota
                        </strong>
                      </span>
                    </div>

                    <span className="font-mono text-[11px] text-slate-500">
                      Tiket Aktif: <strong className="text-slate-800">{activeTeamTickets.length}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: KPI TIM */}
      {activeKpiTab === 'tim' && (
        <div className="space-y-3">
          {kpiTeams.map((kpi) => (
            <div
              key={kpi.team_id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{kpi.team_name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total Selesai: {kpi.total_tickets} tiket
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-sky-600 font-mono">
                    {kpi.total_score}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">SKOR AKHIR</span>
                </div>
              </div>

              {/* Weight Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Ketepatan SLA (30%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.sla_ontime_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Repeat Ticket 7h (25%):</span>
                    <strong className="text-emerald-700 font-mono">{kpi.repeat_ticket_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Kualitas Bukti (20%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.proof_quality_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Rating WA (15%):</span>
                    <strong className="text-amber-700 font-mono">{kpi.satisfaction_score}</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: KPI INDIVIDU TEKNISI */}
      {activeKpiTab === 'teknisi' && (
        <div className="space-y-3">
          {kpiTeknisi.map((kpi) => (
            <div
              key={kpi.user_id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{kpi.user_name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Hadir: {kpi.present_days}/{kpi.work_days} hari kerja
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-sky-600 font-mono">
                    {kpi.total_score}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">SKOR INDIVIDU</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Kehadiran (30%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.attendance_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Tahap 2 Lengkap (30%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.phase2_completion_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Validitas Lokasi (20%):</span>
                    <strong className="text-emerald-700 font-mono">{kpi.location_validity_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Tepat SLA (20%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.sla_timeliness_rate}%</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: KPI SALES */}
      {activeKpiTab === 'sales' && (
        <div className="space-y-3">
          {kpiSales.map((kpi) => (
            <div
              key={kpi.user_id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{kpi.user_name}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total Pengajuan: {kpi.total_submissions}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-sky-600 font-mono">
                    {kpi.total_score}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">SKOR SALES</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Konversi (30%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.conversion_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Retensi 3 Bln (25%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.retention_3month_rate}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Bayar Bulan 1 (20%):</span>
                    <strong className="text-emerald-700 font-mono">{kpi.ontime_payment_first_month}%</strong>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Kualitas Data (15%):</span>
                    <strong className="text-slate-900 font-mono">{kpi.data_quality_rate}%</strong>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
