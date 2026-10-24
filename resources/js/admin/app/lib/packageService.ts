/**
 * Package Service
 * Handles fetching package catalog, CRUD management, and triggering admin web-syncs
 */

import { apiClient, ApiError } from './api';
import { Package, PackagesResponse, SyncPackagesResult } from '../types/packages';
import { packages as defaultPackagesList } from '../data/packages';

/**
 * Normalizes any package item from API or fallback list into standard Package format
 */
export const normalizePackage = (pkg: any): Package => {
  const speed =
    typeof pkg.speed_mbps === 'number'
      ? pkg.speed_mbps
      : typeof pkg.speedMbps === 'number'
      ? pkg.speedMbps
      : parseInt(String(pkg.speed || '30'), 10) || 30;

  return {
    id: pkg.id,
    code: pkg.code || pkg.id || `pkg-${pkg.name?.toLowerCase().replace(/\s+/g, '-')}`,
    name: pkg.name || 'Paket Internet',
    speed_mbps: speed,
    price: Number(pkg.price || 0),
    category: pkg.category || 'residential',
    description: pkg.description || `Koneksi internet fiber optik kecepatan ${speed} Mbps`,
    is_popular: Boolean(pkg.is_popular || pkg.popular),
    is_active: pkg.is_active !== undefined ? Boolean(pkg.is_active) : true,
    synced_at: pkg.synced_at || null,
  };
};

export const defaultNormalizedPackages: Package[] = defaultPackagesList.map(normalizePackage);

/**
 * Safely extracts package list array from various response wrapper shapes
 */
export const extractPackages = (res: any): Package[] => {
  if (!res) return [];
  let rawList: any[] = [];

  if (Array.isArray(res)) {
    rawList = res;
  } else if (Array.isArray(res.data)) {
    rawList = res.data;
  } else if (Array.isArray(res.packages)) {
    rawList = res.packages;
  } else if (res.data && Array.isArray(res.data.packages)) {
    rawList = res.data.packages;
  } else if (res.data && Array.isArray(res.data.data)) {
    rawList = res.data.data;
  }

  return rawList.map(normalizePackage);
};

/**
 * Safely extracts synced_at timestamp from response
 */
export const extractSyncedAt = (res: any): string | null => {
  if (!res) return null;
  if (typeof res.synced_at === 'string') return res.synced_at;
  if (typeof res.data?.synced_at === 'string') return res.data.synced_at;
  if (typeof res.meta?.synced_at === 'string') return res.meta.synced_at;
  return null;
};

export const packageService = {
  /**
   * Fetch active package catalog from backend API (for Sales form)
   * GET /api/packages
   */
  getPackages: async (): Promise<PackagesResponse> => {
    try {
      const response = await apiClient.get<PackagesResponse>('/packages');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal mengambil data paket dari server.', 500);
    }
  },

  /**
   * Fetch ALL packages (including inactive) for Admin Management
   * GET /api/packages?all=1
   */
  getAllPackages: async (): Promise<PackagesResponse> => {
    try {
      const response = await apiClient.get<PackagesResponse>('/packages?all=1');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal mengambil daftar seluruh paket dari server.', 500);
    }
  },

  /**
   * Create a new package (Admin / Superadmin)
   * POST /api/admin/packages
   */
  createPackage: async (data: Partial<Package>): Promise<any> => {
    try {
      return await apiClient.post('/admin/packages', data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal menambahkan paket baru.', 500);
    }
  },

  /**
   * Update package details (Admin / Superadmin)
   * PUT /api/admin/packages/{id}
   */
  updatePackage: async (id: number | string, data: Partial<Package>): Promise<any> => {
    try {
      return await apiClient.put(`/admin/packages/${id}`, data);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal memperbarui data paket.', 500);
    }
  },

  /**
   * Toggle package active status (Admin / Superadmin)
   * PATCH /api/admin/packages/{id}/toggle-active
   */
  togglePackageActive: async (id: number | string): Promise<any> => {
    try {
      return await apiClient.patch(`/admin/packages/${id}/toggle-active`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal mengubah status aktif paket.', 500);
    }
  },

  /**
   * Delete package (RESTRICTED TO SUPERADMIN ONLY)
   * DELETE /api/admin/packages/{id}
   */
  deletePackage: async (id: number | string): Promise<any> => {
    try {
      return await apiClient.delete(`/admin/packages/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal menghapus paket.', 500);
    }
  },

  /**
   * Trigger manual package synchronization from remote website (Admin/Superadmin only)
   * POST /api/admin/packages/sync
   */
  syncPackages: async (): Promise<SyncPackagesResult> => {
    try {
      const response = await apiClient.post<SyncPackagesResult>('/admin/packages/sync');
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Gagal menyinkronkan paket, silakan coba lagi.', 500);
    }
  },
};

export const getPackages = packageService.getPackages;
export const syncPackages = packageService.syncPackages;
