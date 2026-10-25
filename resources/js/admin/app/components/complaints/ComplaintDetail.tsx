import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  Send,
  Wrench,
  CheckCircle2,
  XCircle,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Globe,
  FileText,
  AlertTriangle,
  UserCheck,
  Users,
  CheckCheck,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useAuth } from '../../context/AuthContext';
import {
  useComplaintDetail,
  useResolveRemoteComplaint,
  useVerifyCloseComplaint,
  useReturnComplaint,
  useCancelComplaint,
  useReopenComplaint,
  useAddComplaintNote,
  useTeknisiStartComplaint,
  useTeknisiPendingCustomer,
  useTeknisiResumeComplaint,
  useTeknisiResolveComplaint,
} from '../../hooks/useComplaints';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { ComplaintPriorityBadge } from './ComplaintPriorityBadge';
import { SlaCountdown } from './SlaCountdown';
import { ComplaintAssignModal } from './ComplaintAssignModal';
import { ComplaintReasonModal } from './ComplaintReasonModal';
import { ComplaintVerifyModal } from './ComplaintVerifyModal';
import { ComplaintEvidenceGallery } from './ComplaintEvidenceGallery';
import { ComplaintTimeline } from './ComplaintTimeline';
import { TeknisiResolveModal } from './TeknisiResolveModal';
import { TeknisiAttendanceModal } from './TeknisiAttendanceModal';
import { ComplaintAttendanceCard } from './ComplaintAttendanceCard';
import { formatDate } from '../../lib/formatters';
import { resolveImgUrl } from '../../lib/printBastHelper';
import type { ResolutionCategory } from '../../types/complaint';
import {
  useTeknisiPhase1Complaint,
} from '../../hooks/useComplaints';

export const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSuperadmin = user?.role === 'superadmin' || user?.roles?.includes('superadmin');
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
  const isTeknisi = user?.role === 'teknisi' || user?.roles?.includes('teknisi');

  const { data: complaint, isLoading, refetch } = useComplaintDetail(id);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isTeknisiResolveModalOpen, setIsTeknisiResolveModalOpen] = useState(false);
  const [isTeknisiAttendanceModalOpen, setIsTeknisiAttendanceModalOpen] = useState(false);
  const [reasonModalState, setReasonModalState] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'return' | 'reopen' | 'pending';
    title: string;
    description: string;
    confirmVariant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    type: 'cancel',
    title: '',
    description: '',
  });

  const [isResolveRemoteModalOpen, setIsResolveRemoteModalOpen] = useState(false);
  const [remoteResolutionCategory, setRemoteResolutionCategory] = useState<ResolutionCategory>('config_issue');
  const [remoteNotes, setRemoteNotes] = useState('');

  // Internal Note state
  const [newNote, setNewNote] = useState('');

  // Mutations
  const resolveRemoteMutation = useResolveRemoteComplaint();
  const verifyCloseMutation = useVerifyCloseComplaint();
  const returnMutation = useReturnComplaint();
  const cancelMutation = useCancelComplaint();
  const reopenMutation = useReopenComplaint();
  const resumeMutation = useTeknisiResumeComplaint();
  const teknisiStartMutation = useTeknisiStartComplaint();
  const teknisiPendingMutation = useTeknisiPendingCustomer();
  const teknisiResolveMutation = useTeknisiResolveComplaint();
  const teknisiPhase1Mutation = useTeknisiPhase1Complaint();
  const addNoteMutation = useAddComplaintNote();

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center bg-white rounded-xl border border-gray-200 mt-6">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-xs text-gray-500">Memuat detail tiket pengaduan...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center bg-white rounded-xl border border-gray-200 mt-6">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-900">Tiket Tidak Ditemukan</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Tiket pengaduan yang Anda cari tidak tersedia atau telah dihapus.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(isTeknisi && !isAdmin ? '/teknisi/complaints' : '/admin/complaints')}>
          Kembali ke Daftar
        </Button>
      </div>
    );
  }

  // Handle Reason Modal Submission
  const handleReasonSubmit = async (reason: string) => {
    if (!complaint) return;
    if (reasonModalState.type === 'cancel') {
      await cancelMutation.mutateAsync({ id: complaint.id, reason });
    } else if (reasonModalState.type === 'return') {
      await returnMutation.mutateAsync({ id: complaint.id, reason });
    } else if (reasonModalState.type === 'reopen') {
      await reopenMutation.mutateAsync({ id: complaint.id, reason });
    } else if (reasonModalState.type === 'pending') {
      await teknisiPendingMutation.mutateAsync({ id: complaint.id, reason });
    }
  };

  // Handle Remote Resolve Submission
  const handleResolveRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    await resolveRemoteMutation.mutateAsync({
      id: complaint.id,
      payload: {
        resolution_category: remoteResolutionCategory,
        notes: remoteNotes.trim() || undefined,
      },
    });
    setIsResolveRemoteModalOpen(false);
  };

  // Handle Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !complaint) return;
    await addNoteMutation.mutateAsync({
      id: complaint.id,
      content: newNote.trim(),
      isInternal: true,
    });
    setNewNote('');
  };

  const isClosed = complaint.status === 'closed';
  const isCancelled = complaint.status === 'cancelled';

  const evidenceObj =
    (complaint as any).evidence ||
    complaint.current_assignment?.evidence;

  const evidencePhotos =
    evidenceObj?.photos ||
    (complaint as any).photos ||
    [];

  const hasEvidence =
    Boolean(evidenceObj) ||
    evidencePhotos.length > 0 ||
    Boolean(complaint.resolution_category) ||
    Boolean(complaint.phase_1_completed_at);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isTeknisi && !isAdmin ? '/teknisi/complaints' : '/admin/complaints')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Kembali
          </Button>
          <div className="h-5 w-px bg-gray-200 dark:bg-slate-700" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white font-mono tracking-tight">
                {complaint.ticket_number}
              </h1>
              <ComplaintStatusBadge status={complaint.status} />
              <ComplaintPriorityBadge priority={complaint.priority} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Dibuat {formatDate(complaint.created_at)} oleh {complaint.created_by_name}
            </p>
          </div>
        </div>

        {/* SLA Indicator */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Target SLA:</span>
          <SlaCountdown
            dueAt={complaint.sla_resolve_due_at}
            isPaused={complaint.status === 'pending_customer'}
            isBreached={complaint.is_sla_breached}
            isResolved={complaint.status === 'resolved' || complaint.status === 'closed'}
            isCancelled={complaint.status === 'cancelled'}
          />
        </div>
      </div>

      {/* Action Bar based on Role & State */}
      {(isAdmin || isSuperadmin) && !isClosed && !isCancelled && (
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-indigo-950 tracking-wider">
              Tindakan Tiket ({complaint.status.toUpperCase()}):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Action for OPEN */}
            {complaint.status === 'open' && (
              <>
                {complaint.category !== 'billing' ? (
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                    onClick={() => setIsAssignModalOpen(true)}
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                    Tugaskan Tim {isSuperadmin ? '(Manual/Auto)' : '(Round Robin)'}
                  </Button>
                ) : (
                  <span className="text-xs text-amber-700 font-medium bg-amber-100 px-2.5 py-1 rounded">
                    Billing diselesaikan mandiri
                  </span>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs h-8"
                  onClick={() => setIsResolveRemoteModalOpen(true)}
                >
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                  Selesai Remote
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50 text-xs h-8"
                  onClick={() =>
                    setReasonModalState({
                      isOpen: true,
                      type: 'cancel',
                      title: 'Batalkan Tiket Pengaduan',
                      description: 'Masukkan alasan pembatalan tiket pengaduan pelanggan ini.',
                      confirmVariant: 'destructive',
                    })
                  }
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Batalkan
                </Button>
              </>
            )}

            {/* Action for IN_PROGRESS */}
            {complaint.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white text-amber-700 border-amber-300 hover:bg-amber-50 text-xs h-8"
                onClick={() =>
                  setReasonModalState({
                    isOpen: true,
                    type: 'pending',
                    title: 'Pending Menunggu Pelanggan',
                    description: 'SLA timer akan dijeda hingga pengerjaan dilanjutkan kembali.',
                  })
                }
              >
                <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                Pending Pelanggan
              </Button>
            )}

            {/* Action for PENDING_CUSTOMER */}
            {complaint.status === 'pending_customer' && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                onClick={() => resumeMutation.mutate(complaint.id)}
                disabled={resumeMutation.isPending}
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Lanjutkan Pengerjaan (Lanjut SLA)
              </Button>
            )}

            {/* Action for RESOLVED: Evidence verification before close! */}
            {complaint.status === 'resolved' && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                  onClick={() => setIsVerifyModalOpen(true)}
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  ✓ Verifikasi Bukti & Tutup Tiket
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white text-amber-800 border-amber-300 hover:bg-amber-50 text-xs h-8"
                  onClick={() =>
                    setReasonModalState({
                      isOpen: true,
                      type: 'return',
                      title: 'Kembalikan ke Teknisi (Return)',
                      description: 'Tuliskan alasan mengapa bukti atau hasil pengerjaan ditolak/perlu perbaikan ulang.',
                    })
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Kembalikan ke Teknisi
                </Button>
              </>
            )}

            {/* Cancel fallback */}
            {['assigned', 'in_progress'].includes(complaint.status) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-rose-600 hover:bg-rose-50 text-xs h-8"
                onClick={() =>
                  setReasonModalState({
                    isOpen: true,
                    type: 'cancel',
                    title: 'Batalkan Tiket Pengaduan',
                    description: 'Masukkan alasan pembatalan tiket pengaduan ini.',
                    confirmVariant: 'destructive',
                  })
                }
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Batalkan Tiket
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Action Bar for Field Technician */}
      {isTeknisi && !isAdmin && !isClosed && !isCancelled && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase text-emerald-950 dark:text-emerald-300 tracking-wider">
              Aksi Teknisi Lapangan ({complaint.status.toUpperCase()}):
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {complaint.status === 'assigned' && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                onClick={async () => {
                  await teknisiStartMutation.mutateAsync(complaint.id);
                  refetch();
                }}
                disabled={teknisiStartMutation.isPending}
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Mulai Kerja
              </Button>
            )}

            {complaint.status === 'in_progress' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 text-xs h-8"
                  onClick={() =>
                    setReasonModalState({
                      isOpen: true,
                      type: 'pending',
                      title: 'Pending Menunggu Pelanggan',
                      description: 'SLA timer akan dijeda hingga pengerjaan dilanjutkan kembali.',
                    })
                  }
                  disabled={teknisiPendingMutation.isPending}
                >
                  <PauseCircle className="w-3.5 h-3.5 mr-1.5" />
                  Pending Pelanggan
                </Button>

                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-xs"
                  onClick={() => setIsTeknisiResolveModalOpen(true)}
                  disabled={teknisiPhase1Mutation.isPending || teknisiResolveMutation.isPending}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Tahap 1: Selesai Teknis
                </Button>

                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 font-semibold shadow-xs"
                  onClick={() => setIsTeknisiAttendanceModalOpen(true)}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Tahap 2: Absen Selfie
                </Button>
              </>
            )}

            {complaint.status === 'phase_1_completed' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-md font-medium">
                  ✓ Tahap 1 Teknis Selesai &bull; Menunggu kelengkapan absensi tim.
                </span>
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 font-semibold shadow-xs"
                  onClick={() => setIsTeknisiAttendanceModalOpen(true)}
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Lengkapi Absen Tim (Tahap 2)
                </Button>
              </div>
            )}

            {complaint.status === 'pending_customer' && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                onClick={async () => {
                  await resumeMutation.mutateAsync(complaint.id);
                  refetch();
                }}
                disabled={resumeMutation.isPending}
              >
                <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                Lanjutkan Kerja
              </Button>
            )}

            {complaint.status === 'resolved' && (
              <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1.5 rounded-md font-medium">
                ✓ Pengerjaan & absensi tim lengkap. Menunggu verifikasi Admin.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reopen Action for CLOSED ticket (<= 7 days) */}
      {isClosed && (isAdmin || isSuperadmin) && (
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tiket ini telah selesai dan ditutup.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
            onClick={() =>
              setReasonModalState({
                isOpen: true,
                type: 'reopen',
                title: 'Buka Kembali Tiket Pengaduan',
                description: 'Pelanggan melapor kendala berulang dalam 7 hari kalender. Masukkan alasan pembukaan kembali tiket.',
              })
            }
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Buka Kembali (Reopen)
          </Button>
        </div>
      )}

      {/* Main Grid: Left Column Details & Right Column Timeline/Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Technician Evidence Gallery (Highlighted if status resolved/closed/phase_1) */}
          {hasEvidence && (
            <ComplaintEvidenceGallery
              photos={evidencePhotos}
              description={evidenceObj?.description || (complaint as any).resolution_notes}
              resolutionCategory={evidenceObj?.resolution_category || complaint.resolution_category}
              submittedAt={evidenceObj?.submitted_at || complaint.current_assignment?.resolved_at || complaint.phase_1_completed_at}
              technicianName={complaint.current_assignment?.technician_name}
              opmRedaman={evidenceObj?.opm_redaman || complaint.opm_redaman}
            />
          )}

          {/* Card: Attendance & 2-Phase Status */}
          {(complaint.status !== 'open' || complaint.assigned_team) && (
            <ComplaintAttendanceCard
              complaint={complaint}
              onOpenAttendanceModal={() => setIsTeknisiAttendanceModalOpen(true)}
            />
          )}

          {/* Card: Customer Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Data Pelanggan & Lokasi</h3>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                Area: {complaint.area}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Nama Pelanggan</span>
                <span className="font-semibold text-gray-900 text-sm">{complaint.customer_name}</span>
                {complaint.customer_code && (
                  <span className="text-gray-500 font-mono text-[11px] block mt-0.5">
                    ID: {complaint.customer_code}
                  </span>
                )}
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">Nomor WhatsApp Pelapor</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-900 text-sm">
                    {complaint.customer_phone}
                  </span>
                  <a
                    href={`https://wa.me/${complaint.customer_phone.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-[11px] underline"
                  >
                    Buka WA
                  </a>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-gray-400 block mb-0.5">Alamat Lengkap</span>
                <p className="text-gray-800 leading-relaxed">{complaint.customer_address}</p>
                {complaint.customer_lat && complaint.customer_lng && (
                  <a
                    href={`https://www.google.com/maps?q=${complaint.customer_lat},${complaint.customer_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-[11px] mt-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lihat di Google Maps ({complaint.customer_lat}, {complaint.customer_lng})</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Card: Complaint Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Rincian Keluhan</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">Subjek Keluhan</span>
                <p className="font-semibold text-gray-900 text-sm">{complaint.subject}</p>
              </div>

              <div>
                <span className="text-gray-400 block mb-0.5">Deskripsi Permasalahan</span>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {complaint.description}
                </p>
              </div>

              {complaint.whatsapp_message && (
                <div>
                  <span className="text-gray-400 block mb-0.5">Salinan Chat WhatsApp Asli</span>
                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 font-mono text-[11px] text-slate-700 whitespace-pre-wrap">
                    {complaint.whatsapp_message}
                  </div>
                </div>
              )}

              {/* Lampiran Screenshot / Foto Pelanggan */}
              {complaint.attachments && complaint.attachments.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-400 block mb-1.5 font-medium">Lampiran Screenshot / Foto Bukti Pelapor:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {complaint.attachments.map((att: any, idx: number) => {
                      const url = typeof att === 'string' ? att : att?.url;
                      const resolvedUrl = resolveImgUrl(url);
                      return (
                        <a
                          key={idx}
                          href={resolvedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-indigo-400 transition-all shadow-xs"
                        >
                          <img
                            src={resolvedUrl}
                            alt={`Lampiran ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-semibold">
                            Lihat Foto
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Assignment Information */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Penugasan Tim Teknisi</h3>
              </div>
              {complaint.current_assignment?.is_manual_assignment ? (
                <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">
                  Manual Assign (Superadmin)
                </span>
              ) : complaint.current_assignment ? (
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                  Round Robin Otomatis
                </span>
              ) : null}
            </div>

            {complaint.current_assignment ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Tim Ditugaskan</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1.5 font-bold text-gray-900 text-sm bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      {complaint.current_assignment.assigned_team || complaint.assigned_team || complaint.current_assignment.technician_name}
                    </span>
                  </div>

                  {/* List Personil Teknisi Tim */}
                  {((complaint.current_assignment.team_members && complaint.current_assignment.team_members.length > 0) ||
                    (complaint.team_members && complaint.team_members.length > 0)) && (
                    <div className="mt-2.5 space-y-1">
                      <span className="text-[11px] text-gray-400 font-medium block">Personil Teknisi di Tim Ini:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(complaint.current_assignment.team_members || complaint.team_members || []).map((m: any) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[11px]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {m.name} {m.phone ? <span className="text-gray-400 font-mono text-[10px]">({m.phone})</span> : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 block mb-0.5">Waktu Penugasan</span>
                  <span className="text-gray-800 font-medium">
                    {formatDate(complaint.current_assignment.assigned_at)}
                  </span>
                </div>

                {complaint.current_assignment.scheduled_visit_at && (
                  <div>
                    <span className="text-gray-400 block mb-0.5">Jadwal Kunjungan</span>
                    <span className="text-indigo-600 font-semibold">
                      {formatDate(complaint.current_assignment.scheduled_visit_at)}
                    </span>
                  </div>
                )}

                {complaint.current_assignment.notes && (
                  <div className="sm:col-span-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="text-gray-500 font-medium block mb-0.5">Catatan Penugasan:</span>
                    <p className="text-gray-700 text-xs">{complaint.current_assignment.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                Tiket belum ditugaskan ke tim teknisi.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Timeline & Internal Notes */}
        <div className="space-y-6">
          {/* Timeline Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <Clock className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Riwayat & Log Status</h3>
            </div>
            <ComplaintTimeline logs={complaint.activity_log || (complaint as any).logs || []} />
          </div>

          {/* Internal Notes Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Catatan Internal Admin</h3>
            </div>

            {/* Note Input */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Tulis catatan internal untuk tim..."
                rows={2}
                className="text-xs resize-none"
                disabled={addNoteMutation.isPending}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={addNoteMutation.isPending || !newNote.trim()}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Kirim Catatan
                </Button>
              </div>
            </form>

            {/* Note List */}
            <div className="space-y-2 pt-2 border-t border-gray-100 max-h-60 overflow-y-auto">
              {complaint.notes?.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-3">Belum ada catatan internal.</p>
              ) : (
                complaint.notes?.map((n) => (
                  <div key={n.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-semibold text-gray-800">{n.author_name}</span>
                      <span>{formatDate(n.created_at)}</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Assignment */}
      <ComplaintAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          refetch();
        }}
        complaint={complaint}
      />

      {/* Modal: Verification of Evidence before Close */}
      <ComplaintVerifyModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        complaint={complaint}
        onVerifyClose={async (notes) => {
          await verifyCloseMutation.mutateAsync({
            id: complaint.id,
            payload: { evidence_verified: true, notes },
          });
          refetch();
        }}
        isLoading={verifyCloseMutation.isPending}
      />

      {/* Modal: Reusable Reason Modal */}
      <ComplaintReasonModal
        isOpen={reasonModalState.isOpen}
        onClose={() => setReasonModalState((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={async (reason) => {
          await handleReasonSubmit(reason);
          refetch();
        }}
        title={reasonModalState.title}
        description={reasonModalState.description}
        confirmVariant={reasonModalState.confirmVariant}
      />

      {/* Modal: Resolve Remote */}
      {isResolveRemoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Selesaikan Secara Remote</h3>
            <p className="text-xs text-gray-500">
              Gunakan jika kendala terselesaikan tanpa memerlukan teknisi lapangan (misal reset dari OLT atau kendala billing).
            </p>

            <form onSubmit={handleResolveRemote} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-gray-700 mb-1">
                  Kategori Resolusi <span className="text-red-500">*</span>
                </label>
                <select
                  value={remoteResolutionCategory}
                  onChange={(e) => setRemoteResolutionCategory(e.target.value as ResolutionCategory)}
                  className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-gray-800"
                >
                  <option value="config_issue">Perbaikan Konfigurasi / IP / VLAN</option>
                  <option value="ont_reset">Reset & Rekonfigurasi OLT / ONT</option>
                  <option value="billing_resolved">Kendala Billing / Pembayaran Selesai</option>
                  <option value="customer_side">Kendala di Sisi Pelanggan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Catatan Resolusi</label>
                <Textarea
                  value={remoteNotes}
                  onChange={(e) => setRemoteNotes(e.target.value)}
                  placeholder="Deskripsikan tindakan yang telah dilakukan..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResolveRemoteModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={resolveRemoteMutation.isPending}
                >
                  Selesaikan Tiket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Teknisi Selesai & Upload Bukti (Tahap 1) */}
      <TeknisiResolveModal
        isOpen={isTeknisiResolveModalOpen}
        onClose={() => setIsTeknisiResolveModalOpen(false)}
        complaint={complaint}
        isLoading={teknisiPhase1Mutation.isPending || teknisiResolveMutation.isPending}
        onSubmit={async (payload) => {
          await teknisiPhase1Mutation.mutateAsync({
            id: complaint.id,
            payload,
          });
          setIsTeknisiResolveModalOpen(false);
          refetch();
        }}
      />

      {/* Modal: Absensi Mandiri Teknisi (Tahap 2) */}
      <TeknisiAttendanceModal
        isOpen={isTeknisiAttendanceModalOpen}
        onClose={() => setIsTeknisiAttendanceModalOpen(false)}
        complaint={complaint}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
