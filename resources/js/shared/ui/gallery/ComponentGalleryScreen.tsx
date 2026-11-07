import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Select,
  Checkbox,
  Switch,
  Badge,
  Avatar,
  Icon,
  Spinner,
  Skeleton,
  Divider,
  Tooltip,
  ComponentDensity,
} from '../atoms';
import {
  FormField,
  SearchBox,
  StatusBadge,
  SlaBadge,
  StatCard,
  SignalIndicator,
  UploadProgressItem,
  ToastItem,
  EmptyState,
  ConfirmDialog,
} from '../molecules';
import {
  TicketCard,
  TicketStepper,
  AttendanceReviewCard,
  SignaturePad,
  OfflineBanner,
  OutboxList,
  OutboxItem,
} from '../organisms';
import { BrandLogo } from '../brand/BrandLogo';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Radio,
  Wifi,
  Users,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ComponentGalleryScreen: React.FC = () => {
  const [density, setDensity] = useState<ComponentDensity>('comfortable');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [switchVal, setSwitchVal] = useState(true);
  const [selectVal, setSelectVal] = useState('fiber-50');

  const [toasts, setToasts] = useState([
    { id: '1', type: 'success' as const, title: 'Operasi Berhasil', message: 'Koneksi ONU pelanggan berhasil diverifikasi via BRAS.' },
    { id: '2', type: 'warning' as const, title: 'Peringatan SLA', message: 'Tiket #TKT-8841 tersisa 15 menit sebelum melampaui batas.' },
  ]);

  const mockOutbox: OutboxItem[] = [
    {
      id: 'ob-1',
      actionType: 'ABSEN_MASUK',
      description: 'Absen masuk di ODC-KPN-01 (15 m dari radius kantor)',
      createdAt: '08:02 WIB',
      status: 'pending',
    },
    {
      id: 'ob-2',
      actionType: 'BAST_SUBMIT',
      description: 'Tanda tangan BAST Pelanggan #CUST-9923 (Budi Santoso)',
      createdAt: '09:45 WIB',
      status: 'syncing',
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Gallery Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="admin" size="md" />
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold font-mono">
              DESIGN SYSTEM V1.0
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Katalog komponen reusable, bebas nilai hardcoded, dan mendukung penuh Web Admin & PWA Lapangan.
          </p>
        </div>

        {/* Density Switcher */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl border border-border bg-muted/40">
          <span className="text-xs font-medium text-muted-foreground px-2">Densitas:</span>
          <Button
            variant={density === 'compact' ? 'primary' : 'ghost'}
            size="sm"
            density="compact"
            onClick={() => setDensity('compact')}
          >
            Compact (Admin)
          </Button>
          <Button
            variant={density === 'comfortable' ? 'primary' : 'ghost'}
            size="sm"
            density="compact"
            onClick={() => setDensity('comfortable')}
          >
            Comfortable (PWA)
          </Button>
        </div>
      </div>

      {/* SECTION 1: FOUNDATION & DESIGN TOKENS */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            1. Foundation & Design Tokens
          </h3>
          <p className="text-xs text-muted-foreground">Palet warna serat optik, tipografi, radius, dan status semantik baku.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="w-full h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-mono text-xs font-bold">
              Cyan Pulse
            </div>
            <p className="text-xs font-semibold text-foreground">Brand Primary</p>
            <p className="text-[11px] text-muted-foreground font-mono">--primary</p>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="w-full h-12 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-mono text-xs font-bold">
              Safe / Aktif
            </div>
            <p className="text-xs font-semibold text-foreground">Status Aman</p>
            <p className="text-[11px] text-muted-foreground font-mono">emerald-500</p>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="w-full h-12 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-mono text-xs font-bold">
              Warning
            </div>
            <p className="text-xs font-semibold text-foreground">SLA Waspada</p>
            <p className="text-[11px] text-muted-foreground font-mono">amber-500</p>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="w-full h-12 rounded-lg bg-rose-500 flex items-center justify-center text-white font-mono text-xs font-bold">
              Breached
            </div>
            <p className="text-xs font-semibold text-foreground">Status Kritis</p>
            <p className="text-[11px] text-muted-foreground font-mono">rose-500</p>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="w-full h-12 rounded-lg bg-slate-700 flex items-center justify-center text-white font-mono text-xs font-bold">
              Paused
            </div>
            <p className="text-xs font-semibold text-foreground">SLA Dijeda</p>
            <p className="text-[11px] text-muted-foreground font-mono">slate-700</p>
          </div>

          <div className="p-3 rounded-xl border border-border bg-card space-y-2">
            <div className="w-full h-12 rounded-lg bg-card border border-border flex items-center justify-center text-foreground font-mono text-xs font-bold">
              Background
            </div>
            <p className="text-xs font-semibold text-foreground">Navy Base</p>
            <p className="text-[11px] text-muted-foreground font-mono">--background</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: ATOMS */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            2. Komponen Atoms
          </h3>
          <p className="text-xs text-muted-foreground">Elemen dasar antarmuka dengan varian lengkap dan dukungan responsif.</p>
        </div>

        {/* Buttons & IconButtons */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Tombol (Button &amp; IconButton)</h4>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" density={density}>Primary</Button>
            <Button variant="secondary" density={density}>Secondary</Button>
            <Button variant="outline" density={density}>Outline</Button>
            <Button variant="danger" density={density}>Danger</Button>
            <Button variant="ghost" density={density}>Ghost</Button>
            <Button variant="primary" density={density} isLoading>Memuat</Button>
            <Button variant="primary" density={density} disabled>Nonaktif</Button>
            <Button variant="primary" density={density} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Dengan Ikon
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
            <IconButton icon={<Sparkles className="w-4 h-4" />} ariaLabel="Aksi" variant="primary" density={density} />
            <IconButton icon={<Search className="w-4 h-4" />} ariaLabel="Cari" variant="secondary" density={density} />
            <IconButton icon={<AlertCircle className="w-4 h-4" />} ariaLabel="Peringatan" variant="danger" density={density} />
            <IconButton icon={<Wifi className="w-4 h-4" />} ariaLabel="Sinyal" variant="ghost" density={density} />
            <IconButton icon={<Sparkles className="w-4 h-4" />} ariaLabel="Memuat" variant="primary" density={density} isLoading />
          </div>
        </div>

        {/* Form Controls */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Kontrol Input &amp; Pilihan</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input placeholder="Input teks biasa..." density={density} />
            <Input placeholder="Serial ONU (Monospace)" isMonospace defaultValue="FHTT-8823901" density={density} />
            <Select
              options={[
                { value: 'fiber-20', label: 'Fiber Home 20 Mbps' },
                { value: 'fiber-50', label: 'Fiber Prime 50 Mbps' },
                { value: 'fiber-100', label: 'Fiber Ultra 100 Mbps' },
              ]}
              value={selectVal}
              onChange={(e) => setSelectVal(e.target.value)}
              density={density}
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border/60">
            <Checkbox
              label="SLA Diaktifkan"
              description="Hitung waktu penyelesaian tiket otomatis"
              checked={checkboxVal}
              onChange={(e) => setCheckboxVal(e.target.checked)}
              density={density}
            />

            <Switch
              label="Mode Lapangan Otomatis"
              checked={switchVal}
              onChange={setSwitchVal}
              density={density}
            />
          </div>
        </div>

        {/* Badges, Avatars, Skeletons */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Badge, Avatar &amp; Skeleton</h4>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="default">Default</Badge>
            <Badge tone="success" dot>Sukses / Aktif</Badge>
            <Badge tone="warning" dot>Menunggu</Badge>
            <Badge tone="danger" dot>Terisolir</Badge>
            <Badge tone="info" dot>Dalam Perjalanan</Badge>
            <Badge tone="neutral" dot>Dijeda</Badge>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-border/60">
            <Avatar name="Ahmad Fauzi" size="sm" status="online" />
            <Avatar name="Budi Santoso" size="md" status="away" />
            <Avatar name="Superadmin Fibermedia" size="lg" status="busy" />
            <Tooltip content="Indikator Tooltip Reusable">
              <span className="text-xs text-primary underline cursor-pointer">Hover Tooltip</span>
            </Tooltip>
          </div>
        </div>
      </section>

      {/* SECTION 3: MOLECULES */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            3. Komponen Molecules
          </h3>
          <p className="text-xs text-muted-foreground">Gabungan atom yang membentuk komponen fungsional terarah.</p>
        </div>

        {/* StatCards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pelanggan Aktif"
            value="1.428"
            subtext="99.2% uptime jaringan"
            icon={Users}
            tone="default"
            trend={{ value: "+4.5%", isPositive: true }}
            density={density}
          />
          <StatCard
            title="Tiket Pengaduan Baru"
            value="12"
            subtext="3 eskalasi ke NOC"
            icon={AlertCircle}
            tone="warning"
            trend={{ value: "-2.1%", isPositive: true }}
            density={density}
          />
          <StatCard
            title="Tiket Lewat Batas (SLA)"
            value="1"
            subtext="Perlu tindakan segera"
            icon={Clock}
            tone="danger"
            trend={{ value: "+1", isPositive: false }}
            density={density}
          />
          <StatCard
            title="Kapasitas ODP Rata-rata"
            value="74.2%"
            subtext="Tersedia 312 port"
            icon={Radio}
            tone="success"
            density={density}
          />
        </div>

        {/* FormField, Status & SLA Badges, Signal Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Form Field &amp; Pencarian</h4>
            <FormField
              label="Kode ODP Induk"
              required
              helperText="Pilih ODP dengan port aktif tersedia di area pelanggan"
              density={density}
            >
              <Input isMonospace defaultValue="ODP-KPN-01/04" density={density} />
            </FormField>

            <SearchBox
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Cari nama, NIK, atau serial ONU..."
              density={density}
            />
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Status, SLA &amp; Redaman Optik</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" category="customer" />
              <StatusBadge status="suspended" category="customer" />
              <StatusBadge status="in_progress" category="ticket" />
              <StatusBadge status="resolved" category="ticket" />
            </div>

            <div className="flex flex-wrap gap-2">
              <SlaBadge status="safe" timeText="03:45:00" />
              <SlaBadge status="warning" timeText="00:25:00" />
              <SlaBadge status="breached" timeText="Lewat 12 m" />
              <SlaBadge status="paused" timeText="Dijeda" pauseReason="Hujan badai petir di lokasi" />
            </div>

            <div className="pt-2 border-t border-border flex items-center gap-4">
              <SignalIndicator dbm={-19.45} />
              <SignalIndicator dbm={-25.80} />
              <SignalIndicator dbm={-28.50} />
            </div>
          </div>
        </div>

        {/* Upload Progress & Toast Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Unggah Berkas &amp; Bukti Foto</h4>
            <UploadProgressItem
              fileName="foto_redaman_odp.jpg"
              fileSize="2.4 MB"
              progress={65}
              status="uploading"
            />
            <UploadProgressItem
              fileName="bast_pelanggan_signed.pdf"
              fileSize="512 KB"
              progress={100}
              status="completed"
            />
          </div>

          <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Pemberitahuan Sistem (Toast)</h4>
            {toasts.map((t) => (
              <ToastItem
                key={t.id}
                id={t.id}
                type={t.type}
                title={t.title}
                message={t.message}
                onDismiss={(id) => setToasts((prev) => prev.filter((item) => item.id !== id))}
              />
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: ORGANISMS */}
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            4. Komponen Organisms
          </h3>
          <p className="text-xs text-muted-foreground">Komponen majemuk yang siap dipakai langsung pada layar per fitur.</p>
        </div>

        {/* TicketStepper */}
        <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Ticket Stepper (Alur Pengerjaan Lapangan)</h4>
          <TicketStepper
            currentStep="in_progress"
            timestamps={{
              assigned: '08:15 WIB',
              on_the_way: '08:35 WIB',
              in_progress: '09:00 WIB',
            }}
          />
        </div>

        {/* TicketCard & AttendanceReviewCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Kartu Tiket Lapangan</h4>
            <TicketCard
              ticketNumber="TKT-2026-0812"
              title="Redaman Tinggi &amp; Internet Lambat"
              customerName="Siti Rahmawati"
              address="Jl. Ijen No. 45, RT 02 / RW 04, Malang"
              status="in_progress"
              priority="Tinggi"
              slaStatus="warning"
              slaTimeText="00:35:10"
              technicianName="Ahmad Fauzi (Tim Alpha)"
              density={density}
              actionLabel="Detail Tugas"
              onActionClick={() => alert('Membuka detail tiket')}
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Kartu Tinjauan Absensi Lapangan</h4>
            <AttendanceReviewCard
              id="att-1"
              userName="Ahmad Fauzi"
              userRole="Teknisi Lapangan (Tim Alpha)"
              workDate="31 Okt 2026"
              clockInTime="07:58 WIB"
              distanceMeters={18}
              isInsideRadius={true}
              gpsAccuracyMeters={4.2}
              photoUrl="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
              density={density}
              onApprove={(id) => alert(`Menyetujui absensi #${id}`)}
              onReject={(id) => alert(`Menolak absensi #${id}`)}
            />
          </div>
        </div>

        {/* Signature Pad */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Kanvas Tanda Tangan BAST</h4>
          <SignaturePad
            signerName="Budi Santoso"
            signerRole="Pelanggan FTTH"
            density={density}
            onSave={(dataUrl) => alert('Tanda tangan tersimpan!')}
          />
        </div>

        {/* Offline Banner & Outbox List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Mode Luring &amp; Outbox</h4>
          <OfflineBanner
            isOffline={true}
            queuedCount={mockOutbox.length}
            onSyncNow={() => alert('Menjalankan sinkronisasi outbox...')}
          />
          <OutboxList
            items={mockOutbox}
            density={density}
            onRetryItem={(id) => alert(`Coba ulang item ${id}`)}
            onDeleteItem={(id) => alert(`Hapus item ${id}`)}
            onRetryAll={() => alert('Mencoba sinkronisasi semua outbox')}
          />
        </div>

        {/* Interactive Confirm Dialog Trigger */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="md"
            density={density}
            onClick={() => setIsConfirmOpen(true)}
          >
            Buka Contoh ConfirmDialog
          </Button>
          <ConfirmDialog
            isOpen={isConfirmOpen}
            title="Konfirmasi Penugasan Ulang Tiket"
            description="Apakah Anda yakin ingin menugaskan kembali tiket ini ke Tim Beta? Teknisi saat ini akan dinotifikasi."
            confirmLabel="Ya, Tugaskan Ulang"
            cancelLabel="Batal"
            onConfirm={() => setIsConfirmOpen(false)}
            onClose={() => setIsConfirmOpen(false)}
          />
        </div>
      </section>
    </div>
  );
};

