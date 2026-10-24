import React from 'react';
import {
  Clock,
  UserCheck,
  Wrench,
  PauseCircle,
  CheckCircle2,
  CheckCheck,
  XCircle,
  RotateCcw,
  Users,
} from 'lucide-react';
import type { ComplaintStatus } from '../../types/complaint';

interface ComplaintStatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
  showIcon?: boolean;
}

export const COMPLAINT_STATUS_CONFIG: Record<
  ComplaintStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  open: {
    label: 'Baru (Open)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
  },
  assigned: {
    label: 'Ditugaskan',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: UserCheck,
  },
  in_progress: {
    label: 'Dikerjakan',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Wrench,
  },
  pending_customer: {
    label: 'Pending Pelanggan',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: PauseCircle,
  },
  phase_1_completed: {
    label: 'Fase 1 Selesai (Menunggu Absen)',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: Users,
  },
  resolved: {
    label: 'Selesai Teknisi',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  closed: {
    label: 'Ditutup (Closed)',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: CheckCheck,
  },
  cancelled: {
    label: 'Dibatalkan',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    icon: XCircle,
  },
  reopened: {
    label: 'Dibuka Kembali',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    icon: RotateCcw,
  },
};

export const ComplaintStatusBadge: React.FC<ComplaintStatusBadgeProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const config = COMPLAINT_STATUS_CONFIG[status] || COMPLAINT_STATUS_CONFIG.open;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
