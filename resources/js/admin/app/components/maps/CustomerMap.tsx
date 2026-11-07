import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '../ui/button';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default Leaflet marker icon in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CustomerMapProps {
  lat?: number;
  lng?: number;
  customerName?: string;
  address?: string;
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Component to dynamically update map center when props change
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
};

export const CustomerMap: React.FC<CustomerMapProps> = ({ lat, lng, customerName, address, onLocationSelect, interactive = false }) => {
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (interactive && onLocationSelect) {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  };

  if (!lat || !lng) {
    if (interactive) {
      // For interactive mode without initial location, start at default center (e.g., Kabupaten Malang)
      const defaultLat = -8.1329;
      const defaultLng = 112.6338;
      return (
        <div className="space-y-3">
          <div className="h-[200px] md:h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 z-0 relative">
            <MapContainer center={[defaultLat, defaultLng]} zoom={11} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS, Fibermedia Ops'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <MapEvents />
            </MapContainer>
          </div>
          <div className="text-sm text-gray-500">
            Klik pada peta untuk menandai lokasi.
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center bg-gray-50 border border-dashed rounded-lg p-8 text-gray-500 h-[300px]">
        <MapPin className="w-12 h-12 mb-3 text-gray-300" />
        <p className="font-medium text-lg text-gray-700">Lokasi pelanggan belum tersedia.</p>
        <p className="text-sm mt-1">Koordinat GPS tidak ditemukan untuk pelanggan ini.</p>
      </div>
    );
  }

  const handleOpenGoogleMaps = () => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="space-y-3">
      <div className="h-[200px] md:h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 z-0 relative">
        <MapContainer center={[lat, lng]} zoom={15} scrollWheelZoom={interactive} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, USGS, Fibermedia Ops'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <MapEvents />
          <Marker position={[lat, lng]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{customerName || 'Pelanggan'}</p>
                {address && <p className="text-gray-600 mt-1">{address}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  {lat}, {lng}
                </p>
              </div>
            </Popup>
          </Marker>
          <RecenterMap lat={lat} lng={lng} />
        </MapContainer>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">Koordinat:</span> {lat}, {lng}
        </div>
        <Button variant="outline" size="sm" onClick={handleOpenGoogleMaps} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
          <Navigation className="w-4 h-4 mr-2" />
          Buka di Google Maps
        </Button>
      </div>
    </div>
  );
};
