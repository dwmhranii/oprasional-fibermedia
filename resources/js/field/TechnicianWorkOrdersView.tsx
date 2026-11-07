import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Phone, 
  CheckCircle, 
  XCircle, 
  RotateCw, 
  AlertCircle,
  Inbox,
  UserCheck
} from 'lucide-react';
import { TicketFieldWorkModal } from './TicketFieldWorkModal';
import { formatPhone } from '@shared/lib/formatters';

interface TicketItem {
  id: string; // e.g. "WO-TSK-1" or "WO-CMP-2"
  raw_id: number;
  type: 'psb' | 'complaint';
  type_label: string;
  ticket_number: string;
  title: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  tab_category?: string;
  assigned_team?: string;
  auto_reassign_due_at?: string | null;
  created_at: string;
}

interface TechnicianWorkOrdersViewProps {
  token: string | null;
  currentUser: any;
  currentCoords?: { lat: number; lng: number; accuracy?: number } | null;
  onRefreshParent?: () => void;
}

export const TechnicianWorkOrdersView: React.FC<TechnicianWorkOrdersViewProps> = ({
  token,
  currentUser,
  currentCoords,
  onRefreshParent,
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'in_progress' | 'completed'>('new');
  const [workOrders, setWorkOrders] = useState<TicketItem[]>([]);
  const [counts, setCounts] = useState<{ new: number; in_progress: number; completed: number }>({
    new: 0,
    in_progress: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Field work modal state
  const [workingTicket, setWorkingTicket] = useState<TicketItem | null>(null);

  // Decline modal state
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [selectedTicketForDecline, setSelectedTicketForDecline] = useState<TicketItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchWorkOrders = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/work-orders?tab=all', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const json = await res.json();
        const data: TicketItem[] = Array.isArray(json.data) ? json.data : [];
        setWorkOrders(data);

        // Compute counts
        const newCount = data.filter((item) => item.status === 'assigned' || item.tab_category === 'waiting_acceptance').length;
        const inProgressCount = data.filter((item) => ['in_progress', 'on_the_way'].includes(item.status) || item.tab_category === 'in_progress').length;
        const completedCount = data.filter((item) => ['completed', 'resolved', 'approved'].includes(item.status) || item.tab_category === 'completed').length;

        setCounts({
          new: newCount,
          in_progress: inProgressCount,
          completed: completedCount,
        });
      }
    } catch (e) {
      console.error('Failed to fetch technician work orders', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    const interval = setInterval(fetchWorkOrders, 20000);
    return () => clearInterval(interval);
  }, [token]);

  const handleAccept = async (ticket: TicketItem) => {
    if (!token) return;
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/field/tickets/${ticket.type}/${ticket.raw_id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({ text: json.message || 'Tiket berhasil diterima!', type: 'success' });
        fetchWorkOrders();
        if (onRefreshParent) onRefreshParent();
      } else {
        setActionMessage({ text: json.message || 'Gagal menerima tiket.', type: 'error' });
      }
    } catch (e) {
      setActionMessage({ text: 'Koneksi ke server bermasalah.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!token || !selectedTicketForDecline || !declineReason.trim()) return;
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/field/tickets/${selectedTicketForDecline.type}/${selectedTicketForDecline.raw_id}/decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ reason: declineReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({ text: json.message || 'Tiket berhasil ditolak dan dioper ke tim lain.', type: 'success' });
        setIsDeclineModalOpen(false);
        setSelectedTicketForDecline(null);
        setDeclineReason('');
        fetchWorkOrders();
        if (onRefreshParent) onRefreshParent();
      } else {
        setActionMessage({ text: json.message || 'Gagal menolak tiket.', type: 'error' });
      }
    } catch (e) {
      setActionMessage({ text: 'Koneksi ke server bermasalah.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTickets = workOrders.filter((item) => {
    if (activeTab === 'new') {
      return item.status === 'assigned' || item.tab_category === 'waiting_acceptance';
    }
    if (activeTab === 'in_progress') {
      return ['in_progress', 'on_the_way'].includes(item.status) || item.tab_category === 'in_progress';
    }
    if (activeTab === 'completed') {
      return ['completed', 'resolved', 'approved'].includes(item.status) || item.tab_category === 'completed';
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs px-2 py-0.5 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Segmented Control / Tabs: Baru, Dikerjakan, Selesai */}
      <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'new'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Baru</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'new' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {counts.new}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('in_progress')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'in_progress'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Dikerjakan</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'in_progress' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {counts.in_progress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Selesai</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Ticket List Header Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Menampilkan {filteredTickets.length} tiket tim {currentUser?.team?.name || ''}
        </span>
        <button
          type="button"
          onClick={fetchWorkOrders}
          disabled={isLoading}
          className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-10 text-center space-y-2">
          <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-xs font-medium text-slate-300">
            {activeTab === 'new'
              ? 'Tidak ada tiket baru yang menunggu penerimaan.'
              : activeTab === 'in_progress'
              ? 'Tidak ada tiket yang sedang dikerjakan saat ini.'
              : 'Belum ada tiket yang selesai.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const isPsb = ticket.type === 'psb';

            return (
              <div
                key={ticket.id}
                className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-4 space-y-3 shadow-lg"
              >
                {/* Header Ticket: Type Badge & Ticket Number */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPsb
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isPsb ? <Wrench className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {isPsb ? 'Pemasangan (PSB)' : 'Pengaduan'}
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {ticket.ticket_number}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === 'new'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : activeTab === 'in_progress'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {activeTab === 'new'
                      ? 'Menunggu Diterima'
                      : activeTab === 'in_progress'
                      ? 'Dikerjakan'
                      : 'Selesai'}
                  </span>
                </div>

                {/* Customer Info */}
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-white text-sm">
                    {ticket.customer_name}
                  </div>
                  {ticket.customer_phone && (
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{formatPhone(ticket.customer_phone)}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5 text-slate-300 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{ticket.customer_address}</span>
                  </div>
                </div>

                {/* Auto Reassign Timer Warning in Tab Baru */}
                {activeTab === 'new' && ticket.auto_reassign_due_at && (
                  <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-2 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Segera terima. Tiket akan dioper otomatis jika tidak ada konfirmasi dalam waktu yang ditentukan.
                    </span>
                  </div>
                )}

                {/* Action Buttons for Tab Baru: TERIMA / TOLAK */}
                {activeTab === 'new' && (
                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAccept(ticket)}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Terima
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setSelectedTicketForDecline(ticket);
                        setIsDeclineModalOpen(true);
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-rose-900/40 border border-rose-500/40 text-rose-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      Tolak
                    </button>
                  </div>
                )}

                {/* Status notice & Open Field Work Modal button for in_progress */}
                {activeTab === 'in_progress' && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Tiket sedang dikerjakan. Silakan isi data teknis & absensi di lokasi.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkingTicket(ticket)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all active:scale-[0.99]"
                    >
                      <Wrench className="w-4 h-4" />
                      Buka Form Pengerjaan Lapangan (Tahap 1 &amp; 2)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Pengerjaan Lapangan (Tahap 1 & 2) */}
      {workingTicket && (
        <TicketFieldWorkModal
          open={!!workingTicket}
          onClose={() => setWorkingTicket(null)}
          ticket={{
            type: workingTicket.type,
            raw_id: workingTicket.raw_id,
            ticket_number: workingTicket.ticket_number,
            customer_name: workingTicket.customer_name,
            customer_address: workingTicket.customer_address,
          }}
          token={token}
          currentUser={currentUser}
          currentCoords={currentCoords || null}
          onSuccess={() => {
            fetchWorkOrders();
            if (onRefreshParent) onRefreshParent();
          }}
        />
      )}

      {/* Modal Tolak Tiket dengan Alasan Wajib */}
      {isDeclineModalOpen && selectedTicketForDecline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Tolak Tiket #{selectedTicketForDecline.ticket_number}
            </h3>
            <p className="text-xs text-slate-300">
              Alasan penolakan wajib diisi. Tiket akan langsung dioper otomatis ke tim aktif berikutnya.
            </p>
            <textarea
              rows={3}
              required
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Contoh: Lokasi banjir / peralatan tangga tidak muat / kendala teknis..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeclineModalOpen(false);
                  setSelectedTicketForDecline(null);
                  setDeclineReason('');
                }}
                className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!declineReason.trim() || isProcessing}
                onClick={handleDeclineSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-1"
              >
                {isProcessing && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianWorkOrdersView;
