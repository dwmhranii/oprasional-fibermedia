import React from 'react';
import { StatusBadge, SlaBadge, SlaStatus } from '../molecules';
import { Button, ComponentDensity } from '../atoms';
import { MapPin, User, ArrowRight, Wrench } from 'lucide-react';

export interface TicketCardProps {
  ticketNumber: string;
  title: string;
  customerName: string;
  address: string;
  status: string;
  priority?: string;
  slaStatus: SlaStatus;
  slaTimeText: string;
  technicianName?: string;
  density?: ComponentDensity;
  onClick?: () => void;
  actionLabel?: string;
  onActionClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticketNumber,
  title,
  customerName,
  address,
  status,
  priority,
  slaStatus,
  slaTimeText,
  technicianName,
  density = 'comfortable',
  onClick,
  actionLabel,
  onActionClick,
  className = '',
}) => {
  const isCompact = density === 'compact';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-xl border border-border bg-card transition-all duration-150 text-left shadow-xs ${
        onClick
          ? 'cursor-pointer hover:border-cyan-500/50 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500'
          : ''
      } ${isCompact ? 'p-3.5 space-y-2.5' : 'p-4 sm:p-5 space-y-3.5'} ${className}`}
    >
      {/* Header: Ticket Number & SLA / Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
            #{ticketNumber}
          </span>
          <StatusBadge status={status} category="ticket" size="sm" />
          {priority && (
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
              • {priority}
            </span>
          )}
        </div>

        <SlaBadge status={slaStatus} timeText={slaTimeText} size="sm" />
      </div>

      {/* Main Title & Customer */}
      <div>
        <h4 className={`font-semibold text-foreground tracking-tight line-clamp-1 ${isCompact ? 'text-sm' : 'text-base'}`}>
          {title}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <span className="font-medium text-foreground">{customerName}</span>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        <span className="line-clamp-2 leading-relaxed">{address}</span>
      </div>

      {/* Footer: Technician Info & Optional Action */}
      <div className="flex items-center justify-between pt-2 border-t border-border/80 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wrench className="w-3.5 h-3.5" />
          <span>{technicianName ? technicianName : 'Belum ditugaskan'}</span>
        </div>

        {actionLabel && onActionClick && (
          <Button
            variant="primary"
            size="sm"
            density={density}
            onClick={(e) => {
              e.stopPropagation();
              onActionClick(e);
            }}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

