import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { CableRouteDrawer } from '../maps/CableRouteDrawer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Route,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Scissors,
  Plus,
  RefreshCw,
  Search,
  Activity,
  Globe,
} from 'lucide-react';

export const NetworkCableManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'draw' | 'list'>('draw');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: cableTracks, isLoading, refetch } = useQuery({
    queryKey: ['cableTracks'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/cable-tracks');
      return res?.data || (Array.isArray(res) ? res : []);
    },
  });

  const filteredTracks = (cableTracks || []).filter((track: any) => {
    const matchesStatus = statusFilter === 'all' || (track.operational_status || 'normal') === statusFilter;
    const matchesSearch =
      !searchQuery ||
      track.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Route className="w-7 h-7 text-indigo-600" />
            Pemetaan & Jalur Kabel Jaringan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Penggambaran jalur kabel manual & bantuan ikuti jalan, pemantauan status kabel, dan citra satelit berlisensi.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('draw')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'draw'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Kanvas Gambar Kabel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'list'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Daftar Jalur Kabel ({cableTracks?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab 1: Kanvas Gambar */}
      {activeTab === 'draw' && (
        <CableRouteDrawer
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['cableTracks'] });
          }}
        />
      )}

      {/* Tab 2: Daftar Kabel */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama kabel atau catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Semua Status Operasional</option>
                  <option value="normal">Normal</option>
                  <option value="disrupted">Terganggu (Disrupted)</option>
                  <option value="cut">Putus (Cut)</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* List Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track: any) => {
              const status = track.operational_status || 'normal';
              const isCut = status === 'cut';
              const isDisrupted = status === 'disrupted';

              return (
                <Card
                  key={track.id}
                  className={`border transition-all hover:shadow-md ${
                    isCut
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                      : isDisrupted
                      ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {track.name}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={
                          isCut
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : isDisrupted
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }
                      >
                        {status.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-slate-500">
                      Direkam oleh: {track.creator?.name || 'Sistem / HP Teknisi'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>Panjang Kabel:</span>
                      <strong className="text-slate-900 dark:text-slate-100">
                        {track.total_length_meters ? `${track.total_length_meters} meter` : '-'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>Jumlah Titik Koordinat:</span>
                      <strong>{track.coordinates?.length || track.simplified_points_count || 0} titik</strong>
                    </div>

                    {track.connected_odc && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span>ODC Terhubung:</span>
                        <strong className="text-indigo-600">{track.connected_odc.code}</strong>
                      </div>
                    )}

                    {track.notes && (
                      <p className="text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-xs italic">
                        "{track.notes}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {filteredTracks.length === 0 && !isLoading && (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
                <Route className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold">Belum ada data jalur kabel.</p>
                <p className="text-xs mt-1">Gunakan tab "Kanvas Gambar Kabel" untuk mulai menggambar jalur kabel jaringan.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
