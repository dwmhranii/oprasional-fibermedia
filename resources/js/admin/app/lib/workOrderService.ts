import { apiClient } from './api';
import type { 
  WorkOrderItem, 
  LiveFleetMapData, 
  WorkOrderFilters 
} from '../types/workOrder';

export interface WorkOrderResponse {
  total: number;
  data: WorkOrderItem[];
}

export const workOrderService = {
  /**
   * 7.1. Ambil Feed Terpadu Work Order Teknisi (Satu Pintu)
   * GET /teknisi/work-orders
   */
  getTeknisiWorkOrders: async (filters?: WorkOrderFilters): Promise<{ data: WorkOrderItem[]; counts?: any }> => {
    const params: Record<string, string> = {};
    if (filters?.type && filters.type !== 'all') params.type = filters.type;
    if (filters?.tab && filters.tab !== 'all') params.tab = filters.tab;
    if (filters?.status && filters.status !== 'all') params.status = filters.status;
    if (filters?.date) params.date = filters.date;
    if (filters?.search?.trim()) params.search = filters.search.trim();

    const response = await apiClient.get<any>('/work-orders', params);
    
    const data = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
    return {
      data,
      counts: response?.counts,
    };
  },

  /**
   * 7.2. Detail Spesifik Work Order
   * GET /work-orders/{id}
   */
  getTeknisiWorkOrderDetail: async (id: string): Promise<any> => {
    return apiClient.get<any>(`/work-orders/${encodeURIComponent(id)}`);
  },

  /**
   * 7.3. Live Fleet Map & Tracking Lapangan
   * GET /tracking/live-map
   */
  getAdminLiveFleetMap: async (filters?: { team?: string; type?: string }): Promise<LiveFleetMapData> => {
    const params: Record<string, string> = {};
    if (filters?.team && filters.team !== 'all') params.team = filters.team;
    if (filters?.type && filters.type !== 'all') params.type = filters.type;

    const response = await apiClient.get<any>('/tracking/live-map', params);
    
    // Normalize structure
    const data = response && typeof response === 'object' && 'summary' in response ? response : (response?.data || {});
    return {
      summary: data.summary || {
        total_active_work_orders: 0,
        active_psb_count: 0,
        active_complaints_count: 0,
        active_teams_count: 0,
      },
      teams: Array.isArray(data.teams) ? data.teams : [],
      work_orders: Array.isArray(data.work_orders) ? data.work_orders : [],
    };
  },

  /**
   * 7.4. Seluruh Daftar Work Order (Pantau Terpadu)
   * GET /work-orders
   */
  getAdminWorkOrders: async (filters?: WorkOrderFilters): Promise<{ data: WorkOrderItem[]; counts: any; total: number }> => {
    const params: Record<string, string> = {};
    if (filters?.team && filters.team !== 'all') params.team = filters.team;
    if (filters?.type && filters.type !== 'all') params.type = filters.type;
    if (filters?.tab && filters.tab !== 'all') params.tab = filters.tab;
    if (filters?.status && filters.status !== 'all') params.status = filters.status;
    if (filters?.date) params.date = filters.date;
    if (filters?.search?.trim()) params.search = filters.search.trim();

    const response = await apiClient.get<any>('/work-orders', params);
    
    const data = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);
    const counts = response?.counts || {
      all: data.length,
      unassigned: 0,
      waiting_acceptance: 0,
      in_progress: 0,
      needs_review: 0,
      completed: 0,
    };
    return {
      data,
      counts,
      total: response?.total ?? data.length,
    };
  },
};
