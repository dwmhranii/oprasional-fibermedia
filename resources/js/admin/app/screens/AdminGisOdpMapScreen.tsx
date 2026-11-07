import React, { useState } from 'react';
import {
  MapPanel,
  OdpDetailPanel,
  OdpMarkerData,
  OdpPort,
  Button,
  Badge,
} from '@shared/ui';
import { MapPin, Radio, Filter, Plus } from 'lucide-react';

export interface AdminGisOdpMapScreenProps {
  onNavigateToDispatch?: (odpCode: string) => void;
}

export const AdminGisOdpMapScreen: React.FC<AdminGisOdpMapScreenProps> = ({
  onNavigateToDispatch,
}) => {
  const [selectedOdp, setSelectedOdp] = useState<OdpMarkerData | null>({
    id: 'odp-1',
    code: 'ODP-KPN-01/04',
    lat: -8.1132,
    lng: 112.6415,
    totalPorts: 8,
    usedPorts: 7,
    status: 'full',
  });

  const odpMarkers: OdpMarkerData[] = [
    {
      id: 'odp-1',
      code: 'ODP-KPN-01/04',
      lat: -8.1132,
      lng: 112.6415,
      totalPorts: 8,
      usedPorts: 7,
      status: 'full',
    },
    {
      id: 'odp-2',
      code: 'ODP-KPN-01/05',
      lat: -8.1145,
      lng: 112.6432,
      totalPorts: 8,
      usedPorts: 4,
      status: 'normal',
    },
    {
      id: 'odp-3',
      code: 'ODP-KPN-01/06',
      lat: -8.116,
      lng: 112.6455,
      totalPorts: 16,
      usedPorts: 13,
      status: 'full',
    },
    {
      id: 'odp-4',
      code: 'ODP-KPN-01/07',
      lat: -8.112,
      lng: 112.6395,
      totalPorts: 8,
      usedPorts: 2,
      status: 'normal',
    },
  ];

  const mockPorts: OdpPort[] = [
    { portNumber: 1, isUsed: true, customerName: 'Ahmad Subandi', customerId: 'FM-00101', onuSerial: 'ZTEG-F670-8812', opticalDbm: -19.4 },
    { portNumber: 2, isUsed: true, customerName: 'Siti Rahmawati', customerId: 'FM-00102', onuSerial: 'HWTC-EG81-3391', opticalDbm: -21.2 },
    { portNumber: 3, isUsed: true, customerName: 'Toko Berkah Abadi', customerId: 'FM-00103', onuSerial: 'FHTT-HG68-0021', opticalDbm: -18.7 },
    { portNumber: 4, isUsed: true, customerName: 'Klinik Medika Prima', customerId: 'FM-00104', onuSerial: 'ZTEG-F670-1922', opticalDbm: -22.5 },
    { portNumber: 5, isUsed: true, customerName: 'Bambang Irawan', customerId: 'FM-00105', onuSerial: 'HWTC-EG81-9988', opticalDbm: -20.1 },
    { portNumber: 6, isUsed: true, customerName: 'Warkop Nusantara', customerId: 'FM-00106', onuSerial: 'ZTEG-F670-4455', opticalDbm: -26.9 }, // Waspada
    { portNumber: 7, isUsed: true, customerName: 'Lestari Laundry', customerId: 'FM-00107', onuSerial: 'FHTT-HG68-8833', opticalDbm: -19.8 },
    { portNumber: 8, isUsed: false },
  ];

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {/* Top Map Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Peta GIS Infrastruktur FTTH (ODC / ODP)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Visualisasi jalur kabel feeder, kapasitas sisa port, dan telemetri redaman optik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="success" size="sm" dot>
            4 ODP Terhubung
          </Badge>
          <Button
            variant="primary"
            size="sm"
            density="compact"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => alert('Membuka modal tambah titik ODP baru')}
          >
            Tambah Titik ODP
          </Button>
        </div>
      </div>

      {/* Main Map & Detail Panel Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Interactive GIS Map Canvas (2 cols on desktop) */}
        <div className="lg:col-span-2 h-full min-h-[400px]">
          <MapPanel
            markers={odpMarkers}
            selectedMarkerId={selectedOdp?.id}
            onSelectMarker={(m) => setSelectedOdp(m)}
          />
        </div>

        {/* Selected ODP Detail Panel (1 col) */}
        <div className="h-full min-h-[400px] overflow-hidden">
          {selectedOdp ? (
            <OdpDetailPanel
              odpCode={selectedOdp.code}
              latitude={selectedOdp.lat}
              longitude={selectedOdp.lng}
              totalPorts={selectedOdp.totalPorts}
              usedPorts={selectedOdp.usedPorts}
              status={selectedOdp.status}
              ports={mockPorts}
              onClose={() => setSelectedOdp(null)}
              onDispatchToOdp={(code) => {
                if (onNavigateToDispatch) {
                  onNavigateToDispatch(code);
                } else {
                  alert(`Tugaskan teknisi ke ${code}`);
                }
              }}
            />
          ) : (
            <div className="h-full rounded-2xl border border-dashed border-border bg-card/60 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MapPin className="w-8 h-8 text-primary mb-2 opacity-50" />
              <p className="text-xs font-medium text-foreground">Pilih Marker ODP di Peta</p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                Klik salah satu pin ODP untuk melihat rincian utilisasi port, redaman optik dBm, dan pelanggan terhubung.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

