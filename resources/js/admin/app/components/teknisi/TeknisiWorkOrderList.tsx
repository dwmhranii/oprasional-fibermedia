import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { workOrderService } from '../../lib/workOrderService';
import type { WorkOrderItem, WorkOrderType, WorkOrderPriority } from '../../types/workOrder';
import { formatDate } from '../../lib/formatters';
import { 
  Layers, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Search, 
  Filter, 
  ArrowRight, 
  ExternalLink, 
  ShieldAlert, 
  Sparkles, 
  RotateCw, 
  Compass, 
  CheckCircle,
  FileCheck,
  User,
  Users
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { SlaCountdown } from '../complaints/SlaCountdown';

export const TeknisiWorkOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'all' | 'psb' | 'complaint'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: workOrders = [], isLoading, isFetching, isError, error, refetch } = useQuery<WorkOrderItem[]>({
    queryKey: ['teknisi', 'work-orders', typeFilter, statusFilter, searchQuery],
    queryFn: () => workOrderService.getTeknisiWorkOrders({
      type: typeFilter,
      status: statusFilter,
      search: searchQuery,
    }),
    refetchInterval: 30000, // Background refresh every 30 seconds
  });

  // Calculate quick metrics
  const activeCount = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'approved' && wo.status !== 'cancelled').length;
  const psbCount = workOrders.filter(wo => wo.type === 'psb').length;
  const complaintCount = workOrders.filter(wo => wo.type === 'complaint').length;
  const criticalCount = workOrders.filter(wo => wo.priority === 'critical' && wo.status !== 'completed').length;

  const getPriorityBadge = (priority: WorkOrderPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'in_progress':
        return (
          <Badge className="bg-amber-500 text-white border-0 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            Sedang Dikerjakan
          </Badge>
        );
      case 'on_the_way':
        return (
          <Badge className="bg-indigo-600 text-white border-0 font-semibold flex items-center gap-1">
            <Compass className="w-3 h-3" />
            Menuju Lokasi (OTW)
          </Badge>
        );
      case 'assigned':
        return (
          <Badge className="bg-blue-600 text-white border-0 font-semibold">
            Tugas Baru Ditugaskan
          </Badge>
        );
      case 'phase_1_done':
      case 'phase_1_submitted':
        return (
          <Badge className="bg-sky-600 text-white border-0 font-semibold">
            Tahap 1 Selesai (Tim)
          </Badge>
        );
      case 'completed':
      case 'approved':
      case 'phase_2_complete':
        return (
          <Badge className="bg-emerald-600 text-white border-0 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Selesai
          </Badge>
        );
      case 'returned':
        return (
          <Badge className="bg-rose-600 text-white border-0 font-semibold">
            Perlu Perbaikan (Returned)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-semibold text-gray-700">
            {status}
          </Badge>
        );
    }
  };

  const handleOpenDetail = (wo: WorkOrderItem) => {
    if (wo.type === 'psb') {
      navigate(`/teknisi/tasks/${wo.raw_id}`);
    } else {
      navigate(`/teknisi/complaints/${wo.raw_id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 shadow-xl border border-indigo-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold backdrop-blur-md border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Satu Pintu Pekerjaan Lapangan (Unified FSM)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-indigo-400" />
              My Work Orders
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Seluruh antrean tugas instalasi pasang baru (PSB) dan perbaikan komplain gangguan Anda telah disatukan dan diurutkan secara otomatis berdasarkan skala prioritas & SLA.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs h-9 backdrop-blur-sm"
            >
              <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh Feed
            </Button>
          </div>
        </div>

        {/* Quick KPI Stats Ribbon */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 text-xs block">Tugas Aktif</span>
            <span className="text-2xl font-black text-white">{activeCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 text-xs block">Pasang Baru (PSB)</span>
            <span className="text-2xl font-black text-sky-400">{psbCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 text-xs block">Gangguan (Komplain)</span>
            <span className="text-2xl font-black text-amber-400">{complaintCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 text-xs block">Prioritas Kritis</span>
            <span className="text-2xl font-black text-rose-400">{criticalCount}</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Type Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Work Order Type Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              Semua Pekerjaan
            </button>
            <button
              onClick={() => setTypeFilter('psb')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                typeFilter === 'psb'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Pasang Baru (PSB)
            </button>
            <button
              onClick={() => setTypeFilter('complaint')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                typeFilter === 'complaint'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Gangguan (Komplain)
            </button>
          </div>

          {/* Status Segment */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Tugas Aktif (Perlu Dikerjakan)</option>
              <option value="completed">Riwayat Selesai</option>
              <option value="all">Semua Status</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan nomor tiket, nama pelanggan, alamat, atau nomor telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Work Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse border border-gray-200 dark:border-slate-700" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">Gagal Memuat Antrean Work Order</h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
            {(error as any)?.message || 'Terjadi gangguan saat mengambil data dari server.'}
          </p>
          <Button
            size="sm"
            onClick={() => refetch()}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 font-bold"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            Coba Muat Ulang
          </Button>
        </div>
      ) : workOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">Tidak ada pekerjaan lapangan saat ini</h3>
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto">
            Semua tugas Anda telah selesai dikerjakan atau belum ada penugasan baru dari tim dispatcher/admin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {workOrders.map((wo) => {
            const isPsb = wo.type === 'psb';
            const isCritical = wo.priority === 'critical';
            const isInProgress = wo.status === 'in_progress';

            return (
              <Card 
                key={wo.id}
                className={`transition-all duration-200 hover:shadow-md border-l-4 ${
                  isCritical 
                    ? 'border-l-rose-500 bg-rose-50/20' 
                    : isInProgress
                    ? 'border-l-amber-500 bg-amber-50/20'
                    : isPsb 
                    ? 'border-l-sky-500' 
                    : 'border-l-indigo-500'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Header: Type Badge, Ticket, Priority & SLA */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        isPsb 
                          ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}>
                        {isPsb ? <Wrench className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {wo.type_label || (isPsb ? 'Pasang Baru (PSB)' : 'Gangguan (Komplain)')}
                      </span>

                      <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                        {wo.ticket_number || wo.id}
                      </span>

                      {getPriorityBadge(wo.priority)}
                      {getStatusBadge(wo.status)}
                    </div>

                    {/* SLA countdown if present */}
                    {wo.sla_due_at && (
                      <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-gray-500 text-[11px]">SLA:</span>
                        <SlaCountdown
                          dueAt={wo.sla_due_at}
                          isResolved={wo.status === 'completed' || wo.status === 'approved'}
                          isBreached={wo.is_sla_breached}
                        />
                      </div>
                    )}
                  </div>

                  {/* Main Work Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Col 1 & 2: Title, Customer, Address */}
                    <div className="md:col-span-2 space-y-2">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                        {wo.title}
                      </h4>
                      
                      <div className="space-y-1 text-gray-700 dark:text-slate-300">
                        <div className="flex items-center gap-2 font-medium">
                          <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-semibold text-gray-900 dark:text-white">{wo.customer_name}</span>
                          <span className="text-gray-400">•</span>
                          <span className="font-mono text-gray-600 dark:text-slate-400">{wo.customer_phone}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="leading-relaxed text-gray-800 dark:text-slate-200">{wo.customer_address}</p>
                            {wo.area && (
                              <span className="text-[11px] text-gray-400 font-medium">Area: {wo.area}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Col 3: Two-Phase & Assignment Status */}
                    <div className="space-y-2 bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1.5">
                          <span>Progress 2-Fase</span>
                          {wo.assigned_team && (
                            <span className="flex items-center gap-1 text-indigo-600 font-bold">
                              <Users className="w-3 h-3" /> {wo.assigned_team}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <FileCheck className="w-3.5 h-3.5 text-sky-600" />
                              Tahap 1 (Tim):
                            </span>
                            <span className={`font-bold ${wo.phase_1_done ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {wo.phase_1_done ? '✓ Selesai' : 'Menunggu'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-purple-600" />
                              Tahap 2 (Individu):
                            </span>
                            <span className={`font-bold ${wo.phase_2_done ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {wo.phase_2_done ? '✓ Selesai' : 'Menunggu'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-200 dark:border-slate-700">
                        Ditugaskan: {formatDate(wo.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {wo.customer_phone && (
                        <a
                          href={`https://wa.me/${wo.customer_phone.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Chat WhatsApp
                        </a>
                      )}

                      {wo.coordinates && wo.coordinates.lat && wo.coordinates.lng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${wo.coordinates.lat},${wo.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          Navigasi GPS
                        </a>
                      )}
                    </div>

                    <Button
                      onClick={() => handleOpenDetail(wo)}
                      className={`text-xs h-9 px-4 font-bold shadow-xs ${
                        isPsb 
                          ? 'bg-sky-600 hover:bg-sky-700 text-white' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      Buka Pengerjaan
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
