import React from 'react';
import {
  StatCard,
  TicketCard,
  Button,
  StatusBadge,
  SignalIndicator,
  Badge,
} from '@shared/ui';
import {
  Users,
  AlertCircle,
  Clock,
  Radio,
  FileSpreadsheet,
  Plus,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Activity,
  Server,
} from 'lucide-react';

export interface AdminDashboardScreenProps {
  onNavigate: (screenId: string) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onNavigate,
}) => {
  const urgentTickets = [
    {
      id: 'TKT-2026-0914',
      title: 'Kabel Dropcore Putus Tertimpa Pohon',
      customerName: 'Bambang Sudiro',
      address: 'Jl. Danau Toba No. 12, Sawojajar, Malang',
      status: 'in_progress',
      priority: 'Kritis',
      slaStatus: 'warning' as const,
      slaTimeText: '00:18:40',
      technicianName: 'Tim Bravo (Rudi & Joko)',
    },
    {
      id: 'TKT-2026-0915',
      title: 'Redaman Optik Melemah -29 dBm',
      customerName: 'Dr. Hendra Wijaya',
      address: 'Perumahan Araya Blok B2/14, Malang',
      status: 'assigned',
      priority: 'Tinggi',
      slaStatus: 'safe' as const,
      slaTimeText: '01:42:00',
      technicianName: 'Tim Alpha (Ahmad)',
    },
    {
      id: 'TKT-2026-0916',
      title: 'Modem Los Merah Berkedip Pasca Hujan',
      customerName: 'CV Mitra Abadi',
      address: 'Ruko Dinoyo Megah No. 8, Dinoyo, Malang',
      status: 'open',
      priority: 'Kritis',
      slaStatus: 'breached' as const,
      slaTimeText: 'Lewat 24 m',
      technicianName: 'Belum ditugaskan',
    },
  ];

  const networkNodes = [
    { name: 'ODC-KPN-01 (Kepanjen Central)', rxPower: -18.4, status: 'normal', activeClients: 248 },
    { name: 'ODC-SWJ-02 (Sawojajar Prime)', rxPower: -22.1, status: 'normal', activeClients: 312 },
    { name: 'ODC-DNY-03 (Dinoyo Gateway)', rxPower: -26.8, status: 'warning', activeClients: 195 },
    { name: 'ODC-ARY-04 (Araya Sector)', rxPower: -19.9, status: 'normal', activeClients: 284 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Ringkasan Operasional Hari Ini
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pemantauan langsung transmisi jaringan fiber optik FTTH, SLA pengaduan, dan tim lapangan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            density="compact"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
            onClick={() => alert('Mengekspor laporan operasional ke format Excel')}
          >
            Ekspor Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            density="compact"
            leftIcon={<MapPin className="w-4 h-4 text-primary" />}
            onClick={() => onNavigate('gis-map')}
          >
            Peta GIS ODP
          </Button>
          <Button
            variant="primary"
            size="sm"
            density="compact"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => onNavigate('dispatch')}
          >
            Dispatch Tiket
          </Button>
        </div>
      </div>

      {/* 4 StatCards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pelanggan Aktif"
          value="1.428"
          subtext="18 registrasi baru bulan ini"
          icon={Users}
          tone="default"
          trend={{ value: '+4.2%', isPositive: true }}
          onClick={() => onNavigate('customers')}
        />
        <StatCard
          title="Tiket Pengaduan Baru"
          value="12"
          subtext="3 eskalasi ke dispatcher NOC"
          icon={AlertCircle}
          tone="warning"
          trend={{ value: '-2.5%', isPositive: true }}
          onClick={() => onNavigate('dispatch')}
        />
        <StatCard
          title="Tiket Lewat Batas (SLA)"
          value="1"
          subtext="Perlu penanganan prioritas tinggi"
          icon={Clock}
          tone="danger"
          trend={{ value: '+1', isPositive: false }}
          onClick={() => onNavigate('dispatch')}
        />
        <StatCard
          title="Utilisasi Kapasitas ODP"
          value="74.8%"
          subtext="Tersedia 312 port aktif"
          icon={Radio}
          tone="success"
          onClick={() => onNavigate('gis-map')}
        />
      </div>

      {/* Split Section: Urgent SLA Tickets & Network Core Power */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent SLA Tickets (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Antrean Tiket Pengaduan Mendesak
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              density="compact"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => onNavigate('dispatch')}
            >
              Lihat Semua Antrean
            </Button>
          </div>

          <div className="space-y-3">
            {urgentTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticketNumber={ticket.id}
                title={ticket.title}
                customerName={ticket.customerName}
                address={ticket.address}
                status={ticket.status}
                priority={ticket.priority}
                slaStatus={ticket.slaStatus}
                slaTimeText={ticket.slaTimeText}
                technicianName={ticket.technicianName}
                density="compact"
                actionLabel="Dispatch"
                onActionClick={() => onNavigate('dispatch')}
              />
            ))}
          </div>
        </div>

        {/* Network Hub Signal Telemetry (1 Col) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Kondisi Redaman Hub Optik
              </h3>
            </div>
            <Badge tone="success" size="sm" dot>
              Normal
            </Badge>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
            <div className="space-y-3 divide-y divide-border/60">
              {networkNodes.map((node) => (
                <div key={node.name} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground truncate">{node.name}</span>
                    <SignalIndicator dbm={node.rxPower} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{node.activeClients} Pelanggan Online</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">99.9% Uptime</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                density="compact"
                className="w-full"
                leftIcon={<Server className="w-3.5 h-3.5 text-primary" />}
                onClick={() => onNavigate('gis-map')}
              >
                Buka Monitor Topologi ODC/ODP
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

