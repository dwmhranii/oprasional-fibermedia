import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoordinate } from '../lib/formatters';

// Fix default leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapMarkerItem {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  status?: string;
  iconUrl?: string;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarkerItem[];
  height?: string | number;
  className?: string;
  onMarkerClick?: (marker: MapMarkerItem) => void;
}

function RecenterAutomatically({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  center = [-8.1132, 112.6415],
  zoom = 14,
  markers = [],
  height = '400px',
  className = '',
  onMarkerClick,
}) => {
  return (
    <div
      style={{ height }}
      className={`relative w-full rounded-xl overflow-hidden border border-border shadow-xs z-0 ${className}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterAutomatically center={center} />

        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            eventHandlers={{
              click: () => onMarkerClick?.(m),
            }}
          >
            <Popup>
              <div className="p-1 space-y-1">
                <div className="font-semibold text-sm">{m.title}</div>
                {m.subtitle && <div className="text-xs text-gray-500">{m.subtitle}</div>}
                <div className="text-xs text-gray-400 font-mono">
                  {formatCoordinate(m.lat, m.lng)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
