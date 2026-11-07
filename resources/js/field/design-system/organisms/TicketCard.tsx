import React from 'react';
import { MapPin, Server, ChevronRight, Lock } from 'lucide-react';
import { WorkOrder } from '../../types';
import { StatusBadge } from '../molecules/StatusBadge';
import { SlaBadge, SlaState } from '../molecules/SlaBadge';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';

export interface TicketCardProps {
  workOrder: WorkOrder;
  distanceMeters?: number;
  density?: 'comfortable' | 'compact';
  onSelect: (wo: WorkOrder) => void;
  onAccept?: (wo: WorkOrder) => void;
}

const formatMinutesToHoursText = (mins: number): string => {
  const safeMins = Math.max(0, Math.round(mins));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  if (h <= 0) return `${m}m`;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
};

export const TicketCard: React.FC<TicketCardProps> = ({
  workOrder,
  distanceMeters,
  density = 'comfortable',
  onSelect,
  onAccept,
}) => {
  // PRD v1.2 Section 3 & 7:
  // - Jam SLA hanya berjalan 08.00-20.00 WIB, Senin-Sabtu
  // - Pada 75% target terpakai -> kuning (warning); 100% -> merah (overdue)
  // - SLA PSB berhenti saat BAST ditandatangani (waktu tunggu approval Admin tidak dihitung)
  const targetMins = workOrder.sla_target_minutes || (workOrder.type === 'psb' ? 1440 : 360);
  const elapsedMins = workOrder.sla_elapsed_operational_minutes || 60;
  const usageRatio = elapsedMins / targetMins;
  const remainingMins = Math.max(0, targetMins - elapsedMins);

  let slaState: SlaState = 'safe';
  let remainingText = `${formatMinutesToHoursText(remainingMins)} (08-20 WIB)`;

  if (workOrder.status === 'closed') {
    slaState = 'paused';
    remainingText = 'BAST Disetujui';
  } else if (workOrder.sla_paused) {
    slaState = 'paused';
    remainingText = 'Dijeda Admin/NOC';
  } else if (
    workOrder.type === 'psb' &&
    (workOrder.bast_status === 'signed_at_location' ||
      workOrder.status === 'phase1_completed' ||
      workOrder.status === 'resolved')
  ) {
    slaState = 'paused';
    remainingText = 'Stop (BAST TTD)';
  } else if (usageRatio >= 1) {
    slaState = 'overdue';
    remainingText = `Lewat (${Math.round(usageRatio * 100)}%)`;
  } else if (usageRatio >= 0.75) {
    slaState = 'warning';
    remainingText = `${formatMinutesToHoursText(remainingMins)} (${Math.round(usageRatio * 100)}%)`;
  }

  // Single sequential primary action button label per PRD v1.2 Section 4 & 7
  const actionLabel =
    workOrder.status === 'assigned'
      ? 'Terima Tiket (Respons SLA)'
      : workOrder.status === 'accepted'
      ? 'Berangkat ke Lokasi'
      : workOrder.status === 'on_the_way'
      ? 'Tiba & Kerjakan di Lokasi'
      : workOrder.status === 'arrived'
      ? 'Langkah 1: Bukti & TTD BAST'
      : workOrder.status === 'phase1_completed'
      ? 'Langkah 2: Foto Kunjungan GPS'
      : workOrder.status === 'resolved'
      ? 'Menunggu Approval BAST Admin'
      : 'Lihat Detail & BAST';

  const priorityLabel =
    workOrder.type === 'complaint' && workOrder.priority
      ? workOrder.priority === 'kritis'
        ? 'KRITIS · 3J'
        : workOrder.priority === 'tinggi'
        ? 'TINGGI · 6J'
        : 'SEDANG · 24J'
      : 'PSB · 24J OPS';

  return (
    <article
      className={`rounded-token-lg bg-surface-card border border-edge-subtle shadow-token-card hover:border-edge-focus transition ${
        density === 'comfortable' ? 'p-4 space-y-3' : 'p-3 space-y-2'
      }`}
    >
      {/* Top Row: Ticket ID + Type + Priority + SLA */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={workOrder.type === 'psb' ? 'info' : 'danger'} mono>
            {workOrder.type === 'psb' ? 'PSB BARU' : 'GANGGUAN'}
          </Badge>
          <Badge
            tone={
              workOrder.priority === 'kritis'
                ? 'danger'
                : workOrder.priority === 'tinggi'
                ? 'warning'
                : 'brand'
            }
            mono
          >
            {priorityLabel}
          </Badge>
          <span className="text-xs font-mono font-bold text-content-muted tabular-nums">
            {workOrder.ticket_number}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <SlaBadge state={slaState} remainingText={remainingText} />
        </div>
      </div>

      {/* Customer, Masked NIK & Title */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-content-primary">
              {workOrder.customer_name}
            </h3>
            <p className="text-xs font-mono text-content-muted">
              {workOrder.customer_code} · NIK: {workOrder.customer_nik_masked || '317405******0002'}
              {workOrder.onu_serial ? ` · ONU: ${workOrder.onu_serial}` : ''}
            </p>
          </div>
          <StatusBadge status={workOrder.status} />
        </div>
        <p className="text-xs font-semibold text-brand-accent mt-1">
          {workOrder.title} · {workOrder.package_name}
        </p>
        <p className="text-xs text-content-secondary flex items-start gap-1.5 mt-1.5">
          <MapPin className="w-3.5 h-3.5 text-content-muted shrink-0 mt-0.5" />
          <span>{workOrder.address}</span>
        </p>
      </div>

      {/* ODP Telemetry, Lock Indicator & Single Sequential Action Button */}
      <div className="pt-2.5 border-t border-edge-subtle flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-content-muted tabular-nums">
          <span className="inline-flex items-center gap-1 text-content-secondary font-semibold">
            <Server className="w-3.5 h-3.5 text-brand-accent" />
            {workOrder.odp_name || 'ODP-FIBER'}
            {workOrder.odp_port ? ` P#${workOrder.odp_port}` : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 text-content-muted" title="Tiket terkunci pada tim penerima (tanpa tombol oper-tugas)">
            <Lock className="w-3 h-3" />
            {workOrder.assigned_team_name || 'Tim Terkunci'}
          </span>
          {typeof distanceMeters === 'number' && (
            <>
              <span aria-hidden="true">·</span>
              <span>{distanceMeters}m</span>
            </>
          )}
        </div>

        {workOrder.status === 'assigned' && onAccept ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              density={density}
              onClick={(e) => {
                e.stopPropagation();
                onAccept(workOrder);
              }}
            >
              Terima Tiket
            </Button>
            <Button
              size="sm"
              variant="secondary"
              density={density}
              rightIcon={<ChevronRight className="w-4 h-4" />}
              onClick={() => onSelect(workOrder)}
            >
              Detail
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant={workOrder.status === 'closed' ? 'secondary' : 'primary'}
            density={density}
            rightIcon={<ChevronRight className="w-4 h-4" />}
            onClick={() => onSelect(workOrder)}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
};
