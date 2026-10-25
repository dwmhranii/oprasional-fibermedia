import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  FileText, 
  Search, 
  ExternalLink,
  Info
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

interface MediaItem {
  id: number;
  kind: string;
  disk: string;
  path: string;
  sha256: string | null;
  size: number;
  mime: string | null;
  preview_url: string | null;
  captured_at: string | null;
  received_at: string | null;
  selisih_jam: number;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  uploaded_by: string | null;
  is_anomaly: boolean;
  anomaly_reasons: string[] | null;
}

interface AttendanceItem {
  id: number;
  user_id: number;
  user_name: string;
  selfie_url: string | null;
  lat: number;
  lng: number;
  accuracy: number | null;
  distance_meters: number | null;
  geofence_status: 'inside' | 'outside' | 'low_accuracy' | 'unverified';
  captured_at: string | null;
  received_at: string | null;
}

interface RequirementItem {
  id: number;
  user_id: number;
  user: { id: number; name: string };
  required_at: string;
  completed_at: string | null;
  waived_by_id: number | null;
  waived_by?: { id: number; name: string };
  waive_reason: string | null;
}

export const TicketEvidenceReview: React.FC = () => {
  const [ticketType, setTicketType] = useState<'psb' | 'complaint'>('psb');
  const [ticketId, setTicketId] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [evidenceData, setEvidenceData] = useState<{
    ticket: { id: number; number: string; status: string; customer_name: string };
    media: MediaItem[];
    attendances: AttendanceItem[];
    phase2_requirements: RequirementItem[];
    has_anomalies: boolean;
  } | null>(null);

  // Modal Waive
  const [waiveModalUser, setWaiveModalUser] = useState<RequirementItem | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiving, setWaiving] = useState(false);

  const fetchEvidence = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/admin/tickets/${ticketType}/${ticketId}/evidence`);
      if (res?.ticket) {
        setEvidenceData(res);
      } else if (res?.data?.ticket) {
        setEvidenceData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat bukti tiket.');
      setEvidenceData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [ticketType]);

  const handleWaiveSubmit = async () => {
    if (!waiveModalUser || !waiveReason.trim()) {
      toast.error('Alasan pembebasan wajib diisi.');
      return;
    }
    setWaiving(true);
    try {
      await api.post(`/admin/tickets/${ticketType}/${ticketId}/phase2/waive`, {
        user_id: waiveModalUser.user_id,
        reason: waiveReason,
      });
      toast.success('Teknisi berhasil dibebaskan dari Tahap 2.');
      setWaiveModalUser(null);
      setWaiveReason('');
      fetchEvidence();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membebaskan teknisi.');
    } finally {
      setWaiving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tinjau Bukti Kerja Lapangan & Integritas Tahap 2</h1>
          <p className="text-sm text-gray-500 mt-1">
            Verifikasi foto pengerjaan, SHA-256 hash, anomali geofence/jam, dan kelengkapan absensi mandiri tim.
          </p>
        </div>

        {/* Filter Ticket */}
        <div className="flex items-center gap-3 bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
          <select
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="psb">PSB (Task)</option>
            <option value="complaint">Pengaduan (Complaint)</option>
          </select>
          <input
            type="number"
            min="1"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="ID Tiket..."
            className="w-24 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={fetchEvidence}
            disabled={loading}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1.5 rounded transition shadow-sm"
          >
            <Search className="w-4 h-4" />
            <span>Muat</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-20 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3"></div>
          <p className="text-sm">Memuat data bukti dan memverifikasi integritas hash...</p>
        </div>
      )}

      {!loading && !evidenceData && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="text-base font-semibold text-gray-700">Pilih Tiket untuk Meninjau Bukti</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Masukkan tipe tiket dan ID untuk memeriksa bukti foto, deteksi anomali, dan status absensi Tahap 2.
          </p>
        </div>
      )}

      {!loading && evidenceData && (
        <div className="space-y-6">
          {/* Anomaly Banner */}
          {evidenceData.has_anomalies ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Perhatian: Terdeteksi Anomali pada Berkas Bukti</h4>
                <p className="text-xs text-amber-700 mt-1">
                  Sistem menemukan ketidakwajaran pada foto yang diunggah (misal hash SHA-256 duplikat, selisih jam besar, atau akurasi GPS rendah). Silakan periksa lencana anomali pada masing-masing foto di bawah.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-900">Seluruh Berkas Terverifikasi Bersih</h4>
                <p className="text-xs text-emerald-700">
                  Tidak ditemukan foto duplikat atau pelanggaran batas selisih waktu/GPS.
                </p>
              </div>
            </div>
          )}

          {/* Ticket Information Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 uppercase tracking-wide bg-indigo-100 text-indigo-700 rounded">
                  {ticketType}
                </span>
                <h2 className="text-lg font-bold text-gray-900">
                  #{evidenceData.ticket.number} - {evidenceData.ticket.customer_name}
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Status Saat Ini: <span className="font-semibold text-gray-700 uppercase">{evidenceData.ticket.status}</span>
              </p>
            </div>
          </div>

          {/* Media Grid */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              <span>Berkas Media Lapangan ({evidenceData.media.length})</span>
            </h3>

            {evidenceData.media.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Belum ada foto yang diunggah untuk tiket ini.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {evidenceData.media.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg overflow-hidden flex flex-col justify-between ${
                      item.is_anomaly ? 'border-amber-400 bg-amber-50/20 shadow-amber-100' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      {/* Image Preview */}
                      <div className="relative aspect-video bg-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-200">
                        {item.preview_url ? (
                          <img
                            src={item.preview_url}
                            alt={item.kind}
                            className="w-full h-full object-cover hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="text-xs text-gray-400 flex flex-col items-center gap-1">
                            <FileText className="w-6 h-6" />
                            <span>Preview tidak tersedia</span>
                          </div>
                        )}
                        <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded capitalize">
                          {item.kind}
                        </span>
                        {item.is_anomaly && (
                          <span className="absolute top-2 right-2 bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Anomali
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-gray-500">
                          <span>Ukuran: {item.size ? `${Math.round(item.size / 1024)} KB` : '-'}</span>
                          <span>{item.mime || 'image/jpeg'}</span>
                        </div>

                        {/* SHA256 */}
                        <div className="bg-gray-50 p-1.5 rounded border border-gray-200 font-mono text-[10px] text-gray-600 truncate" title={item.sha256 || 'Tanpa hash (Data Lama)'}>
                          <span className="font-bold text-gray-400 mr-1">SHA:</span>
                          {item.sha256 ? item.sha256 : <span className="italic text-gray-400">Data lama (tanpa hash)</span>}
                        </div>

                        {/* GPS & Time */}
                        <div className="space-y-1 text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {item.lat && item.lng ? `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)} (±${Math.round(item.accuracy || 0)}m)` : 'GPS tidak tercatat'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              {item.captured_at ? new Date(item.captured_at).toLocaleTimeString('id-ID') : '-'}
                              {item.selisih_jam > 0 && ` (Selisih: ${item.selisih_jam}j)`}
                            </span>
                          </div>
                        </div>

                        {/* Anomaly reasons */}
                        {item.anomaly_reasons && item.anomaly_reasons.length > 0 && (
                          <div className="bg-amber-100/70 border border-amber-300 text-amber-900 rounded p-2 space-y-1">
                            {item.anomaly_reasons.map((reason, idx) => (
                              <p key={idx} className="text-[11px] flex items-start gap-1">
                                <span>•</span> <span>{reason}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {item.preview_url && (
                      <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                        <a
                          href={item.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Berkas Asli (Signed URL)</span>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phase 2 Requirements & Waive Management */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Daftar Teknisi Wajib Tahap 2 ({evidenceData.phase2_requirements.length})</span>
            </h3>
            <p className="text-xs text-gray-500">
              Tiket hanya dapat berstatus selesai penuh (Resolved/Completed) jika seluruh teknisi yang hadir hari itu telah melakukan absensi selfie + GPS atau dibebaskan resmi oleh Admin.
            </p>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 uppercase">
                  <tr>
                    <th className="px-4 py-3">Nama Teknisi</th>
                    <th className="px-4 py-3">Waktu Dikunci</th>
                    <th className="px-4 py-3">Status Pemenuhan</th>
                    <th className="px-4 py-3">Catatan / Alasan</th>
                    <th className="px-4 py-3 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {evidenceData.phase2_requirements.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{req.user?.name || `User #${req.user_id}`}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(req.required_at).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">
                        {req.waived_by_id ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium">
                            <Info className="w-3 h-3" /> Dibebaskan Admin
                          </span>
                        ) : req.completed_at ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Absensi Lengkap
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-medium">
                            Belum Absen
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {req.waive_reason ? `Alasan: "${req.waive_reason}"` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!req.completed_at && !req.waived_by_id && (
                          <button
                            onClick={() => {
                              setWaiveModalUser(req);
                              setWaiveReason('');
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition"
                          >
                            Bebaskan Teknisi
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bebaskan Teknisi */}
      {waiveModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <span>Bebaskan Teknisi dari Absensi Tiket</span>
            </h3>
            <p className="text-xs text-gray-600">
              Anda akan membebaskan <strong>{waiveModalUser.user?.name}</strong> dari kewajiban absensi Tahap 2 untuk tiket ini. Alasan tertulis wajib disertakan untuk audit trail.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alasan Pembebasan *</label>
              <textarea
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Contoh: Teknisi ditugaskan darurat ke lokasi gangguan terdekat / sakit mendadak"
                rows={3}
                className="w-full text-xs border border-gray-300 rounded p-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWaiveModalUser(null)}
                className="text-xs px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleWaiveSubmit}
                disabled={waiving || !waiveReason.trim()}
                className="text-xs px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded font-semibold"
              >
                {waiving ? 'Memproses...' : 'Bebaskan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
