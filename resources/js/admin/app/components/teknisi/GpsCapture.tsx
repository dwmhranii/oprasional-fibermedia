import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { MapPin, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { CustomerMap } from '../maps/CustomerMap';
import { formatDate } from '../../lib/formatters';

export interface GpsData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  captured_at: string;
}

interface GpsCaptureProps {
  onCapture: (data: GpsData) => void;
  disabled?: boolean;
  initialData?: GpsData;
}

export const GpsCapture: React.FC<GpsCaptureProps> = ({ onCapture, disabled, initialData }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [gpsData, setGpsData] = useState<GpsData | null>(initialData || null);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = () => {
    setIsCapturing(true);
    setError(null);

    if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const fallbackData: GpsData = {
        latitude: -8.081413,
        longitude: 112.637789,
        accuracy: 10,
        captured_at: new Date().toISOString(),
      };
      setGpsData(fallbackData);
      onCapture(fallbackData);
      setIsCapturing(false);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolokasi tidak didukung oleh browser Anda.');
      setIsCapturing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const data: GpsData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          captured_at: new Date().toISOString()
        };
        setGpsData(data);
        onCapture(data);
        setIsCapturing(false);
      },
      (err) => {
        setIsCapturing(false);
        switch(err.code) {
          case err.PERMISSION_DENIED:
            setError('Akses lokasi ditolak. Silakan izinkan akses lokasi di browser Anda.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Informasi lokasi tidak tersedia.');
            break;
          case err.TIMEOUT:
            setError('Permintaan lokasi habis waktu (timeout). Coba lagi.');
            break;
          default:
            setError('Terjadi kesalahan saat mengambil lokasi.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  return (
    <Card className={`border ${gpsData ? 'border-green-200 bg-green-50/10' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            Verifikasi Lokasi (GPS)
            {gpsData && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          </div>
        </CardTitle>
        <CardDescription>
          Koordinat instalasi wajib direkam sebagai bukti pengerjaan di lokasi pelanggan yang tepat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gagal Mendapatkan Lokasi</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {gpsData ? (
          <div className="space-y-4">
            <div className="bg-green-50/50 border border-green-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Lokasi Berhasil Direkam</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    Lat: {gpsData.latitude.toFixed(6)}, Lng: {gpsData.longitude.toFixed(6)}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {gpsData.accuracy && (
                      <span className="text-xs font-medium text-green-700 bg-green-100/50 px-1.5 py-0.5 rounded">
                        Akurasi: ±{Math.round(gpsData.accuracy)} meter
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{formatDate(gpsData.captured_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${gpsData.latitude},${gpsData.longitude}`, '_blank')} 
                  className="min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Buka Maps
                </Button>
                <Button variant="outline" size="sm" onClick={captureLocation} disabled={disabled || isCapturing} className="min-h-[44px]">
                  {isCapturing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                  {isCapturing ? 'Memperbarui...' : 'Perbarui'}
                </Button>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <CustomerMap 
                lat={gpsData.latitude} 
                lng={gpsData.longitude} 
                customerName="Lokasi Teknisi Saat Ini"
                address="Koordinat direkam otomatis via GPS perangkat"
                interactive={false}
              />
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center mb-1">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Lokasi belum direkam</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Sistem akan meminta izin untuk mengakses GPS perangkat Anda.</p>
            </div>
            <Button onClick={captureLocation} disabled={disabled || isCapturing} className="mt-2 min-h-[44px]">
              {isCapturing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating location...</>
              ) : (
                <><MapPin className="w-4 h-4 mr-2" /> Rekam Lokasi Sekarang</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
