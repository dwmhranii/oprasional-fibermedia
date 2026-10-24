import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquareWarning,
  Plus,
  Clock,
  Wrench,
  PauseCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAdminComplaints, useComplaintStats } from '../../hooks/useComplaints';
import { ComplaintFilterBar } from './ComplaintFilterBar';
import { ComplaintList } from './ComplaintList';
import type { ComplaintFilters } from '../../types/complaint';

export const ComplaintDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ComplaintFilters>({ page: 1, per_page: 10 });

  const { data: statsData, isLoading: isLoadingStats } = useComplaintStats();
  const { data: complaintsData, isLoading: isLoadingList, refetch } = useAdminComplaints(filters);

  const stats = statsData || {
    total: 0,
    open: 0,
    assigned: 0,
    in_progress: 0,
    pending_customer: 0,
    resolved: 0,
    resolved_today: 0,
    closed: 0,
    sla_breached: 0,
    avg_resolve_hours: 0,
  };

  const handleStatCardClick = (statusKey?: string, isBreached?: boolean) => {
    if (isBreached) {
      setFilters((prev) => ({ ...prev, status: undefined, sla_breached: true, page: 1 }));
    } else {
      setFilters((prev) => ({ ...prev, status: statusKey, sla_breached: undefined, page: 1 }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Manajemen Pengaduan Pelanggan
              </h1>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Pencatatan dari WhatsApp, penugasan teknisi otomatis (Round Robin), dan tracking SLA
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-9 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Muat Ulang
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/admin/complaints/new')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            ＋ Buat Tiket Baru
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tiket Baru (Open) */}
        <div
          onClick={() => handleStatCardClick('open')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Tiket Baru (Open)</span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.open}</span>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">belum ditugaskan</span>
          </div>
        </div>

        {/* Card 2: Dikerjakan (In Progress) */}
        <div
          onClick={() => handleStatCardClick('in_progress')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Sedang Dikerjakan</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.in_progress}</span>
            <span className="text-[11px] text-gray-400 dark:text-slate-500">di tangan teknisi</span>
          </div>
        </div>

        {/* Card 3: Pending Pelanggan */}
        <div
          onClick={() => handleStatCardClick('pending_customer')}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Pending Pelanggan</span>
            <div className="p-1.5 bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 rounded-lg">
              <PauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending_customer}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">SLA dijeda</span>
          </div>
        </div>

        {/* Card 4: SLA Breached */}
        <div
          onClick={() => handleStatCardClick(undefined, true)}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer hover:shadow-sm transition-all ${
            stats.sla_breached > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60 text-rose-950 dark:text-rose-200 hover:border-rose-400'
              : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">SLA Breached</span>
            <div className="p-1.5 bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900 dark:text-rose-200">{stats.sla_breached}</span>
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">melewati batas waktu</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <ComplaintFilterBar
        filters={filters}
        onFilterChange={(newFilters) => setFilters(newFilters)}
      />

      {/* Data Table */}
      <ComplaintList
        complaints={complaintsData?.data || []}
        isLoading={isLoadingList}
        total={complaintsData?.total || 0}
        currentPage={filters.page || 1}
        perPage={filters.per_page || 10}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        onRefresh={() => refetch()}
      />
    </div>
  );
};
