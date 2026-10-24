import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Notification } from '../types/notification';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const getNotifications = async (): Promise<Notification[]> => {
    const response = await apiClient.get<any>('/notifications');
    return response.data || [];
  };

  const { data: notifications = [], isLoading, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 10000, // Automatic polling to GET /api/notifications every 10 seconds
    refetchOnWindowFocus: true, // Auto refetch when user opens/focuses the window
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications,
    isLoading,
    isError,
    error,
    markAsRead,
    markAllAsRead,
  };
};
