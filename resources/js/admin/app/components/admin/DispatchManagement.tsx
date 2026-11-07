import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Clock,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
  History,
  Filter,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface DispatchSettingsData {
  min_members_present: number;
  accept_timeout_menit: number;
  max_oper: number;
}

interface PendingTicket {
  id: number;
  type: 'psb' | 'complaint';
  number: string;
  customer_name: string;
  address: string;
  created_at: string;
}

interface AssignmentLogItem {
  id: number;
  assignable_type: string;
  ticket_type?: string;
  ticket_id?: number;
  team?: {
    id: number;
    name: string;
  } | null;
  action: string;
  reason?: string;
  actor?: {
    id: number;
    name: string;
  } | null;
  attempt_no: number;
  created_at: string;
}

interface TeamItem {
  id: number;
  name: string;
}

export const DispatchManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'pending' | 'logs'>('pending');
  const [loading, setLoading] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<DispatchSettingsData>({
    min_members_present: 1,
    accept_timeout_menit: 15,
    max_oper: 3,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Pending Queue State
  const [pendingPsb, setPendingPsb] = useState<any[]>([]);
  const [pendingComplaints, setPendingComplaints] = useState<any[]>([]);

  // Logs State
  const [logs, setLogs] = useState<AssignmentLogItem[]>([]);
  const [logFilterAction, setLogFilterAction] = useState<string>('');

  // Manual Assign Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<{ type: 'psb' | 'complaint'; id: number; number: string } | null>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [manualReason, setManualReason] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);

  const getAuthToken = () => localStorage.getItem('fm-admin:auth_token') || '';

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/dispatch-settings', {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: 'application/json',
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Pending
  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dispatch/pending', {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: 'application/json',
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPendingPsb(json.data.psb || []);
        setPendingComplaints(json.data.complaints || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = logFilterAction
        ? `/api/assignment-logs?action=${logFilterAction}`
        : '/api/assignment-logs';
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: 'application/json',
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data.data || json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Teams for Modal
  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/complaints/available-teams', {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          Accept: 'application/json',
        },
      });
      const json = await res.json();
      if (Array.isArray(json)) {
        setTeams(json);
      } else if (json.data) {
        setTeams(json.data);
      }
    } catch (e) {
      // Fallback
      setTeams([
        { id: 1, name: 'Tim A' },
        { id: 2, name: 'Tim B' },
        { id: 3, name: 'Tim C' },
        { id: 4, name: 'Tim D' },
      ]);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPending();
    fetchLogs();
    fetchTeams();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/dispatch-settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Pengaturan dispatch berhasil disimpan');
      } else {
        toast.error(json.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err: any) {
      toast.error('Gagal menghubungi server');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenManualAssign = (type: 'psb' | 'complaint', id: number, number: string) => {
    setSelectedTicket({ type, id, number });
    setSelectedTeamId('');
    setManualReason('');
    setModalOpen(true);
  };

  const handleSubmitManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !selectedTeamId || !manualReason.trim()) {
      toast.error('Pilih tim dan isi alasan penugasan');
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch('/api/dispatch/manual-assign', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ticket_type: selectedTicket.type,
          ticket_id: selectedTicket.id,
          team_id: selectedTeamId,
          reason: manualReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Tiket berhasil ditugaskan');
        setModalOpen(false);
        fetchPending();
        fetchLogs();
      } else {
        toast.error(json.message || 'Gagal menugaskan tiket');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setSubmittingManual(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'assigned':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">Ditugaskan</span>;
      case 'accepted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Diterima</span>;
      case 'declined':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">Ditolak</span>;
      case 'timeout':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Timeout (Oper)</span>;
      case 'reassigned':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">Dioper Ulang</span>;
      case 'pending':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-400 border border-slate-500/30">Tertunda</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-500" />
            Manajemen Dispatch & Penugasan Tim
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sistem giliran round-robin otomatis PSB & Gangguan dengan lock atomic, geofence, dan oper waktu.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-sm font-medium">
          <button
            onClick={() => { setActiveTab('pending'); fetchPending(); }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Antrean Tertunda ({pendingPsb.length + pendingComplaints.length})
          </button>
          <button
            onClick={() => { setActiveTab('settings'); fetchSettings(); }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Pengaturan Giliran
          </button>
          <button
            onClick={() => { setActiveTab('logs'); fetchLogs(); }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat Log
          </button>
        </div>
      </div>

      {/* Tab Content: PENDING QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PSB Pending */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Tiket PSB Belum Ditugaskan</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  {pendingPsb.length} Tiket
                </span>
              </div>

              {pendingPsb.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Tidak ada tiket PSB yang tertunda. Semua terdistribusi ke tim aktif.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPsb.map((t) => (
                    <div key={t.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {t.task_number}
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {t.provisioning?.submission?.customer_name || 'Pelanggan PSB'}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">
                          {t.provisioning?.submission?.address || '-'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenManualAssign('psb', t.id, t.task_number)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Tugaskan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Complaint Pending */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Tiket Gangguan Belum Ditugaskan</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                  {pendingComplaints.length} Tiket
                </span>
              </div>

              {pendingComplaints.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Tidak ada tiket gangguan tertunda.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingComplaints.map((c) => (
                    <div key={c.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                          {c.ticket_number || `CMP-${c.id}`}
                        </div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">
                          {c.customer?.name || c.customer_name || 'Pelanggan Gangguan'}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">
                          {c.customer?.address || c.address || '-'}
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenManualAssign('complaint', c.id, c.ticket_number || `CMP-${c.id}`)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Tugaskan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Konfigurasi Parameter Algoritma Dispatch
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Minimal Anggota Hadir per Tim (min_members_present)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.min_members_present}
                    onChange={(e) => setSettings({ ...settings, min_members_present: parseInt(e.target.value) || 1 })}
                    className="w-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    Orang (Tim siap bila minimal sejumlah anggota sudah absen masuk di kantor).
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Batas Waktu Penerimaan Tiket (accept_timeout_menit)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settings.accept_timeout_menit}
                    onChange={(e) => setSettings({ ...settings, accept_timeout_menit: parseInt(e.target.value) || 15 })}
                    className="w-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    Menit (Jika tidak ditekan Terima oleh tim, tiket otomatis dioper ke tim berikutnya).
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Batas Maksimal Oper (max_oper)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_oper}
                    onChange={(e) => setSettings({ ...settings, max_oper: parseInt(e.target.value) || 3 })}
                    className="w-32 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-xs text-slate-500">
                    Kali (Jika mencapai batas tanpa diterima, tiket dialihkan ke status Eskalasi Admin).
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings && <RefreshCw className="w-4 h-4 animate-spin" />}
                Simpan Konfigurasi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content: ASSIGNMENT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Riwayat Penugasan (Assignment Logs)
            </h3>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={logFilterAction}
                onChange={(e) => {
                  setLogFilterAction(e.target.value);
                  setTimeout(fetchLogs, 50);
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="">Semua Aksi</option>
                <option value="assigned">Ditugaskan</option>
                <option value="accepted">Diterima</option>
                <option value="declined">Ditolak</option>
                <option value="timeout">Timeout</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Tim</th>
                  <th className="p-3">Tiket</th>
                  <th className="p-3">Alasan / Catatan</th>
                  <th className="p-3">Aktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Belum ada riwayat penugasan.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                      <td className="p-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {log.team?.name || '-'}
                      </td>
                      <td className="p-3 font-mono text-xs text-indigo-500">
                        {log.ticket_type ? `[${log.ticket_type.toUpperCase()}] ` : ''}#{log.ticket_id || log.id}
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {log.reason || '-'}
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {log.actor?.name || 'Sistem'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL PENUGASAN MANUAL */}
      {modalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-500" />
                Penugasan Manual Tiket
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManualAssign} className="space-y-4">
              <div>
                <span className="text-xs text-slate-500">Tiket:</span>
                <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedTicket.number} ({selectedTicket.type.toUpperCase()})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Pilih Tim Teknisi *
                </label>
                <select
                  required
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Pilih Tim --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Alasan Penugasan Manual *
                </label>
                <textarea
                  required
                  rows={3}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Contoh: Permintaan khusus pelanggan / prioritas lapangan..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submittingManual && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Tugaskan Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
