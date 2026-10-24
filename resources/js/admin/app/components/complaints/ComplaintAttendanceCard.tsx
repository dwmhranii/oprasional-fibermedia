import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  UserX,
  Phone,
} from 'lucide-react';
import { Button } from '../ui/button';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';
import { useComplaintAttendances } from '../../hooks/useComplaints';
import { useAuth } from '../../context/AuthContext';
import { resolveImgUrl } from '../../lib/printBastHelper';
import { formatDate } from '../../lib/formatters';
import type { Complaint, ComplaintAttendance, TeamMember } from '../../types/complaint';

interface ComplaintAttendanceCardProps {
  complaint: Complaint;
  onOpenAttendanceModal?: () => void;
  className?: string;
}

export const ComplaintAttendanceCard: React.FC<ComplaintAttendanceCardProps> = ({
  complaint,
  onOpenAttendanceModal,
  className = '',
}) => {
  const { user } = useAuth();
  const { data: attendanceData, isLoading, refetch } = useComplaintAttendances(complaint.id);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Selfie Absensi');

  // Anggota tim dan absensi (gabungkan data dari endpoint attendances atau fallback dari complaint)
  const teamName =
    attendanceData?.assigned_team ||
    complaint.assigned_team ||
    complaint.current_assignment?.assigned_team ||
    'Tim Lapangan';

  const teamMembers: TeamMember[] =
    attendanceData?.team_members ||
    complaint.team_members ||
    complaint.current_assignment?.team_members ||
    [];

  const attendances: ComplaintAttendance[] =
    attendanceData?.attendances || complaint.attendances || [];

  // Hitung jumlah kehadiran
  const totalMembers = teamMembers.length;
  const attendedCount = attendances.length;
  const isComplete =
    attendanceData?.all_team_members_attended ??
    complaint.all_team_members_attended ??
    (totalMembers > 0 && attendedCount >= totalMembers);

  // Cek apakah user saat ini adalah anggota tim yang belum absen
  const currentUserId = user?.id;
  const currentUserAttended = attendances.some((a) => a.user_id === currentUserId);
  const isUserInTeam =
    user?.role === 'teknisi' ||
    user?.roles?.includes('teknisi') ||
    teamMembers.some((m) => m.id === currentUserId);

  const canUserAttend = isUserInTeam && !currentUserAttended && complaint.status !== 'closed' && complaint.status !== 'cancelled';

  const handleOpenPhoto = (url: string, name: string) => {
    setPreviewPhoto(resolveImgUrl(url));
    setPreviewTitle(`Selfie Absensi Geotag: ${name}`);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs p-5 space-y-4 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Fase 2: Absensi Mandiri Tim Lapangan
              </h3>
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {teamName}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Setiap teknisi bertugas wajib selfie di lokasi pelanggan untuk validasi kehadiran
            </p>
          </div>
        </div>

        {/* Status Badge Kelengkapan */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tim Lengkap ({attendedCount}/{totalMembers || attendedCount})</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Menunggu Absen ({attendedCount}/{totalMembers || 2})
              </span>
            </span>
          )}

          {canUserAttend && onOpenAttendanceModal && (
            <Button
              size="sm"
              onClick={onOpenAttendanceModal}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 font-medium shadow-xs flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Ambil Absen Saya</span>
            </Button>
          )}
        </div>
      </div>

      {/* Progress Banner Status 2-Fase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Box Fase 1 */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Fase 1: Teknis Lapangan</span>
            {complaint.current_assignment?.resolved_at || complaint.phase_1_completed_at ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Selesai
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                Sedang Dikerjakan
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Perbaikan fisik, pengukuran OPM, & upload foto bukti kabel/ONT.
          </p>
        </div>

        {/* Box Fase 2 */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-gray-700 dark:text-slate-300">Fase 2: Geotag & Selfie</span>
            {isComplete ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" /> Lengkap
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                {attendedCount} dari {totalMembers || 2} Absen
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-slate-400">
            Selfie kamera depan dengan watermark GPS permanen dari setiap teknisi.
          </p>
        </div>
      </div>

      {/* Daftar Personel & Status Absensi */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
          Daftar Personel Tim Bertugas
        </h4>

        {teamMembers.length === 0 && attendances.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/40 rounded-lg border border-dashed border-gray-200 dark:border-slate-800">
            Belum ada data anggota tim yang ditugaskan ke tiket ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Render data tim yang ada di teamMembers */}
            {teamMembers.map((member) => {
              const att = attendances.find((a) => a.user_id === member.id || a.technician_name.toLowerCase().includes(member.name.toLowerCase()));
              const isCurrentUser = member.id === currentUserId;

              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-xl border transition-all ${
                    att
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selfie Thumbnail / Avatar */}
                    {att?.selfie_url ? (
                      <div
                        onClick={() => handleOpenPhoto(att.selfie_url, att.technician_name || member.name)}
                        className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-emerald-500 shrink-0 cursor-pointer group shadow-2xs"
                      >
                        <img
                          src={resolveImgUrl(att.selfie_url)}
                          alt={member.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 dark:border-slate-700">
                        <UserX className="w-5 h-5" />
                      </div>
                    )}

                    {/* Member Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {member.name}
                          {isCurrentUser && (
                            <span className="ml-1 text-[10px] text-teal-600 font-semibold">(Anda)</span>
                          )}
                        </span>
                        {att ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Hadir
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full shrink-0">
                            <Clock className="w-3 h-3" /> Belum Absen
                          </span>
                        )}
                      </div>

                      {member.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-mono">
                          <Phone className="w-3 h-3" />
                          <span>{member.phone}</span>
                        </div>
                      )}

                      {/* Info Absensi jika sudah hadir */}
                      {att && (
                        <div className="text-[11px] text-gray-600 dark:text-slate-400 space-y-0.5 pt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Waktu: <strong>{formatDate(att.clocked_at)}</strong></span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>
                              {att.latitude.toFixed(5)}, {att.longitude.toFixed(5)}
                            </span>
                            {att.distance_meters !== undefined && (
                              <span className="text-gray-400 font-sans">
                                (Jarak: {Math.round(att.distance_meters)}m)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Jika ada absensi dari personil yang tidak ada di teamMembers awal */}
            {attendances
              .filter((a) => !teamMembers.some((m) => m.id === a.user_id))
              .map((att) => (
                <div
                  key={`att-${att.id}`}
                  className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={() => handleOpenPhoto(att.selfie_url, att.technician_name)}
                      className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-emerald-500 shrink-0 cursor-pointer group shadow-2xs"
                    >
                      <img
                        src={resolveImgUrl(att.selfie_url)}
                        alt={att.technician_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {att.technician_name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Hadir
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        <span>Waktu: {formatDate(att.clocked_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal Zoom Preview Selfie */}
      {previewPhoto && (
        <ImagePreviewModal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          imageUrl={previewPhoto}
          title={previewTitle}
        />
      )}
    </div>
  );
};
