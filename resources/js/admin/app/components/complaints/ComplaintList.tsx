import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { ComplaintStatusBadge } from './ComplaintStatusBadge';
import { ComplaintPriorityBadge } from './ComplaintPriorityBadge';
import { SlaCountdown } from './SlaCountdown';
import { ComplaintAssignModal } from './ComplaintAssignModal';
import { formatDate } from '../../lib/formatters';
import type { ComplaintListItem, Complaint } from '../../types/complaint';
import { Eye, UserCheck,
  Users, ChevronLeft, ChevronRight, Inbox, Clock } from 'lucide-react';

interface ComplaintListProps {
  complaints: ComplaintListItem[];
  isLoading?: boolean;
  total?: number;
  currentPage?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
}

export const ComplaintList: React.FC<ComplaintListProps> = ({
  complaints = [],
  isLoading = false,
  total = 0,
  currentPage = 1,
  perPage = 10,
  onPageChange,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [selectedComplaintForAssign, setSelectedComplaintForAssign] = useState<Complaint | null>(null);

  const totalPages = Math.ceil(total / perPage) || 1;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
        <p className="text-xs text-gray-500 dark:text-slate-400">Memuat data tiket pengaduan...</p>
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-12 text-center">
        <Inbox className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Tidak ada tiket pengaduan</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Belum ada tiket pengaduan yang sesuai dengan kriteria filter saat ini.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50/80 dark:bg-slate-950/80">
            <TableRow className="border-b border-gray-200 dark:border-slate-800">
              <TableHead className="w-[140px] text-xs font-semibold text-gray-700 dark:text-slate-300">No. Tiket</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 dark:text-slate-300">Pelanggan</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 dark:text-slate-300">Area</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 dark:text-slate-300">Kendala</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 dark:text-slate-300">Prioritas</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 dark:text-slate-300">Status</TableHead>
              <TableHead className="text-xs font-semibold text-gray-700 dark:text-slate-300">Target SLA</TableHead>
              <TableHead className="text-right text-xs font-semibold text-gray-700 dark:text-slate-300">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.map((item) => (
              <TableRow
                key={item.id}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                onClick={() => navigate(`/admin/complaints/${item.id}`)}
              >
                {/* Ticket Number & Date */}
                <TableCell className="font-medium text-xs">
                  <div className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                    {item.ticket_number}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {formatDate(item.created_at)}
                  </div>
                </TableCell>

                {/* Customer */}
                <TableCell className="text-xs">
                  <div className="font-medium text-gray-900 dark:text-slate-100">{item.customer_name}</div>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">{item.customer_phone}</div>
                </TableCell>

                {/* Area */}
                <TableCell className="text-xs">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-[11px] font-medium">
                    {item.area}
                  </span>
                </TableCell>

                {/* Subject & Category */}
                <TableCell className="text-xs max-w-[200px]">
                  <div className="truncate font-medium text-gray-800 dark:text-slate-200" title={item.subject}>
                    {item.subject}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {item.category}
                  </div>
                </TableCell>

                {/* Priority */}
                <TableCell className="text-xs">
                  <ComplaintPriorityBadge priority={item.priority} />
                </TableCell>

                {/* Status */}
                <TableCell className="text-xs">
                  <ComplaintStatusBadge status={item.status} />
                  {(item.assigned_team || item.assigned_to_name) && (
                    <div className="text-[11px] text-indigo-600 mt-1 flex items-center gap-1 font-medium">
                      <Users className="w-3 h-3 text-indigo-500" />
                      <span className="truncate max-w-[120px]">{item.assigned_team || item.assigned_to_name}</span>
                    </div>
                  )}
                </TableCell>

                {/* SLA Countdown */}
                <TableCell className="text-xs">
                  <SlaCountdown
                    dueAt={item.sla_resolve_due_at}
                    isPaused={item.status === 'pending_customer'}
                    isBreached={item.is_sla_breached}
                    isResolved={item.status === 'resolved' || item.status === 'closed'}
                    isCancelled={item.status === 'cancelled'}
                  />
                </TableCell>

                {/* Action Buttons */}
                <TableCell className="text-right text-xs" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    {item.status === 'open' && item.category !== 'billing' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200"
                        onClick={() => setSelectedComplaintForAssign(item as unknown as Complaint)}
                      >
                        <Users className="w-3.5 h-3.5 mr-1" />
                        Tugaskan Tim
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 text-gray-600 hover:text-gray-900"
                      onClick={() => navigate(`/admin/complaints/${item.id}`)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Detail
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Menampilkan {complaints.length} dari {total} tiket
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange && onPageChange(currentPage - 1)}
              className="h-7 px-2"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Sebelumnya
            </Button>
            <span className="font-medium text-gray-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange && onPageChange(currentPage + 1)}
              className="h-7 px-2"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Reused Assignment Modal */}
      {selectedComplaintForAssign && (
        <ComplaintAssignModal
          isOpen={!!selectedComplaintForAssign}
          onClose={() => {
            setSelectedComplaintForAssign(null);
            if (onRefresh) onRefresh();
          }}
          complaint={selectedComplaintForAssign}
        />
      )}
    </div>
  );
};
