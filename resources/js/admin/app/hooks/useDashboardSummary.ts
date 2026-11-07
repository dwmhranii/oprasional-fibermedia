import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useEcho } from '../providers/EchoProvider';
import type { DashboardPeriod, DashboardSummaryData } from '../types/dashboard';

interface UseDashboardSummaryOptions {
  initialPeriod?: DashboardPeriod;
}

export function useDashboardSummary(options: UseDashboardSummaryOptions = {}) {
  const [period, setPeriod] = useState<DashboardPeriod>(options.initialPeriod || 'today');
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { echo } = useEcho();

  // Primary Query with automatic caching and graceful error isolation
  const queryKey = ['dashboardSummary', period];

  const query = useQuery<DashboardSummaryData>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<any>(`/dashboard/summary?period=${period}`);
      return (response?.data || response) as DashboardSummaryData;
    },
    staleTime: 30000, // 30s stale time aligned with backend cache
    refetchInterval: isLiveConnected ? false : 60000, // 60s fallback polling if Echo disconnected
    refetchOnWindowFocus: true,
  });

  // Echo / Reverb subscription
  useEffect(() => {
    if (!echo) {
      setIsLiveConnected(false);
      return;
    }

    try {
      const channel = echo.private('admins');

      setIsLiveConnected(true);

      const handleUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      };

      channel
        .listen('.TicketDispatched', handleUpdate)
        .listen('.ComplaintCreated', handleUpdate)
        .listen('.ComplaintStatusUpdated', handleUpdate)
        .listen('.DailyAttendanceCreated', handleUpdate)
        .listen('.DailyAttendanceUpdated', handleUpdate)
        .listen('.NetworkStatusChanged', handleUpdate);

      return () => {
        try {
          channel.stopListening('.TicketDispatched');
          channel.stopListening('.ComplaintCreated');
          channel.stopListening('.ComplaintStatusUpdated');
          channel.stopListening('.DailyAttendanceCreated');
          channel.stopListening('.DailyAttendanceUpdated');
          channel.stopListening('.NetworkStatusChanged');
        } catch {
          // ignore cleanup issues
        }
      };
    } catch {
      setIsLiveConnected(false);
    }
  }, [echo, queryClient]);

  const forceReload = useCallback(async () => {
    try {
      const response = await apiClient.get<any>(`/dashboard/summary?period=${period}&refresh=1`);
      queryClient.setQueryData(queryKey, response?.data || response);
    } catch {
      query.refetch();
    }
  }, [period, queryKey, queryClient, query]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: forceReload,
    period,
    setPeriod,
    isLiveConnected,
  };
}
