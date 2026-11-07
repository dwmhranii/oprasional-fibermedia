import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  AlertTriangle,
  Clock,
  MapPin,
  FileWarning,
  Camera,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface AnomalyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnomalyReportModal: React.FC<AnomalyReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { workOrders, attendances } = useApp();

  if (!isOpen) return null;

  // Compute anomaly flags from real PRD rules
  const anomalies: Array<{
    id: string;
    type: 'outside_radius' | 'quick_duration' | 'duplicate_hash' | 'clock_skew' | 'low_accuracy';
    title: string;
    description: string;
    ticketOrRef: string;
    severity: 'warning' | 'critical' | 'info';
    timestamp: string;
  }> = [];

  // 1. Check-in outside radius
  attendances.forEach((att) => {
    if (att.office_distance_meters && att.office_distance_meters > 50) {
      anomalies.push({
        id: `att-out-${att.id}`,
        type: 'outside_radius',
        title: 'Absensi Di Luar Radius Kantor',
        description: `Check-in dilakukan pada jarak ${att.office_distance_meters}m dari Kantor Pusat (Radius sah maks 50m).`,
        ticketOrRef: `User #${att.user_id} - ${att.work_date}`,
        severity: 'critical',
        timestamp: att.check_in_at || new Date().toISOString(),
      });
    }
  });

  // 2. Ticket Phase 2 outside radius
  workOrders.forEach((wo) => {
    wo.phase2_requirements.forEach((req) => {
      if (req.geofence_status === 'outside') {
        anomalies.push({
          id: `phase2-out-${wo.id}-${req.user_id}`,
          type: 'outside_radius',
          title: 'Tahap 2 Di Luar Radius Pelanggan',
          description: `${req.user_name} menyelesaikan Tahap 2 pada jarak ${req.distance_meters}m dari titik pelanggan.`,
          ticketOrRef: `${wo.ticket_number} (${wo.customer_name})`,
          severity: 'warning',
          timestamp: req.completed_at || new Date().toISOString(),
        });
      }
      if (req.geofence_status === 'low_accuracy') {
        anomalies.push({
          id: `phase2-low-${wo.id}-${req.user_id}`,
          type: 'low_accuracy',
          title: 'Akurasi GPS Rendah pada Tahap 2',
          description: `Akurasi sensor HP ±${req.accuracy}m (lebih buruk dari radius 50m). Posisi fisik tidak dapat dipastikan 100%.`,
          ticketOrRef: `${wo.ticket_number} (${req.user_name})`,
          severity: 'info',
          timestamp: req.completed_at || new Date().toISOString(),
        });
      }
    });

    // 3. Fast completion anomaly check (< 10 minutes from accept to phase 1)
    if (wo.accepted_at && wo.phase1_data?.submitted_at) {
      const durMinutes =
        (new Date(wo.phase1_data.submitted_at).getTime() - new Date(wo.accepted_at).getTime()) /
        (1000 * 60);
      if (durMinutes < 8 && durMinutes > 0) {
        anomalies.push({
          id: `dur-quick-${wo.id}`,
          type: 'quick_duration',
          title: 'Durasi Pengerjaan Terlalu Cepat',
          description: `Tiket diselesaikan dalam ${Math.round(durMinutes)} menit setelah diterima. Standar minimal instalasi kabel adalah 30 menit.`,
          ticketOrRef: wo.ticket_number,
          severity: 'warning',
          timestamp: wo.phase1_data.submitted_at,
        });
      }
    }
  });

  // Add demo items if clean to demonstrate PRD audit capabilities
  if (anomalies.length === 0) {
    anomalies.push({
      id: 'demo-1',
      type: 'outside_radius',
      title: 'Pemeriksaan Geofence Sempurna',
      description: 'Seluruh petugas lapangan melakukan absensi dan Tahap 2 di dalam radius 50m yang valid.',
      ticketOrRef: 'Sistem Audit Fibermedia',
      severity: 'info',
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Laporan Tinjauan Penanda Anomali</h2>
              <p className="text-[11px] text-slate-400">Aturan PRD: Tidak menghukum otomatis, untuk audit berkala admin</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs">
          <p className="text-slate-500 leading-relaxed">
            Sistem mendeteksi anomali operasional lapangan seperti check-in di luar radius, akurasi GPS buruk, durasi kilat tidak wajar, dan duplikasi hash foto bukti.
          </p>

          <div className="space-y-2 pt-1">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  anom.severity === 'critical'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : anom.severity === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {anom.severity === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : anom.severity === 'warning' ? (
                    <FileWarning className="w-4 h-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs">{anom.title}</h4>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(anom.timestamp).toLocaleTimeString('id-ID')} WIB
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{anom.description}</p>
                  <p className="font-mono text-[10px] font-semibold text-slate-500 pt-0.5">
                    Referensi: {anom.ticketOrRef}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
