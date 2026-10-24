import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { workOrderService } from '../../lib/workOrderService';
import type { LiveFleetMapData, FleetTeam, FleetMapWorkOrder } from '../../types/workOrder';
import { 
  Navigation, 
  Users, 
  Wrench, 
  AlertTriangle, 
  Radio, 
  RotateCw, 
  Layers, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Search,
  Filter,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// Custom Marker Icons for Leaflet
const createCustomIcon = (type: 'psb' | 'complaint') => {
  const isPsb = type === 'psb';
  const bgColor = isPsb ? '#0284c7' : '#e11d48'; // Sky-600 vs Rose-600
  const iconSymbol = isPsb ? '🔧' : '⚠️';

  return L.divIcon({
    className: 'custom-fleet-pin',
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        background: ${bgColor};
        border: 2.5px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: 15px;
          line-height: 1;
        ">${iconSymbol}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
};

const psbIcon = createCustomIcon('psb');
const complaintIcon = createCustomIcon('complaint');

// Map Recenter Helper
const FitMapBounds: React.FC<{ workOrders: FleetMapWorkOrder[] }> = ({ workOrders }) => {
  const map = useMap();

  useEffect(() => {
    if (!workOrders || workOrders.length === 0) return;

    const validCoords = workOrders
      .filter(wo => wo.coordinates?.lat && wo.coordinates?.lng)
      .map(wo => [wo.coordinates.lat, wo.coordinates.lng] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [workOrders, map]);

  return null;
};

export const LiveFleetTracking: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15000); // 15s default

  const { data, isLoading, isFetching, refetch } = useQuery<LiveFleetMapData>({
    queryKey: ['admin', 'live-fleet-map', selectedTeam, selectedType],
    queryFn: () => workOrderService.getAdminLiveFleetMap({
      team: selectedTeam,
      type: selectedType,
    }),
    refetchInterval: autoRefreshInterval,
  });

  const summary = data?.summary || {
    total_active_work_orders: 0,
    active_psb_count: 0,
    active_complaints_count: 0,
    active_teams_count: 0,
  };

  const teams = data?.teams || [];
  const workOrders = data?.work_orders || [];

  // Malang Raya Default Coordinates
  const defaultCenterLat = -7.9666;
  const defaultCenterLng = 112.6326;

  const handleOpenDetail = (wo: FleetMapWorkOrder) => {
    // Extract raw ID if format is WO-CMP-12 or WO-TSK-4
    const rawId = wo.id.replace(/^WO-(CMP|TSK)-/, '');
    if (wo.type === 'psb') {
      navigate(`/admin/tasks/${rawId}`);
    } else {
      navigate(`/admin/complaints/${rawId}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header & Command Center Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              Live Command Center
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-indigo-400" />
            Peta Komando & Fleet Tracking Lapangan
          </h1>
          <p className="text-xs text-slate-400">
            Pemantauan langsung pergerakan armada teknisi dan sebaran tugas aktif di wilayah operasional Malang Raya secara real-time.
          </p>
        </div>

        {/* Action Controls: Refresh & Auto-Refresh Interval */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Auto:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-white font-semibold outline-none cursor-pointer"
            >
              <option value={10000} className="bg-slate-900">10s</option>
              <option value={15000} className="bg-slate-900">15s</option>
              <option value={30000} className="bg-slate-900">30s</option>
              <option value={0} className="bg-slate-900">Mati</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-white text-xs h-9"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Work Order Aktif</p>
              <h3 className="text-xl font-bold text-gray-900">{summary.total_active_work_orders}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-100 bg-gradient-to-br from-sky-50/50 to-white shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pasang Baru (PSB)</p>
              <h3 className="text-xl font-bold text-sky-700">{summary.active_psb_count}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-100 bg-gradient-to-br from-rose-50/50 to-white shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Gangguan (Komplain)</p>
              <h3 className="text-xl font-bold text-rose-700">{summary.active_complaints_count}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Tim Teknisi Aktif</p>
              <h3 className="text-xl font-bold text-emerald-700">{summary.active_teams_count}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-700">Filter Tim:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Tim Teknisi</option>
              {teams.map((t) => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">Tipe Tugas:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Tipe (PSB & Gangguan)</option>
              <option value="psb">Hanya Pasang Baru (PSB)</option>
              <option value="complaint">Hanya Gangguan (Komplain)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span>
            <span>Pasang Baru (PSB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block"></span>
            <span>Gangguan (Komplain)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left) & Fleet Teams Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaflet Map (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs flex flex-col h-[580px]">
          <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" />
              Sebaran Titik Pelanggan & Lokasi Pekerjaan Lapangan
            </span>
            <span className="text-gray-500 font-mono text-[11px]">
              {workOrders.length} Titik Terdeteksi
            </span>
          </div>

          <div className="flex-1 w-full relative z-0">
            <MapContainer
              center={[defaultCenterLat, defaultCenterLng]}
              zoom={12}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitMapBounds workOrders={workOrders} />

              {workOrders.map((wo) => {
                if (!wo.coordinates?.lat || !wo.coordinates?.lng) return null;
                const isPsb = wo.type === 'psb';

                return (
                  <Marker
                    key={wo.id}
                    position={[wo.coordinates.lat, wo.coordinates.lng]}
                    icon={isPsb ? psbIcon : complaintIcon}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-1 space-y-2 text-xs min-w-[220px]">
                        <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPsb ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPsb ? 'Pasang Baru' : 'Gangguan'}
                          </span>
                          <span className="font-mono font-bold text-gray-800">{wo.ticket_number || wo.id}</span>
                        </div>

                        <div>
                          <p className="font-bold text-gray-900 text-sm">{wo.customer_name}</p>
                          <p className="text-gray-600 text-[11px] mt-0.5">{wo.title}</p>
                        </div>

                        <div className="bg-gray-50 p-2 rounded border space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tim:</span>
                            <span className="font-bold text-indigo-700">{wo.assigned_team || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status:</span>
                            <span className="font-semibold text-gray-800">{wo.status}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleOpenDetail(wo)}
                          className="w-full h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          Lihat Detail Pekerjaan
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Fleet Team Status Panel (1 Col) */}
        <div className="space-y-4 flex flex-col h-[580px]">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs shrink-0">
            <h3 className="font-bold text-gray-900 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Status Tim Armada Teknisi
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {teams.length} Tim
              </Badge>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {teams.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border text-center text-gray-400 text-xs">
                Belum ada data tim teknisi terdaftar.
              </div>
            ) : (
              teams.map((team) => {
                const isBusy = team.status === 'busy' || team.total_active_wos > 0;

                return (
                  <Card key={team.name} className="shadow-xs border border-gray-200 hover:border-indigo-300 transition-colors">
                    <CardContent className="p-4 space-y-3 text-xs">
                      {/* Team Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{team.name}</span>
                          <span className="text-gray-400">({team.member_count} Anggota)</span>
                        </div>

                        <Badge className={
                          isBusy 
                            ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold' 
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                        }>
                          {isBusy ? 'Sedang Bertugas' : 'Standby (Siaga)'}
                        </Badge>
                      </div>

                      {/* Active Tasks Counters */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-lg border text-[11px]">
                        <div>
                          <span className="text-gray-400 block">PSB Aktif:</span>
                          <span className="font-bold text-sky-700">{team.psb_count} Tugas</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block">Komplain Aktif:</span>
                          <span className="font-bold text-rose-700">{team.complaint_count} Tiket</span>
                        </div>
                      </div>

                      {/* Current Ongoing Work Order */}
                      {team.current_work_order ? (
                        <div className="bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-lg space-y-1">
                          <span className="text-[10px] font-bold uppercase text-indigo-700 tracking-wider block">
                            Pekerjaan Saat Ini:
                          </span>
                          <p className="font-bold text-gray-900 text-xs">
                            {team.current_work_order.customer_name}
                          </p>
                          <p className="text-[11px] text-gray-600 font-mono">
                            {team.current_work_order.ticket_number} • Status: {team.current_work_order.status}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">
                          Tidak ada pekerjaan yang sedang berlangsung.
                        </p>
                      )}

                      {/* Team Members */}
                      {team.members && team.members.length > 0 && (
                        <div className="pt-2 border-t border-gray-100 space-y-1">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase">Anggota:</span>
                          <div className="space-y-1">
                            {team.members.map((m) => (
                              <div key={m.id} className="flex items-center justify-between text-[11px] text-gray-700">
                                <span>{m.name}</span>
                                {m.phone && (
                                  <a
                                    href={`https://wa.me/${m.phone.replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-mono text-[10px] flex items-center gap-1"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {m.phone}
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
