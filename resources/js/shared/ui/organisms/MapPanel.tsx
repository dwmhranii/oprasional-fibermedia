import React, { useState } from 'react';
import { IconButton, Badge } from '../atoms';
import { Layers, Navigation, Plus, Minus, Info, Radio, Cable } from 'lucide-react';

export interface OdpMarkerData {
  id: string;
  code: string;
  lat: number;
  lng: number;
  totalPorts: number;
  usedPorts: number;
  status: 'normal' | 'full' | 'maintenance';
}

export interface MapPanelProps {
  markers: OdpMarkerData[];
  selectedMarkerId?: string;
  onSelectMarker: (marker: OdpMarkerData) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export const MapPanel: React.FC<MapPanelProps> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  center = { lat: -8.1132, lng: 112.6415 },
  zoom = 15,
  className = '',
}) => {
  const [showLegend, setShowLegend] = useState(true);
  const [activeLayers, setActiveLayers] = useState({
    odp: true,
    cables: true,
    coverage: false,
  });

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-border bg-slate-950 flex flex-col ${className}`}>
      {/* Map Canvas Simulated Vector Topography View */}
      <div className="relative flex-1 w-full h-full overflow-hidden select-none bg-[#070b14]">
        {/* Subtle SVG Grid & Route Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none">
          <defs>
            <pattern id="grid-map" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-map)" />

          {/* Fiber Optic Feeder Cable Polyline */}
          {activeLayers.cables && (
            <>
              <path
                d="M 50 180 Q 220 160 400 240 T 780 290 T 1100 250"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
                strokeDasharray="6,4"
                className="animate-pulse"
              />
              <path
                d="M 400 240 Q 520 400 650 500 T 950 560"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
              />
            </>
          )}
        </svg>

        {/* Central ODC Node */}
        <div className="absolute top-[230px] left-[390px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto cursor-pointer group">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)] group-hover:scale-110 transition-transform">
            <Radio className="w-4 h-4" />
          </div>
          <span className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono text-cyan-300">
            ODC-KPN-01
          </span>
        </div>

        {/* ODP Markers */}
        {activeLayers.odp &&
          markers.map((odp, idx) => {
            const isSelected = selectedMarkerId === odp.id;
            const pct = odp.usedPorts / odp.totalPorts;

            let pinColor = 'bg-emerald-500 border-emerald-300 text-white';
            let glowColor = 'shadow-[0_0_12px_rgba(16,185,129,0.5)]';
            if (pct >= 0.9 || odp.status === 'full') {
              pinColor = 'bg-rose-500 border-rose-300 text-white';
              glowColor = 'shadow-[0_0_12px_rgba(244,63,94,0.5)]';
            } else if (pct >= 0.75) {
              pinColor = 'bg-amber-500 border-amber-300 text-slate-900';
              glowColor = 'shadow-[0_0_12px_rgba(245,158,11,0.5)]';
            }

            // Scatter marker positions visually across map
            const leftPos = 180 + (idx % 4) * 230 + ((idx * 37) % 60);
            const topPos = 140 + Math.floor(idx / 4) * 160 + ((idx * 43) % 50);

            return (
              <div
                key={odp.id}
                style={{ left: `${leftPos}px`, top: `${topPos}px` }}
                onClick={() => onSelectMarker(odp)}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group pointer-events-auto"
              >
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold transition-all duration-200 ${pinColor} ${glowColor} ${
                    isSelected ? 'ring-4 ring-cyan-400 scale-125' : 'group-hover:scale-110'
                  }`}
                >
                  {odp.usedPorts}
                </div>
                <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/95 border border-slate-700 text-[10px] font-mono text-slate-200 tracking-tight whitespace-nowrap shadow-md">
                  {odp.code} ({odp.usedPorts}/{odp.totalPorts})
                </div>
              </div>
            );
          })}

        {/* GIS Controls (Top-Right) */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
          <div className="flex flex-col rounded-xl overflow-hidden border border-border bg-card/90 backdrop-blur-md shadow-md">
            <IconButton
              icon={<Plus className="w-4 h-4" />}
              ariaLabel="Perbesar peta"
              variant="ghost"
              size="sm"
              density="compact"
            />
            <div className="h-[1px] bg-border w-full" />
            <IconButton
              icon={<Minus className="w-4 h-4" />}
              ariaLabel="Perkecil peta"
              variant="ghost"
              size="sm"
              density="compact"
            />
          </div>

          <IconButton
            icon={<Navigation className="w-4 h-4" />}
            ariaLabel="Pusatkan posisi saya"
            variant="secondary"
            size="sm"
            density="compact"
            className="shadow-md"
          />

          <IconButton
            icon={<Layers className="w-4 h-4" />}
            ariaLabel="Lapisan peta"
            variant="secondary"
            size="sm"
            density="compact"
            className="shadow-md"
            onClick={() =>
              setActiveLayers((prev) => ({ ...prev, cables: !prev.cables }))
            }
          />
        </div>

        {/* Legend Overlay (Bottom-Left) */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 p-3 rounded-xl border border-border bg-card/90 backdrop-blur-md shadow-lg text-xs space-y-2 z-20 max-w-xs">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-1.5">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                Legenda Kapasitas ODP
              </span>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Sembunyikan
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground">Tersedia (&lt; 75% terpakai)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                <span className="text-muted-foreground">Waspada (75% - 90% terpakai)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                <span className="text-muted-foreground">Penuh (&gt; 90% terpakai)</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <span className="w-4 h-0.5 bg-cyan-400 shrink-0" />
                <span className="text-muted-foreground">Kabel Fiber Feeder</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

