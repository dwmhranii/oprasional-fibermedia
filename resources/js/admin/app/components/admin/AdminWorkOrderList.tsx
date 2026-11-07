import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { workOrderService } from '../../lib/workOrderService';
import type { 
  WorkOrderItem, 
  WorkOrderPriority, 
  WorkOrderTab, 
  WorkOrderCounts 
} from '../../types/workOrder';
import { formatDate } from '../../lib/formatters';
import { apiClient } from '../../lib/api';
import { 
  Layers, 
  Search, 
  RotateCw, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  Users, 
  CheckCircle2, 
  Eye, 
  Radio,
  Calendar,
  Sparkles,
  Inbox
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SlaCountdown } from '../complaints/SlaCountdown';
import { UnifiedTicketDetailModal } from '../common/UnifiedTicketDetailModal';

const AutoReassignCountdown: React.FC<{ dueAt: string }> = ({ dueAt }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; isExpired: boolean }>({
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculate = () => {
      const diffMs = new Date(dueAt).getTime() - Date.now();
      if (diffMs <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, isExpired: true });
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const minutes = Math.floor(totalSecs / 60);
        const seconds = totalSecs % 60;
        setTimeLeft({ minutes, seconds, isExpired: false });
      }
    };
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [dueAt]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shadow-xs">
        <Clock className="w-3 h-3 text-rose-500 animate-pulse" />
        Waktu habis (oper otomatis)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-xs">
      <Clock className="w-3 h-3 text-amber-500" />
      Oper: {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
    </span>
  );
};

export const AdminWorkOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkOrderTab>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'psb' | 'complaint'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal detail
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<{ type: 'psb' | 'complaint'; id: number } | null>(null);

  // Teams list
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['admin', 'teams-selection'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/teams');
      return Array.isArray(res) ? res : (res?.data || []);
    },
    staleTime: 60000,
  });

  const { data, isLoading, isFetching, refetch } = useQuery<{
    data: WorkOrderItem[];
    counts: WorkOrderCounts;
    total: number;
  }>({
    queryKey: ['admin', 'work-orders', activeTab, teamFilter, typeFilter, dateFilter, searchQuery],
    queryFn: () => workOrderService.getAdminWorkOrders({
      tab: activeTab,
      team: teamFilter,
      type: typeFilter,
      date: dateFilter,
      search: searchQuery,
    }),
    refetchInterval: 15000,
  });

  const workOrders = data?.data || [];
  const counts: WorkOrderCounts = data?.counts || {
    all: 0,
    unassigned: 0,
    waiting_acceptance: 0,
    in_progress: 0,
    needs_review: 0,
    completed: 0,
  };

  const tabs: { key: WorkOrderTab; label: string; count: number }[] = [
    { key: 'all', label: 'Semua', count: counts.all },
    { key: 'unassigned', label: 'Belum Ditugaskan', count: counts.unassigned },
    { key: 'waiting_acceptance', label: 'Menunggu Diterima', count: counts.waiting_acceptance },
    { key: 'in_progress', label: 'Dikerjakan', count: counts.in_progress },
    { key: 'needs_review', label: 'Perlu Ditinjau', count: counts.needs_review },
    { key: 'completed', label: 'Selesai', count: counts.completed },
  ];

  const getPriorityBadge = (priority: WorkOrderPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            CRITICAL
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: string, tabCat?: string) => {
    const s = (status || '').toLowerCase();
    if (tabCat === 'unassigned' || s === 'unassigned' || s === 'pending') {
      return (
        <Badge className="bg-slate-600 text-white border-0 font-bold text-[10px]">
          Belum Ditugaskan
        </Badge>
      );
    }
    if (tabCat === 'waiting_acceptance' || s === 'assigned') {
      return (
        <Badge className="bg-amber-600 text-white border-0 font-bold text-[10px] animate-pulse">
          Menunggu Diterima
        </Badge>
      );
    }
    switch (s) {
      case 'in_progress':
        return (
          <Badge className="bg-indigo-600 text-white border-0 font-semibold text-[10px]">
            Sedang Dikerjakan
          </Badge>
        );
      case 'on_the_way':
        return (
          <Badge className="bg-sky-600 text-white border-0 font-semibold text-[10px]">
            OTW Lokasi
          </Badge>
        );
      case 'phase_1_done':
      case 'phase_1_submitted':
        return (
          <Badge className="bg-purple-600 text-white border-0 font-semibold text-[10px]">
            Tahap 1 Submitted
          </Badge>
        );
      case 'completed':
      case 'approved':
      case 'phase_2_complete':
      case 'resolved':
        return (
          <Badge className="bg-emerald-600 text-white border-0 font-semibold text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Selesai
          </Badge>
        );
      case 'returned':
        return (
          <Badge className="bg-rose-600 text-white border-0 font-semibold text-[10px]">
            Returned
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-semibold text-gray-700 text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  const handleRowClick = (wo: WorkOrderItem) => {
    setSelectedTicket({
      type: wo.type,
      id: wo.raw_id,
    });
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner - Strict Read-only Monitoring, NO Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Work Order (Pantau)
            </h1>
          </div>
          <p className="text-xs text-gray-500">
            Daftar gabungan pengaduan gangguan dan pasang baru (PSB) lintas tim teknisi. Hanya baca; klik baris untuk membuka detail tiket dan kontrol penugasan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/network/map')}
            className="text-xs h-9 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-bold"
          >
            <Radio className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Peta Komando
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-9"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Tab Navigation Toolbar (6 Tabs Sesuai Spesifikasi TAMBAHAN Tahap 2) */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar: Jenis, Tim, Tanggal, Pencarian */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tiket, pelanggan, alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Jenis Pekerjaan</option>
              <option value="psb">Pasang Baru (PSB)</option>
              <option value="complaint">Gangguan (Komplain)</option>
            </select>
          </div>

          {/* Team Filter */}
          <div>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Tim Teknisi</option>
              {teams.map((t: any) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Tipe & Tiket</th>
                <th className="py-3 px-4">Pelanggan & Lokasi</th>
                <th className="py-3 px-4">Tim Bertugas</th>
                <th className="py-3 px-4">Prioritas & SLA</th>
                <th className="py-3 px-4">Status & Hitung Mundur</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Memuat data antrean work order...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 space-y-2">
                    <Inbox className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="font-semibold text-gray-600">
                      {activeTab === 'needs_review'
                        ? 'Tab Perlu Ditinjau belum tersedia sampai Fase 3.'
                        : 'Tidak ada data work order pada kriteria filter ini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => {
                  const isPsb = wo.type === 'psb';

                  return (
                    <tr
                      key={wo.id}
                      onClick={() => handleRowClick(wo)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                    >
                      {/* Ticket & Type */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPsb 
                              ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isPsb ? <Wrench className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {isPsb ? 'PSB' : 'Komplain'}
                          </span>
                          <p className="font-mono font-bold text-gray-900 text-xs">
                            {wo.ticket_number || wo.id}
                          </p>
                          <span className="text-[10px] text-gray-400 block">
                            {formatDate(wo.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Customer & Address */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-gray-900">{wo.customer_name}</p>
                          <p className="text-gray-500 font-mono text-[11px]">{wo.customer_phone}</p>
                          <p className="text-gray-600 text-[11px] line-clamp-2 leading-relaxed">
                            {wo.customer_address}
                          </p>
                          {wo.area && (
                            <span className="text-[10px] text-gray-400 font-medium">Area: {wo.area}</span>
                          )}
                        </div>
                      </td>

                      {/* Team */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                          <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{wo.assigned_team || 'Belum Ditugaskan'}</span>
                        </div>
                      </td>

                      {/* Priority & SLA */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          <div>{getPriorityBadge(wo.priority)}</div>
                          {wo.sla_due_at && (
                            <div className="text-[10px] bg-slate-50 p-1 rounded border inline-block">
                              <SlaCountdown
                                dueAt={wo.sla_due_at}
                                isResolved={wo.status === 'completed' || wo.status === 'approved' || wo.status === 'resolved'}
                                isBreached={wo.is_sla_breached}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status & Auto Reassign Countdown */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          <div>{getStatusBadge(wo.status, wo.tab_category)}</div>
                          {wo.auto_reassign_due_at && (
                            <div>
                              <AutoReassignCountdown dueAt={wo.auto_reassign_due_at} />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(wo);
                          }}
                          className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Ticket Detail Modal (5 Tabs: Ringkasan, Penugasan, Pekerjaan, Bukti, Riwayat) */}
      {selectedTicket && (
        <UnifiedTicketDetailModal
          open={detailModalOpen}
          onOpenChange={(open) => {
            setDetailModalOpen(open);
            if (!open) {
              setSelectedTicket(null);
              refetch();
            }
          }}
          ticketType={selectedTicket.type}
          ticketId={selectedTicket.id}
        />
      )}
    </div>
  );
};

export default AdminWorkOrderList;
