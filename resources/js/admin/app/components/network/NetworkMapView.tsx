import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '../../lib/api';
import { PageHeader } from '@shared/ui/PageHeader';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { NodeStatusChangeModal } from './NodeStatusChangeModal';
import { Input } from '../ui/input';
import {
  MapPin,
  Layers,
  Network,
  Server,
  Cable,
  Filter,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  X,
  Search,
  ExternalLink,
  Save,
  Pencil,
  Undo2,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

// Perbaikan ikon marker default Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OdpPortInfo {
  port_number: number;
  is_occupied: boolean;
  customer: {
    id: number;
    name: string;
    customer_code: string;
    username: string;
    status: string;
    is_online: boolean;
  } | null;
}

export const NetworkMapView: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const cablesGroupRef = useRef<L.LayerGroup | null>(null);
  const nodesGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingPolylineRef = useRef<L.Polyline | null>(null);
  const dragMarkerRef = useRef<L.Marker | null>(null);

  // State Filter & Mode
  const [selectedType, setSelectedType] = useState<string>('all'); // all, olt, odc, odp, cable
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // all, normal, disrupted, cut
  const [activeTab, setActiveTab] = useState<'map' | 'undrawn'>('map');
  const [mapLayerMode, setMapLayerMode] = useState<'google-streets' | 'google-satellite' | 'osm'>('google-streets');
  const [showGmapsGuide, setShowGmapsGuide] = useState(false);

  // Detail Drawer & Status Modal
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalNode, setStatusModalNode] = useState<any | null>(null);
  const [odpPortsData, setOdpPortsData] = useState<{ odp: any; ports: OdpPortInfo[] } | null>(null);
  const [loadingPorts, setLoadingPorts] = useState(false);

  // Mode Gambar Rute Kabel
  const [isDrawingCable, setIsDrawingCable] = useState(false);
  const [drawingCableTarget, setDrawingCableTarget] = useState<any | null>(null);
  const [drawnRoutePoints, setDrawnRoutePoints] = useState<[number, number][]>([]); // [[lon, lat], ...]

  // Mode Tambah Simpul dengan Pin Geser
  const [isAddingNode, setIsAddingNode] = useState<'odp' | 'odc' | null>(null);
  const [draggablePos, setDraggablePos] = useState<{ lat: number; lng: number }>({ lat: -8.081413, lng: 112.637789 });
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeCode, setNewNodeCode] = useState('');
  const [newNodeCapacity, setNewNodeCapacity] = useState(8);

  // 1. Fetch GeoJSON Peta dari /api/network/map
  const { data: geojsonData, isLoading: loadingMap, refetch: refetchMap } = useQuery({
    queryKey: ['network-map-geojson'],
    queryFn: async () => {
      const res = await apiClient.get('/network/map');
      return res?.data?.data || res?.data || res;
    },
    staleTime: 30000,
  });

  // 2. Fetch Kabel yang Belum Digambar
  const { data: undrawnCables, refetch: refetchUndrawn } = useQuery({
    queryKey: ['network-cables-undrawn'],
    queryFn: async () => {
      const res = await apiClient.get('/network/cables?undrawn=1');
      return res?.data?.data || res?.data || [];
    },
  });

  // Hitung akumulasi jarak rute yang sedang digambar (meter)
  const currentDrawnLength = useMemo(() => {
    if (drawnRoutePoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < drawnRoutePoints.length - 1; i++) {
      const [lon1, lat1] = drawnRoutePoints[i];
      const [lon2, lat2] = drawnRoutePoints[i + 1];
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += R * c;
    }
    return Math.round(total);
  }, [drawnRoutePoints]);

  // Helper untuk membuat TileLayer Leaflet
  const createTileLayer = (mode: 'google-streets' | 'google-satellite' | 'osm'): L.TileLayer => {
    switch (mode) {
      case 'google-streets':
        return L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          attribution: '&copy; Google Maps &bull; Fibermedia Ops',
        });
      case 'google-satellite':
        return L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          attribution: '&copy; Google Maps Satelit &bull; Fibermedia Ops',
        });
      case 'osm':
      default:
        return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
    }
  };

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || leafletMapRef.current) return;

    const initialCenter: [number, number] = [-8.081413, 112.637789]; // Bululawang

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 14,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const initialTile = createTileLayer(mapLayerMode).addTo(map);
    tileLayerRef.current = initialTile;

    cablesGroupRef.current = L.layerGroup().addTo(map);
    nodesGroupRef.current = L.layerGroup().addTo(map);
    drawingPolylineRef.current = L.polyline([], {
      color: '#f97316',
      weight: 5,
      dashArray: '6, 6',
      opacity: 0.9,
    }).addTo(map);

    leafletMapRef.current = map;

    // Klik pada peta saat mode menggambar kabel aktif
    map.on('click', (e: L.LeafletMouseEvent) => {
      const activeDrawing = (window as any).__IS_DRAWING_CABLE;
      if (activeDrawing) {
        const newPt: [number, number] = [
          Number(e.latlng.lng.toFixed(7)),
          Number(e.latlng.lat.toFixed(7)),
        ];
        setDrawnRoutePoints((prev) => [...prev, newPt]);
      }
    });

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
  const toggleMapLayerMode = (mode: 'google-streets' | 'google-satellite' | 'osm') => {
    setMapLayerMode(mode);
    const map = leafletMapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }
    const newTile = createTileLayer(mode).addTo(map);
    tileLayerRef.current = newTile;
  };

  // Update flag global untuk map click event handler
  useEffect(() => {
    (window as any).__IS_DRAWING_CABLE = isDrawingCable;
  }, [isDrawingCable]);

  // Update garis gambar rute saat point berubah
  useEffect(() => {
    if (drawingPolylineRef.current) {
      const latLngs = drawnRoutePoints.map(([lon, lat]) => [lat, lon] as [number, number]);
      drawingPolylineRef.current.setLatLngs(latLngs);
    }
  }, [drawnRoutePoints]);

  // Kelola pin geser untuk tambah simpul baru
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    if (dragMarkerRef.current) {
      dragMarkerRef.current.remove();
      dragMarkerRef.current = null;
    }

    if (isAddingNode) {
      const center = map.getCenter();
      setDraggablePos({ lat: center.lat, lng: center.lng });

      const pinIcon = L.divIcon({
        className: 'custom-leaflet-drag-pin',
        html: `
          <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab;">
            <div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white;">
              📍 Geser Posisi ${isAddingNode === 'odp' ? 'ODP' : 'ODC'}
            </div>
            <div style="width: 14px; height: 14px; background: #10b981; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); margin-top: -3px;"></div>
          </div>
        `,
        iconSize: [120, 50],
        iconAnchor: [60, 50],
      });

      const marker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setDraggablePos({ lat: pos.lat, lng: pos.lng });
      });

      dragMarkerRef.current = marker;
    }
  }, [isAddingNode]);

  // Render Marker Simpul & Garis Kabel pada Peta Leaflet
  useEffect(() => {
    const map = leafletMapRef.current;
    const cablesGroup = cablesGroupRef.current;
    const nodesGroup = nodesGroupRef.current;

    if (!map || !cablesGroup || !nodesGroup || !geojsonData?.features) return;

    cablesGroup.clearLayers();
    nodesGroup.clearLayers();

    // Filter features
    const features = geojsonData.features.filter((f: any) => {
      const type = f.properties?.type;
      const status = f.properties?.status;

      if (selectedType !== 'all' && type !== selectedType) return false;
      if (selectedStatus !== 'all' && status !== selectedStatus) return false;
      return true;
    });

    // 1. Render Garis Kabel (LineString)
    const cableFeatures = features.filter((f: any) => f.geometry?.type === 'LineString');
    cableFeatures.forEach((f: any) => {
      const coords = f.geometry?.coordinates || [];
      if (!Array.isArray(coords) || coords.length < 2) return;

      const latLngs = coords.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
      const props = f.properties || {};
      const isCut = props.status === 'cut' || props.status === 'disrupted';

      const polyline = L.polyline(latLngs, {
        color: isCut ? '#ef4444' : '#0284c7',
        weight: isCut ? 5 : 4,
        dashArray: isCut ? '6, 6' : undefined,
        opacity: 0.85,
      });

      polyline.on('click', () => {
        handleSelectNode(props, 'cable');
      });

      polyline.bindTooltip(`Kabel: ${props.name || 'Jalur FTTH'} (${props.core_count || 12} Core)`, {
        sticky: true,
      });

      polyline.addTo(cablesGroup);
    });

    // 2. Render Marker Simpul (Point)
    const pointFeatures = features.filter((f: any) => f.geometry?.type === 'Point');
    pointFeatures.forEach((f: any) => {
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;
      const [lon, lat] = coords;
      const props = f.properties || {};
      const type = props.type;
      const status = props.status;

      let bgColor = '#0284c7';
      let iconSvg = '🔌';
      let size = 26;

      const isDisrupted = status === 'disrupted' || status === 'cut';
      if (isDisrupted) {
        bgColor = '#ef4444'; // Red if disrupted / cut
      } else if (type === 'olt') {
        bgColor = '#8b5cf6'; // Purple-500
        iconSvg = '🏢';
        size = 34;
      } else if (type === 'odc') {
        bgColor = '#10b981'; // Emerald if normal
        iconSvg = '🗄️';
        size = 30;
      } else if (type === 'odp') {
        bgColor = props.free_ports === 0 ? '#f59e0b' : '#0284c7'; // Amber if full, Sky if free
        iconSvg = '🔌';
        size = 24;
      }

      const iconHtml = `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; cursor: pointer;">
          ${
            isDisrupted
              ? `<div style="position: absolute; width: ${size + 14}px; height: ${
                  size + 14
                }px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            position: relative;
            width: ${size}px;
            height: ${size}px;
            background: ${bgColor};
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${size * 0.48}px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          ">
            ${iconSvg}
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-network-node',
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([lat, lon], { icon: markerIcon });
      marker.on('click', () => {
        handleSelectNode(props, type);
      });

      marker.bindTooltip(`${type?.toUpperCase()}: ${props.name || props.code}`, {
        sticky: true,
      });

      marker.addTo(nodesGroup);
    });
  }, [geojsonData, selectedType, selectedStatus]);

  // Handler Pilih Simpul & Fetch Detail Port jika ODP
  const handleSelectNode = async (props: any, type: string) => {
    setSelectedNode({ ...props, nodeType: type });
    setOdpPortsData(null);

    if (type === 'odp' && props.id) {
      setLoadingPorts(true);
      try {
        const res = await apiClient.get(`/network/odps/${props.id}/ports`);
        const data = res?.data?.data || res?.data;
        setOdpPortsData(data);
      } catch (err) {
        toast.error('Gagal mengambil data port ODP');
      } finally {
        setLoadingPorts(false);
      }
    }
  };

  // Simpan Rute Kabel Baru / Update
  const saveCableRouteMutation = useMutation({
    mutationFn: async () => {
      if (!drawingCableTarget || drawnRoutePoints.length < 2) return;
      return apiClient.put(`/network/cables/${drawingCableTarget.id}/route`, {
        route: drawnRoutePoints,
      });
    },
    onSuccess: () => {
      toast.success('Jalur kabel berhasil disimpan!');
      setIsDrawingCable(false);
      setDrawingCableTarget(null);
      setDrawnRoutePoints([]);
      refetchMap();
      refetchUndrawn();
    },
    onError: () => {
      toast.error('Gagal menyimpan rute kabel');
    },
  });

  // Simpan Simpul Baru (ODP / ODC)
  const saveNewNodeMutation = useMutation({
    mutationFn: async () => {
      if (!isAddingNode || !newNodeName) return;
      if (isAddingNode === 'odp') {
        return apiClient.post('/network/odps', {
          name: newNodeName,
          code: newNodeCode || undefined,
          port_capacity: newNodeCapacity,
          latitude: draggablePos.lat,
          longitude: draggablePos.lng,
        });
      } else {
        return apiClient.post('/network/odcs', {
          name: newNodeName,
          code: newNodeCode || undefined,
          capacity_odp: newNodeCapacity,
          latitude: draggablePos.lat,
          longitude: draggablePos.lng,
        });
      }
    },
    onSuccess: () => {
      toast.success(`${isAddingNode === 'odp' ? 'ODP' : 'ODC'} berhasil ditambahkan!`);
      setIsAddingNode(null);
      setNewNodeName('');
      setNewNodeCode('');
      refetchMap();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menambahkan simpul');
    },
  });

  // Aktifkan Mode Gambar untuk Kabel Tertentu
  const startDrawingCable = (cable: any) => {
    setIsDrawingCable(true);
    setDrawingCableTarget(cable);
    setDrawnRoutePoints(cable.route || []);
    setActiveTab('map');
    toast.info(`Klik pada peta di sepanjang jalan untuk membentuk jalur kabel "${cable.name}".`);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex flex-col bg-background overflow-hidden">
      {/* 1. Header Toolbar Bar */}
      <div className="flex flex-wrap items-center justify-between p-3.5 border-b border-border bg-card z-10 gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              Peta Jaringan FTTH
              <Badge variant="outline" className="text-xs font-normal bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800">
                Leaflet &amp; Google Tiles
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Visualisasi topologi OLT, ODC, ODP dan jalur kabel area Bululawang
            </p>
          </div>
        </div>

        {/* Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pilihan Lapisan Peta Leaflet */}
          <div className="flex items-center rounded-md border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={() => toggleMapLayerMode('google-streets')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mapLayerMode === 'google-streets'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Google Maps
            </button>
            <button
              type="button"
              onClick={() => toggleMapLayerMode('google-satellite')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mapLayerMode === 'google-satellite'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Satelit
            </button>
            <button
              type="button"
              onClick={() => toggleMapLayerMode('osm')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mapLayerMode === 'osm'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OSM
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowGmapsGuide(true)}
            className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
            title="Petunjuk Integrasi API Google Maps"
          >
            <Info className="w-3.5 h-3.5 text-sky-500" />
            <span>Petunjuk Google Maps</span>
          </Button>

          {/* Tipe Simpul */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-border bg-background text-foreground"
          >
            <option value="all">Semua Simpul &amp; Kabel</option>
            <option value="olt">Server / OLT</option>
            <option value="odc">ODC (Kabinet)</option>
            <option value="odp">ODP (Distribusi)</option>
            <option value="cable">Kabel Jaringan</option>
          </select>

          {/* Status Simpul */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 px-3 text-xs rounded-md border border-border bg-background text-foreground"
          >
            <option value="all">Semua Status</option>
            <option value="normal">Normal</option>
            <option value="disrupted">Gangguan</option>
            <option value="cut">Putus</option>
          </select>

          {/* Tombol Aksi */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab(activeTab === 'map' ? 'undrawn' : 'map')}
            className="h-9 text-xs"
          >
            <Cable className="w-3.5 h-3.5 mr-1.5" />
            Jalur Belum Digambar ({undrawnCables?.length || 0})
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setIsAddingNode('odp');
              if (leafletMapRef.current) {
                const center = leafletMapRef.current.getCenter();
                setDraggablePos({ lat: center.lat, lng: center.lng });
              }
            }}
            className="h-9 text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Tambah ODP
          </Button>
        </div>
      </div>

      {/* 2. Map Container & Floating Panels */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Indicator saat Mode Gambar Kabel Aktif */}
        {isDrawingCable && (
          <div className="absolute top-4 left-4 z-20 bg-card/95 backdrop-blur border border-primary p-4 rounded-xl shadow-2xl max-w-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-primary" />
                Mode Menggambar Kabel
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsDrawingCable(false);
                  setDrawnRoutePoints([]);
                }}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Target: <strong className="text-foreground">{drawingCableTarget?.name}</strong>
            </p>
            <div className="bg-muted p-2 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span>Jumlah Titik:</span>
                <span className="font-semibold text-foreground">{drawnRoutePoints.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Panjang Jalur Terhitung:</span>
                <span className="font-bold text-primary">{currentDrawnLength.toLocaleString('id-ID')} meter</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDrawnRoutePoints((prev) => prev.slice(0, -1))}
                disabled={drawnRoutePoints.length === 0}
                className="flex-1 text-xs"
              >
                <Undo2 className="w-3.5 h-3.5 mr-1" />
                Undo Titik
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => saveCableRouteMutation.mutate()}
                disabled={drawnRoutePoints.length < 2 || saveCableRouteMutation.isPending}
                className="flex-1 text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                Simpan Jalur
              </Button>
            </div>
          </div>
        )}

        {/* Floating Dialog Tambah ODP / ODC baru */}
        {isAddingNode && (
          <div className="absolute top-4 right-4 z-20 bg-card/95 backdrop-blur border border-border p-4 rounded-xl shadow-2xl w-80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary" />
                Tambah {isAddingNode === 'odp' ? 'ODP Baru' : 'ODC Baru'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsAddingNode(null)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Geser pin penanda di peta ke lokasi tiang/titik yang tepat.
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-foreground">Nama Simpul</label>
                <Input
                  size="sm"
                  placeholder="Contoh: ODP-BLW-042"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground">Kapasitas Port</label>
                <select
                  value={newNodeCapacity}
                  onChange={(e) => setNewNodeCapacity(Number(e.target.value))}
                  className="w-full h-8 px-2 text-xs rounded-md border border-border bg-background mt-1"
                >
                  <option value={8}>8 Port</option>
                  <option value={16}>16 Port</option>
                  <option value={24}>24 Port</option>
                </select>
              </div>
              <div className="bg-muted p-2 rounded text-[11px] font-mono text-muted-foreground">
                Lat: {draggablePos.lat.toFixed(6)}, Lng: {draggablePos.lng.toFixed(6)}
              </div>
            </div>
            <Button
              size="sm"
              variant="default"
              className="w-full text-xs"
              disabled={!newNodeName || saveNewNodeMutation.isPending}
              onClick={() => saveNewNodeMutation.mutate()}
            >
              Simpan Simpul ke Peta
            </Button>
          </div>
        )}

        {/* Detail Drawer (Panel Kanan saat simpul/kabel diklik) */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-10 w-96 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-5 space-y-4 max-h-[calc(100%-2rem)] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <Badge
                  variant={
                    selectedNode.status === 'normal'
                      ? 'default'
                      : selectedNode.status === 'disrupted'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="mb-1 text-[10px] uppercase font-bold"
                >
                  {selectedNode.status || 'Normal'}
                </Badge>
                <h3 className="font-bold text-base text-foreground leading-snug">
                  {selectedNode.name || 'Detail Simpul'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Kode: <span className="font-mono text-foreground">{selectedNode.code || '-'}</span>
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedNode(null)}
                className="h-7 w-7 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Konten Spesifik ODP */}
            {selectedNode.nodeType === 'odp' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 bg-muted/50 p-2.5 rounded-xl text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Kapasitas Port:</span>
                    <strong className="text-sm text-foreground">{selectedNode.port_capacity || 8} Port</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Port Kosong:</span>
                    <strong className={`text-sm ${selectedNode.free_ports > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {selectedNode.free_ports ?? '-'} Port
                    </strong>
                  </div>
                </div>

                {/* Grid Port Visual */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                    <span>Status Utilisasi Port</span>
                    {loadingPorts && <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />}
                  </h4>
                  {odpPortsData?.ports ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {odpPortsData.ports.map((p) => (
                        <div
                          key={p.port_number}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            p.is_occupied
                              ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                              : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                          }`}
                          title={
                            p.customer
                              ? `Port ${p.port_number}: ${p.customer.name} (${p.customer.customer_code})`
                              : `Port ${p.port_number}: Tersedia`
                          }
                        >
                          <div className="text-[10px] font-bold">P{p.port_number}</div>
                          <div className="text-[9px] truncate">
                            {p.customer ? p.customer.name.split(' ')[0] : 'Kosong'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic text-center py-2">
                      Memuat daftar port...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Konten Spesifik ODC */}
            {selectedNode.nodeType === 'odc' && (
              <div className="space-y-2 text-xs">
                <div className="bg-muted/50 p-2.5 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kapasitas Distribusi:</span>
                    <strong className="text-foreground">{selectedNode.capacity_odp || 48} ODP</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wilayah Layanan:</span>
                    <strong className="text-foreground">{selectedNode.area || 'Bululawang'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Konten Spesifik Kabel */}
            {selectedNode.nodeType === 'cable' && (
              <div className="space-y-3 text-xs">
                <div className="bg-muted/50 p-2.5 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipe Kabel:</span>
                    <strong className="text-foreground">{selectedNode.cable_type || 'Drop / Feeder'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jumlah Core:</span>
                    <strong className="text-foreground">{selectedNode.core_count || 12} Core</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Panjang Rute:</span>
                    <strong className="text-foreground">
                      {selectedNode.length_meters
                        ? `${Number(selectedNode.length_meters).toLocaleString('id-ID')} m`
                        : 'Belum terukur'}
                    </strong>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => startDrawingCable(selectedNode)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Gambar / Ubah Jalur Kabel Ini
                </Button>
              </div>
            )}

            {/* Tombol Aksi Simpul */}
            <div className="pt-2 border-t border-border flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  setStatusModalNode(selectedNode);
                  setStatusModalOpen(true);
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Ubah Status
              </Button>
              <Button
                size="sm"
                variant="default"
                className="flex-1 text-xs"
                onClick={() => {
                  if (selectedNode.nodeType === 'odp') navigate('/network/odp');
                  else if (selectedNode.nodeType === 'odc') navigate('/network/nodes');
                  else navigate('/network/nodes');
                }}
              >
                Detail Master
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Panel Tab Daftar Kabel Belum Digambar */}
        {activeTab === 'undrawn' && (
          <div className="absolute top-4 left-4 z-10 w-96 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl p-5 space-y-4 max-h-[calc(100%-2rem)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Cable className="w-4 h-4 text-primary" />
                Kabel Belum Digambar ({undrawnCables?.length || 0})
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveTab('map')}
                className="h-7 w-7 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Daftar segmen kabel fiber yang belum memiliki koordinat jalur di peta.
            </p>
            <div className="space-y-2">
              {undrawnCables && undrawnCables.length > 0 ? (
                undrawnCables.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-border bg-background hover:border-primary/50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-semibold text-foreground">{c.name}</strong>
                      <Badge variant="outline" className="text-[10px]">
                        {c.core_count || 12} Core
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground space-y-0.5">
                      <div>Dari: {c.source_node_name || 'ODC'}</div>
                      <div>Ke: {c.target_node_name || 'ODP'}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full text-xs h-7"
                      onClick={() => startDrawingCable(c)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Mulai Gambar Jalur Ini
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Semua kabel sudah memiliki jalur di peta.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Petunjuk Integrasi Google Maps API */}
      <Dialog open={showGmapsGuide} onOpenChange={setShowGmapsGuide}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-500" />
              <span>Petunjuk Integrasi Google Maps API</span>
            </DialogTitle>
            <DialogDescription>
              Fibermedia-Ops mendukung dua opsi penggunaan Google Maps untuk pemetaan jaringan FTTH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs text-foreground mt-2">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Opsi A: Tile Layer Leaflet Langsung (Gratis &amp; Aktif)</span>
              </div>
              <p className="text-muted-foreground">
                Tombol <strong>Google Maps</strong> dan <strong>Google Satelit</strong> di bilah atas sudah aktif langsung menggunakan tile resmi Google tanpa memerlukan billing atau API Key.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 space-y-2">
              <div className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Opsi B: Menggunakan Google Maps SDK Resmi (GCP API Key)</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Buka <strong>Google Cloud Console</strong> &amp; buat proyek baru.</li>
                <li>Aktifkan <strong>Maps JavaScript API</strong> di Library API.</li>
                <li>Buat API Key di menu <strong>Credentials</strong>, beri pembatasan domain <code>http://fibermedia-ops.test/*</code>.</li>
                <li>Tambahkan baris berikut di file <code>.env</code> Anda:
                  <pre className="mt-1 p-2 rounded bg-muted font-mono text-[11px] text-foreground">VITE_GOOGLE_MAPS_API_KEY=AIzaSy...</pre>
                </li>
                <li>CSP backend di <code>routes/web.php</code> sudah disiapkan untuk mengizinkan domain Google Maps.</li>
              </ol>
            </div>

            <div className="text-[11px] text-muted-foreground italic border-t border-border pt-2">
              Panduan lengkap beserta contoh kode implementasi Leaflet dapat dilihat pada file dokumentasi: <code className="text-primary font-mono">docs/google-maps-setup.md</code>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Ubah Status & Pratinjau Dampak */}
      <NodeStatusChangeModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        node={statusModalNode}
        onSuccess={() => {
          refetchMap();
          if (selectedNode && statusModalNode && selectedNode.id === statusModalNode.id) {
            setSelectedNode((prev: any) =>
              prev ? { ...prev, status: statusModalNode.status } : null
            );
          }
        }}
      />
    </div>
  );
};
