import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { CheckCircle2, Users, ArrowRight } from 'lucide-react';
import type { Complaint } from '../../types/complaint';
import { ComplaintPriorityBadge } from './ComplaintPriorityBadge';

interface ComplaintAssignSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint | null;
  onViewDetail?: () => void;
  onBackToList?: () => void;
}

export const ComplaintAssignSuccessModal: React.FC<ComplaintAssignSuccessModalProps> = ({
  isOpen,
  onClose,
  complaint,
  onViewDetail,
  onBackToList,
}) => {
  if (!complaint) return null;

  const currentAssignment = complaint.current_assignment;
  const teamName = currentAssignment?.assigned_team || complaint.assigned_team || currentAssignment?.technician_name || 'Tim Lapangan';
  const teamMembers = currentAssignment?.team_members || complaint.team_members || [];
  const isManual = currentAssignment?.is_manual_assignment;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Header Celebration Gradient */}
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3 shadow-inner ring-4 ring-white/30 animate-bounce">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-white mb-1">
            Penugasan Berhasil!
          </DialogTitle>
          <DialogDescription className="text-xs text-white/90">
            Tiket <span className="font-mono font-semibold text-white bg-black/20 px-2 py-0.5 rounded">{complaint.ticket_number}</span> telah dialokasikan ke teknisi.
          </DialogDescription>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Card Tim Terpilih */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Tim Teknisi Bertugas
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isManual
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {isManual ? 'Manual Assign (SA)' : 'Round Robin Otomatis'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {teamName}
              </h3>
            </div>

            {/* Personil Teknisi */}
            {teamMembers.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-indigo-100/70 dark:border-slate-700">
                <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
                  Personil yang menerima tugas ini:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {teamMembers.map((m: any) => (
                    <div
                      key={m.id}
                      className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-2xs text-xs text-gray-800 dark:text-slate-200"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-medium">{m.name}</span>
                      {m.phone && (
                        <span className="text-[10px] text-gray-400 font-mono">({m.phone})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400 italic pt-1">
                Seluruh anggota {teamName} dapat langsung melihat dan mengerjakan tiket ini.
              </p>
            )}
          </div>

          {/* Quick Ticket Info */}
          <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800">
            <div>
              <span className="text-gray-400 dark:text-slate-400 text-[11px] block">Pelanggan</span>
              <span className="font-semibold text-gray-900 dark:text-white truncate block">
                {complaint.customer_name}
              </span>
              <span className="text-gray-500 font-mono text-[11px]">{complaint.customer_phone}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-slate-400 text-[11px] block">Wilayah & Prioritas</span>
              <span className="font-medium text-gray-800 dark:text-slate-200 truncate block">
                {complaint.area}
              </span>
              <div className="mt-0.5">
                <ComplaintPriorityBadge priority={complaint.priority} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-4 bg-gray-50 dark:bg-slate-900/80 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          {onBackToList && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToList}
              className="text-xs h-9 sm:w-1/2"
            >
              Daftar Pengaduan
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onViewDetail || onClose}
            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-medium sm:w-1/2 flex items-center justify-center gap-1.5 shadow-xs"
          >
            <span>Buka Detail Tiket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
