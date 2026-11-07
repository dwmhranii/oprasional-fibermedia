import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Compass,
  Navigation,
  RotateCcw,
  Trash2,
  Save,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  Route,
  Globe,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../lib/api';

// Perbaiki icon default Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CableRouteDrawerProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  onSaved?: (track: any) => void;
}

export const CableRouteDrawer: React.FC<CableRouteDrawerProps> = ({
  initialCenter = [-8.1329, 112.6338], // Default Jawa Timur / Malang
  initialZoom = 14,
  onSaved,
}) => {
  // Titik koordinat jalur kabel: array of [lat, lng]
  const [points, setPoints] = useState<[number, number][]>([]);
  const [trackName, setTrackName] = useState('');
  const [operationalStatus, setOperationalStatus] = useState<'normal' | 'disrupted' | 'cut'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Butir 3: Rute otomatis mengikuti jalan sebagai bantuan menggambar (HANYA saat tombol ditekan)
  const [isSnapToRoadActive, setIsSnapToRoadActive] = useState(false);
  const [isLoadingSnap, setIsLoadingSnap] = useState(false);
  const [snapMessage, setSnapMessage] = useState<string | null>(null);

  // Butir 4: Lapisan satelit online opsional dari penyedia berlisensi (cek ketentuan sebelum dipakai)
  const [activeLayer, setActiveLayer] = useState<'street' | 'satellite'>('street');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseAgreed, setLicenseAgreed] = useState<boolean>(() => {
    return localStorage.getItem('fm-admin:satellite_license_agreed') === 'true';
  });
  const [licenseAcceptedCheckbox, setLicenseAcceptedCheckbox] = useState(false);

  // Handler toggle lapisan satelit
  const handleToggleSatelliteLayer = () => {
    if (activeLayer === 'street') {
      if (!licenseAgreed) {
        setShowLicenseModal(true);
      } else {
        setActiveLayer('satellite');
      }
    } else {
      setActiveLayer('street');
    }
  };

  // Konfirmasi persetujuan ketentuan lisensi penyedia satelit
  const handleConfirmLicense = () => {
    if (!licenseAcceptedCheckbox) return;
    localStorage.setItem('fm-admin:satellite_license_agreed', 'true');
    setLicenseAgreed(true);
    setShowLicenseModal(false);
    setActiveLayer('satellite');
  };

  // Map Click Handler
  const MapClickHandler = () => {
    useMapEvents({
      click: async (e) => {
        const clickedLatLng: [number, number] = [e.latlng.lat, e.latlng.lng];

        // Jika mode bantuan Ikuti Jalan AKTIF dan sudah ada titik sebelumnya
        if (isSnapToRoadActive && points.length > 0) {
          const lastPoint = points[points.length - 1];
          setIsLoadingSnap(true);
          setSnapMessage('Menghitung lekukan jalan...');

          try {
            // Origin & destination dalam format [lng, lat] untuk routing API
            const response = await apiClient.post<any>('/network/route-snap', {
              origin: [lastPoint[1], lastPoint[0]],
              destination: [clickedLatLng[1], clickedLatLng[0]],
            });

            if (response?.success && Array.isArray(response?.coordinates)) {
              // Convert [[lng, lat], ...] kembali ke [[lat, lng], ...]
              const roadLatLngs: [number, number][] = response.coordinates.map((c: [number, number]) => [c[1], c[0]]);

              setPoints((prev) => {
                // Hindari duplikasi titik awal
                const remainingPrev = prev.slice(0, -1);
                return [...remainingPrev, ...roadLatLngs];
              });

              setSnapMessage(
                response.snapped_to_road
                  ? `Jalur jalan ditambahkan (${response.distance_meters} m).`
                  : 'Garis lurus digunakan (jalan tidak terpetakan).'
              );
            } else {
              setPoints((prev) => [...prev, clickedLatLng]);
              setSnapMessage('Fallback ke garis manual.');
            }
          } catch (err: any) {
            console.error('Snap road error:', err);
            // Fallback manual lurus jika gagal
            setPoints((prev) => [...prev, clickedLatLng]);
            setSnapMessage('Koneksi rute jalan gagal, menggunakan titik manual.');
          } finally {
            setIsLoadingSnap(false);
            // Jalur manual tetap yang utama: setelah bantuan digunakan untuk segmen ini, nonaktifkan atau biarkan user mengatur
            setIsSnapToRoadActive(false);
          }
        } else {
          // MODE UTAMA (MANUAL): langsung tambahkan titik lurus manual
          setPoints((prev) => [...prev, clickedLatLng]);
          setSnapMessage(null);
        }
      },
    });

    return null;
  };

  // Hitung total estimasi panjang kabel dalam meter
  const calculateTotalLength = (): number => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const radlat1 = (Math.PI * p1[0]) / 180;
      const radlat2 = (Math.PI * p2[0]) / 180;
      const theta = p1[1] - p2[1];
      const radtheta = (Math.PI * theta) / 180;
      let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
      dist = Math.acos(Math.min(1, dist));
      dist = (dist * 180) / Math.PI;
      dist = dist * 60 * 1.1515 * 1609.344;
      total += dist;
    }
    return Math.round(total);
  };

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1));
    setSnapMessage(null);
  };

  const handleClear = () => {
    if (points.length > 0 && confirm('Hapus seluruh titik gambar jalur kabel?')) {
      setPoints([]);
      setSnapMessage(null);
    }
  };

  const handleSaveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (points.length < 2) {
      alert('Tentukan minimal 2 titik untuk membentuk jalur kabel.');
      return;
    }
    if (!trackName.trim()) {
      alert('Nama jalur kabel wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Format koordinat [lng, lat] untuk database GeoJSON standar
      const coordinates = points.map((p) => [p[1], p[0]]);
      const lengthMeters = calculateTotalLength();

      const payload = {
        name: trackName.trim(),
        coordinates,
        raw_points_count: points.length,
        simplified_points_count: points.length,
        total_length_meters: lengthMeters,
        operational_status: operationalStatus,
        notes: `Digambar melalui Drawing Tool (Mode: ${points.length} titik)`,
      };

      const res = await apiClient.post<any>('/cable-tracks', payload);
      setSaveSuccess(true);
      if (onSaved) onSaved(res?.data || res);
      setTimeout(() => setSaveSuccess(false), 4000);
      setPoints([]);
      setTrackName('');
    } catch (err: any) {
      alert(`Gagal menyimpan jalur kabel: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Route className="w-5 h-5 text-indigo-600" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Penggambar Jalur Kabel Jaringan
                </h4>
                <p className="text-xs text-slate-500">
                  Mode utama: <span className="font-semibold text-slate-700 dark:text-slate-300">Jalur Manual</span>. Gunakan tombol bantuan untuk mengikuti kontur jalan saat diperlukan.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Bantuan Ikuti Jalan (Butir 3) */}
              <Button
                type="button"
                variant={isSnapToRoadActive ? 'default' : 'outline'}
                size="sm"
                className={`transition-all duration-200 flex items-center gap-1.5 ${
                  isSnapToRoadActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm ring-2 ring-amber-300 dark:ring-amber-900'
                    : 'text-slate-700 dark:text-slate-300 border-dashed border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                onClick={() => {
                  if (points.length === 0) {
                    alert('Klik titik awal kabel di peta terlebih dahulu sebelum mengaktifkan bantuan ikuti jalan.');
                    return;
                  }
                  setIsSnapToRoadActive(!isSnapToRoadActive);
                  setSnapMessage(null);
                }}
                disabled={isLoadingSnap}
              >
                {isLoadingSnap ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <Navigation className={`w-4 h-4 ${isSnapToRoadActive ? 'rotate-45 text-white' : 'text-amber-600'}`} />
                )}
                <span>{isSnapToRoadActive ? 'Bantuan Jalan: AKTIF' : 'Bantu Ikuti Jalan (Snap)'}</span>
              </Button>

              {/* Tombol Lapisan Satelit (Butir 4) */}
              <Button
                type="button"
                variant={activeLayer === 'satellite' ? 'default' : 'outline'}
                size="sm"
                className={`flex items-center gap-1.5 ${
                  activeLayer === 'satellite'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
                onClick={handleToggleSatelliteLayer}
              >
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>{activeLayer === 'satellite' ? 'Citra Satelit Berlisensi' : 'Lapisan Satelit'}</span>
              </Button>

              {/* Undo & Reset */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={points.length === 0}
                className="text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Undo
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={points.length === 0}
                className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Status Indicator Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500">
                Titik: <strong className="text-slate-900 dark:text-slate-100">{points.length}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                Estimasi Panjang: <strong className="text-indigo-600 dark:text-indigo-400">{calculateTotalLength()} meter</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">
                Lapisan:{' '}
                <strong className={activeLayer === 'satellite' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}>
                  {activeLayer === 'satellite' ? 'Citra Satelit (Esri World Imagery)' : 'OpenStreetMap'}
                </strong>
              </span>
            </div>

            {isSnapToRoadActive && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse">
                Klik titik berikutnya di peta untuk mengikuti kontur jalan
              </Badge>
            )}

            {snapMessage && (
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {snapMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Canvas */}
      <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm z-0">
        <MapContainer
          center={initialCenter}
          zoom={initialZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          {activeLayer === 'street' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS, Fibermedia Ops'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          )}

          <MapClickHandler />

          {/* Render Cable Polyline */}
          {points.length > 1 && (
            <Polyline
              positions={points}
              pathOptions={{
                color: isSnapToRoadActive ? '#d97706' : '#4f46e5',
                weight: 5,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          )}

          {/* Render Vertex Markers */}
          {points.map((pt, index) => (
            <CircleMarker
              key={index}
              center={pt}
              radius={index === 0 || index === points.length - 1 ? 6 : 4}
              pathOptions={{
                color: '#ffffff',
                fillColor: index === 0 ? '#10b981' : index === points.length - 1 ? '#ef4444' : '#4f46e5',
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong>Titik #{index + 1}</strong>
                  <div>Lat: {pt[0].toFixed(6)}</div>
                  <div>Lng: {pt[1].toFixed(6)}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Petunjuk Interaktif Overlay */}
        {points.length === 0 && (
          <div className="absolute top-4 left-4 z-[500] pointer-events-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-xs text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Klik di peta untuk mulai menggambar jalur kabel (Jalur Manual Utama).</span>
          </div>
        )}
      </div>

      {/* Form Simpan Jalur Kabel */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <form onSubmit={handleSaveTrack} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Nama Jalur Kabel (cth: Feeder ODC-BLW-01 ke ODP-BLW-05)"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="w-full sm:w-48">
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="normal">Status: Normal</option>
                <option value="disrupted">Status: Terganggu</option>
                <option value="cut">Status: Putus (Cut)</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={points.length < 2 || isSubmitting}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Jalur ({points.length} Titik)</span>
            </Button>
          </form>

          {saveSuccess && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Jalur kabel berhasil disimpan ke database jaringan operasional!</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Ketentuan Pemakaian Citra Satelit Berlisensi (Butir 4) */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Ketentuan Lisensi Citra Satelit
                </h3>
                <p className="text-xs text-slate-500">Penyedia Berlisensi: Esri World Imagery</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <p>
                Lapisan citra satelit ini disediakan dari <strong>Esri ArcGIS Online</strong> dan komunitas GIS berlisensi untuk keperluan bantuan operasional dan verifikasi spasial internal Fibermedia.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-500">
                <li>Hanya untuk bantuan pemetaan infrastruktur jaringan telekomunikasi internal.</li>
                <li>Tidak untuk dijual ulang, didistribusikan ulang, atau dijadikan dataset komersial independen.</li>
                <li>Atribusi lisensi penyedia wajib dicantumkan pada tampilan peta.</li>
              </ul>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={licenseAcceptedCheckbox}
                onChange={(e) => setLicenseAcceptedCheckbox(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Saya telah membaca dan menyetujui ketentuan pemakaian citra satelit berlisensi ini.</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLicenseModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!licenseAcceptedCheckbox}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmLicense}
              >
                Setujui & Gunakan Satelit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
