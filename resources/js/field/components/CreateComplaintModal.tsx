import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INITIAL_ODPS } from '../data/mockData';
import {
  X,
  Plus,
  MessageSquare,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface CreateComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateComplaintModal: React.FC<CreateComplaintModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentGps, workOrders, isTeamReady, teams, currentUser, showToast } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [category, setCategory] = useState<'LOS Merah' | 'Koneksi Lambat' | 'Kabel Putus' | 'ONT Rusak' | 'Lainnya'>('LOS Merah');
  const [priority, setPriority] = useState<'kritis' | 'tinggi' | 'normal'>('tinggi');
  const [rawWhatsAppMessage, setRawWhatsAppMessage] = useState('');
  const [selectedOdp, setSelectedOdp] = useState(INITIAL_ODPS[0].name);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !customerAddress) {
      alert('Nama pelanggan, nomor WhatsApp, dan alamat wajib diisi.');
      return;
    }

    // Generate complaint ticket
    const ticketId = Date.now();
    const ticketNumber = `GNG-2026-1026-${Math.floor(100 + Math.random() * 900)}`;

    // TeamDispatchService: Find next ready team
    const readyTeams = teams
      .filter((t) => t.is_active)
      .sort((a, b) => a.order_index - b.order_index)
      .filter((t) => isTeamReady(t.id).isReady);

    const assignedTeam = readyTeams.length > 0 ? readyTeams[0] : null;

    const newTicket = {
      id: ticketId,
      ticket_number: ticketNumber,
      type: 'complaint' as const,
      title: `[${category}] ${rawWhatsAppMessage ? rawWhatsAppMessage.slice(0, 35) + '...' : 'Gangguan Jaringan'}`,
      customer_name: customerName,
      customer_code: `FM-CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: customerPhone,
      address: customerAddress,
      latitude: currentGps.lat,
      longitude: currentGps.lng,
      package_name: 'Fiber Pro 100 Mbps',
      area: 'Jakarta Selatan',
      odp_name: selectedOdp,
      odp_port: Math.floor(1 + Math.random() * 8),
      status: (assignedTeam ? 'assigned' : 'unassigned') as any,
      assigned_team_id: assignedTeam?.id,
      assigned_team_name: assignedTeam?.name,
      assigned_at: assignedTeam ? new Date().toISOString() : undefined,
      response_deadline_at: assignedTeam ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined,
      reassign_count: 0,
      phase2_requirements: [],
      history_logs: [
        {
          timestamp: new Date().toISOString(),
          action: `Tiket Pengaduan Dibuat oleh ${currentUser.name} (Admin / CS)`,
          actor_name: currentUser.name,
          note: rawWhatsAppMessage ? `Pesan Asli WA: "${rawWhatsAppMessage}"` : undefined,
        },
        ...(assignedTeam
          ? [
              {
                timestamp: new Date().toISOString(),
                action: `Otomatis Ditugaskan ke ${assignedTeam.name} via TeamDispatchService`,
                actor_name: 'TeamDispatchService',
              },
            ]
          : [
              {
                timestamp: new Date().toISOString(),
                action: 'Menunggu di Antrean Belum Ditugaskan (Tidak ada tim yang siap)',
                actor_name: 'TeamDispatchService',
              },
            ]),
      ],
    };

    // Inject into work orders
    workOrders.unshift(newTicket as any);

    showToast(`Tiket ${ticketNumber} berhasil dibuat dan ${assignedTeam ? `ditugaskan ke ${assignedTeam.name}` : 'masuk antrean tertunda'}!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Input Pengaduan Gangguan (CS)</h2>
              <p className="text-[11px] text-slate-400">Aturan PRD: Diisi manual oleh admin dari laporan WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {/* Raw WhatsApp Message Input */}
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <label className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
              Pesan Asli dari WhatsApp Pelanggan (Disimpan untuk Audit)
            </label>
            <textarea
              rows={2}
              value={rawWhatsAppMessage}
              onChange={(e) => setRawWhatsAppMessage(e.target.value)}
              placeholder="Contoh: 'Selamat siang min, internet rumah saya los merah blinking dari jam 9 pagi...'"
              className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Pelanggan *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Ibu Rina Anggraini"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">No. WhatsApp *</label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0812xxxxxxxx"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Alamat Pelanggan *</label>
            <textarea
              rows={2}
              required
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Alamat lengkap lokasi gangguan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Kategori Gangguan</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
              >
                <option value="LOS Merah">LOS Merah (Kabel/Redaman)</option>
                <option value="Koneksi Lambat">Koneksi Lambat / RTO</option>
                <option value="Kabel Putus">Kabel Dropcore Putus</option>
                <option value="ONT Rusak">ONT Mati Total / Adaptor</option>
                <option value="Lainnya">Lain-lain</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Prioritas Tiket</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold"
              >
                <option value="kritis">Kritis (SLA 2 Jam)</option>
                <option value="tinggi">Tinggi (SLA 4 Jam)</option>
                <option value="normal">Normal (SLA 8 Jam)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">ODP Terdekat</label>
            <select
              value={selectedOdp}
              onChange={(e) => setSelectedOdp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
            >
              {INITIAL_ODPS.map((odp) => (
                <option key={odp.code} value={odp.name}>
                  {odp.code} - {odp.name} ({odp.address})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Buat Tiket & Masukkan Giliran Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
