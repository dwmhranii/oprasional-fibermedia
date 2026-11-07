import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoordinate, formatDistance } from '@shared/lib/formatters';
import {
  Download,
  MapPin,
  RefreshCw,
  Plus,
  Play,
  Square,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Layers,
  HardDrive,
  Compass,
  ArrowRight,
  Wifi,
  WifiOff,
  Crosshair,
} from 'lucide-react';
import {
  db,
  LocalOdp,
  LocalCableTrack,
  getNearestOdps,
  downloadOfflineMap,
  syncNetworkData,
  enqueueOfflineRequest,
  simplifyCoordinates,
  haversineDistance,
} from '../shared';

interface NetworkMapOfflineViewProps {
  token: string | null;
  currentCoords: { lat: number; lng: number; accuracy?: number } | null;
}

export const NetworkMapOfflineView: React.FC<NetworkMapOfflineViewProps> = ({
  token,
  currentCoords,
}) => {
  // Peta & Map download state
  const [manifest, setManifest] = useState<{
    version?: string;
    size_formatted?: string;
    attribution?: string;
  } | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloadingMap, setIsDownloadingMap] = useState(false);
  const [offlineMapDownloaded, setOfflineMapDownloaded] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('fm-pwa:offline_map_downloaded_at'));
  });
  const [mapVersion, setMapVersion] = useState<string | null>(() => {
    return localStorage.getItem('fm-pwa:offline_map_version');
  });

  // Data ODP lokal
  const [odps, setOdps] = useState<(LocalOdp & { distance_meters?: number })[]>([]);
  const [selectedOdp, setSelectedOdp] = useState<LocalOdp | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Form Tambah ODP
  const [showAddOdpModal, setShowAddOdpModal] = useState(false);
  const [newOdpName, setNewOdpName] = useState('');
  const [newOdpCode, setNewOdpCode] = useState('');
  const [newOdpCapacity, setNewOdpCapacity] = useState('8');
  const [newOdpCoords, setNewOdpCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Rekam Jalur Kabel state
  const [isRecordingTrack, setIsRecordingTrack] = useState(false);
  const [recordedPoints, setRecordedPoints] = useState<[number, number][]>([]);
  const [trackName, setTrackName] = useState('');
  const [totalTrackDistance, setTotalTrackDistance] = useState(0);
  const watchIdRef = useRef<number | null>(null);

  // Leaflet Map state & refs
  const [leafletBasemap, setLeafletBasemap] = useState<'osm' | 'google' | 'google-sat'>('google');
  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Inisialisasi & sinkronisasi Leaflet map
  useEffect(() => {
    if (!leafletContainerRef.current || leafletMapRef.current) return;

    const initialCenter: [number, number] = currentCoords
      ? [currentCoords.lat, currentCoords.lng]
      : [-8.081413, 112.637789];

    const map = L.map(leafletContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      zoomControl: true,
    });

    const getTileUrl = (type: 'osm' | 'google' | 'google-sat') => {
      switch (type) {
        case 'google':
          return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        case 'google-sat':
          return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        case 'osm':
        default:
          return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      }
    };

    const tileLayer = L.tileLayer(getTileUrl('google'), {
      maxZoom: 20,
      attribution: '&copy; Google Maps &bull; Fibermedia Ops',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markersGroupRef.current = L.layerGroup().addTo(map);
    routePolylineRef.current = L.polyline([], { color: '#0284c7', weight: 4 }).addTo(map);
    leafletMapRef.current = map;

    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Update basemap tile layer
  const handleSwitchBasemap = (type: 'osm' | 'google' | 'google-sat') => {
    setLeafletBasemap(type);
    const map = leafletMapRef.current;
    if (!map || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    const getTileUrl = (t: 'osm' | 'google' | 'google-sat') => {
      switch (t) {
        case 'google':
          return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
        case 'google-sat':
          return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        case 'osm':
        default:
          return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      }
    };

    const newLayer = L.tileLayer(getTileUrl(type), {
      maxZoom: 20,
      attribution: type.startsWith('google') ? '&copy; Google Maps' : '&copy; OpenStreetMap',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  };

  // Render Leaflet markers & technician pin
  useEffect(() => {
    const map = leafletMapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Technician GPS marker
    if (currentCoords) {
      const techIcon = L.divIcon({
        className: 'custom-tech-pin',
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#0284c7;border:3px solid white;box-shadow:0 0 10px rgba(2,132,199,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([currentCoords.lat, currentCoords.lng], { icon: techIcon })
        .bindPopup('<b>Posisi Anda Saat Ini</b><br/>Teknisi Lapangan')
        .addTo(markersGroup);
    }

    // 2. ODP markers
    odps.forEach((odp) => {
      const capacity = odp.port_capacity || 8;
      const usedPorts = odp.used_ports || [];
      const remaining = capacity - usedPorts.length;
      const isFull = remaining <= 0;

      const odpIcon = L.divIcon({
        className: 'custom-odp-pin',
        html: `<div style="padding:2px 6px;border-radius:6px;background:${isFull ? '#e11d48' : '#059669'};color:white;font-weight:bold;font-size:10px;border:1.5px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;">${odp.code}</div>`,
        iconSize: [40, 20],
        iconAnchor: [20, 10],
      });

      const marker = L.marker([odp.latitude, odp.longitude], { icon: odpIcon });
      marker.bindPopup(`
        <div style="font-size:12px;min-width:140px;">
          <strong style="color:#0284c7;">${odp.code}</strong><br/>
          <span>${odp.name}</span><br/>
          <span style="font-size:11px;color:#64748b;">${odp.address || ''}</span><br/>
          <span style="font-weight:bold;color:${isFull ? '#e11d48' : '#059669'};">
            ${isFull ? 'Penuh (0 Port Sisa)' : `${remaining} Port Tersisa`}
          </span>
        </div>
      `);
      marker.on('click', () => {
        setSelectedOdp(odp);
      });
      marker.addTo(markersGroup);
    });
  }, [odps, currentCoords]);

  // Update real-time polyline while recording track
  useEffect(() => {
    if (!routePolylineRef.current) return;
    const latLngs = recordedPoints.map((pt) => [pt[1], pt[0]] as [number, number]);
    routePolylineRef.current.setLatLngs(latLngs);
  }, [recordedPoints]);

  // Load Manifest
  useEffect(() => {
    fetch('/tiles/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setManifest(data);
      })
      .catch(() => {});
  }, []);

  // Load ODP lokal
  const loadLocalOdps = async () => {
    if (currentCoords) {
      const nearest = await getNearestOdps(currentCoords.lat, currentCoords.lng, 50);
      setOdps(nearest);
    } else {
      const all = await db.odps.limit(50).toArray();
      setOdps(all);
    }
  };

  useEffect(() => {
    loadLocalOdps();
  }, [currentCoords]);

  // Handler Sinkron Jaringan
  const handleSyncNetwork = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncNetworkData(token);
      setSyncMessage(`Sinkron sukses: +${res.added} baru, ~${res.updated} diperbarui, -${res.deleted} dihapus.`);
      await loadLocalOdps();
    } catch (err: any) {
      setSyncMessage(`Gagal sinkron: ${err.message || 'Offline'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler Unduh Peta Offline
  const handleDownloadMap = async () => {
    setIsDownloadingMap(true);
    setDownloadProgress(0);
    try {
      const res = await downloadOfflineMap((pct) => {
        setDownloadProgress(pct);
      });
      setOfflineMapDownloaded(true);
      setMapVersion(res.version);
      setSyncMessage(`Peta offline berhasil diunduh (${res.sizeFormatted}).`);
    } catch (err: any) {
      alert(`Gagal mengunduh peta: ${err.message}`);
    } finally {
      setIsDownloadingMap(false);
      setDownloadProgress(null);
    }
  };

  // Handler Tambah ODP dari Lapangan
  const handleSaveOdp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOdpCoords) {
      alert('Koordinat ODP wajib diisi. Klik "Pakai Lokasi Saya Sekarang".');
      return;
    }
    if (!newOdpName) {
      alert('Nama ODP wajib diisi.');
      return;
    }

    const clientUuid = 'odp-cli-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    const capacity = parseInt(newOdpCapacity, 10) || 8;

    // 1. Simpan ke database Dexie lokal langsung agar segera muncul di HP
    const localOdpItem: LocalOdp = {
      id: Date.now(), // temporary local id
      client_uuid: clientUuid,
      code: newOdpCode || `ODP-FLD-${clientUuid.substring(8, 14).toUpperCase()}`,
      name: newOdpName,
      latitude: newOdpCoords.lat,
      longitude: newOdpCoords.lng,
      port_capacity: capacity,
      status: 'needs_review',
      is_approved: false,
      used_ports: [],
      updated_at: new Date().toISOString(),
    };
    await db.odps.put(localOdpItem);

    // 2. Masukkan ke antrean keluar Dexie untuk disinkronkan ke server
    await enqueueOfflineRequest('/api/odps', 'POST', {
      client_uuid: clientUuid,
      name: newOdpName,
      code: localOdpItem.code,
      latitude: newOdpCoords.lat,
      longitude: newOdpCoords.lng,
      port_capacity: capacity,
      notes: 'Usulan ODP baru dari lapangan (PWA offline)',
    }, token);

    setShowAddOdpModal(false);
    setNewOdpName('');
    setNewOdpCode('');
    setNewOdpCoords(null);
    await loadLocalOdps();
    alert('Usulan ODP tersimpan di HP dan otomatis masuk antrean keluar!');
  };

  // Handler Rekam Jalur Kabel
  const handleStartRecording = () => {
    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      alert('Perekaman GPS membutuhkan koneksi aman HTTPS atau localhost.');
      return;
    }

    if (!navigator.geolocation) {
      alert('Perangkat tidak mendukung geolokasi');
      return;
    }
    setIsRecordingTrack(true);
    setRecordedPoints([]);
    setTotalTrackDistance(0);

    let lastCoord: [number, number] | null = null;
    let dist = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const pt: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setRecordedPoints((prev) => {
          if (lastCoord) {
            dist += haversineDistance(lastCoord[1], lastCoord[0], pt[1], pt[0]);
            setTotalTrackDistance(dist);
          }
          lastCoord = pt;
          return [...prev, pt];
        });
      },
      (err) => {
        console.warn('Geolocation track error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  };

  const handleStopRecording = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsRecordingTrack(false);

    if (recordedPoints.length < 2) {
      alert('Titik yang terekam terlalu sedikit (minimal 2 titik).');
      return;
    }

    // Sederhanakan titik dengan toleransi ~3 m
    const simplified = simplifyCoordinates(recordedPoints, 3);
    const clientUuid = 'trk-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    const finalName = trackName.trim() || `Jalur Kabel ${new Date().toLocaleTimeString('id-ID')}`;

    // Simpan ke antrean keluar
    await enqueueOfflineRequest('/api/cable-tracks', 'POST', {
      client_uuid: clientUuid,
      name: finalName,
      coordinates: simplified,
      raw_points_count: recordedPoints.length,
      simplified_points_count: simplified.length,
      total_length_meters: Math.round(totalTrackDistance),
      notes: `Direkam via PWA (${recordedPoints.length} titik disederhanakan jadi ${simplified.length} titik)`,
    }, token);

    alert(`Jalur kabel "${finalName}" berhasil direkam (${Math.round(totalTrackDistance)} meter, ${simplified.length} titik) dan masuk antrean kirim!`);
    setRecordedPoints([]);
    setTrackName('');
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Unduh Peta Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Peta Jaringan & ODP Offline
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Peta vektor PMTiles disimpan di memori HP, berfungsi 100% tanpa sinyal/internet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNetwork}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-100"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              Sinkron Data ODP
            </button>
            <button
              onClick={handleDownloadMap}
              disabled={isDownloadingMap}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {offlineMapDownloaded ? 'Unduh Ulang Peta' : 'Unduh Peta Offline'}
            </button>
          </div>
        </div>

        {/* Status Peta Offline & Progress Bar */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300">
              Status Peta: {offlineMapDownloaded ? (
                <strong className="text-emerald-600">Tersedia Offline (v{mapVersion || manifest?.version})</strong>
              ) : (
                <span className="text-amber-600">Belum diunduh (Disarankan unduh via Wi-Fi)</span>
              )}
            </span>
            {manifest?.size_formatted && (
              <span className="text-slate-400">&bull; Ukuran: {manifest.size_formatted}</span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 italic">
            {manifest?.attribution || '© Fibermedia Ops, OpenStreetMap'}
          </span>
        </div>

        {downloadProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-blue-600 font-semibold">
              <span>Mengunduh peta area.pmtiles...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {syncMessage && (
          <div className="text-xs p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {syncMessage}
          </div>
        )}
      </div>

      {/* 2. Floating Action Toolbar: Tambah ODP & Rekam Jalur */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            if (currentCoords) {
              setNewOdpCoords({ lat: currentCoords.lat, lng: currentCoords.lng });
            }
            setShowAddOdpModal(true);
          }}
          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          Tambah ODP Baru
        </button>

        {!isRecordingTrack ? (
          <button
            onClick={handleStartRecording}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 shadow-sm"
          >
            <Play className="w-4 h-4 text-blue-600" />
            Rekam Jalur Kabel
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className="p-3 rounded-xl bg-rose-600 text-white flex items-center justify-center gap-2 text-xs font-bold shadow-sm animate-pulse"
          >
            <Square className="w-4 h-4" />
            Selesai Rekam ({Math.round(totalTrackDistance)}m &bull; {recordedPoints.length} titik)
          </button>
        )}
      </div>

      {/* 2b. Peta Interaktif Leaflet Lapangan */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Peta Visual Leaflet</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSwitchBasemap('osm')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                leafletBasemap === 'osm'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
              }`}
            >
              OSM
            </button>
            <button
              type="button"
              onClick={() => handleSwitchBasemap('google')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                leafletBasemap === 'google'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
              }`}
            >
              Google Maps
            </button>
            <button
              type="button"
              onClick={() => handleSwitchBasemap('google-sat')}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                leafletBasemap === 'google-sat'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
              }`}
            >
              Google Satelit
            </button>
          </div>
        </div>
        <div ref={leafletContainerRef} className="w-full h-72 z-0" />
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>&bull; Pin Biru: Posisi Anda &bull; Pin Hijau/Merah: ODP</span>
          <span className="italic">Leaflet &bull; Google Maps Tile</span>
        </div>
      </div>

      {/* 3. Daftar ODP Terdekat (Offline Haversine) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-blue-600" />
            ODP Terdekat (Dihitung Offline dari GPS HP)
          </h4>
          <span className="text-xs text-slate-400">{odps.length} ODP</span>
        </div>

        {odps.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-xl">
            Belum ada data ODP lokal. Klik tombol &ldquo;Sinkron Data ODP&rdquo; di atas untuk mengunduh data jaringan.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {odps.map((odp) => {
              const capacity = odp.port_capacity || 8;
              const usedPorts = odp.used_ports || [];
              const isFull = usedPorts.length >= capacity;

              return (
                <div
                  key={odp.id}
                  onClick={() => setSelectedOdp(odp)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedOdp?.id === odp.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {odp.code || odp.name}
                      </span>
                      <p className="text-slate-500 text-[11px]">{odp.name}</p>
                    </div>

                    <div className="text-right">
                      {odp.distance_meters !== undefined && (
                        <span className="font-semibold text-blue-600 block">
                          ±{formatDistance(odp.distance_meters)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isFull
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {usedPorts.length}/{capacity} Port Terisi
                      </span>
                    </div>
                  </div>

                  {/* Port Grid Indicator saat ODP dipilih */}
                  {selectedOdp?.id === odp.id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Visual Port Terisi (Merah) / Kosong (Hijau):
                      </span>
                      <div className="grid grid-cols-8 gap-1.5">
                        {Array.from({ length: capacity }, (_, i) => i + 1).map((portNum) => {
                          const isOccupied = usedPorts.includes(portNum);
                          return (
                            <div
                              key={portNum}
                              className={`h-7 rounded flex items-center justify-center font-bold text-[10px] ${
                                isOccupied
                                  ? 'bg-rose-500 text-white shadow-sm'
                                  : 'bg-emerald-500 text-white shadow-sm'
                              }`}
                            >
                              {portNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tambah ODP Baru */}
      {showAddOdpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-5 border shadow-xl space-y-4">
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Tambah Usulan ODP Baru
            </h4>

            <form onSubmit={handleSaveOdp} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  Nama ODP *
                </label>
                <input
                  type="text"
                  placeholder="Misal: ODP-BLW-042"
                  value={newOdpName}
                  onChange={(e) => setNewOdpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  Kode ODP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generate bila dikosongkan"
                  value={newOdpCode}
                  onChange={(e) => setNewOdpCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                  Kapasitas Port
                </label>
                <select
                  value={newOdpCapacity}
                  onChange={(e) => setNewOdpCapacity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent text-xs"
                >
                  <option value="4">4 Port</option>
                  <option value="8">8 Port</option>
                  <option value="16">16 Port</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-600 dark:text-slate-400 font-semibold">
                    Koordinat GPS *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentCoords) {
                        setNewOdpCoords({ lat: currentCoords.lat, lng: currentCoords.lng });
                      } else {
                        alert('Menunggu sinyal GPS...');
                      }
                    }}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Pakai Lokasi Saya Sekarang
                  </button>
                </div>
                <div className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800 text-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {newOdpCoords ? formatCoordinate(newOdpCoords.lat, newOdpCoords.lng) : 'Belum ditentukan'}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddOdpModal(false)}
                  className="flex-1 py-2 rounded-lg border text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  Simpan ODP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
