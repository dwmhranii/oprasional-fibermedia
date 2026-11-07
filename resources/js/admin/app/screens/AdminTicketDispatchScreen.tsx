import React, { useState } from 'react';
import {
  TicketCard,
  FilterBar,
  Button,
  Select,
  FormField,
  Input,
  UploadProgressItem,
  ConfirmDialog,
  Badge,
  SlaStatus,
} from '@shared/ui';
import {
  PauseCircle,
  PlayCircle,
  UserCheck,
  UploadCloud,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { ACTIONS } from '@shared/i18n/id';

interface DispatchTicketItem {
  id: string;
  ticketNumber: string;
  title: string;
  customerName: string;
  address: string;
  status: string;
  priority: string;
  slaStatus: SlaStatus;
  slaTimeText: string;
  technicianName: string;
  isPaused: boolean;
  pauseReason?: string;
  evidencePhotoName?: string;
}

export const AdminTicketDispatchScreen: React.FC = () => {
  const [tickets, setTickets] = useState<DispatchTicketItem[]>([
    {
      id: 't-1',
      ticketNumber: 'TKT-2026-0914',
      title: 'Kabel Dropcore Putus Tertimpa Pohon',
      customerName: 'Bambang Sudiro',
      address: 'Jl. Danau Toba No. 12, Sawojajar, Malang',
      status: 'in_progress',
      priority: 'Kritis',
      slaStatus: 'warning',
      slaTimeText: '00:18:40',
      technicianName: 'Tim Bravo (Rudi & Joko)',
      isPaused: false,
    },
    {
      id: 't-2',
      ticketNumber: 'TKT-2026-0915',
      title: 'Redaman Optik Melemah -29 dBm',
      customerName: 'Dr. Hendra Wijaya',
      address: 'Perumahan Araya Blok B2/14, Malang',
      status: 'assigned',
      priority: 'Tinggi',
      slaStatus: 'safe',
      slaTimeText: '01:42:00',
      technicianName: 'Tim Alpha (Ahmad)',
      isPaused: false,
    },
    {
      id: 't-3',
      ticketNumber: 'TKT-2026-0918',
      title: 'Tidak Bisa Koneksi PPPoE (Auth Timeout)',
      customerName: 'Siti Aminah',
      address: 'Jl. Galunggung No. 34, Klojen, Malang',
      status: 'open',
      priority: 'Sedang',
      slaStatus: 'safe',
      slaTimeText: '03:10:00',
      technicianName: 'Belum ditugaskan',
      isPaused: false,
    },
  ]);

  // Modal States
  const [selectedTicket, setSelectedTicket] = useState<DispatchTicketItem | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isPauseSlaModalOpen, setIsPauseSlaModalOpen] = useState(false);

  // Form states
  const [selectedTech, setSelectedTech] = useState('tech-alpha');
  const [standardPauseReason, setStandardPauseReason] = useState('cuaca_ekstrem');
  const [customNote, setCustomNote] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const standardReasons = [
    { value: 'cuaca_ekstrem', label: 'Hujan badai / cuaca ekstrem di lokasi' },
    { value: 'izin_akses', label: 'Menunggu izin akses pengelola perumahan/gedung' },
    { value: 'jadwal_ulang_pelanggan', label: 'Pelanggan meminta jadwal ulang kedatangan' },
    { value: 'backbone_maintenance', label: 'Perbaikan kabel feeder/backbone oleh tim NOC pusat' },
  ];

  const handleOpenReassign = (ticket: DispatchTicketItem) => {
    setSelectedTicket(ticket);
    setIsReassignModalOpen(true);
  };

  const handleOpenPauseSla = (ticket: DispatchTicketItem) => {
    setSelectedTicket(ticket);
    setUploadProgress(null);
    setUploadedFileName('');
    setIsPauseSlaModalOpen(true);
  };

  const handleConfirmReassign = () => {
    if (!selectedTicket) return;
    const techName =
      selectedTech === 'tech-alpha'
        ? 'Tim Alpha (Ahmad & Fauzi)'
        : selectedTech === 'tech-bravo'
        ? 'Tim Bravo (Rudi & Joko)'
        : 'Tim Charlie (Danang)';

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? { ...t, technicianName: techName, status: 'assigned' }
          : t
      )
    );
    setIsReassignModalOpen(false);
  };

  const handleSimulateUpload = () => {
    setUploadedFileName('bukti_hujan_deras_lokasi.jpg');
    setUploadProgress(20);
    const interval = setInterval(() => {
      setUploadProgress((p) => {
        if (p === null || p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 30;
      });
    }, 150);
  };

  const handleConfirmPauseSla = () => {
    if (!selectedTicket) return;
    const reasonObj = standardReasons.find((r) => r.value === standardPauseReason);
    const reasonText = reasonObj ? reasonObj.label : 'Dijeda oleh Dispatcher';

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              isPaused: true,
              slaStatus: 'paused',
              slaTimeText: 'Dijeda',
              pauseReason: reasonText,
              evidencePhotoName: uploadedFileName || 'bukti_verifikasi_noc.jpg',
            }
          : t
      )
    );
    setIsPauseSlaModalOpen(false);
  };

  const handleResumeSla = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              isPaused: false,
              slaStatus: 'warning',
              slaTimeText: '00:18:40',
              pauseReason: undefined,
            }
          : t
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Manajemen Dispatch Tiket &amp; Kontrol SLA
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Penugasan teknisi lapangan dan jeda sementara penghitungan SLA dengan verifikasi alasan baku serta foto bukti.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="warning" size="md" dot>
            {tickets.filter((t) => t.slaStatus === 'warning' || t.slaStatus === 'breached').length} Tiket Kritis
          </Badge>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="space-y-2">
            <TicketCard
              ticketNumber={ticket.ticketNumber}
              title={ticket.title}
              customerName={ticket.customerName}
              address={ticket.address}
              status={ticket.status}
              priority={ticket.priority}
              slaStatus={ticket.slaStatus}
              slaTimeText={ticket.slaTimeText}
              technicianName={ticket.technicianName}
              density="compact"
            />

            {/* Quick Action Bar per Card */}
            <div className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                density="compact"
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                onClick={() => handleOpenReassign(ticket)}
              >
                Tugaskan Ulang
              </Button>

              {ticket.isPaused ? (
                <Button
                  variant="primary"
                  size="sm"
                  density="compact"
                  leftIcon={<PlayCircle className="w-3.5 h-3.5" />}
                  onClick={() => handleResumeSla(ticket.id)}
                >
                  Lanjutkan SLA
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  density="compact"
                  leftIcon={<PauseCircle className="w-3.5 h-3.5 text-amber-500" />}
                  onClick={() => handleOpenPauseSla(ticket)}
                >
                  Jeda SLA
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: REASSIGN TECHNICIAN */}
      {isReassignModalOpen && selectedTicket && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
        >
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Tugaskan Ulang Tiket #{selectedTicket.ticketNumber}
              </h3>
              <p className="text-xs text-muted-foreground">
                Pilih tim teknisi yang bertugas di wilayah {selectedTicket.address}.
              </p>
            </div>

            <FormField label="Pilih Tim Teknisi" required density="comfortable">
              <Select
                options={[
                  { value: 'tech-alpha', label: 'Tim Alpha (Ahmad & Fauzi) - Area Kepanjen' },
                  { value: 'tech-bravo', label: 'Tim Bravo (Rudi & Joko) - Area Sawojajar' },
                  { value: 'tech-charlie', label: 'Tim Charlie (Danang) - Area Dinoyo' },
                ]}
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                density="comfortable"
              />
            </FormField>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                density="compact"
                onClick={() => setIsReassignModalOpen(false)}
              >
                {ACTIONS.cancel}
              </Button>
              <Button
                variant="primary"
                size="sm"
                density="compact"
                onClick={handleConfirmReassign}
              >
                Konfirmasi Penugasan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAUSE SLA DENGAN ALASAN BAKU & FOTO BUKTI */}
      {isPauseSlaModalOpen && selectedTicket && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0"
        >
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-base font-bold text-foreground">
                  Jeda SLA Tiket #{selectedTicket.ticketNumber}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Penghentian sementara perhitungan waktu SLA wajib menyertakan alasan operasional baku dan bukti foto lokasi.
                </p>
              </div>
            </div>

            <FormField label="Alasan Baku Jeda SLA" required density="comfortable">
              <Select
                options={standardReasons}
                value={standardPauseReason}
                onChange={(e) => setStandardPauseReason(e.target.value)}
                density="comfortable"
              />
            </FormField>

            <FormField label="Catatan Tambahan Dispatcher" density="comfortable">
              <Input
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Contoh: Petir menyambar tiang utama, menunggu cuaca reda..."
                density="comfortable"
              />
            </FormField>

            {/* Photo Evidence Upload Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Foto Bukti Lapangan</span>
                <span className="text-rose-500 font-bold">*Wajib</span>
              </label>

              {uploadProgress === null ? (
                <div
                  onClick={handleSimulateUpload}
                  className="p-4 rounded-xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-1.5"
                >
                  <UploadCloud className="w-6 h-6 text-primary" />
                  <span className="text-xs font-medium text-foreground">Klik untuk unggah foto bukti</span>
                  <span className="text-[11px] text-muted-foreground">Format JPG/PNG maks. 5 MB</span>
                </div>
              ) : (
                <UploadProgressItem
                  fileName={uploadedFileName}
                  fileSize="3.2 MB"
                  progress={uploadProgress}
                  status={uploadProgress >= 100 ? 'completed' : 'uploading'}
                  onCancel={() => setUploadProgress(null)}
                />
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                density="compact"
                onClick={() => setIsPauseSlaModalOpen(false)}
              >
                {ACTIONS.cancel}
              </Button>
              <Button
                variant="danger"
                size="sm"
                density="compact"
                disabled={uploadProgress === null || uploadProgress < 100}
                onClick={handleConfirmPauseSla}
              >
                Jeda Waktu SLA
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

