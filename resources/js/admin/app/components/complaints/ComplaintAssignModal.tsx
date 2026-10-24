import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useAuth } from '../../context/AuthContext';
import { useAvailableTeams, useAssignComplaint } from '../../hooks/useComplaints';
import type { Complaint } from '../../types/complaint';
import { Users, ShieldCheck, Info, Loader2, AlertTriangle, UserCheck } from 'lucide-react';

interface ComplaintAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onAssigned?: (complaint: Complaint) => void;
}

export const ComplaintAssignModal: React.FC<ComplaintAssignModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onAssigned,
}) => {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin' || user?.roles?.includes('superadmin');

  // Assign mode for superadmin: 'auto' | 'manual'
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('auto');
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Teams query
  const { data: teams = [], isLoading: isLoadingTeams } = useAvailableTeams(complaint?.area);

  const assignMutation = useAssignComplaint();

  const handleOpenChange = (open: boolean) => {
    if (!open && !assignMutation.isPending) {
      setAssignMode('auto');
      setSelectedTeamName('');
      setNotes('');
      onClose();
    }
  };

  const selectedTeamData = teams.find((t) => t.name === selectedTeamName);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;

    if (isSuperadmin && assignMode === 'manual' && !selectedTeamName) {
      return;
    }

    try {
      const res = await assignMutation.mutateAsync({
        id: complaint.id,
        payload: {
          team: isSuperadmin && assignMode === 'manual' ? selectedTeamName : undefined,
          notes: notes.trim() || undefined,
        },
      });

      handleOpenChange(false);
      if (onAssigned && res?.complaint) {
        onAssigned(res.complaint);
      }
    } catch {
      // Handled by toast
    }
  };

  if (!complaint) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Tugaskan Tim Teknisi
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-slate-400">
                Tiket: <strong>{complaint.ticket_number}</strong> &bull; Wilayah:{' '}
                <span className="font-medium text-gray-800 dark:text-slate-200">{complaint.area}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleAssign} className="space-y-4 pt-2">
          {/* Section: Mode Penugasan */}
          {isSuperadmin ? (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Hak Akses Superadmin
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Bisa memilih manual tim</span>
              </div>

              <RadioGroup
                value={assignMode}
                onValueChange={(val: 'auto' | 'manual') => setAssignMode(val)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-700">
                  <RadioGroupItem value="auto" id="mode-auto" />
                  <Label htmlFor="mode-auto" className="text-xs font-medium cursor-pointer flex-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Otomatis (Round Robin Antar Tim)</span>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Sistem memilih Tim aktif dengan beban tiket paling ringan untuk area {complaint.area}.
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-700">
                  <RadioGroupItem value="manual" id="mode-manual" />
                  <Label htmlFor="mode-manual" className="text-xs font-medium cursor-pointer flex-1">
                    <span className="font-semibold text-gray-900 dark:text-white">Pilih Tim Manual</span>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Pilih langsung salah satu Tim Teknisi (Team A, Team B, Team C, dsb.) untuk menangani tiket ini.
                    </p>
                  </Label>
                </div>
              </RadioGroup>

              {/* Dropdown Tim if manual */}
              {assignMode === 'manual' && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Pilih Tim Lapangan <span className="text-red-500">*</span>
                  </label>
                  {isLoadingTeams ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      Memuat daftar tim teknisi...
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      Tidak ada Tim Teknisi aktif yang terdaftar di sistem.
                    </div>
                  ) : (
                    <select
                      value={selectedTeamName || ''}
                      onChange={(e) => setSelectedTeamName(e.target.value)}
                      className="w-full text-xs rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Pilih salah satu Tim Teknisi --</option>
                      {teams.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name} ({t.member_count} Personil) &mdash; Beban: {t.active_tickets_count} tiket aktif
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Preview personil tim */}
                  {selectedTeamData && selectedTeamData.technicians && selectedTeamData.technicians.length > 0 && (
                    <div className="mt-2.5 p-2.5 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 rounded-md shadow-xs space-y-1.5">
                      <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 block">
                        Personil Terdaftar di {selectedTeamData.name}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTeamData.technicians.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded text-[11px]"
                          >
                            <UserCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            {m.name} {m.phone ? `(${m.phone})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Mode untuk Admin: Pure Round Robin Antar Tim */
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-900 dark:text-blue-300 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span>Penugasan Otomatis Antar Tim (Round Robin)</span>
              </div>
              <p className="text-blue-800 dark:text-blue-200 leading-relaxed text-[11px]">
                Sesuai kebijakan operasional, akun <strong>Admin</strong> menugaskan tim melalui sistem otomatis (Round Robin berbobot beban paling rendah antar Tim Teknisi di wilayah <strong>{complaint.area}</strong>).
              </p>
            </div>
          )}

          {/* Notes for team */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Catatan untuk Tim Teknisi <span className="text-gray-400 dark:text-slate-500 font-normal">(opsional)</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Harap hubungi pelanggan sebelum tiba di lokasi..."
              rows={3}
              className="w-full text-xs resize-none dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100"
              disabled={assignMutation.isPending}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={assignMutation.isPending}
              className="dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Tugaskan Nanti
            </Button>
            <Button
              type="submit"
              disabled={
                assignMutation.isPending ||
                (isSuperadmin && assignMode === 'manual' && !selectedTeamName)
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[130px]"
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menugaskan Tim...
                </>
              ) : (
                'Tugaskan Tim'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
