import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, Clock, Users, ArrowRight, ShieldAlert } from 'lucide-react';

interface ShortcutItem {
  title: string;
  count: number;
  route: string;
  available: boolean;
}

interface ShortcutsResponse {
  success: boolean;
  data: {
    unassigned_complaints?: ShortcutItem;
    isolated_customers?: ShortcutItem;
    ready_teams?: ShortcutItem;
  };
}

export const DashboardShortcutCards: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<ShortcutsResponse>({
    queryKey: ['dashboardShortcuts'],
    queryFn: async () => {
      return await apiClient.get<ShortcutsResponse>('/dashboard/shortcuts');
    },
    refetchInterval: 15000,
  });

  const shortcutsData =
    (data as any)?.unassigned_complaints !== undefined
      ? (data as any)
      : (data as any)?.data;

  if (isLoading || !shortcutsData) {
    return null;
  }

  const { unassigned_complaints, isolated_customers, ready_teams } = shortcutsData;

  const cards = [
    {
      key: 'unassigned',
      item: unassigned_complaints,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      colorClass: 'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    },
    {
      key: 'isolated',
      item: isolated_customers,
      icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
      colorClass: 'border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
    },
    {
      key: 'ready_teams',
      item: ready_teams,
      icon: <Users className="w-5 h-5 text-emerald-500" />,
      colorClass: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    },
  ].filter((c) => c.item && c.item.available);

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map(({ key, item, icon, colorClass, badgeClass }) => {
        if (!item) return null;
        return (
          <Card
            key={key}
            onClick={() => navigate(item.route)}
            className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] border ${colorClass}`}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {item.title}
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {item.count}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={badgeClass}>Buka</Badge>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
