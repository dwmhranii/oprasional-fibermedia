import React from 'react';
import {
  Clock,
  Navigation,
  MapPin,
  Wrench,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Badge, BadgeTone } from '../atoms/Badge';
import { TicketStatus } from '../../types';

export interface StatusBadgeProps {
  status: TicketStatus | 'active_customer' | 'suspended_customer' | 'hadir' | 'off';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const map: Record<
    string,
    { label: string; tone: BadgeTone; icon: React.ReactNode }
  > = {
    pending: {
      label: 'Antrean Admin',
      tone: 'paused',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    assigned: {
      label: 'Ditugaskan (Wajib Respons ≤2j)',
      tone: 'warning',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    accepted: {
      label: 'Diterima Tim',
      tone: 'info',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    on_the_way: {
      label: 'Dalam Perjalanan',
      tone: 'info',
      icon: <Navigation className="w-3.5 h-3.5" />,
    },
    arrived: {
      label: 'Dikerjakan di Lokasi',
      tone: 'brand',
      icon: <MapPin className="w-3.5 h-3.5" />,
    },
    in_progress: {
      label: 'Dikerjakan',
      tone: 'brand',
      icon: <Wrench className="w-3.5 h-3.5" />,
    },
    phase1_completed: {
      label: 'BAST TTD · Menunggu Foto Kunjungan',
      tone: 'warning',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    resolved: {
      label: 'Menunggu Approval BAST Admin',
      tone: 'info',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    waiting_admin: {
      label: 'Approval BAST Admin',
      tone: 'info',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    closed: {
      label: 'Selesai (BAST Approved)',
      tone: 'safe',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    active_customer: {
      label: 'Pelanggan Active',
      tone: 'safe',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    suspended_customer: {
      label: 'Suspended (Manual CS)',
      tone: 'danger',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    hadir: {
      label: 'Hadir Terverifikasi',
      tone: 'safe',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    off: {
      label: 'Belum Absen',
      tone: 'warning',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
  };

  const cfg = map[status] || {
    label: String(status),
    tone: 'paused' as BadgeTone,
    icon: <Clock className="w-3.5 h-3.5" />,
  };

  return (
    <Badge tone={cfg.tone} size={size} icon={cfg.icon}>
      {cfg.label}
    </Badge>
  );
};
