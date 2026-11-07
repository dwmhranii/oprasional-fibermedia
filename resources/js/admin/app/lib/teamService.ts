import { apiClient } from './api';

export interface TeamMember {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  status?: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  order_index?: number;
  member_count?: number;
  active_tickets_count?: number;
  members: TeamMember[];
  technicians?: TeamMember[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateTeamPayload {
  name: string;
  description?: string;
  is_active?: boolean;
}

/**
 * Normalizes raw API team item to standard Team object
 */
const normalizeTeam = (raw: any): Team => {
  const membersList: TeamMember[] = Array.isArray(raw.members)
    ? raw.members
    : Array.isArray(raw.technicians)
    ? raw.technicians
    : Array.isArray(raw.users)
    ? raw.users
    : [];

  const normalizedMembers = membersList.map((m: any) => ({
    id: m.id,
    name: m.name || m.nama_lengkap || 'Teknisi',
    email: m.email || '',
    phone: m.phone || m.no_hp || '',
    role: m.role || 'teknisi',
    avatar: m.avatar,
    status: m.status || 'active',
  }));

  const isActive = raw.is_active !== undefined 
    ? Boolean(raw.is_active) 
    : (raw.status ? raw.status === 'active' || raw.status === 'aktif' : true);

  return {
    id: raw.id,
    name: raw.name || `Team ${raw.id}`,
    description: raw.description || '',
    is_active: isActive,
    order_index: raw.order_index ?? 0,
    member_count: raw.member_count ?? normalizedMembers.length,
    active_tickets_count: raw.active_tickets_count ?? raw.active_complaints_count ?? 0,
    members: normalizedMembers,
    technicians: normalizedMembers,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
};

export const teamService = {
  /**
   * Fetch all field technician teams
   */
  async getTeams(): Promise<Team[]> {
    try {
      const response = await apiClient.get<any>('/teams');
      const items = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      return items.map(normalizeTeam);
    } catch (err: any) {
      // Fallback to available teams if endpoint is in transition
      try {
        const fallback = await apiClient.get<any>('/teams/available');
        const fallbackItems = Array.isArray(fallback?.data)
          ? fallback.data
          : Array.isArray(fallback)
          ? fallback
          : [];
        if (fallbackItems.length > 0) {
          return fallbackItems.map(normalizeTeam);
        }
      } catch {
        // Ignore fallback error
      }
      throw err;
    }
  },

  /**
   * Get single team detail with members
   */
  async getTeam(id: number | string): Promise<Team> {
    const response = await apiClient.get<any>(`/teams/${id}`);
    const data = response?.data || response;
    return normalizeTeam(data);
  },

  /**
   * Create a new team
   */
  async createTeam(payload: CreateTeamPayload): Promise<Team> {
    const response = await apiClient.post<any>('/teams', {
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      is_active: payload.is_active ?? true,
    });
    const data = response?.data || response;
    return normalizeTeam(data);
  },

  /**
   * Update team name, description, or active status
   */
  async updateTeam(id: number | string, payload: UpdateTeamPayload): Promise<Team> {
    const response = await apiClient.put<any>(`/teams/${id}`, {
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      is_active: payload.is_active,
    });
    const data = response?.data || response;
    return normalizeTeam(data);
  },

  /**
   * Toggle team active/inactive status
   */
  async toggleTeamStatus(id: number | string, currentStatus?: boolean): Promise<any> {
    try {
      return await apiClient.patch(`/teams/${id}/toggle`);
    } catch (err) {
      // Fallback to PUT if PATCH toggle is not supported
      if (currentStatus !== undefined) {
        return await apiClient.put(`/teams/${id}`, {
          is_active: !currentStatus,
        });
      }
      throw err;
    }
  },

  /**
   * Assign or update member technicians in a team
   */
  async updateTeamMembers(id: number | string, userIds: number[]): Promise<any> {
    return await apiClient.post(`/teams/${id}/members`, {
      user_ids: userIds,
    });
  },

  /**
   * Delete team (if applicable)
   */
  async deleteTeam(id: number | string): Promise<any> {
    return await apiClient.delete(`/teams/${id}`);
  },

  /**
   * Fetch all technicians registered in the system
   */
  async getAllTechnicians(): Promise<TeamMember[]> {
    try {
      const response = await apiClient.get<any>('/users?role=teknisi&per_page=100');
      const items = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      return items.map((u: any) => ({
        id: u.id,
        name: u.name || u.nama_lengkap || u.username,
        email: u.email || '',
        phone: u.phone || u.no_hp || '',
        role: 'teknisi',
        avatar: u.avatar,
        status: u.status || 'active',
      }));
    } catch {
      // Fallback to available teams/technicians
      const res = await apiClient.get<any>('/teams/available');
      const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      return items.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email || '',
        phone: u.phone || '',
        role: 'teknisi',
        avatar: u.avatar,
        status: 'active',
      }));
    }
  },
};
