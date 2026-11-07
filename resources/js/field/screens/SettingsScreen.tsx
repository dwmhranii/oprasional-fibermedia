import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Sliders,
  MapPin,
  Smartphone,
  ShieldCheck,
  Server,
  Database,
  Radio,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface SettingsScreenProps {
  onOpenOutbox: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenOutbox }) => {
  const {
    currentUser,
    office,
    setOffice,
    dispatchSettings,
    setDispatchSettings,
    currentGps,
    gpsSimulationMode,
    setGpsSimulationMode,
    offlineQueue,
  } = useApp();

  const isSuperadmin = currentUser.role === 'superadmin';

  return (
    <div className="space-y-4 pb-20">
      {/* Device Registration Info (PRD requirement) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Registrasi Perangkat Teknisi (Device)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Disetujui
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Aturan PRD: Perangkat didaftarkan dengan UUID dan model perangkat, disetujui admin, dan dicantumkan pada watermark setiap foto bukti kerja.
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-sans font-semibold block">DEVICE UUID</span>
            <span className="font-bold text-slate-800 truncate block">{currentUser.device_uuid}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-sans font-semibold block">MODEL PERANGKAT</span>
            <span className="font-bold text-slate-800 truncate block">{currentUser.device_model}</span>
          </div>
        </div>
      </div>

      {/* GPS Location & Testing Simulator */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Uji Coba Posisi GPS & Geofence
            </h3>
          </div>
          <span className="font-mono text-xs text-sky-700 font-bold">
            ±{currentGps.accuracy}m Akurasi
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Pilih lokasi simulasi di bawah untuk menguji aturan validasi radius 50m tanpa harus berpindah tempat fisik.
        </p>

        <div className="space-y-1.5">
          <button
            onClick={() => setGpsSimulationMode('office_valid')}
            className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
              gpsSimulationMode === 'office_valid'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div>
              <p>Di Dalam Kantor Pusat (12 meter)</p>
              <p className="text-[10px] font-normal text-slate-400 font-mono">
                Lat: {office.latitude.toFixed(5)}, Lng: {office.longitude.toFixed(5)}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
              Absen Sah
            </span>
          </button>

          <button
            onClick={() => setGpsSimulationMode('office_boundary')}
            className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
              gpsSimulationMode === 'office_boundary'
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div>
              <p>Mendekati Batas Geofence (42 meter)</p>
              <p className="text-[10px] font-normal text-slate-400">Masih dalam batas aman &lt; 50m</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              Batas 50m
            </span>
          </button>

          <button
            onClick={() => setGpsSimulationMode('office_outside')}
            className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
              gpsSimulationMode === 'office_outside'
                ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div>
              <p>Di Luar Radius Kantor (180 meter)</p>
              <p className="text-[10px] font-normal text-slate-400">Di luar jangkauan titik absensi sah</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-200 text-red-900">
              Absen Ditolak
            </span>
          </button>

          <button
            onClick={() => setGpsSimulationMode('real_device')}
            className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
              gpsSimulationMode === 'real_device'
                ? 'bg-sky-50 border-sky-300 text-sky-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div>
              <p>Gunakan GPS Nyata Perangkat (Hardware Web Geolocation)</p>
              <p className="text-[10px] font-normal text-slate-400">Membaca navigator.geolocation asli HP</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-200 text-sky-900">
              Sensor Asli
            </span>
          </button>
        </div>
      </div>

      {/* Superadmin Config Parameters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Pengaturan Dispatch & Geofence (Superadmin)
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">Tersimpan di DB</span>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">Radius Geofence Tiket (Batas Bawah 50m):</span>
              <span className="font-bold font-mono text-sky-700">
                {dispatchSettings.geofence_radius_meters} meter
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              disabled={!isSuperadmin}
              value={dispatchSettings.geofence_radius_meters}
              onChange={(e) =>
                setDispatchSettings({
                  ...dispatchSettings,
                  geofence_radius_meters: Math.max(50, parseInt(e.target.value)),
                })
              }
              className="w-full accent-sky-600 disabled:opacity-50"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Sesuai PRD: Radius default 50m dan tidak bisa diatur di bawah 50 meter.
            </p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">Batas Waktu Respons Terima Tiket:</span>
              <span className="font-bold font-mono text-sky-700">
                {dispatchSettings.response_timeout_minutes} menit
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              disabled={!isSuperadmin}
              value={dispatchSettings.response_timeout_minutes}
              onChange={(e) =>
                setDispatchSettings({
                  ...dispatchSettings,
                  response_timeout_minutes: parseInt(e.target.value),
                })
              }
              className="w-full accent-sky-600 disabled:opacity-50"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">Syarat Anggota Hadir per Tim (Min Ready):</span>
              <span className="font-bold font-mono text-sky-700">
                {dispatchSettings.min_members_present} dari 2 teknisi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Outbox & Storage Manager */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Penyimpanan Offline & Outbox
            </h3>
          </div>
          <span className="font-mono text-xs text-slate-600">
            {offlineQueue.length} item antrean
          </span>
        </div>

        <button
          onClick={onOpenOutbox}
          className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
        >
          <Radio className="w-3.5 h-3.5 text-sky-600" />
          Lihat Isi Antrean Offline (Outbox)
        </button>
      </div>
    </div>
  );
};
