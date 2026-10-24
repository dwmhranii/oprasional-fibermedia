import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Server,
  Layers,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ValidationQueue } from './ValidationQueue';
import { ProvisioningManagement } from './ProvisioningManagement';
import { apiClient } from '../../lib/api';

interface ProvisioningValidationHubProps {
  defaultTab?: 'validation' | 'provisioning';
}

export const ProvisioningValidationHub: React.FC<ProvisioningValidationHubProps> = ({
  defaultTab = 'validation',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Determine active tab from URL query params or prop default
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (tabParam === 'validation' || tabParam === 'provisioning') {
      return tabParam;
    }
    return defaultTab;
  });

  // Sync state if URL query param changes
  useEffect(() => {
    if (tabParam === 'validation' || tabParam === 'provisioning') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // 1. Fetch pending validation count for tab badge
  const { data: validationStats } = useQuery({
    queryKey: ['adminSubmissions', 'stats', 'pending', 'hub'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/admin/submissions?status=pending&per_page=1');
        return res?.meta?.total ?? 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000,
  });

  // 2. Fetch active provisioning count for tab badge
  const { data: provisioningStats } = useQuery({
    queryKey: ['adminProvisionings', 'stats', 'active', 'hub'],
    queryFn: async () => {
      try {
        const res = await apiClient.get<any>('/admin/provisionings?status=in_progress&per_page=1');
        return res?.meta?.total ?? 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-8 pointer-events-none">
          <Layers className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Siklus Pemasangan Sambungan Baru (PSB)
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Validasi Pengajuan & Manajemen Provisioning
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Pusat alur terpadu untuk memeriksa kelayakan berkas pelanggan baru, melakukan verifikasi persetujuan,
              serta mengeksekusi provisi akun jaringan dan sinkronisasi server BFASS/NAS.
            </p>
          </div>
        </div>
      </div>

      {/* Unified Tab Switcher Container */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <TabsList className="grid grid-cols-2 w-full sm:w-auto min-w-[340px] md:min-w-[420px] bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-auto">
            {/* TAB 1: Antrean Validasi */}
            <TabsTrigger
              value="validation"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs md:text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-sm text-slate-600 dark:text-slate-300"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>1. Antrean Validasi</span>
              {typeof validationStats === 'number' && validationStats > 0 && (
                <Badge className="ml-1 bg-amber-500 hover:bg-amber-500 text-white text-[10px] h-4 px-1.5 font-bold">
                  {validationStats}
                </Badge>
              )}
            </TabsTrigger>

            {/* TAB 2: Manajemen Provisioning */}
            <TabsTrigger
              value="provisioning"
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs md:text-sm font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-slate-600 dark:text-slate-300"
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>2. Manajemen Provisioning</span>
              {typeof provisioningStats === 'number' && provisioningStats > 0 && (
                <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-white text-[10px] h-4 px-1.5 font-bold">
                  {provisioningStats}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Quick Flow Hint */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-3">
            <span className="font-medium">Alur Otomatis:</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
              Disetujui di Validasi
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
              Masuk Provisi Jaringan
            </span>
          </div>
        </div>

        {/* TAB CONTENT 1: Antrean Validasi */}
        <TabsContent value="validation" className="mt-0 focus-visible:outline-none">
          <ValidationQueue isEmbedded={true} />
        </TabsContent>

        {/* TAB CONTENT 2: Manajemen Provisioning */}
        <TabsContent value="provisioning" className="mt-0 focus-visible:outline-none">
          <ProvisioningManagement isEmbedded={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
