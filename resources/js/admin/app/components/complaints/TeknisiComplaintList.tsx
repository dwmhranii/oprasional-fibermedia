import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  MapPin,
  Calendar,
  Play,
  CheckCircle2,
  PauseCircle,
  Clock,
  Navigation,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Inbox,
  Loader2,
  Users,
  Shield,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';
import {
  useTeknisiComplaints,
  useAvailableTeams,
  useTeknisiStartComplaint,
  useTeknisiScheduleVisit,
  useTeknisiPendingCustomer,
  useTeknisiResumeComplaint,
  useTeknisiResolveComplaint,
  useTeknisiPhase1Complaint,
} from '../../hooks/useComplaints';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { ComplaintPriorityBadge } from './ComplaintPriorityBadge';
import { SlaCountdown } from './SlaCountdown';
import { ComplaintReasonModal } from './ComplaintReasonModal';
import { TeknisiResolveModal } from './TeknisiResolveModal';
import { TeknisiAttendanceModal } from './TeknisiAttendanceModal';
import { formatDate } from '../../lib/formatters';
import type { ComplaintListItem, Complaint } from '../../types/complaint';

export const TeknisiComplaintList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin' || user?.roles?.includes('superadmin');
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
  const isPrivileged = isSuperadmin || isAdmin;

  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Query teams if privileged
  const { data: teams = [] } = useAvailableTeams();

  // Modals state
  const [selectedForResolve, setSelectedForResolve] = useState<ComplaintListItem | null>(null);
  const [selectedForAttendance, setSelectedForAttendance] = useState<ComplaintListItem | null>(null);
  const [pendingModalState, setPendingModalState] = useState<{
    isOpen: boolean;
    complaintId: number | null;
  }>({
    isOpen: false,
    complaintId: null,
  });

  const [scheduleModalState, setScheduleModalState] = useState<{
    isOpen: boolean;
    complaintId: number | null;
    datetime: string;
  }>({
    isOpen: false,
    complaintId: null,
    datetime: '',
  });

  // Query
  const { data, isLoading, refetch } = useTeknisiComplaints({
    status: activeTab === 'all' ? undefined : activeTab,
    team: selectedTeam === 'all' ? undefined : selectedTeam,
  });

  const complaints = data?.data || [];

  // Mutations
  const startMutation = useTeknisiStartComplaint();
  const scheduleMutation = useTeknisiScheduleVisit();
  const pendingMutation = useTeknisiPendingCustomer();
  const resumeMutation = useTeknisiResumeComplaint();
  const resolveMutation = useTeknisiResolveComplaint();
  const phase1Mutation = useTeknisiPhase1Complaint();

  const handleStart = async (id: number) => {
    await startMutation.mutateAsync(id);
    refetch();
  };

  const handleResume = async (id: number) => {
    await resumeMutation.mutateAsync(id);
    refetch();
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalState.complaintId || !scheduleModalState.datetime) return;
    await scheduleMutation.mutateAsync({
      id: scheduleModalState.complaintId,
      scheduledVisitAt: scheduleModalState.datetime,
    });
    setScheduleModalState({ isOpen: false, complaintId: null, datetime: '' });
    refetch();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Tugas Pengaduan Teknisi</h1>
              {isPrivileged && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <Shield className="w-3 h-3" />
                  Mode Superadmin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {isPrivileged
                ? 'Memantau dan mengelola seluruh penugasan tiket pengaduan di semua tim teknisi.'
                : `Daftar tiket penanganan pengaduan lapangan untuk ${(user as any)?.team ? (user as any).team : 'Anda'}.`}
            </p>
          </div>
        </div>

        {/* Team Filter for Superadmin/Admin */}
        {isPrivileged && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Pilih Tim:
            </span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedTeam('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedTeam === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Semua Tim
              </button>
              {teams.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelectedTeam(t.name)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedTeam === t.name
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.name} {t.active_tickets_count > 0 ? `(${t.active_tickets_count})` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Tab Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pt-2 border-t border-gray-100 dark:border-slate-800 no-scrollbar">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'assigned', label: 'Baru' },
            { id: 'in_progress', label: 'Dikerjakan' },
            { id: 'phase_1_completed', label: 'Menunggu Absen Tim' },
            { id: 'pending_customer', label: 'Pending' },
            { id: 'resolved', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-slate-400">Memuat tugas pengaduan...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
          <Inbox className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200">Tidak Ada Tugas Pengaduan</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Saat ini tidak ada tiket pengaduan aktif dalam kategori atau tim ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs p-4 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              {/* Header: Ticket Number, Status, SLA */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-400">
                      {item.ticket_number}
                    </span>
                    <ComplaintPriorityBadge priority={item.priority} />
                    {item.assigned_team && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Users className="w-2.5 h-2.5 mr-1" />
                        {item.assigned_team}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                    {item.area} • {formatDate(item.created_at)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ComplaintStatusBadge status={item.status} />
                  <SlaCountdown
                    dueAt={item.sla_resolve_due_at}
                    isPaused={item.status === 'pending_customer'}
                    isBreached={item.is_sla_breached}
                    isResolved={item.status === 'resolved' || item.status === 'closed'}
                    isCancelled={item.status === 'cancelled'}
                  />
                </div>
              </div>

              {/* Subject & Description */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-700/60 text-xs">
                <span className="font-semibold text-gray-900 dark:text-white block mb-0.5">{item.subject}</span>
                <span className="text-gray-500 dark:text-slate-400 text-[11px]">{item.category}</span>
              </div>

              {/* Customer Info & Quick Action Buttons */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-gray-700 dark:text-slate-200">
                  <span className="font-semibold text-sm">{item.customer_name}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${item.customer_phone}`}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Telepon</span>
                    </a>
                    <a
                      href={`https://wa.me/${item.customer_phone.replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>Chat WA</span>
                    </a>
                  </div>
                </div>

                {/* Google Maps link button */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    item.customer_name + ' ' + item.area
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Buka Navigasi Peta Lokasi</span>
                </a>
              </div>

              {/* Action Buttons for Technician */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-8 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white px-2"
                  onClick={() => navigate(`/teknisi/complaints/${item.id}`)}
                >
                  Detail Lengkap <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>

                <div className="flex items-center gap-2">
                  {/* Status: ASSIGNED -> Mulai Pengerjaan */}
                  {item.status === 'assigned' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        onClick={() =>
                          setScheduleModalState({
                            isOpen: true,
                            complaintId: item.id,
                            datetime: '',
                          })
                        }
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        Jadwalkan
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                        onClick={() => handleStart(item.id)}
                        disabled={startMutation.isPending}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        Mulai Kerja
                      </Button>
                    </>
                  )}

                  {/* Status: IN_PROGRESS -> Pending, Tahap 1 Selesai Teknis, Tahap 2 Absen Selfie */}
                  {item.status === 'in_progress' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                        onClick={() =>
                          setPendingModalState({
                            isOpen: true,
                            complaintId: item.id,
                          })
                        }
                      >
                        <PauseCircle className="w-3.5 h-3.5 mr-1" />
                        Pending
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => setSelectedForResolve(item)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Tahap 1: Bukti
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                        onClick={() => setSelectedForAttendance(item)}
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Tahap 2: Absen
                      </Button>
                    </>
                  )}

                  {/* Status: PHASE_1_COMPLETED -> Tunggu Absensi Tim */}
                  {item.status === 'phase_1_completed' && (
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      onClick={() => setSelectedForAttendance(item)}
                    >
                      <Users className="w-3.5 h-3.5 mr-1" />
                      Lengkapi Absen Tim (Tahap 2)
                    </Button>
                  )}

                  {/* Status: PENDING_CUSTOMER -> Lanjutkan */}
                  {item.status === 'pending_customer' && (
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => handleResume(item.id)}
                      disabled={resumeMutation.isPending}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      Lanjutkan Kerja
                    </Button>
                  )}

                  {/* Status: RESOLVED -> Waiting Admin Verification */}
                  {item.status === 'resolved' && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                      Menunggu Verifikasi Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Resolve with Evidence (Tahap 1) */}
      {selectedForResolve && (
        <TeknisiResolveModal
          isOpen={!!selectedForResolve}
          onClose={() => setSelectedForResolve(null)}
          complaint={selectedForResolve as unknown as Complaint}
          onSubmit={async (payload) => {
            await phase1Mutation.mutateAsync({
              id: selectedForResolve.id,
              payload,
            });
            setSelectedForResolve(null);
            refetch();
          }}
          isLoading={phase1Mutation.isPending || resolveMutation.isPending}
        />
      )}

      {/* Modal: Absensi Mandiri Teknisi (Tahap 2) */}
      {selectedForAttendance && (
        <TeknisiAttendanceModal
          isOpen={!!selectedForAttendance}
          onClose={() => setSelectedForAttendance(null)}
          complaint={selectedForAttendance as unknown as Complaint}
          onSuccess={() => {
            setSelectedForAttendance(null);
            refetch();
          }}
        />
      )}

      {/* Modal: Pending Customer Reason */}
      <ComplaintReasonModal
        isOpen={pendingModalState.isOpen}
        onClose={() => setPendingModalState({ isOpen: false, complaintId: null })}
        onSubmit={async (reason) => {
          if (!pendingModalState.complaintId) return;
          await pendingMutation.mutateAsync({
            id: pendingModalState.complaintId,
            reason,
          });
          setPendingModalState({ isOpen: false, complaintId: null });
          refetch();
        }}
        title="Pending Menunggu Pelanggan"
        description="Jelaskan alasan menunggu pelanggan (misal: Pelanggan tidak ada di rumah, janji temu besok pagi). SLA timer akan dijeda."
      />

      {/* Modal: Schedule Visit */}
      {scheduleModalState.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">Jadwalkan Kunjungan</h3>
            <p className="text-xs text-gray-500">
              Tentukan rencana waktu kunjungan ke lokasi pelanggan.
            </p>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Waktu Kunjungan <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleModalState.datetime}
                  onChange={(e) =>
                    setScheduleModalState((prev) => ({ ...prev, datetime: e.target.value }))
                  }
                  className="w-full text-xs h-9 rounded-md border border-gray-300 px-3 text-gray-800"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleModalState({ isOpen: false, complaintId: null, datetime: '' })}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 text-white"
                  disabled={scheduleMutation.isPending}
                >
                  Simpan Jadwal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
