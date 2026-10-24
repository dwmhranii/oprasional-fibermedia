import { ALL_MALANG_DISTRICTS } from '../../data/malangRegions';
import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAreas } from '../../hooks/useComplaints';
import type { ComplaintFilters, ComplaintStatus, ComplaintPriority } from '../../types/complaint';

interface ComplaintFilterBarProps {
  filters: ComplaintFilters;
  onFilterChange: (newFilters: ComplaintFilters) => void;
  areas?: string[];
  hideStatus?: boolean;
  className?: string;
}

const DEFAULT_AREAS = ALL_MALANG_DISTRICTS;

export const ComplaintFilterBar: React.FC<ComplaintFilterBarProps> = ({
  filters,
  onFilterChange,
  areas: propAreas,
  hideStatus = false,
  className = '',
}) => {
  const { data: fetchedAreas } = useAreas();
  const areas = propAreas || fetchedAreas || DEFAULT_AREAS;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value, page: 1 });
  };

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: status || undefined, page: 1 });
  };

  const handlePriorityChange = (priority: string) => {
    onFilterChange({ ...filters, priority: priority || undefined, page: 1 });
  };

  const handleAreaChange = (area: string) => {
    onFilterChange({ ...filters, area: area || undefined, page: 1 });
  };

  const handleReset = () => {
    onFilterChange({ page: 1 });
  };

  const hasActiveFilters = Boolean(
    filters.search || filters.status || filters.priority || filters.area
  );

  return (
    <div className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={filters.search || ''}
            onChange={handleSearch}
            placeholder="Cari tiket, pelanggan, no HP..."
            className="pl-9 text-xs h-9 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Status Filter */}
        {!hideStatus && (
          <div>
            <select
              value={filters.status || ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full text-xs h-9 rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-gray-700 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="open">Baru (Open)</option>
              <option value="assigned">Ditugaskan</option>
              <option value="in_progress">Dikerjakan</option>
              <option value="pending_customer">Pending Pelanggan</option>
              <option value="resolved">Selesai Teknisi</option>
              <option value="closed">Ditutup (Closed)</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="reopened">Dibuka Kembali</option>
            </select>
          </div>
        )}

        {/* Priority Filter */}
        <div>
          <select
            value={filters.priority || ''}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="w-full text-xs h-9 rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-gray-700 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Prioritas</option>
            <option value="low">Rendah (Low)</option>
            <option value="medium">Sedang (Medium)</option>
            <option value="high">Tinggi (High)</option>
            <option value="critical">Kritis (Critical)</option>
          </select>
        </div>

        {/* Area Filter */}
        <div>
          <select
            value={filters.area || ''}
            onChange={(e) => handleAreaChange(e.target.value)}
            className="w-full text-xs h-9 rounded-md border border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-gray-700 dark:text-slate-200 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Semua Wilayah</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-slate-800">
          <span className="text-[11px] text-gray-500 dark:text-slate-400">
            Filter aktif diterapkan
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset Filter
          </Button>
        </div>
      )}
    </div>
  );
};
