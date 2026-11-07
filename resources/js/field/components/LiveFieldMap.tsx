import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkOrder } from '../types';
import { INITIAL_ODPS } from '../data/mockData';
import {
  Building2,
  Layers,
  ZoomIn,
  ZoomOut,
  X,
  Route,
} from 'lucide-react';

interface LiveFieldMapProps {
  onSelectTicket?: (ticket: WorkOrder) => void;
}

export const LiveFieldMap: React.FC<LiveFieldMapProps> = ({ onSelectTicket }) => {
  const { office, workOrders, currentGps, isOnline } = useApp();

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  // PRD v1.2 Section 1 & 8: OSRM publik dengan cache 7 hari dan fallback garis lurus
  const [routingMode, setRoutingMode] = useState<'osrm_road' | 'straight_fallback'>('osrm_road');
  const [selectedPin, setSelectedPin] = useState<{
    type: 'office' | 'ticket' | 'odp' | 'my_location';
    data: any;
  } | null>(null);

  const mapWidth = 500;
  const mapHeight = 360;

  const centerLat = office.latitude;
  const centerLng = office.longitude;
  const latSpan = 0.08 / zoomLevel;
  const lngSpan = 0.08 / zoomLevel;

  const projectCoords = (lat: number, lng: number) => {
    const x = ((lng - (centerLng - lngSpan / 2)) / lngSpan) * mapWidth;
    const y = (((centerLat + latSpan / 2) - lat) / latSpan) * mapHeight;
    return { x, y };
  };

  const officePos = projectCoords(office.latitude, office.longitude);
  const myPos = projectCoords(currentGps.lat, currentGps.lng);

  const effectiveRouting = !isOnline ? 'straight_fallback' : routingMode;

  return (
    <div className="bg-surface-card rounded-token-lg border border-edge-subtle shadow-token-card overflow-hidden">
      {/* Map Control Bar with OSRM vs Fallback Garis Lurus (PRD v1.2 Section 8) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-900 text-white text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-bold">Peta GIS ODP & Routing Jalan (PRD v1.2)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              setRoutingMode((m) => (m === 'osrm_road' ? 'straight_fallback' : 'osrm_road'))
            }
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer border ${
              effectiveRouting === 'osrm_road'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}
            title="PRD Bagian 8: OSRM publik gratis dengan cache Redis 7 hari & fallback garis lurus"
          >
            <Route className="w-3 h-3" />
            {effectiveRouting === 'osrm_road'
              ? 'OSRM Publik (Cache 7h)'
              : 'Fallback Garis Lurus'}
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Perbesar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.7))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Perkecil"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Vector Interactive Map Canvas */}
      <div className="relative w-full h-[320px] bg-slate-950 overflow-hidden select-none">
        <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} className="w-full h-full cursor-grab">
          {/* Map Grid Roads */}
          <g stroke="rgba(255,255,255,0.07)" strokeWidth="1.5">
            <line x1="0" y1="80" x2={mapWidth} y2="80" />
            <line x1="0" y1="180" x2={mapWidth} y2="180" strokeWidth="2.5" stroke="rgba(56,189,248,0.15)" />
            <line x1="0" y1="260" x2={mapWidth} y2="260" />
            <line x1="120" y1="0" x2="120" y2={mapHeight} />
            <line x1="250" y1="0" x2="250" y2={mapHeight} strokeWidth="2.5" stroke="rgba(56,189,248,0.15)" />
            <line x1="380" y1="0" x2="380" y2={mapHeight} />
            <line x1="50" y1="320" x2="450" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          </g>

          {/* District Labels */}
          <text x="70" y="45" fill="rgba(255,255,255,0.18)" fontSize="10" fontWeight="bold">KEBAYORAN</text>
          <text x="320" y="70" fill="rgba(255,255,255,0.18)" fontSize="10" fontWeight="bold">TEBET</text>
          <text x="210" y="340" fill="rgba(255,255,255,0.18)" fontSize="10" fontWeight="bold">CILANDAK</text>

          {/* OSRM Road Route vs Straight-Line Fallback between ODP and Customer Tickets */}
          {workOrders.map((wo) => {
            const odp = INITIAL_ODPS.find((o) => o.code === wo.odp_name || o.name === wo.odp_name) || INITIAL_ODPS[0];
            const odpPos = projectCoords(odp.lat, odp.lng);
            const woPos = projectCoords(wo.latitude, wo.longitude);

            if (effectiveRouting === 'osrm_road') {
              // Simulated orthogonal road path via street intersections (OSRM cached route)
              const midX = odpPos.x;
              const midY = woPos.y;
              return (
                <polyline
                  key={`route-${wo.id}`}
                  points={`${odpPos.x},${odpPos.y} ${midX},${midY} ${woPos.x},${woPos.y}`}
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.55)"
                  strokeWidth="2"
                />
              );
            }
            // Fallback garis lurus (when OSRM timeout/down)
            return (
              <line
                key={`route-${wo.id}`}
                x1={odpPos.x}
                y1={odpPos.y}
                x2={woPos.x}
                y2={woPos.y}
                stroke="rgba(245, 158, 11, 0.65)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            );
          })}

          {/* ODP Distribution Points with Port Capacity & Held Ports */}
          {INITIAL_ODPS.map((odp) => {
            const pos = projectCoords(odp.lat, odp.lng);
            return (
              <g
                key={odp.code}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer"
                onClick={() => setSelectedPin({ type: 'odp', data: odp })}
              >
                <circle r="6" fill="#0e7490" stroke="#22d3ee" strokeWidth="1.5" />
                <text y="-9" textAnchor="middle" fill="#67e8f9" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  {odp.code} ({odp.active_ports}/{odp.capacity})
                </text>
              </g>
            );
          })}

          {/* Office Geofence Circle (50m Radius) */}
          <g transform={`translate(${officePos.x}, ${officePos.y})`}>
            <circle
              r="26"
              fill="rgba(14, 165, 233, 0.15)"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <circle r="4" fill="#0284c7" />
            <g
              className="cursor-pointer"
              onClick={() => setSelectedPin({ type: 'office', data: office })}
            >
              <rect x="-10" y="-18" width="20" height="14" rx="3" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
              <text x="0" y="-8" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">HQ</text>
            </g>
          </g>

          {/* Active Work Order Pins */}
          {workOrders.map((wo) => {
            const pos = projectCoords(wo.latitude, wo.longitude);
            const isPsb = wo.type === 'psb';
            const isResolved = wo.status === 'resolved' || wo.status === 'closed';
            const pinColor = isResolved ? '#10b981' : isPsb ? '#0284c7' : '#f43f5e';

            return (
              <g
                key={wo.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={() => setSelectedPin({ type: 'ticket', data: wo })}
              >
                <circle
                  r="22"
                  fill={isPsb ? 'rgba(2, 132, 199, 0.12)' : 'rgba(244, 63, 94, 0.12)'}
                  stroke={pinColor}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle r="6" fill={pinColor} stroke="#ffffff" strokeWidth="2" />
                <text
                  y="-10"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="8"
                  fontWeight="bold"
                  className="font-mono bg-black/50"
                >
                  {wo.ticket_number.slice(-3)}
                </text>
              </g>
            );
          })}

          {/* Current Technician Device Location Pin */}
          <g transform={`translate(${myPos.x}, ${myPos.y})`}>
            <circle
              r={Math.min(30, Math.max(12, currentGps.accuracy / 2))}
              fill="rgba(56, 189, 248, 0.2)"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <circle r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
            <circle r="3" fill="#ffffff" />
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg text-[10px] text-slate-300 font-mono border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> PSB
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Gangguan
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> ODP
            </span>
          </div>
          <span className="text-cyan-300">
            {effectiveRouting === 'osrm_road'
              ? 'Rute: OSRM Jalan (Cache 7 Hari)'
              : 'Rute: Fallback Garis Lurus'}
          </span>
        </div>
      </div>

      {/* Selected Marker Detail Card */}
      {selectedPin && (
        <div className="p-3 bg-surface-muted border-t border-edge-subtle text-xs flex items-start justify-between">
          <div className="space-y-1">
            {selectedPin.type === 'office' && (
              <div>
                <p className="font-bold text-content-primary flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-brand-accent" />
                  {selectedPin.data.name}
                </p>
                <p className="text-[11px] text-content-secondary font-mono">
                  Radius Kantor: 50m · IP Wi-Fi Sah: {selectedPin.data.allowed_wifi_ip}
                </p>
              </div>
            )}

            {selectedPin.type === 'odp' && (
              <div>
                <p className="font-bold text-content-primary font-mono">
                  {selectedPin.data.code} — {selectedPin.data.name}
                </p>
                <p className="text-[11px] text-content-secondary font-mono">
                  {selectedPin.data.address} · Port Active: {selectedPin.data.active_ports}/{selectedPin.data.capacity} · Port Held (Tahan 30h): {selectedPin.data.held_ports}
                </p>
              </div>
            )}

            {selectedPin.type === 'ticket' && (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-content-primary">
                    {selectedPin.data.ticket_number}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 uppercase font-mono">
                    {selectedPin.data.type}
                  </span>
                </div>
                <p className="font-semibold text-content-primary">{selectedPin.data.customer_name}</p>
                <p className="text-[11px] text-content-secondary truncate max-w-xs">{selectedPin.data.address}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedPin.type === 'ticket' && onSelectTicket && (
              <button
                onClick={() => onSelectTicket(selectedPin.data)}
                className="px-3 py-1.5 rounded-lg bg-brand-primary text-brand-on-primary font-extrabold text-xs cursor-pointer"
              >
                Buka Tiket
              </button>
            )}
            <button
              onClick={() => setSelectedPin(null)}
              className="p-1 text-content-muted hover:text-content-primary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
