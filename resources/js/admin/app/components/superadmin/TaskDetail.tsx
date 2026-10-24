import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import { resolveImgUrl } from '../../lib/printBastHelper';
import { toast } from 'sonner';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, MapPin, 
  Users, CheckCircle, Navigation, Camera, PenTool, XCircle,
  FileCheck, FileText, User, ZoomIn, Eye
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CustomerMap } from '../maps/CustomerMap';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';

const SmartImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  onPreview?: (url: string, title: string) => void;
  title?: string;
}> = ({
  src,
  alt,
  className = 'w-full h-44 object-cover rounded-lg bg-white',
  fallbackText = 'Foto belum diunggah atau tidak dapat dimuat',
  onPreview,
  title,
}) => {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src ? resolveImgUrl(src) : null);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    setCurrentSrc(src ? resolveImgUrl(src) : null);
    setHasError(false);
  }, [src]);

  if (!currentSrc || hasError) {
    return (
      <div className="w-full h-44 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400 p-4 text-center">
        <Camera className="w-7 h-7 text-gray-300" />
        <span className="text-xs font-medium text-gray-400">{fallbackText}</span>
      </div>
    );
  }

  return (
    <div
      onClick={() => onPreview && onPreview(currentSrc, title || alt)}
      className={`group relative overflow-hidden rounded-lg border bg-white ${onPreview ? 'cursor-pointer hover:border-indigo-400 transition-colors' : ''}`}
    >
      <img
        src={currentSrc}
        alt={alt}
        className={`${className} transition-transform duration-200 ${onPreview ? 'group-hover:scale-105' : ''}`}
        onError={() => {
          setHasError(true);
        }}
      />
      {onPreview && (
        <>
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white">
            <ZoomIn className="w-6 h-6 drop-shadow" />
            <span className="text-[11px] font-semibold bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
              Klik untuk Perbesar
            </span>
          </div>
          <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 opacity-80 group-hover:opacity-0 transition-opacity pointer-events-none">
            <ZoomIn className="w-3 h-3" /> Zoom
          </span>
        </>
      )}
    </div>
  );
};

export const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  /**
   * [!IMPORTANT]
   * **HIGH: Missing Deferred Manual BFASS Credential UI**
   * According to the frozen Backend API Documentation, passing `manual_provisioning` during `/validate` is optional. If omitted, the Admin must provide it later using the `PUT /api/admin/provisionings/{id}/bfass-credentials` endpoint to trigger Task Assignment. The frontend's `ProvisioningDetail.tsx` is currently missing this form entirely. It must be built to support the deferred BFASS entry workflow.
   */

  // Use the shared task endpoint
  const { data: task, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'task', id],
    queryFn: () => apiClient.get<any>(`/teknisi/tasks/${id}`),
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      assigned: { label: 'Assigned', color: '#3b82f6' },
      on_the_way: { label: 'On The Way', color: '#8b5cf6' },
      in_progress: { label: 'In Progress', color: '#f59e0b' },
      phase_1_submitted: { label: 'Phase 1 Submitted', color: '#0ea5e9' },
      phase_2_complete: { label: 'Phase 2 Complete', color: '#0ea5e9' },
      submitted: { label: 'Submitted', color: '#6366f1' },
      completed: { label: 'Completed', color: '#10b981' },
      failed: { label: 'Failed', color: '#ef4444' },
      approved: { label: 'Approved', color: '#10b981' },
      rejected: { label: 'Rejected', color: '#ef4444' },
      returned: { label: 'Returned', color: '#ef4444' },
      escalated: { label: 'Escalated', color: '#ef4444' },
    };

    const config = statusConfig[status] || { label: status || 'Unknown', color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </Badge>
    );
  };

  const handleApprove = async () => {
    if (!selectedAssignment) return;
    if (selectedAssignment.status !== 'phase_2_complete' && selectedAssignment.status !== 'submitted') {
      toast.warning('Tugas belum dapat disetujui.', {
        description: 'Teknisi harus menyelesaikan dan mengirimkan laporan Fase 2 terlebih dahulu dari aplikasi teknisi.'
      });
      return;
    }
    setIsApproving(true);
    try {
      await apiClient.put(`/admin/task-assignments/${selectedAssignment.id}/approve`, {
        status: 'approved'
      });
      toast.success('Bukti tugas teknisi berhasil disetujui.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedAssignment(null);
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menyetujui tugas.');
      } else {
        toast.error('Terjadi kesalahan sistem.');
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAssignment || !rejectReason.trim()) {
      toast.error('Alasan penolakan harus diisi.');
      return;
    }
    setIsRejecting(true);
    try {
      await apiClient.put(`/admin/task-assignments/${selectedAssignment.id}/return`, {
        notes: rejectReason.trim()
      });
      toast.success('Tugas teknisi berhasil ditolak dan dikembalikan.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedAssignment(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal menolak tugas.');
      } else {
        toast.error('Terjadi kesalahan sistem.');
      }
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 animate-pulse">Memuat data Approval Board...</p>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-800">Gagal Memuat Data</h3>
        <p className="text-gray-500 mb-4">{error instanceof Error ? error.message : 'Tugas tidak ditemukan.'}</p>
        <Button onClick={() => navigate(-1)} variant="outline">Kembali</Button>
      </div>
    );
  }

  const assignments = task.all_assignments || [];
  const teamName = typeof task.assigned_team === 'object' ? task.assigned_team?.name : task.assigned_team;

  // Compute Rich Progress
  const total = assignments.length;
  const approvedCount = assignments.filter((a: any) => a.status === 'approved').length;
  const submittedCount = assignments.filter((a: any) => a.status === 'phase_2_complete').length;
  const returnedCount = assignments.filter((a: any) => a.status === 'returned').length;
  const assignedCount = assignments.filter((a: any) => a.status === 'assigned').length;
  const progressPercentage = total === 0 ? 0 : Math.round((approvedCount / total) * 100);

  // Compute Timeline with returned & phase 1 events
  const timelineEvents: { id: string, time: string, description: string, type: 'info' | 'approved' | 'returned', notes?: string, timeRaw: Date }[] = [];
  if (task.created_at) {
    timelineEvents.push({ id: 'task-created', time: formatDate(task.created_at), description: 'Task Assigned', type: 'info', timeRaw: new Date(task.created_at) });
  }

  if (task.photos?.before || task.photos?.after || task.customer_signature_url || task.status === 'phase_1_submitted' || task.shared_verification?.completed) {
    const timeStr = task.updated_at || task.created_at;
    timelineEvents.push({ id: 'phase1-submitted', time: formatDate(timeStr), description: 'Phase 1 Submitted (Verifikasi Bersama Tim)', type: 'info', timeRaw: new Date(timeStr) });
  }

  assignments.forEach((assignment: any) => {
    const techName = assignment.user?.name || `Teknisi ${assignment.user_id}`;
    if (assignment.started_at) {
      const timeStr = assignment.started_at ? assignment.started_at : assignment.updated_at;
      timelineEvents.push({ id: `start-${assignment.id}`, time: formatDate(timeStr), description: `${techName} Started (OTW / In Progress)`, type: 'info', timeRaw: new Date(timeStr) });
    }
    if (assignment.submitted_at || assignment.status === 'phase_2_complete' || assignment.status === 'submitted') {
      const timeStr = assignment.submitted_at ? assignment.submitted_at : assignment.updated_at;
      timelineEvents.push({ id: `submit-${assignment.id}`, time: formatDate(timeStr), description: `${techName} Submitted (Phase 2 Laporan Individu)`, type: 'info', timeRaw: new Date(timeStr) });
    }
    if (assignment.status === 'returned' || assignment.notes) {
      const timeStr = assignment.updated_at || assignment.returned_at || assignment.created_at;
      const notes = assignment.notes || assignment.rejection_notes || assignment.evidence?.notes;
      timelineEvents.push({ id: `return-${assignment.id}`, time: formatDate(timeStr), description: `Admin Returned (${techName})`, type: 'returned', notes, timeRaw: new Date(timeStr) });
    }
    if (assignment.approved_at || assignment.status === 'approved') {
      const timeStr = assignment.approved_at ? assignment.approved_at : assignment.updated_at;
      timelineEvents.push({ id: `approve-${assignment.id}`, time: formatDate(timeStr), description: `Admin Approved (${techName})`, type: 'approved', timeRaw: new Date(timeStr) });
    }
  });
  timelineEvents.sort((a, b) => a.timeRaw.getTime() - b.timeRaw.getTime());

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Approval Board <span className="text-gray-400 font-normal">|</span> {task.task_number || `TSK-${task.id}`}
          </h1>
        </div>
        {getStatusBadge(task.status)}
      </div>

      {/* Summary Card */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1 min-w-[200px]">
              <p className="text-sm text-gray-500 font-medium">Assigned Team</p>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span className="text-xl font-bold text-gray-800">{teamName || 'Tim Tidak Diketahui'}</span>
              </div>
            </div>
            
            <div className="h-10 w-px bg-indigo-200 hidden md:block"></div>

            <div className="space-y-3 flex-1 w-full">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-gray-500">Progress Keseluruhan</span>
                <span className="text-indigo-700 font-bold">{approvedCount} / {total} Technician Approved</span>
              </div>
              <div className="w-full bg-indigo-200/50 rounded-full h-3 overflow-hidden">
                <div className="bg-indigo-600 h-3 transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>Submitted: {submittedCount}</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Returned: {returnedCount}</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>Assigned: {assignedCount}</div>
              </div>
            </div>

            <div className="h-10 w-px bg-indigo-200 hidden md:block"></div>

            <div className="space-y-1 min-w-[150px]">
              <p className="text-sm text-gray-500 font-medium">Pelanggan</p>
              <p className="text-base font-semibold text-gray-800">{task.customer?.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Status Anggota & Tahapan Tim</h2>

          {/* List 1: Status Fase 1 (Verifikasi Bersama Tim) */}
          <Card className="border-sky-200 bg-sky-50/20 shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-base">
                      1. Verifikasi Bersama Tim (Fase 1)
                    </span>
                    <Badge className="bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs">
                      {task.shared_verification?.completed || task.status === 'completed' || task.status === 'phase_1_submitted' || task.status === 'phase_2_complete' ? 'Phase 1 Submitted' : 'Menunggu Pengerjaan'}
                    </Badge>
                  </div>
                  <p className="text-xs text-sky-700 font-medium flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                    Dokumentasi Foto Lokasi, Foto Modem ONT Terpasang, dan TTD Digital Pelanggan.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(task.photos?.before || task.photos?.after || task.customer_signature_url) && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="bg-white border-sky-200 text-sky-700 hover:bg-sky-50 font-semibold text-xs h-9"
                      onClick={() => setSelectedAssignment({ isPhase1: true, user: { name: 'Dokumentasi Bersama Tim (Fase 1)' }, evidence: { photo_before: task.photos?.before, photo_after: task.photos?.after, signature_url: task.customer_signature_url } })}
                    >
                      Lihat Bukti Fase 1
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        
        {/* List 2 & List 3: Individual Member Statuses */}
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white border rounded-lg">
            Belum ada data tugas untuk anggota tim.
          </div>
        ) : (
          assignments.map((assignment: any, memberIdx: number) => {
            const hasEvidence = Boolean(
              assignment.evidence && (
                assignment.evidence.photo_before || 
                assignment.evidence.photo_after || 
                assignment.evidence.signature_url || 
                assignment.evidence.signature_path || 
                assignment.evidence.attendance_photo ||
                assignment.evidence.photo_selfie ||
                assignment.evidence.completion_notes
              )
            );
            const isCompletedPhase2 = assignment.status === 'phase_2_complete' || assignment.status === 'submitted' || assignment.status === 'approved' || assignment.status === 'returned';
            const isReadyForReview = isCompletedPhase2 || hasEvidence;

            const renderAssignmentSubtitle = () => {
              const status = assignment.status;
              const notes = assignment.notes || assignment.rejection_notes || assignment.evidence?.completion_notes || assignment.evidence?.notes;

              if (status === 'returned') {
                return (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200 mt-2 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-rose-800">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Dikembalikan untuk Perbaikan (Revisi Admin)
                    </p>
                    {notes && <p className="italic text-gray-700 font-medium">Catatan Admin: "{notes}"</p>}
                  </div>
                );
              }

              if (status === 'assigned') {
                return (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Menunggu teknisi memulai tugas.
                  </p>
                );
              }

              if (status === 'on_the_way') {
                return (
                  <p className="text-xs text-purple-600 font-medium flex items-center gap-1.5 mt-1">
                    <Navigation className="w-3.5 h-3.5 text-purple-500" /> Teknisi dalam perjalanan ke lokasi.
                  </p>
                );
              }

              if (status === 'in_progress') {
                return (
                  <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" /> Sedang melakukan instalasi di lokasi.
                  </p>
                );
              }

              if (status === 'phase_1_submitted') {
                return (
                  <p className="text-xs text-sky-600 font-medium flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" /> Verifikasi bersama (Tahap 1) selesai. Menunggu laporan individu.
                  </p>
                );
              }

              if (status === 'phase_2_complete' || status === 'submitted') {
                return (
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Laporan & bukti lengkap. Siap dikaji Admin.
                  </p>
                );
              }

              if (status === 'approved') {
                return (
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tugas telah disetujui Admin.
                  </p>
                );
              }

              return (
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                  <Clock className="w-3.5 h-3.5" /> Status: {status}
                </p>
              );
            };

            return (
              <Card key={assignment.id} className={assignment.status === 'approved' ? "border-emerald-200 shadow-sm bg-emerald-50/10" : assignment.status === 'returned' ? "border-rose-200 bg-rose-50/10 shadow-sm" : ""}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-base">
                          {memberIdx + 2}. {assignment.user?.name || `Teknisi ${assignment.user_id}`}
                        </span>
                        {getStatusBadge(assignment.status)}
                      </div>
                      {renderAssignmentSubtitle()}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isReadyForReview && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs h-9"
                          onClick={() => setSelectedAssignment(assignment)}
                        >
                          Lihat Bukti & Review
                        </Button>
                      )}
                      {assignment.status === 'approved' && (
                        <div className="text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Assignment Timeline</h2>
          <Card>
            <CardContent className="p-6">
              {timelineEvents.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">Belum ada aktivitas.</div>
              ) : (
                <div className="relative border-l-2 border-indigo-100 ml-3 space-y-6">
                  {timelineEvents.map((event, idx) => {
                    const isReturned = event.type === 'returned';
                    const isApproved = event.type === 'approved';

                    return (
                      <div key={event.id + idx} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                          isReturned ? 'bg-rose-500' : isApproved ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}></div>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-gray-500">{event.time}</span>
                          <span className={`text-sm font-bold mt-0.5 ${
                            isReturned ? 'text-rose-700' : isApproved ? 'text-emerald-700' : 'text-gray-800'
                          }`}>
                            {event.description}
                          </span>
                          {event.notes && (
                            <div className="text-xs italic text-rose-800 bg-rose-50 p-2 rounded-lg mt-1 border border-rose-200 font-medium">
                              Catatan Admin: "{event.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => {
        setSelectedAssignment(null);
        setRejectReason('');
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Bukti Pemasangan - {selectedAssignment?.user?.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Review dan verifikasi bukti pengerjaan teknisi
            </DialogDescription>
          </DialogHeader>
          
          {selectedAssignment && (
            <div className="space-y-6 py-2 text-xs">
              {selectedAssignment.isPhase1 ? (
                /* FASE 1: DOKUMENTASI VERIFIKASI BERSAMA TIM */
                <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                    <h4 className="font-bold text-sky-900 text-sm flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-sky-600" />
                      Dokumentasi Verifikasi Bersama Tim (Fase 1)
                    </h4>
                    <Badge className="bg-sky-600 text-white font-bold text-[10px]">Phase 1 (Team Shared)</Badge>
                  </div>

                  {/* Photos Before & After */}
                  {(() => {
                    const beforeRaw = selectedAssignment?.evidence?.photo_before_url || selectedAssignment?.evidence?.photo_before || selectedAssignment?.evidence?.photo_before_path || task.photos?.before || task.shared_verification?.photo_before_url;
                    const afterRaw = selectedAssignment?.evidence?.photo_after_url || selectedAssignment?.evidence?.photo_after || selectedAssignment?.evidence?.photo_after_path || task.photos?.after || task.shared_verification?.photo_after_url;
                    const beforeUrl = resolveImgUrl(beforeRaw);
                    const afterUrl = resolveImgUrl(afterRaw);

                    if (!beforeUrl && !afterUrl) return null;

                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-indigo-600" /> Foto Bukti Pemasangan
                          </p>
                          <span className="text-[11px] text-gray-400">Klik foto untuk perbesar</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-[11px] text-gray-500 font-medium">Sebelum (Before)</p>
                            <SmartImage 
                              src={beforeUrl} 
                              alt="Sebelum (Before)" 
                              title="Foto Bukti Pemasangan - Sebelum (Before)"
                              className="w-full h-44 object-cover rounded-lg bg-white"
                              fallbackText="Foto sebelum belum tersedia"
                              onPreview={(url, title) => setPreviewPhoto({ url, title })}
                            />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] text-gray-500 font-medium">Sesudah (After)</p>
                            <SmartImage 
                              src={afterUrl} 
                              alt="Sesudah (After)" 
                              title="Foto Bukti Pemasangan - Sesudah (After)"
                              className="w-full h-44 object-cover rounded-lg bg-white"
                              fallbackText="Foto sesudah belum tersedia"
                              onPreview={(url, title) => setPreviewPhoto({ url, title })}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SOP Checklist */}
                  {(selectedAssignment?.evidence?.checklist_result || task.checklist_results || task.task_checklist_items) && (
                    <div className="space-y-2 pt-2 border-t border-sky-100">
                      <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Checklist SOP Pemasangan (BAST)
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-sky-100">
                        {(selectedAssignment?.evidence?.checklist_result || task.checklist_results || task.task_checklist_items || []).map((item: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-2 text-gray-800">
                            {item.is_completed || item.status === 'ok' || item.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            )}
                            <span>{item.item_name || item.name || `Checklist Item ${idx + 1}`}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Customer Signature */}
                  {(() => {
                    const sigRaw = selectedAssignment?.evidence?.signature_path || selectedAssignment?.evidence?.signature_url || task.customer_signature_path || task.customer_signature_url || task.shared_verification?.signature_path;
                    const sigUrl = resolveImgUrl(sigRaw);
                    if (!sigUrl) return null;
                    return (
                      <div className="space-y-2 pt-2 border-t border-sky-100">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5 text-orange-600" /> Tanda Tangan Digital Pelanggan
                          </p>
                          <span className="text-[11px] text-gray-400">Klik untuk perbesar</span>
                        </div>
                        <div 
                          onClick={() => setPreviewPhoto({ url: sigUrl, title: 'Tanda Tangan Digital Pelanggan' })}
                          className="group relative bg-white border rounded-lg p-3 flex justify-center cursor-pointer hover:border-indigo-400 transition-colors overflow-hidden"
                        >
                          <img src={sigUrl} alt="Signature" className="max-h-32 object-contain group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white gap-1.5 font-medium text-xs">
                            <ZoomIn className="w-4 h-4 drop-shadow" />
                            <span className="bg-black/60 px-2 py-0.5 rounded-full text-[11px]">Lihat Tanda Tangan</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* FASE 2: LAPORAN KEHADIRAN INDIVIDU TEKNISI */
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      Laporan Kehadiran & Penyelesaian Individu ({selectedAssignment?.user?.name || `Teknisi ${selectedAssignment?.user_id}`})
                    </h4>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">Phase 2 (Individual Log)</Badge>
                  </div>

                  {/* Selfie Photo & Notes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Selfie Photo */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-purple-600" /> Foto Selfie Kehadiran Teknisi
                        </p>
                        <span className="text-[11px] text-gray-400">Klik untuk perbesar</span>
                      </div>
                      {(() => {
                        const ev = selectedAssignment?.evidence || {};
                        const rawSelfie = ev.attendance_photo_path || ev.attendance_photo || ev.photo_selfie || ev.photo_selfie_path || ev.photo_selfie_url || ev.selfie_photo_path || ev.selfie_path || ev.selfie_url || ev.selfie || selectedAssignment?.attendance_photo_path || selectedAssignment?.photo_selfie || selectedAssignment?.photo_selfie_url || selectedAssignment?.selfie || task?.photos?.selfie;

                        return (
                          <SmartImage
                            src={rawSelfie}
                            alt="Selfie Kehadiran"
                            title={`Foto Selfie Kehadiran - ${selectedAssignment?.user?.name || 'Teknisi'}`}
                            className="w-full h-48 object-cover rounded-lg bg-white shadow-sm"
                            fallbackText="Foto selfie belum diunggah atau tidak dapat dimuat"
                            onPreview={(url, title) => setPreviewPhoto({ url, title })}
                          />
                        );
                      })()}
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-600" /> Catatan Pengerjaan Teknisi
                      </p>
                      <div className="text-gray-800 bg-white p-3 rounded-lg border min-h-[140px] leading-relaxed text-xs">
                        {selectedAssignment?.notes || selectedAssignment?.evidence?.notes || selectedAssignment?.evidence?.completion_notes || 'Tidak ada catatan khusus.'}
                      </div>
                    </div>
                  </div>

                  {/* GPS Location */}
                  {selectedAssignment?.evidence?.latitude && selectedAssignment?.evidence?.longitude && (
                    <div className="space-y-2 pt-2 border-t border-emerald-100">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-gray-700 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-600" /> Lokasi GPS Lapangan (Absensi Pengerjaan)
                        </p>
                        {selectedAssignment.evidence.accuracy && (
                          <span className="text-[11px] text-gray-500 font-mono">Akurasi: ±{selectedAssignment.evidence.accuracy} meter</span>
                        )}
                      </div>
                      <div className="h-56 rounded-lg overflow-hidden border">
                        <CustomerMap 
                          lat={Number(selectedAssignment.evidence.latitude)} 
                          lng={Number(selectedAssignment.evidence.longitude)} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedAssignment?.status === 'approved' ? (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-emerald-800 text-sm font-bold mt-4 shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                Bukti pengerjaan teknisi ini telah disetujui (Approved).
              </span>
              <Badge className="bg-emerald-600 text-white font-bold px-3 py-1 text-xs">Approved</Badge>
            </div>
          ) : selectedAssignment?.isPhase1 ? (
            <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-center justify-between text-sky-800 text-sm font-bold mt-4 shadow-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-sky-600 shrink-0" />
                Dokumentasi Foto Lapangan & TTD Digital Pelanggan (Fase 1).
              </span>
              <Badge className="bg-sky-600 text-white font-bold px-3 py-1 text-xs">Phase 1 Submitted</Badge>
            </div>
          ) : (() => {
            const canApprove = selectedAssignment?.status === 'phase_2_complete' || selectedAssignment?.status === 'submitted';

            return (
              <>
                {!canApprove && (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs mt-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-amber-900">Belum Siap Disetujui (Menunggu Laporan Fase 2)</p>
                      <p className="text-amber-700 leading-relaxed">
                        Status teknisi saat ini masih <strong>{selectedAssignment?.status || 'Assigned'}</strong>. Tombol persetujuan (Approve) hanya dapat digunakan setelah teknisi mengunggah selfie kehadiran dan menyelesaikan laporan tugas (Fase 2) dari aplikasi teknisi.
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Catatan Penolakan (Hanya jika ditolak)</label>
                    <textarea 
                      className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      rows={3}
                      placeholder="Berikan alasan jika menolak bukti ini..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleReject}
                    disabled={isRejecting || isApproving || !canApprove}
                  >
                    {isRejecting ? 'Menolak...' : 'Reject Bukti'}
                  </Button>
                  <Button 
                    className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting || !canApprove}
                    title={!canApprove ? 'Teknisi belum menyelesaikan Fase 2' : undefined}
                  >
                    {isApproving ? 'Menyetujui...' : 'Approve Bukti'}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Enlarged Photo Preview Modal */}
      {previewPhoto && (
        <ImagePreviewModal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          imageUrl={previewPhoto.url}
          title={previewPhoto.title}
        />
      )}
    </div>
  );
};
