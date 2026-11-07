import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Layers, Crosshair } from 'lucide-react';

// Fix default Leaflet marker icon asset URLs
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PsbLocationPickerMapProps {
  latitude: number;
  longitude: number;
  onChangeLocation: (lat: number, lng: number) => void;
  isDark?: boolean;
  accentPrimary?: string;
  accentSecondary?: string;
}

export const PsbLocationPickerMap: React.FC<PsbLocationPickerMapProps> = ({
  latitude,
  longitude,
  onChangeLocation,
  isDark = true,
  accentPrimary = '#06b6d4',
  accentSecondary = '#38bdf8',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [basemap, setBasemap] = useState<'street' | 'satellite'>('street');
  const [isLocating, setIsLocating] = useState(false);

  const getTileUrl = (type: 'street' | 'satellite') => {
    if (type === 'satellite') {
      // Google Hybrid (Satellite + Roads/Labels)
      return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    }
    // Google Street Maps
    return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  };

  // Create custom pulsing pin icon for PSB Location
  const createCustomPinIcon = () => {
    return L.divIcon({
      className: 'psb-interactive-pin',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #ef4444; opacity: 0.35; animation: pulse 1.8s infinite;"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #0f172a; border: 2.5px solid #ef4444; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = Number.isFinite(latitude) && latitude !== 0 ? latitude : -7.9785;
    const initialLng = Number.isFinite(longitude) && longitude !== 0 ? longitude : 112.6318;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
    });

    const tileLayer = L.tileLayer(getTileUrl('street'), {
      maxZoom: 20,
      attribution: '&copy; Google Maps &bull; Fibermedia Ops',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Add draggable marker
    const marker = L.marker([initialLat, initialLng], {
      icon: createCustomPinIcon(),
      draggable: true,
      autoPan: true,
    }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 11px; font-weight: bold; padding: 2px;">
        Titik Pemasangan PSB<br/>
        <span style="font-family: monospace; font-size: 10px; color: #64748b;">${initialLat.toFixed(6)}, ${initialLng.toFixed(6)}</span>
      </div>
    `);

    // Handle marker drag event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const lat = Number(pos.lat.toFixed(6));
      const lng = Number(pos.lng.toFixed(6));
      onChangeLocation(lat, lng);
    });

    // Handle map click event
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([lat, lng]);
      onChangeLocation(lat, lng);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Invalidate size to ensure clean rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update marker position when latitude or longitude changes externally
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const currentPos = markerRef.current.getLatLng();
    const diffLat = Math.abs(currentPos.lat - latitude);
    const diffLng = Math.abs(currentPos.lng - longitude);

    if (diffLat > 0.00001 || diffLng > 0.00001) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude]);

  // Handle Basemap Switch
  const handleSwitchBasemap = (type: 'street' | 'satellite') => {
    setBasemap(type);
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();
    const newLayer = L.tileLayer(getTileUrl(type), {
      maxZoom: 20,
      attribution: '&copy; Google Maps &bull; Fibermedia Ops',
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  };

  // Recenter map to current marker
  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([latitude, longitude], 17, { animate: true });
  };

  // Fetch current device GPS location
  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onChangeLocation(lat, lng);

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapInstanceRef.current.setView([lat, lng], 17, { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-2">
      {/* Map Card */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border shadow-sm ${
          isDark ? 'border-blue-900/70 bg-[#071022]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {/* Leaflet Container */}
        <div ref={mapContainerRef} className="w-full h-64 sm:h-72 z-0" />

        {/* Floating Controls Overlay */}
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col gap-1.5">
          {/* Basemap Switcher */}
          <div
            className={`p-1 rounded-xl shadow-lg border flex items-center gap-1 backdrop-blur-md ${
              isDark ? 'bg-slate-900/85 border-blue-900/80 text-white' : 'bg-white/90 border-slate-200 text-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => handleSwitchBasemap('street')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                basemap === 'street'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'hover:bg-slate-800/20'
              }`}
            >
              Jalan
            </button>
            <button
              type="button"
              onClick={() => handleSwitchBasemap('satellite')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                basemap === 'satellite'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'hover:bg-slate-800/20'
              }`}
            >
              Satelit
            </button>
          </div>

          {/* Recenter Button */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Pusatkan ke Pin"
            className={`p-2 rounded-xl shadow-lg border cursor-pointer backdrop-blur-md flex items-center justify-center transition hover:scale-105 ${
              isDark
                ? 'bg-slate-900/85 border-blue-900/80 text-cyan-400 hover:bg-slate-800'
                : 'bg-white/90 border-slate-200 text-cyan-600 hover:bg-slate-100'
            }`}
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Instruction Banner */}
        <div
          className={`absolute bottom-2.5 left-2.5 right-2.5 z-10 px-3 py-1.5 rounded-xl text-[11px] font-medium shadow-md backdrop-blur-md flex items-center justify-between gap-2 ${
            isDark
              ? 'bg-slate-900/90 border border-blue-900/70 text-slate-200'
              : 'bg-white/95 border border-slate-200 text-slate-700'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">Ketuk peta / geser pin merah ke atap rumah</span>
          </span>
          <span className="font-mono text-[10px] text-cyan-400 font-bold shrink-0">
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Action: Use Current GPS */}
      <button
        type="button"
        onClick={handleGetCurrentGps}
        disabled={isLocating}
        className="w-full py-2.5 px-3 rounded-xl text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition hover:opacity-95 disabled:opacity-50"
        style={{
          background: `linear-gradient(135deg, ${accentPrimary}, ${accentSecondary})`,
        }}
      >
        <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
        {isLocating ? 'Mendeteksi Titik GPS...' : 'Ambil Titik Koordinat GPS Saat Ini'}
      </button>
    </div>
  );
};
