import { ALL_MALANG_DISTRICTS, MALANG_REGIONS_HIERARCHY, type CityAreaHierarchy } from '../data/malangRegions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '../lib/api';
import type {
  Complaint,
  ComplaintListItem,
  ComplaintStats,
  ComplaintFilters,
  ComplaintCreatePayload,
  ComplaintAssignPayload,
  ComplaintResolveRemotePayload,
  ComplaintResolveTechnicianPayload,
  ComplaintPhase1Payload,
  ComplaintPhase2Payload,
  ComplaintAttendance,
  ComplaintTeamAttendanceResponse,
  ComplaintVerifyPayload,
  AvailableTechnician,
  AvailableTeam,
} from '../types/complaint';
import { toast } from 'sonner';

/**
 * Service methods for complaints API
 * Designed to seamlessly receive and unpack standard Laravel responses:
 * - Laravel API Resource: { data: ... }
 * - Laravel LengthAwarePaginator: { data: [...], current_page, total, ... }
 * - Laravel Envelope: { success: true, data: ... }
 */
export const complaintService = {
  // Complaints Endpoints
  getAdminComplaints: async (filters: ComplaintFilters = {}): Promise<{ data: ComplaintListItem[]; total: number; meta?: any }> => {
    const res = await apiClient.get<any>('/complaints', { params: filters });
    const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    const total = res?.total ?? res?.meta?.total ?? items.length;
    return { data: items, total, meta: res?.meta };
  },

  getComplaintDetail: async (id: number | string): Promise<Complaint> => {
    const res = await apiClient.get<any>(`/complaints/${id}`);
    return (res?.data ?? res) as Complaint;
  },

  getComplaintStats: async (): Promise<ComplaintStats> => {
    const res = await apiClient.get<any>('/complaints/stats');
    const d = res?.data ?? res ?? {};
    return {
      total: Number(d.total || 0),
      open: Number(d.open || 0),
      assigned: Number(d.assigned || 0),
      in_progress: Number(d.in_progress || 0),
      pending_customer: Number(d.pending_customer || 0),
      resolved: Number(d.resolved || 0),
      resolved_today: Number(d.resolved_today || 0),
      closed: Number(d.closed || 0),
      sla_breached: Number(d.sla_breached || 0),
      avg_resolve_hours: Number(d.avg_resolve_hours || 0),
    };
  },

  checkDuplicate: async (phone?: string, customerCode?: string): Promise<{ has_duplicate: boolean; active_complaints: ComplaintListItem[] }> => {
    if (!phone && !customerCode) {
      return { has_duplicate: false, active_complaints: [] };
    }
    const res = await apiClient.get<any>('/complaints/check-duplicate', {
      params: { phone, customer_code: customerCode },
    });
    const d = res?.data ?? res ?? {};
    const active = Array.isArray(d.active_complaints)
      ? d.active_complaints
      : (Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []));

    return {
      has_duplicate: Boolean(d.has_duplicate ?? active.length > 0),
      active_complaints: active,
    };
  },

  getAvailableTeams: async (area?: string): Promise<AvailableTeam[]> => {
    try {
      const res = await apiClient.get<any>('/teams/available', {
        params: area ? { area } : undefined,
      });
      const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      if (items.length > 0) return items as AvailableTeam[];
    } catch {
      // fallback
    }
    return [
      { id: 1, name: 'Team A', member_count: 2, active_tickets_count: 0, technicians: [], is_available: true },
      { id: 2, name: 'Team B', member_count: 2, active_tickets_count: 0, technicians: [], is_available: true },
      { id: 3, name: 'Team C', member_count: 2, active_tickets_count: 0, technicians: [], is_available: true },
      { id: 4, name: 'Team D', member_count: 0, active_tickets_count: 0, technicians: [], is_available: true },
    ];
  },

  getAvailableTechnicians: async (area?: string): Promise<AvailableTechnician[]> => {
    const res = await apiClient.get<any>('/technicians/available', {
      params: area ? { area } : undefined,
    });
    const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    return items as AvailableTechnician[];
  },

  getAreaHierarchy: async (): Promise<CityAreaHierarchy[]> => {
    try {
      const res = await apiClient.get<any>('/areas/hierarchy');
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      if (items.length > 0) return items;
    } catch {
      // fallback if backend is offline
    }
    return MALANG_REGIONS_HIERARCHY;
  },

  getAreas: async (): Promise<string[]> => {
    try {
      const res = await apiClient.get<any>('/areas');
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      if (items.length > 0) {
        return items.map((i: any) => (typeof i === 'string' ? i : i.name || i.area));
      }
    } catch {
      // fallback
    }
    return ALL_MALANG_DISTRICTS;
  },

  createComplaint: async (payload: ComplaintCreatePayload): Promise<Complaint> => {
    const hasAttachments = payload.attachments && payload.attachments.length > 0;
    if (hasAttachments) {
      const formData = new FormData();
      formData.append('customer_name', payload.customer_name);
      formData.append('customer_phone', payload.customer_phone);
      if (payload.customer_code) formData.append('customer_code', payload.customer_code);
      formData.append('customer_address', payload.customer_address);
      if (payload.customer_lat) formData.append('customer_lat', String(payload.customer_lat));
      if (payload.customer_lng) formData.append('customer_lng', String(payload.customer_lng));
      formData.append('area', payload.area);
      formData.append('category', payload.category);
      formData.append('subject', payload.subject);
      formData.append('description', payload.description);
      formData.append('priority', payload.priority);
      if (payload.whatsapp_message) formData.append('whatsapp_message', payload.whatsapp_message);

      payload.attachments?.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });

      const res = await apiClient.post<any>('/complaints', formData);
      return (res?.data ?? res) as Complaint;
    }

    const res = await apiClient.post<any>('/complaints', payload);
    return (res?.data ?? res) as Complaint;
  },

  assignComplaint: async (id: number | string, payload: ComplaintAssignPayload): Promise<{ complaint: Complaint; assigned_to: any }> => {
    const res = await apiClient.post<any>(`/complaints/${id}/assign`, payload);
    const d = res?.data ?? res ?? {};
    return {
      complaint: (d.complaint ?? d) as Complaint,
      assigned_to: d.assigned_to ?? d.technician,
    };
  },

  resolveRemote: async (id: number | string, payload: ComplaintResolveRemotePayload): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/resolve-remote`, payload);
    return (res?.data ?? res) as Complaint;
  },

  verifyAndClose: async (id: number | string, payload: ComplaintVerifyPayload): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/verify-close`, payload);
    return (res?.data ?? res) as Complaint;
  },

  returnComplaint: async (id: number | string, reason: string): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/return`, { reason });
    return (res?.data ?? res) as Complaint;
  },

  cancelComplaint: async (id: number | string, reason: string): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/cancel`, { reason });
    return (res?.data ?? res) as Complaint;
  },

  reopenComplaint: async (id: number | string, reason: string): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/reopen`, { reason });
    return (res?.data ?? res) as Complaint;
  },

  addNote: async (id: number | string, content: string, isInternal: boolean = true): Promise<any> => {
    const res = await apiClient.post<any>(`/complaints/${id}/notes`, { content, is_internal: isInternal });
    return res?.data ?? res;
  },

  // Operasional Lapangan
  getTeknisiComplaints: async (filters: ComplaintFilters = {}): Promise<{ data: ComplaintListItem[]; total: number; meta?: any }> => {
    const res = await apiClient.get<any>('/complaints', { params: filters });
    const items = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
    const total = res?.total ?? res?.meta?.total ?? items.length;
    return { data: items, total, meta: res?.meta };
  },

  getTeknisiComplaintDetail: async (id: number | string): Promise<Complaint> => {
    const res = await apiClient.get<any>(`/complaints/${id}`);
    return (res?.data ?? res) as Complaint;
  },

  teknisiStart: async (id: number | string): Promise<Complaint> => {
    const res = await apiClient.post<any>(`/complaints/${id}/start`);
    return (res?.data ?? res) as Complaint;
  },

  teknisiSchedule: async (id: number | string, scheduledVisitAt: string): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/schedule-visit`, { scheduled_visit_at: scheduledVisitAt });
    return (res?.data ?? res) as Complaint;
  },

  teknisiPending: async (id: number | string, reason: string): Promise<Complaint> => {
    const res = await apiClient.put<any>(`/complaints/${id}/pending-customer`, { reason });
    return (res?.data ?? res) as Complaint;
  },

  teknisiResume: async (id: number | string): Promise<Complaint> => {
    const res = await apiClient.post<any>(`/complaints/${id}/start`);
    return (res?.data ?? res) as Complaint;
  },

  teknisiResolve: async (id: number | string, payload: ComplaintResolveTechnicianPayload): Promise<Complaint> => {
    const formData = new FormData();
    formData.append('resolution_category', payload.resolution_category);
    if (payload.description) formData.append('description', payload.description);

    payload.photos.forEach((photo, idx) => {
      formData.append(`photos[${idx}]`, photo);
    });

    const res = await apiClient.post<any>(`/complaints/${id}/resolve`, formData);
    return (res?.data ?? res) as Complaint;
  },

  // Tahap 1: Penyelesaian Teknis Lapangan & Bukti Fisik
  teknisiPhase1: async (id: number | string, payload: ComplaintPhase1Payload): Promise<Complaint> => {
    const formData = new FormData();
    formData.append('resolution_category', payload.resolution_category);
    formData.append('description', payload.description);
    if (payload.opm_redaman) formData.append('opm_redaman', payload.opm_redaman);

    payload.photos.forEach((photo, idx) => {
      formData.append(`photos[${idx}]`, photo);
    });

    try {
      const res = await apiClient.post<any>(`/complaints/${id}/phase-1`, formData);
      return (res?.data ?? res) as Complaint;
    } catch (err: any) {
      if (err?.status === 404) {
        // Fallback backward-compatible
        const fallbackRes = await apiClient.post<any>(`/complaints/${id}/resolve`, formData);
        return (fallbackRes?.data ?? fallbackRes) as Complaint;
      }
      throw err;
    }
  },

  // Tahap 2: Absensi Mandiri Setiap Teknisi Tim (Selfie & Geotag)
  teknisiPhase2Attendance: async (
    id: number | string,
    payload: ComplaintPhase2Payload
  ): Promise<{
    message: string;
    attendance: ComplaintAttendance;
    complaint: Complaint;
  }> => {
    const formData = new FormData();
    formData.append('selfie_photo', payload.selfie_photo);
    formData.append('latitude', String(payload.latitude));
    formData.append('longitude', String(payload.longitude));
    if (payload.accuracy !== undefined) {
      formData.append('accuracy', String(payload.accuracy));
    }

    const res = await apiClient.post<any>(`/complaints/${id}/phase-2-attendance`, formData);
    return res?.data ?? res;
  },

  // Cek Status Kehadiran Tim Lapangan
  getTeamAttendances: async (id: number | string): Promise<ComplaintTeamAttendanceResponse> => {
    const res = await apiClient.get<any>(`/complaints/${id}/attendances`);
    return (res?.data ?? res) as ComplaintTeamAttendanceResponse;
  },
};

// ==========================================
// React Query Hooks
// ==========================================

export const useAdminComplaints = (filters: ComplaintFilters = {}) => {
  return useQuery({
    queryKey: ['adminComplaints', filters],
    queryFn: () => complaintService.getAdminComplaints(filters),
    placeholderData: (prev) => prev,
    staleTime: 30000,
  });
};

export const useComplaintDetail = (id: number | string | undefined) => {
  return useQuery({
    queryKey: ['adminComplaints', 'detail', id],
    queryFn: () => complaintService.getComplaintDetail(id!),
    enabled: !!id && id !== 'id' && id !== ':id' && id !== 'undefined',
    staleTime: 15000,
  });
};

export const useComplaintStats = () => {
  return useQuery({
    queryKey: ['adminComplaints', 'stats'],
    queryFn: () => complaintService.getComplaintStats(),
    staleTime: 60000,
  });
};

export const useCheckDuplicateComplaint = (phone?: string, customerCode?: string) => {
  return useQuery({
    queryKey: ['complaintsDuplicateCheck', phone, customerCode],
    queryFn: () => complaintService.checkDuplicate(phone, customerCode),
    enabled: Boolean((phone && phone.length >= 8) || (customerCode && customerCode.length >= 3)),
    staleTime: 30000,
  });
};

export const useAvailableTeams = (area?: string) => {
  return useQuery({
    queryKey: ['availableTeams', area],
    queryFn: () => complaintService.getAvailableTeams(area),
    staleTime: 30000,
  });
};

export const useAvailableTechnicians = (area?: string) => {
  return useQuery({
    queryKey: ['availableTechnicians', area],
    queryFn: () => complaintService.getAvailableTechnicians(area),
    staleTime: 60000,
  });
};

export const useAreas = () => {
  return useQuery({
    queryKey: ['complaintAreas'],
    queryFn: () => complaintService.getAreas(),
    staleTime: 300000, // 5 mins cache
  });
};

export const useAreaHierarchy = () => {
  return useQuery({
    queryKey: ['complaintAreaHierarchy'],
    queryFn: () => complaintService.getAreaHierarchy(),
    staleTime: 300000,
  });
};

export const useTeknisiComplaints = (filters: ComplaintFilters = {}) => {
  return useQuery({
    queryKey: ['teknisiComplaints', filters],
    queryFn: () => complaintService.getTeknisiComplaints(filters),
    placeholderData: (prev) => prev,
    staleTime: 30000,
  });
};

export const useTeknisiComplaintDetail = (id: number | string | undefined) => {
  return useQuery({
    queryKey: ['teknisiComplaints', 'detail', id],
    queryFn: () => complaintService.getTeknisiComplaintDetail(id!),
    enabled: !!id,
    staleTime: 15000,
  });
};

export const useComplaintAttendances = (id: number | string | undefined) => {
  return useQuery({
    queryKey: ['complaints', 'attendances', id],
    queryFn: () => complaintService.getTeamAttendances(id!),
    enabled: !!id,
    staleTime: 10000,
  });
};

// ==========================================
// Mutation Hooks
// ==========================================

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ComplaintCreatePayload) => complaintService.createComplaint(payload),
    onSuccess: (data) => {
      toast.success(`Tiket ${data.ticket_number || 'pengaduan'} berhasil dibuat`);
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal membuat tiket pengaduan');
    },
  });
};

export const useAssignComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ComplaintAssignPayload }) =>
      complaintService.assignComplaint(id, payload),
    onSuccess: (res, vars) => {
      const techName = res.assigned_to?.name || res.assigned_to?.nama_lengkap || 'teknisi';
      toast.success(`Tiket berhasil ditugaskan ke ${techName}`);
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      if (error?.status === 409) {
        toast.error(error?.message || 'Tidak ada teknisi tersedia di area ini saat ini.');
      } else {
        toast.error(error?.getFirstError?.() || error?.message || 'Gagal menugaskan tiket');
      }
    },
  });
};

export const useResolveRemoteComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ComplaintResolveRemotePayload }) =>
      complaintService.resolveRemote(id, payload),
    onSuccess: (_, vars) => {
      toast.success('Pengaduan berhasil diselesaikan secara remote');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal menyelesaikan pengaduan');
    },
  });
};

export const useVerifyCloseComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ComplaintVerifyPayload }) =>
      complaintService.verifyAndClose(id, payload),
    onSuccess: (_, vars) => {
      toast.success('Bukti teknisi diverifikasi. Tiket resmi ditutup.');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal memverifikasi dan menutup tiket');
    },
  });
};

export const useReturnComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      complaintService.returnComplaint(id, reason),
    onSuccess: (_, vars) => {
      toast.success('Tiket dikembalikan ke teknisi untuk perbaikan');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal mengembalikan tiket');
    },
  });
};

export const useCancelComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      complaintService.cancelComplaint(id, reason),
    onSuccess: (_, vars) => {
      toast.success('Tiket pengaduan dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal membatalkan tiket');
    },
  });
};

export const useReopenComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      complaintService.reopenComplaint(id, reason),
    onSuccess: (_, vars) => {
      toast.success('Tiket pengaduan berhasil dibuka kembali');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'stats'] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal membuka kembali tiket');
    },
  });
};

export const useAddComplaintNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, isInternal }: { id: number | string; content: string; isInternal?: boolean }) =>
      complaintService.addNote(id, content, isInternal),
    onSuccess: (_, vars) => {
      toast.success('Catatan berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal menambahkan catatan');
    },
  });
};

// Teknisi Mutations
export const useTeknisiStartComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => complaintService.teknisiStart(id),
    onSuccess: (_, id) => {
      toast.success('Pengerjaan pengaduan dimulai');
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal memulai pengerjaan');
    },
  });
};

export const useTeknisiScheduleVisit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledVisitAt }: { id: number | string; scheduledVisitAt: string }) =>
      complaintService.teknisiSchedule(id, scheduledVisitAt),
    onSuccess: (_, vars) => {
      toast.success('Jadwal kunjungan berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(vars.id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal menyimpan jadwal kunjungan');
    },
  });
};

export const useTeknisiPendingCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      complaintService.teknisiPending(id, reason),
    onSuccess: (_, vars) => {
      toast.success('Status diubah ke Pending Pelanggan (SLA dijeda)');
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(vars.id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal mengubah status pending');
    },
  });
};

export const useTeknisiResumeComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => complaintService.teknisiResume(id),
    onSuccess: (_, id) => {
      toast.success('Pengerjaan dilanjutkan (SLA berjalan kembali)');
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal melanjutkan pengerjaan');
    },
  });
};

export const useTeknisiResolveComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ComplaintResolveTechnicianPayload }) =>
      complaintService.teknisiResolve(id, payload),
    onSuccess: (_, vars) => {
      toast.success('Bukti pengerjaan berhasil dikirim. Menunggu verifikasi Admin.');
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'attendances', String(vars.id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal menyelesaikan tiket pengaduan');
    },
  });
};

export const useTeknisiPhase1Complaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ComplaintPhase1Payload }) =>
      complaintService.teknisiPhase1(id, payload),
    onSuccess: (data, vars) => {
      if (data.status === 'resolved') {
        toast.success('Pengerjaan teknis & absensi tim lengkap! Tiket resmi diselesaikan (RESOLVED).');
      } else {
        toast.success('Tahap 1 (Penyelesaian Teknis) berhasil disimpan. Menunggu absensi mandiri tim.');
      }
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'attendances', String(vars.id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal menyimpan penyelesaian teknis Tahap 1');
    },
  });
};

export const useTeknisiPhase2Attendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ComplaintPhase2Payload }) =>
      complaintService.teknisiPhase2Attendance(id, payload),
    onSuccess: (res, vars) => {
      const isResolved = res?.complaint?.status === 'resolved' || res?.complaint?.all_team_members_attended;
      if (isResolved) {
        toast.success(res?.message || 'Absensi Anda tercatat & seluruh tim lengkap! Tiket resmi RESOLVED.');
      } else {
        toast.success(res?.message || 'Absensi selfie & lokasi Anda berhasil dicatat.');
      }
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['teknisiComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
      queryClient.invalidateQueries({ queryKey: ['adminComplaints', 'detail', String(vars.id)] });
      queryClient.invalidateQueries({ queryKey: ['complaints', 'attendances', String(vars.id)] });
    },
    onError: (error: ApiError | any) => {
      toast.error(error?.getFirstError?.() || error?.message || 'Gagal mengirimkan absensi mandiri Tahap 2');
    },
  });
};
