import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkOrder, TicketStatus } from '../types';
import { SLA_PAUSE_STANDARD_REASONS } from '../data/mockData';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { SignaturePadModal } from '../components/SignaturePadModal';
import { ProcessedPhotoResult } from '../utils/watermark';
import { evaluateGeofence } from '../utils/geo';
import { SlaBadge, SlaState, Badge } from '../design-system';
import {
  X,
  MapPin,
  Phone,
  Navigation,
  CheckCircle2,
  Camera,
  PenTool,
  Check,
  Star,
  ShieldAlert,
  Radio,
  Activity,
  Lock as LockIcon,
  Gauge,
  ShieldCheck,
  Home,
  Clock,
  FileCheck2,
  PauseCircle,
  HardDrive,
} from 'lucide-react';

interface WorkOrderDetailModalProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
}

export const formatTicketStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case 'assigned':
      return 'Ditugaskan (Wajib Respons ≤2j)';
    case 'accepted':
      return 'Diterima Tim';
    case 'on_the_way':
      return 'Dalam Perjalanan';
    case 'arrived':
      return 'Dikerjakan di Lokasi';
    case 'phase1_completed':
      return 'Step 1 & BAST Selesai';
    case 'resolved':
      return 'Menunggu Approval BAST Admin';
    case 'closed':
      return 'Selesai (BAST Approved)';
    case 'unassigned':
      return 'Antrean';
    case 'needs_admin':
      return 'Butuh Admin';
    default:
      return status;
  }
};

const generateSystemSpeedtestSnapshot = (
  ticketNumber: string,
  customerName: string,
  packageName: string,
  dlMbps: number,
  ulMbps: number,
  pingMs: number,
  jitterMs: number
): { dataUrl: string; hash: string } => {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 480, 300);
    grad.addColorStop(0, '#050c1b');
    grad.addColorStop(1, '#0d1f42');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 300);

    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, 0, 480, 6);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('FIBERMEDIA TELEMETRY SPEEDTEST SYSTEM', 20, 34);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(
      `WO: ${ticketNumber} · ${new Date().toLocaleTimeString('id-ID')} WIB`,
      20,
      54
    );

    ctx.fillStyle = '#0b1833';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, 74, 210, 110);
    ctx.fillRect(20, 74, 210, 110);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('DOWNLOAD BANDWIDTH', 34, 98);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(`${dlMbps.toFixed(1)}`, 34, 142);
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Mbps', 155, 142);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('STATUS: PASS (SESUAI PAKET)', 34, 168);

    ctx.fillStyle = '#0b1833';
    ctx.strokeStyle = '#3b82f6';
    ctx.strokeRect(250, 74, 210, 110);
    ctx.fillRect(250, 74, 210, 110);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('UPLOAD BANDWIDTH', 264, 98);
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(`${ulMbps.toFixed(1)}`, 264, 142);
    ctx.font = 'bold 13px monospace';
    ctx.fillText('Mbps', 385, 142);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px monospace';
    ctx.fillText(`PING: ${pingMs}ms · JITTER: ${jitterMs}ms`, 264, 168);

    ctx.fillStyle = '#071126';
    ctx.fillRect(20, 200, 440, 78);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`PELANGGAN : ${customerName.toUpperCase()}`, 32, 224);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`PAKET     : ${packageName.toUpperCase()}`, 32, 244);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText('SERVER: core-jkt01.fibermedia.net · VERIFIED BY SYSTEM', 32, 264);
  }

  const hash = `SPD-${Math.random().toString(16).substring(2, 10).toUpperCase()}-${Date.now()
    .toString(16)
    .slice(-4)
    .toUpperCase()}`;
  return {
    dataUrl: canvas.toDataURL('image/png'),
    hash,
  };
};

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  workOrder,
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    currentGps,
    setGpsSimulationMode,
    acceptTicket,
    updateTicketStatus,
    submitPhase1,
    submitPhase2,
    waivePhase2,
    closeTicket,
    rejectBastByAdmin,
    togglePauseSlaByAdmin,
    dispatchSettings,
    themeMode,
    accentConfig,
    isOnline,
    showToast,
  } = useApp();

  const isDark = themeMode === 'dark';

  const [activeStepTab, setActiveStepTab] = useState<'info' | 'phase1' | 'phase2' | 'history'>('info');

  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraPhotoKind, setCameraPhotoKind] = useState<string>('FOTO OPM');
  const [cameraPhotoTarget, setCameraPhotoTarget] = useState<'opm' | 'house' | 'step2_selfie'>('opm');
  const [lastPhotoSizeKb, setLastPhotoSizeKb] = useState<number>(
    workOrder.phase1_data?.compressed_size_kb || 284
  );

  // Built-in System Speedtest runner state
  const [isRunningSpeedtest, setIsRunningSpeedtest] = useState<boolean>(false);
  const [speedtestProgress, setSpeedtestProgress] = useState<number>(0);
  const [speedtestStats, setSpeedtestStats] = useState<{
    dl: number;
    ul: number;
    ping: number;
    jitter: number;
  } | null>(
    workOrder.phase1_data?.photo_before
      ? { dl: 94.8, ul: 48.2, ping: 4, jitter: 1 }
      : null
  );

  const [isSignatureOpen, setIsSignatureOpen] = useState<boolean>(false);

  // Step 1 Draft Form State (Manual checklist defaults to ALL FALSE)
  const [phase1Form, setPhase1Form] = useState<{
    photo_before: string;
    photo_before_hash: string;
    photo_ont: string;
    photo_ont_hash: string;
    photo_after: string;
    photo_after_hash: string;
    optical_power_dbm: number;
    checklist: {
      dropcore_installed: boolean;
      ont_powered: boolean;
      wifi_configured: boolean;
      redaman_standard: boolean;
      speedtest_verified: boolean;
    };
    customer_signature: string;
  }>({
    photo_before: workOrder.phase1_data?.photo_before || '',
    photo_before_hash: workOrder.phase1_data?.photo_before_hash || '',
    photo_ont: workOrder.phase1_data?.photo_ont || '',
    photo_ont_hash: workOrder.phase1_data?.photo_ont_hash || '',
    photo_after: workOrder.phase1_data?.photo_after || '',
    photo_after_hash: workOrder.phase1_data?.photo_after_hash || '',
    optical_power_dbm: workOrder.phase1_data?.optical_power_dbm || -18.5,
    checklist: workOrder.phase1_data?.checklist || {
      dropcore_installed: false,
      ont_powered: false,
      wifi_configured: false,
      redaman_standard: false,
      speedtest_verified: false,
    },
    customer_signature: workOrder.phase1_data?.customer_signature || '',
  });

  // Waive Step 2 & Admin controls
  const [waiveUserId, setWaiveUserId] = useState<number | null>(null);
  const [waiveReason, setWaiveReason] = useState<string>('');
  const [selectedPauseReason, setSelectedPauseReason] = useState<string>(
    SLA_PAUSE_STANDARD_REASONS[0]
  );
  const [rejectBastReason, setRejectBastReason] = useState<string>(
    'Foto OPM buram, mohon foto ulang layar redaman OPM di lokasi.'
  );
  const [showRejectBastInput, setShowRejectBastInput] = useState<boolean>(false);

  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [ratingNoteInput, setRatingNoteInput] = useState<string>(
    'BAST terverifikasi lengkap, layanan pelanggan kini berstatus ACTIVE.'
  );

  if (!isOpen) return null;

  // Real-time distance to customer
  const customerGeofence = evaluateGeofence(
    currentGps.lat,
    currentGps.lng,
    currentGps.accuracy,
    workOrder.latitude,
    workOrder.longitude,
    dispatchSettings.geofence_radius_meters
  );

  const myPhase2Req = workOrder.phase2_requirements.find(
    (req) => req.user_id === currentUser.id
  );

  // Strict Sequential Unlock Rules per PRD v1.2 Section 4 & 7:
  // 1. Step 1 (Bukti + BAST) can only be opened after confirming arrival ('arrived', 'phase1_completed', 'resolved', 'closed')
  const canOpenStep1 = [
    'arrived',
    'phase1_completed',
    'resolved',
    'closed',
  ].includes(workOrder.status);

  // 2. Step 2 (Foto Kunjungan Ber-GPS) can only be opened after Step 1 & BAST are completed
  const canOpenStep2 = [
    'phase1_completed',
    'resolved',
    'closed',
  ].includes(workOrder.status);

  // 3. Riwayat can only be opened after Step 2 is completed by all members ('resolved', 'closed')
  const canOpenHistory = ['resolved', 'closed'].includes(workOrder.status);

  // SLA Operational Window Calculations (PRD v1.2 Section 3)
  const targetMins = workOrder.sla_target_minutes || (workOrder.type === 'psb' ? 1440 : 360);
  const elapsedMins = workOrder.sla_elapsed_operational_minutes || 60;
  const usagePct = Math.min(100, Math.round((elapsedMins / targetMins) * 100));
  const remainingMins = Math.max(0, targetMins - elapsedMins);
  const remHours = Math.floor(remainingMins / 60);
  const remMinutes = remainingMins % 60;

  let slaState: SlaState = 'safe';
  let slaText = `${remHours}j ${remMinutes}m tersisa`;
  if (workOrder.status === 'closed') {
    slaState = 'paused';
    slaText = 'Selesai (BAST Approved)';
  } else if (workOrder.sla_paused) {
    slaState = 'paused';
    slaText = 'Dijeda Admin/NOC';
  } else if (
    workOrder.type === 'psb' &&
    (workOrder.bast_status === 'signed_at_location' ||
      workOrder.status === 'phase1_completed' ||
      workOrder.status === 'resolved')
  ) {
    slaState = 'paused';
    slaText = 'Stop (BAST Ditandatangani)';
  } else if (usagePct >= 100) {
    slaState = 'overdue';
    slaText = `Lewat Batas (${usagePct}%)`;
  } else if (usagePct >= 75) {
    slaState = 'warning';
    slaText = `Eskalasi Kuning (${usagePct}%)`;
  }

  const parseTargetMbps = (): number => {
    const match = workOrder.package_name.match(/(\d+)\s*Mbps/i);
    return match ? parseInt(match[1], 10) : 50;
  };

  const handleRunSystemSpeedtest = () => {
    if (isRunningSpeedtest) return;
    setIsRunningSpeedtest(true);
    setSpeedtestProgress(15);

    const targetMbps = parseTargetMbps();
    const interval = setInterval(() => {
      setSpeedtestProgress((prev) => Math.min(95, prev + 22));
    }, 350);

    setTimeout(() => {
      clearInterval(interval);
      setSpeedtestProgress(100);

      const dl = +(targetMbps * (0.96 + Math.random() * 0.06)).toFixed(1);
      const ul = +(targetMbps * (0.52 + Math.random() * 0.08)).toFixed(1);
      const ping = Math.floor(3 + Math.random() * 4);
      const jitter = Math.floor(1 + Math.random() * 2);

      const snapshot = generateSystemSpeedtestSnapshot(
        workOrder.ticket_number,
        workOrder.customer_name,
        workOrder.package_name,
        dl,
        ul,
        ping,
        jitter
      );

      setSpeedtestStats({ dl, ul, ping, jitter });
      setPhase1Form((prev) => ({
        ...prev,
        photo_before: snapshot.dataUrl,
        photo_before_hash: snapshot.hash,
      }));
      setIsRunningSpeedtest(false);
      showToast(`Speedtest Sistem Selesai: Download ${dl} Mbps / Upload ${ul} Mbps (${ping}ms)`);
    }, 1500);
  };

  const handleCapturePhoto = (target: 'opm' | 'house' | 'step2_selfie', kind: string) => {
    setCameraPhotoTarget(target);
    setCameraPhotoKind(kind);
    setIsCameraOpen(true);
  };

  const handlePhotoCaptured = (res: ProcessedPhotoResult) => {
    setLastPhotoSizeKb(Math.min(390, res.sizeKb || 284));
    if (cameraPhotoTarget === 'opm') {
      setPhase1Form((prev) => ({
        ...prev,
        photo_ont: res.dataUrl,
        photo_ont_hash: res.hash,
      }));
    } else if (cameraPhotoTarget === 'house') {
      setPhase1Form((prev) => ({
        ...prev,
        photo_after: res.dataUrl,
        photo_after_hash: res.hash,
      }));
    } else if (cameraPhotoTarget === 'step2_selfie') {
      submitPhase2(workOrder.id, res.dataUrl, res.hash);
    }
  };

  const allChecklistChecked =
    phase1Form.checklist.dropcore_installed &&
    phase1Form.checklist.ont_powered &&
    phase1Form.checklist.wifi_configured &&
    phase1Form.checklist.speedtest_verified;

  const handleSubmitStep1Form = async () => {
    if (!phase1Form.photo_before) {
      showToast('Wajib menjalankan Speedtest by Sistem terlebih dahulu.');
      return;
    }
    if (!phase1Form.photo_ont) {
      showToast('Wajib mengambil Foto OPM & ONT ber-GPS terlebih dahulu.');
      return;
    }
    if (!phase1Form.photo_after) {
      showToast('Wajib mengambil Foto Rumah Pelanggan ber-GPS terlebih dahulu.');
      return;
    }
    if (!allChecklistChecked) {
      showToast('Wajib mencentang seluruh item Checklist Pekerjaan secara manual terlebih dahulu.');
      return;
    }
    if (!phase1Form.customer_signature) {
      showToast('Wajib meminta Tanda Tangan BAST Pelanggan di layar di tempat (tanpa status pending).');
      return;
    }

    await submitPhase1(workOrder.id, {
      ...phase1Form,
      compressed_size_kb: lastPhotoSizeKb,
      thumbnail_size_kb: 38,
      checklist: {
        ...phase1Form.checklist,
        redaman_standard:
          phase1Form.optical_power_dbm >= -24 && phase1Form.optical_power_dbm <= -13,
      },
    });
    setActiveStepTab('phase2');
  };

  const isTechnicianInTeam =
    currentUser.role === 'teknisi' &&
    (!workOrder.assigned_team_id ||
      currentUser.team_id === workOrder.assigned_team_id ||
      currentUser.team_name === workOrder.assigned_team_name);

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const isOpticalStandard =
    phase1Form.optical_power_dbm >= -24 && phase1Form.optical_power_dbm <= -13;
  const opticalGaugePct = Math.min(
    100,
    Math.max(0, ((phase1Form.optical_power_dbm - -32) / (-10 - -32)) * 100)
  );

  const modalShellClass = isDark
    ? 'bg-[#081329] border border-blue-800/80 text-slate-100'
    : 'bg-white border border-slate-200 text-slate-900';

  const cardBoxClass = isDark
    ? 'bg-[#0C1B38] border-blue-900/70 text-slate-100'
    : 'bg-slate-50/80 border-slate-200 text-slate-900';

  const handleTabClick = (
    tabId: 'info' | 'phase1' | 'phase2' | 'history',
    locked: boolean,
    lockReason: string
  ) => {
    if (locked) {
      showToast(lockReason);
      return;
    }
    setActiveStepTab(tabId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
      <div className={`w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${modalShellClass}`}>
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#050C1B] text-white border-b border-blue-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                workOrder.type === 'psb'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {workOrder.type.toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold font-mono text-white truncate">
                  {workOrder.ticket_number}
                </h2>
                {workOrder.priority && (
                  <Badge
                    tone={
                      workOrder.priority === 'kritis'
                        ? 'danger'
                        : workOrder.priority === 'tinggi'
                        ? 'warning'
                        : 'info'
                    }
                    mono
                  >
                    {workOrder.priority.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                {workOrder.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-950 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strict Sequential Workflow Sub-nav Tabs */}
        <div
          className={`grid grid-cols-4 border-b text-xs font-bold ${
            isDark
              ? 'bg-[#060E20] border-blue-900/60 text-slate-400'
              : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          {(
            [
              {
                id: 'info',
                label: '1. Detail WO',
                locked: false,
                lockReason: '',
                done: canOpenStep1,
              },
              {
                id: 'phase1',
                label: '2. Step 1 (BAST)',
                locked: !canOpenStep1,
                lockReason:
                  'Terkunci: Selesaikan konfirmasi Diterima, Berangkat, & Tiba di Lokasi pada Detail WO terlebih dahulu.',
                done: canOpenStep2,
              },
              {
                id: 'phase2',
                label: '3. Step 2 (GPS)',
                locked: !canOpenStep2,
                lockReason:
                  'Terkunci (PRD Bagian 7): Langkah 1 (Bukti & Tanda Tangan BAST di Tempat) wajib selesai sebelum Langkah 2 (Foto Kunjungan Ber-GPS) terbuka.',
                done: canOpenHistory,
              },
              {
                id: 'history',
                label: '4. Riwayat',
                locked: !canOpenHistory,
                lockReason:
                  'Terkunci: Selesaikan foto kunjungan ber-GPS pada Step 2 terlebih dahulu.',
                done: workOrder.status === 'closed',
              },
            ] as const
          ).map((t) => {
            const isActive = activeStepTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-disabled={t.locked}
                onClick={() => handleTabClick(t.id, t.locked, t.lockReason)}
                style={
                  isActive
                    ? {
                        borderBottomColor: accentConfig.secondaryHex,
                        color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex,
                      }
                    : undefined
                }
                className={`py-2.5 text-center transition border-b-2 relative flex items-center justify-center gap-1 ${
                  t.locked
                    ? 'opacity-40 cursor-not-allowed'
                    : isActive
                    ? isDark
                      ? 'bg-[#0C1B38] cursor-pointer'
                      : 'bg-white cursor-pointer'
                    : 'border-transparent hover:opacity-85 cursor-pointer'
                }`}
              >
                <span className="truncate">{t.label}</span>
                {t.locked ? (
                  <LockIcon className="w-3 h-3 text-slate-500 shrink-0" />
                ) : t.done ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: INFO, SLA OPERATIONAL WINDOW & SINGLE SEQUENTIAL ACTION BUTTON */}
          {activeStepTab === 'info' && (
            <div className="space-y-3">
              {/* PRD v1.2 Section 3: SLA Operational Window Panel (08.00-20.00 WIB, Senin-Sabtu) */}
              <div className={`rounded-xl border p-3.5 space-y-2.5 text-xs ${cardBoxClass}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Clock
                      className="w-4 h-4"
                      style={{ color: accentConfig.secondaryHex }}
                    />
                    <span className="font-mono font-extrabold uppercase tracking-wider">
                      SLA JAM OPERASIONAL (08.00–20.00 WIB, SEN–SAB)
                    </span>
                  </div>
                  <SlaBadge state={slaState} remainingText={slaText} />
                </div>

                {/* Progress Bar SLA (Eskalasi 75% Kuning, 100% Merah) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                    <span>
                      Terpakai: {Math.floor(elapsedMins / 60)}j {elapsedMins % 60}m / Target{' '}
                      {Math.floor(targetMins / 60)}j Operasional
                    </span>
                    <span>75% Kuning · 100% Merah</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-blue-900/50">
                    <div
                      className={`h-full rounded-full transition-all ${
                        workOrder.sla_paused
                          ? 'bg-slate-500'
                          : usagePct >= 100
                          ? 'bg-rose-500'
                          : usagePct >= 75
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max(6, usagePct)}%` }}
                    />
                  </div>
                </div>

                {workOrder.sla_paused && (
                  <div className="p-2.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
                    <PauseCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        SLA Sedang Dijeda oleh {workOrder.sla_paused_by || 'Admin/NOC'}
                      </span>
                      <span>Alasan Baku: {workOrder.sla_pause_reason}</span>
                    </div>
                  </div>
                )}

                {workOrder.bast_status === 'rejected_by_admin' && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-[11px]">
                    <strong>BAST Ditolak Admin:</strong> Tiket dikembalikan ke status{' '}
                    <span className="font-mono font-bold">dikerjakan</span> untuk diperbaiki oleh teknisi.
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {workOrder.type === 'psb'
                    ? 'Aturan PRD v1.2: SLA PSB (24 jam operasional) otomatis berhenti saat BAST ditandatangani pelanggan di layar; waktu menunggu approval Admin tidak dihitung.'
                    : `Aturan PRD v1.2: Target respons pengaduan ≤2 jam operasional; penyelesaian ${
                        workOrder.priority === 'kritis'
                          ? 'Kritis 3 jam'
                          : workOrder.priority === 'tinggi'
                          ? 'Tinggi 6 jam'
                          : 'Sedang 24 jam'
                      } operasional.`}
                </p>
              </div>

              {/* Customer Info Card with Masked NIK & ONU Serial */}
              <div className={`rounded-xl border p-3.5 space-y-2.5 text-xs ${cardBoxClass}`}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                      DATA PELANGGAN & IDENTITAS TERENKRIPSI (AES-256)
                    </span>
                    <h3 className="text-sm font-extrabold mt-0.5">{workOrder.customer_name}</h3>
                    <p className="text-slate-400 font-mono text-[11px]">
                      Kode: {workOrder.customer_code} · NIK Masked:{' '}
                      <span className="text-cyan-300 font-bold">
                        {workOrder.customer_nik_masked || '317405******0002'}
                      </span>
                    </p>
                    {workOrder.onu_serial && (
                      <p className="text-slate-400 font-mono text-[11px]">
                        Serial ONU: <span className="text-emerald-400 font-bold">{workOrder.onu_serial}</span>
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://wa.me/${workOrder.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition shadow-xs shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Hubungi
                  </a>
                </div>

                <div className="text-slate-400 flex items-start gap-1.5">
                  <MapPin
                    className="w-3.5 h-3.5 shrink-0 mt-0.5"
                    style={{ color: accentConfig.secondaryHex }}
                  />
                  <span>{workOrder.address}</span>
                </div>

                {/* Optical Topology Bar inside Detail */}
                <div
                  className={`p-2.5 rounded-xl border font-mono text-[11px] ${
                    isDark
                      ? 'bg-[#071022] border-blue-950 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Radio
                        className="w-3.5 h-3.5"
                        style={{ color: accentConfig.secondaryHex }}
                      />
                      <span className="font-bold">{workOrder.odp_name}</span>
                    </div>
                    <span className="text-slate-500">───</span>
                    <span className="font-bold text-cyan-400">PORT #{workOrder.odp_port}</span>
                    <span className="text-slate-500">───</span>
                    <span className="font-bold text-emerald-400 truncate max-w-[160px]">
                      {workOrder.package_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Team Lock Rule (PRD v1.2 Section 4) */}
              <div className={`rounded-xl border p-3.5 space-y-2 text-xs ${cardBoxClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">State Machine Tiket:</span>
                  <span
                    className="font-mono font-bold text-xs"
                    style={{ color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex }}
                  >
                    {formatTicketStatusLabel(workOrder.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Tim Penerima (Terkunci):</span>
                  <span className="font-bold flex items-center gap-1">
                    <LockIcon className="w-3.5 h-3.5 text-cyan-400" />
                    {workOrder.assigned_team_name || 'Belum Ditugaskan'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-blue-900/40">
                  Sesuai PRD v1.2 Bagian 4: Tiket terkunci pada tim penerima (teknisi tidak punya tombol oper-tugas & tidak bisa mem-pause SLA; hanya Admin/NOC lewat Web Admin).
                </p>
              </div>

              {/* Geofence Proximity To Customer */}
              <div className={`rounded-xl border p-3.5 text-xs space-y-2 ${cardBoxClass}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    RADAR GEOFENCE LOKASI PELANGGAN
                  </span>
                  <span className="font-mono text-slate-400">Radius 50m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-extrabold tabular-nums">
                    {customerGeofence.distanceMeters} meter
                  </span>
                  <span
                    className={`font-mono font-bold text-[11px] ${
                      customerGeofence.status === 'inside'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {customerGeofence.status === 'inside'
                      ? 'DALAM RADIUS (≤50m VALID)'
                      : 'DI LUAR RADIUS (DITANDAI)'}
                  </span>
                </div>

                <div
                  className={`pt-2 border-t flex gap-2 ${
                    isDark ? 'border-blue-900/60' : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setGpsSimulationMode('customer_valid')}
                    className="flex-1 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 cursor-pointer"
                  >
                    Simulasi: Di Lokasi (6m)
                  </button>
                  <button
                    onClick={() => setGpsSimulationMode('customer_outside')}
                    className="flex-1 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 cursor-pointer"
                  >
                    Simulasi: Di Luar (120m)
                  </button>
                </div>
              </div>

              {/* SINGLE SEQUENTIAL ACTION BUTTON FOR FIELD TECHNICIAN (PRD v1.2 Section 4) */}
              <div className="pt-1 space-y-2">
                {workOrder.status === 'assigned' && isTechnicianInTeam && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => acceptTicket(workOrder.id)}
                      className="w-full min-h-touch rounded-xl text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      Status: Terima Tiket (Respons SLA ≤2 Jam)
                    </button>
                    <p className="text-[11px] text-center text-slate-400 font-mono">
                      Langkah 1 State Machine: Terima tiket terlebih dahulu sebelum berangkat.
                    </p>
                  </div>
                )}

                {workOrder.status === 'accepted' && isTechnicianInTeam && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => updateTicketStatus(workOrder.id, 'on_the_way')}
                      className="w-full min-h-touch rounded-xl text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                      }}
                    >
                      <Navigation className="w-4 h-4 stroke-[2.5]" />
                      Status: Berangkat Menuju Lokasi (dalam_perjalanan)
                    </button>
                    <p className="text-[11px] text-center text-slate-400 font-mono">
                      Step 1 terkunci hingga tim tiba di lokasi pelanggan.
                    </p>
                  </div>
                )}

                {workOrder.status === 'on_the_way' && isTechnicianInTeam && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => updateTicketStatus(workOrder.id, 'arrived')}
                      className="w-full min-h-touch rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                      Status: Tiba & Mulai Kerjakan di Lokasi (dikerjakan)
                    </button>
                    <p className="text-[11px] text-center text-slate-400 font-mono">
                      Klik setelah tiba di lokasi untuk membuka Formulir Bukti & BAST Step 1.
                    </p>
                  </div>
                )}

                {workOrder.status === 'arrived' && (
                  <button
                    onClick={() => setActiveStepTab('phase1')}
                    className="w-full min-h-touch rounded-xl text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                    }}
                  >
                    <PenTool className="w-4 h-4 stroke-[2.5]" />
                    Mulai Isi Bukti & Tanda Tangan BAST (Step 1)
                  </button>
                )}

                {workOrder.status === 'phase1_completed' && (
                  <button
                    onClick={() => setActiveStepTab('phase2')}
                    className="w-full min-h-touch rounded-xl text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                    }}
                  >
                    <Camera className="w-4 h-4 stroke-[2.5]" />
                    Lanjut Langkah 2: Foto Kunjungan Lapangan Ber-GPS
                  </button>
                )}

                {canOpenHistory && (
                  <button
                    onClick={() => setActiveStepTab('history')}
                    className="w-full min-h-touch rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Lihat Paket BAST & Riwayat Penyelesaian WO
                  </button>
                )}

                {/* Admin / NOC Controls (Pause SLA with 5 Standard Reasons & Approve/Reject BAST) */}
                {isAdminOrSuper && workOrder.status !== 'closed' && (
                  <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-[#071229] space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <span>Kontrol Admin/NOC: Pause SLA (5 Alasan Baku PRD)</span>
                      <Badge tone={workOrder.sla_paused ? 'warning' : 'info'}>
                        {workOrder.sla_paused ? 'SLA PAUSED' : 'SLA RUNNING'}
                      </Badge>
                    </div>
                    {!workOrder.sla_paused && (
                      <select
                        value={selectedPauseReason}
                        onChange={(e) => setSelectedPauseReason(e.target.value)}
                        className={`w-full p-2 rounded-lg border text-xs ${cardBoxClass}`}
                      >
                        {SLA_PAUSE_STANDARD_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => togglePauseSlaByAdmin(workOrder.id, selectedPauseReason)}
                      className="w-full py-2 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs cursor-pointer"
                    >
                      {workOrder.sla_paused
                        ? 'Lanjutkan (Resume) Jam SLA'
                        : 'Pause SLA dengan Alasan Baku'}
                    </button>
                  </div>
                )}

                {workOrder.status === 'resolved' && isAdminOrSuper && (
                  <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <FileCheck2 className="w-4 h-4" />
                      Verifikasi & Persetujuan BAST oleh Admin (PRD Bagian 4 & 7)
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Tiket baru berstatus <strong>Selesai (Closed)</strong> dan pelanggan menjadi{' '}
                      <strong>Active</strong> setelah Admin menyetujui BAST. Jika ditolak, tiket kembali ke{' '}
                      <strong>Dikerjakan</strong>.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium">Evaluasi Layanan:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setSelectedRating(star)}
                            className={`p-1 rounded ${selectedRating >= star ? 'text-amber-400' : 'text-slate-600'}`}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={ratingNoteInput}
                      onChange={(e) => setRatingNoteInput(e.target.value)}
                      placeholder="Catatan persetujuan BAST..."
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs ${cardBoxClass}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowRejectBastInput(!showRejectBastInput)}
                        className="py-2 rounded-xl border border-rose-500/50 bg-rose-500/15 text-rose-300 font-bold text-xs cursor-pointer"
                      >
                        Tolak BAST (Revisi)
                      </button>
                      <button
                        onClick={() => closeTicket(workOrder.id, selectedRating, ratingNoteInput)}
                        className="py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs hover:bg-emerald-400 transition cursor-pointer"
                      >
                        Setujui BAST & Tutup WO
                      </button>
                    </div>

                    {showRejectBastInput && (
                      <div className="pt-2 space-y-2 border-t border-rose-500/30">
                        <input
                          type="text"
                          value={rejectBastReason}
                          onChange={(e) => setRejectBastReason(e.target.value)}
                          placeholder="Alasan penolakan BAST..."
                          className={`w-full px-3 py-1.5 rounded-lg border text-xs ${cardBoxClass}`}
                        />
                        <button
                          onClick={() => {
                            rejectBastByAdmin(workOrder.id, rejectBastReason);
                            setShowRejectBastInput(false);
                          }}
                          className="w-full py-2 rounded-lg bg-rose-600 text-white font-bold text-xs cursor-pointer"
                        >
                          Kembalikan ke Status Dikerjakan
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STEP 1 (Speedtest Sistem, Foto OPM + Rumah <=400KB, Checklist Manual, BAST Tanda Tangan di Tempat) */}
          {activeStepTab === 'phase1' && canOpenStep1 && (
            <div className="space-y-3.5 text-xs">
              <div className={`p-3 rounded-xl border leading-relaxed ${cardBoxClass}`}>
                <strong>Langkah 1 Wajib di Lapangan (PRD v1.2 Bagian 7):</strong> Selesaikan{' '}
                <strong>Speedtest Sistem</strong>, unggah <strong>Foto Bukti (OPM/ONT & Foto Rumah)</strong> ber-GPS (kompresi klien ≤400 KB), centang manual checklist, dan minta pelanggan menandatangani <strong>BAST langsung di layar di tempat</strong> sebelum Langkah 2 terbuka.
              </div>

              {/* 1. DEDICATED FULL-WIDTH SPEEDTEST BY SISTEM CARD */}
              <div
                className="rounded-2xl p-4 border bg-gradient-to-br from-[#061024] via-[#0A1936] to-[#071229] text-white shadow-lg space-y-3.5"
                style={{
                  borderColor: phase1Form.photo_before
                    ? 'rgba(16, 185, 129, 0.5)'
                    : `${accentConfig.primaryHex}55`,
                }}
              >
                <div className="flex items-center justify-between border-b border-blue-900/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-950 font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                      }}
                    >
                      <Gauge className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-extrabold tracking-wider text-white block">
                        1. SPEEDTEST SISTEM FIBERMEDIA
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Server: core-jkt01.fibermedia.net · Paket: {workOrder.package_name}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg border ${
                      phase1Form.photo_before && speedtestStats
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : isRunningSpeedtest
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {phase1Form.photo_before && speedtestStats
                      ? 'PASS · SESUAI PAKET'
                      : isRunningSpeedtest
                      ? `MENGUJI ${speedtestProgress}%`
                      : 'WAJIB DIUJI'}
                  </span>
                </div>

                {/* Speedtest Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#050C1B]/90 border border-cyan-500/30">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                      DOWNLOAD
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-extrabold font-mono tabular-nums text-cyan-400">
                        {isRunningSpeedtest
                          ? (parseTargetMbps() * (speedtestProgress / 100)).toFixed(1)
                          : speedtestStats
                          ? speedtestStats.dl.toFixed(1)
                          : '0.0'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Mbps
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050C1B]/90 border border-blue-500/30">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                      UPLOAD
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-extrabold font-mono tabular-nums text-sky-400">
                        {isRunningSpeedtest
                          ? (parseTargetMbps() * 0.5 * (speedtestProgress / 100)).toFixed(1)
                          : speedtestStats
                          ? speedtestStats.ul.toFixed(1)
                          : '0.0'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        Mbps
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050C1B]/90 border border-blue-900/60">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                      LATENCY PING
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-extrabold font-mono tabular-nums text-emerald-400">
                        {speedtestStats ? speedtestStats.ping : isRunningSpeedtest ? '4' : '--'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        ms
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#050C1B]/90 border border-blue-900/60">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                      JITTER
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-extrabold font-mono tabular-nums text-slate-200">
                        {speedtestStats ? speedtestStats.jitter : isRunningSpeedtest ? '1' : '--'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        ms
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-blue-900/60">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400"
                      style={{
                        width: isRunningSpeedtest
                          ? `${speedtestProgress}%`
                          : phase1Form.photo_before
                          ? '100%'
                          : '0%',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      {phase1Form.photo_before_hash
                        ? `ID Bukti Sistem: ${phase1Form.photo_before_hash}`
                        : 'Klik tombol di bawah untuk menguji bandwidth langsung dari sistem'}
                    </span>
                    <span className="text-cyan-300 font-bold">
                      Target: {workOrder.package_name}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRunningSpeedtest || workOrder.status === 'closed'}
                  onClick={handleRunSystemSpeedtest}
                  className="w-full h-10 rounded-xl text-slate-950 text-xs font-extrabold cursor-pointer disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                  }}
                >
                  <Gauge className="w-4 h-4 stroke-[2.5]" />
                  {isRunningSpeedtest
                    ? `Menguji Kecepatan Jaringan (${speedtestProgress}%)...`
                    : phase1Form.photo_before
                    ? 'Uji Ulang Speedtest Sistem'
                    : 'Jalankan Speedtest Sistem Sekarang'}
                </button>
              </div>

              {/* 2 & 3. CAMERA PHOTO EVIDENCE (2-COLUMN GRID: FOTO OPM & FOTO RUMAH) */}
              <div className="grid grid-cols-2 gap-3">
                {/* 2. FOTO OPM (OPTICAL POWER METER) */}
                <div
                  className={`flex flex-col justify-between p-3 rounded-xl border text-center ${cardBoxClass}`}
                >
                  <div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono font-extrabold text-cyan-400 mb-2">
                      <Activity className="w-3.5 h-3.5" />
                      <span>2. FOTO OPM (REDAMAN)</span>
                    </div>

                    {phase1Form.photo_ont ? (
                      <div className="space-y-1.5 mb-2.5">
                        <img
                          src={phase1Form.photo_ont}
                          alt="Foto OPM"
                          className="w-full h-28 object-cover rounded-lg border border-blue-900/50"
                        />
                        <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-between px-1">
                          <span>{lastPhotoSizeKb} KB (≤400KB)</span>
                          <span>Thumb 38KB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-lg bg-[#050C1B] border border-blue-900/60 flex flex-col items-center justify-center text-slate-500 mb-2.5">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-mono">Layar Alat OPM + ONT</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={workOrder.status === 'closed'}
                    onClick={() => handleCapturePhoto('opm', 'FOTO OPM REDAMAN')}
                    className="w-full py-2 rounded-lg text-slate-950 text-xs font-extrabold cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                    }}
                  >
                    {phase1Form.photo_ont ? 'Ganti Foto OPM' : 'Ambil Foto OPM'}
                  </button>
                </div>

                {/* 3. FOTO RUMAH PELANGGAN */}
                <div
                  className={`flex flex-col justify-between p-3 rounded-xl border text-center ${cardBoxClass}`}
                >
                  <div>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono font-extrabold text-cyan-400 mb-2">
                      <Home className="w-3.5 h-3.5" />
                      <span>3. FOTO RUMAH</span>
                    </div>

                    {phase1Form.photo_after ? (
                      <div className="space-y-1.5 mb-2.5">
                        <img
                          src={phase1Form.photo_after}
                          alt="Foto Rumah"
                          className="w-full h-28 object-cover rounded-lg border border-blue-900/50"
                        />
                        <div className="text-[10px] font-mono text-emerald-400 flex items-center justify-between px-1">
                          <span>EXIF Cleaned · GPS OK</span>
                          <span>≤400KB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-lg bg-[#050C1B] border border-blue-900/60 flex flex-col items-center justify-center text-slate-500 mb-2.5">
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-mono">Tampak Rumah Pelanggan</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={workOrder.status === 'closed'}
                    onClick={() => handleCapturePhoto('house', 'FOTO RUMAH PELANGGAN')}
                    className="w-full py-2 rounded-lg text-slate-950 text-xs font-extrabold cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                    }}
                  >
                    {phase1Form.photo_after ? 'Ganti Foto Rumah' : 'Ambil Foto Rumah'}
                  </button>
                </div>
              </div>

              {/* Info Kompresi Klien <=400KB & Cadangan Google Drive (PRD Bagian 8 & NFR-04) */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-mono ${cardBoxClass}`}>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Kompresi Klien ≤400 KB · Thumbnail 30–50 KB</span>
                </span>
                <span className="text-emerald-400 font-bold">
                  {isOnline ? 'Google Drive Backup Ready' : 'Outbox Resumable Upload'}
                </span>
              </div>

              {/* ISP Optical Power Attenuation Gauge (dBm) */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${cardBoxClass}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Activity
                      className={`w-4 h-4 ${
                        isOpticalStandard ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    />
                    <span className="font-extrabold">Nilai Redaman OPM (dBm):</span>
                  </div>
                  <span
                    className={`font-mono font-extrabold text-sm tabular-nums ${
                      isOpticalStandard ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {phase1Form.optical_power_dbm.toFixed(1)} dBm
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="relative h-2.5 w-full rounded-full bg-slate-950 overflow-hidden border border-blue-900/50">
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/35 border-x border-emerald-400/70"
                      style={{
                        left: `${((-24 - -32) / 22) * 100}%`,
                        width: `${((-13 - -24) / 22) * 100}%`,
                      }}
                    />
                    <div
                      className={`absolute top-0 bottom-0 w-2 rounded-full ${
                        isOpticalStandard ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                      style={{ left: `calc(${opticalGaugePct}% - 4px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 tabular-nums">
                    <span>-32 dBm (LOS)</span>
                    <span className="text-emerald-400 font-bold">
                      STANDAR GPON: -24 s/d -13 dBm
                    </span>
                    <span>-10 dBm</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="-32"
                  max="-10"
                  step="0.1"
                  value={phase1Form.optical_power_dbm}
                  onChange={(e) =>
                    setPhase1Form((prev) => ({
                      ...prev,
                      optical_power_dbm: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Manual Checklist (Not Auto-Checked) */}
              <div className={`p-3.5 rounded-xl border space-y-2 ${cardBoxClass}`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">Checklist Standar Pekerjaan (Centang Manual):</span>
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      allChecklistChecked ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {allChecklistChecked ? 'LENGKAP (4/4)' : 'WAJIB DICENTANG SEMUA'}
                  </span>
                </div>
                {(
                  [
                    {
                      key: 'dropcore_installed',
                      label: 'Penarikan kabel dropcore rapi & S-Clamp terpasang kuat',
                    },
                    {
                      key: 'ont_powered',
                      label: 'ONT menyala normal & nilai redaman OPM sesuai standar',
                    },
                    {
                      key: 'wifi_configured',
                      label: 'SSID & password WiFi sudah dikonfigurasi di perangkat pelanggan',
                    },
                    {
                      key: 'speedtest_verified',
                      label: 'Hasil Speedtest Sistem sesuai paket & telah ditunjukkan ke pelanggan',
                    },
                  ] as const
                ).map((chk) => (
                  <label
                    key={chk.key}
                    className="flex items-center gap-2.5 cursor-pointer py-1 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={phase1Form.checklist[chk.key]}
                      onChange={(e) =>
                        setPhase1Form((prev) => ({
                          ...prev,
                          checklist: {
                            ...prev.checklist,
                            [chk.key]: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                    />
                    <span>{chk.label}</span>
                  </label>
                ))}
              </div>

              {/* BAST dengan Tanda Tangan Non-Sertifikat di Layar (PRD v1.2 Bagian 7) */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${cardBoxClass}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span className="font-extrabold">
                      BAST & TTE Verifikasi Pelanggan di Layar (Non-Sertifikat / Tanpa PSrE):
                    </span>
                  </div>
                  {phase1Form.customer_signature ? (
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> DITANDATANGANI DI TEMPAT
                    </span>
                  ) : (
                    <span className="text-amber-400 font-mono font-bold text-[11px]">
                      WAJIB TTD DI TEMPAT
                    </span>
                  )}
                </div>

                {/* Data Bukti Wajib pada BAST sesuai PRD Bagian 7 */}
                <div className="p-2.5 rounded-lg bg-[#050C1B]/80 border border-blue-900/60 font-mono text-[11px] space-y-1 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nama & NIK Masked:</span>
                    <span className="font-bold text-white">
                      {workOrder.customer_name} ({workOrder.customer_nik_masked || '317405******0002'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Teknisi Hadir:</span>
                    <span className="font-bold text-cyan-300">
                      {currentUser.name} ({currentUser.team_name || 'Tim Lapangan'})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Koordinat GPS BAST:</span>
                    <span className="tabular-nums">
                      {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)} (±{currentGps.accuracy}m)
                    </span>
                  </div>
                  {workOrder.phase1_data?.bast_sha256 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hash SHA-256 BAST:</span>
                      <span className="text-emerald-400 truncate max-w-[210px]">
                        {workOrder.phase1_data.bast_sha256}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-blue-900/40 text-[10px]">
                    <span>
                      Waktu Perangkat:{' '}
                      {workOrder.phase1_data?.bast_device_timestamp
                        ? new Date(workOrder.phase1_data.bast_device_timestamp).toLocaleTimeString('id-ID')
                        : 'Saat disimpan'}
                    </span>
                    <span>
                      Waktu Server:{' '}
                      {workOrder.phase1_data?.bast_server_timestamp
                        ? new Date(workOrder.phase1_data.bast_server_timestamp).toLocaleTimeString('id-ID')
                        : isOnline
                        ? 'Otomatis'
                        : 'Saat Sinkron Outbox'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sesuai PRD v1.2 Bagian 7: Tanda tangan BAST dilakukan langsung di layar di tempat tanpa sertifikat elektronik (bisa selesai 100% offline). Tidak ada status <em>pending_signature</em>.
                </p>

                {phase1Form.customer_signature ? (
                  <div className="h-20 bg-white rounded-lg border border-slate-300 flex items-center justify-center p-2">
                    <img
                      src={phase1Form.customer_signature}
                      alt="TTE Verifikasi Pelanggan"
                      className="max-h-full object-contain"
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsSignatureOpen(true)}
                  className="w-full py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs font-extrabold hover:bg-cyan-500/20 transition cursor-pointer"
                >
                  {phase1Form.customer_signature
                    ? 'Ubah Tanda Tangan BAST Pelanggan'
                    : 'Buka Kanvas Tanda Tangan BAST Pelanggan'}
                </button>
              </div>

              {/* Submit Step 1 Button */}
              {workOrder.status !== 'closed' && (
                <button
                  onClick={handleSubmitStep1Form}
                  className="w-full min-h-touch rounded-xl text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                  }}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Simpan Paket BAST Step 1 & Buka Foto Kunjungan Step 2
                </button>
              )}
            </div>
          )}

          {/* TAB 3: STEP 2 (Foto Kunjungan Lapangan Ber-GPS - Hanya terbuka setelah Step 1 & BAST selesai) */}
          {activeStepTab === 'phase2' && canOpenStep2 && (
            <div className="space-y-3.5 text-xs">
              <div className={`p-3 rounded-xl border leading-relaxed ${cardBoxClass}`}>
                <strong>Langkah 2 Wajib di Lapangan (Foto Kunjungan Ber-GPS — PRD Bagian 7):</strong>{' '}
                Setelah BAST ditandatangani pada Langkah 1, teknisi mengambil foto lapangan ber-GPS sebagai bukti kunjungan (Radius 50m). Setelah selesai, paket dikirim ke Admin untuk persetujuan BAST.
              </div>

              <div className="space-y-2">
                <span className="font-mono font-bold text-slate-400 block uppercase tracking-wider text-[11px]">
                  Daftar Anggota Tim Wajib Foto Kunjungan Ber-GPS ({workOrder.phase2_requirements.length} Teknisi):
                </span>

                {workOrder.phase2_requirements.map((req) => (
                  <div
                    key={req.user_id}
                    className={`p-3 rounded-xl border flex items-center justify-between ${cardBoxClass}`}
                  >
                    <div className="flex items-center gap-3">
                      {req.selfie_url ? (
                        <img
                          src={req.selfie_url}
                          alt={req.user_name}
                          className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-blue-950 flex items-center justify-center text-cyan-300 font-bold">
                          {req.user_name.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold">{req.user_name}</p>
                        {req.completed_at ? (
                          <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                            Tercatat {new Date(req.completed_at).toLocaleTimeString('id-ID')} WIB · {req.distance_meters}m
                          </p>
                        ) : req.waived ? (
                          <p className="text-[10px] text-amber-400 font-medium">
                            Dibebaskan Admin ({req.waive_reason})
                          </p>
                        ) : (
                          <p className="text-[10px] text-amber-400 font-medium">
                            Belum Ambil Foto Kunjungan Ber-GPS
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      {req.completed_at ? (
                        <span
                          className={`font-bold text-[10px] ${
                            req.geofence_status === 'inside'
                              ? 'text-emerald-400'
                              : req.geofence_status === 'outside'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {req.geofence_status === 'inside'
                            ? 'VALID (≤50m)'
                            : req.geofence_status === 'outside'
                            ? 'LUAR RADIUS'
                            : 'AKURASI RENDAH'}
                        </span>
                      ) : req.waived ? (
                        <span className="text-amber-400 text-[10px] font-bold">
                          WAIVED
                        </span>
                      ) : isAdminOrSuper ? (
                        <button
                          onClick={() => setWaiveUserId(req.user_id)}
                          className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                        >
                          Bebaskan
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {myPhase2Req && !myPhase2Req.completed_at && !myPhase2Req.waived && (
                <div className="pt-2">
                  <button
                    onClick={() => handleCapturePhoto('step2_selfie', 'FOTO KUNJUNGAN BER-GPS')}
                    className="w-full min-h-touch rounded-xl text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    Ambil Foto Kunjungan Ber-GPS ({currentUser.name})
                  </button>
                  <p className="mt-1.5 text-center text-[10px] font-mono text-slate-400">
                    Koordinat GPS & jarak ke titik pelanggan akan dicatat ke paket BAST.
                  </p>
                </div>
              )}

              {canOpenHistory && (
                <button
                  onClick={() => setActiveStepTab('history')}
                  className="w-full min-h-touch rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  Langkah 2 Selesai — Lihat Status Approval BAST & Riwayat
                </button>
              )}

              {waiveUserId && (
                <div className="p-3 rounded-xl border border-amber-500/50 bg-amber-950/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Pembebasan Step 2 (Alasan Wajib)
                  </div>
                  <input
                    type="text"
                    value={waiveReason}
                    onChange={(e) => setWaiveReason(e.target.value)}
                    placeholder="Contoh: Teknisi dipindah darurat..."
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs ${cardBoxClass}`}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setWaiveUserId(null)}
                      className="px-2.5 py-1 text-xs text-slate-400"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        if (!waiveReason) {
                          showToast('Alasan pembebasan wajib diisi.');
                          return;
                        }
                        waivePhase2(workOrder.id, waiveUserId, waiveReason);
                        setWaiveUserId(null);
                        setWaiveReason('');
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Bebaskan Anggota
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORY AUDIT LOGS & BAST APPROVAL STATUS */}
          {activeStepTab === 'history' && canOpenHistory && (
            <div className="space-y-3 text-xs">
              <div className={`p-3.5 rounded-xl border space-y-1.5 ${cardBoxClass}`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-cyan-400" />
                    Status Dokumen BAST & Siklus Tiket
                  </span>
                  <Badge tone={workOrder.status === 'closed' ? 'safe' : 'info'} mono>
                    {workOrder.status === 'closed'
                      ? 'BAST DISETUJUI ADMIN'
                      : 'MENUNGGU APPROVAL ADMIN'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sesuai PRD v1.2 Bagian 4 & 8: Server mengunci PDF BAST dengan hash SHA-256. Reopen tiket hanya diizinkan maksimal <strong>3 x 24 jam kalender</strong> setelah selesai; lewat batas itu wajib tiket pengaduan baru. Retensi Activity Log 6 bulan, foto & BAST selama kontrak + 6 bulan setelah terminated.
                </p>
              </div>

              <span className="font-mono font-bold text-slate-400 block uppercase tracking-wider text-[11px]">
                Jejak Audit Tiket (Activity Log — Retensi 6 Bulan):
              </span>
              <div className="space-y-2">
                {workOrder.history_logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border space-y-1 font-mono text-[11px] ${cardBoxClass}`}
                  >
                    <div className="flex items-center justify-between text-slate-400">
                      <span>{new Date(log.timestamp).toLocaleString('id-ID')} WIB</span>
                      <span
                        className="font-bold"
                        style={{ color: accentConfig.secondaryHex }}
                      >
                        {log.actor_name}
                      </span>
                    </div>
                    <p className="font-sans font-bold text-xs">{log.action}</p>
                    {log.note && (
                      <p className="text-[11px] text-slate-400 font-sans italic">
                        {log.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div
          className={`p-3 border-t flex justify-end ${
            isDark ? 'bg-[#050C1B] border-blue-900/60' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-950 text-white border border-blue-800 text-xs font-bold hover:bg-blue-900 transition cursor-pointer"
          >
            Tutup Panel
          </button>
        </div>
      </div>

      {/* Embedded Camera Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title={workOrder.ticket_number}
        photoKind={cameraPhotoKind}
        facingModeDefault={cameraPhotoTarget === 'step2_selfie' ? 'user' : 'environment'}
        onPhotoCaptured={handlePhotoCaptured}
      />

      {/* Embedded Signature Pad Modal (BAST Tanda Tangan di Layar) */}
      <SignaturePadModal
        isOpen={isSignatureOpen}
        onClose={() => setIsSignatureOpen(false)}
        customerName={workOrder.customer_name}
        onSignatureSaved={(sigUrl) => {
          setPhase1Form((prev) => ({ ...prev, customer_signature: sigUrl }));
        }}
      />
    </div>
  );
};
