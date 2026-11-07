import { apiClient } from './api';

export interface PromoCode {
  id: string | number;
  code: string;
  name: string;
  description?: string;
  type: 'fixed' | 'percentage' | 'free_installation';
  value: number;
  min_package_price?: number;
  max_uses?: number | null;
  used_count?: number;
  valid_from?: string | null;
  valid_until?: string | null;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface PromoValidationResponse {
  is_valid: boolean;
  message: string;
  discount_amount?: number;
  discount_text?: string;
  final_total?: number;
  promo?: {
    id: string | number;
    code: string;
    name: string;
    type: 'fixed' | 'percentage' | 'free_installation';
    value: number;
  };
}

export const defaultMockPromos: PromoCode[] = [
  {
    id: 1,
    code: 'HEMAT50K',
    name: 'Diskon Spesial Rp 50.000',
    description: 'Potongan Rp 50.000 untuk transaksi pertama',
    type: 'fixed',
    value: 50000,
    min_package_price: 100000,
    max_uses: 100,
    used_count: 14,
    status: 'active',
  },
  {
    id: 2,
    code: 'FIBER10',
    name: 'Diskon 10% Semua Paket',
    description: 'Potongan 10% dari harga paket bulanan',
    type: 'percentage',
    value: 10,
    min_package_price: 150000,
    max_uses: 500,
    used_count: 89,
    status: 'active',
  },
  {
    id: 3,
    code: 'FREEINSTALL',
    name: 'Gratis Biaya Instalasi',
    description: 'Bebas biaya pemasangan modem Rp 50.000',
    type: 'free_installation',
    value: 50000,
    min_package_price: 0,
    max_uses: 200,
    used_count: 45,
    status: 'active',
  },
];

export const promoService = {
  // Get all promo codes (Admin)
  getPromos: async (status?: string, search?: string): Promise<{ data: PromoCode[]; summary?: any }> => {
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await apiClient.get<any>('/promos', { params });
      return {
        data: res.data || res.items || res,
        summary: res.summary || {
          total_promos: (res.data || res).length,
          total_active: (res.data || res).filter((p: any) => p.status === 'active').length,
          total_used: (res.data || res).reduce((acc: number, p: any) => acc + (p.used_count || 0), 0),
          total_expired: 0,
        },
      };
    } catch (err) {
      console.warn('Failed to fetch promos from API, using fallback data:', err);
      let filtered = [...defaultMockPromos];
      if (status) filtered = filtered.filter((p) => p.status === status);
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(
          (p) => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
        );
      }
      return {
        data: filtered,
        summary: {
          total_promos: filtered.length,
          total_active: filtered.filter((p) => p.status === 'active').length,
          total_used: filtered.reduce((acc, p) => acc + (p.used_count || 0), 0),
          total_expired: 0,
        },
      };
    }
  },

  // Create new promo code (Admin)
  createPromo: async (promoData: Partial<PromoCode>): Promise<PromoCode> => {
    try {
      const res = await apiClient.post<any>('/promos', promoData);
      return res.data || res;
    } catch (err: any) {
      console.error('API create promo failed:', err);
      // Fallback local creation
      const newPromo: PromoCode = {
        id: Date.now(),
        code: (promoData.code || 'FIBER-' + Math.random().toString(36).substring(2, 7)).toUpperCase(),
        name: promoData.name || 'Promo Kode',
        description: promoData.description || '',
        type: promoData.type || 'fixed',
        value: Number(promoData.value || 0),
        min_package_price: Number(promoData.min_package_price || 0),
        max_uses: promoData.max_uses ? Number(promoData.max_uses) : null,
        used_count: 0,
        valid_until: promoData.valid_until || null,
        status: promoData.status || 'active',
        created_at: new Date().toISOString(),
      };
      defaultMockPromos.unshift(newPromo);
      return newPromo;
    }
  },

  // Toggle promo status active/inactive (Admin)
  toggleStatus: async (id: string | number): Promise<PromoCode> => {
    try {
      const res = await apiClient.patch<any>(`/promos/${id}/toggle-status`, {});
      return res.data || res;
    } catch (err) {
      const target = defaultMockPromos.find((p) => String(p.id) === String(id));
      if (target) {
        target.status = target.status === 'active' ? 'inactive' : 'active';
        return target;
      }
      throw err;
    }
  },

  // Delete promo code (Admin)
  deletePromo: async (id: string | number): Promise<boolean> => {
    try {
      await apiClient.delete<any>(`/promos/${id}`);
      return true;
    } catch (err) {
      const idx = defaultMockPromos.findIndex((p) => String(p.id) === String(id));
      if (idx !== -1) {
        defaultMockPromos.splice(idx, 1);
        return true;
      }
      return false;
    }
  },

  // Validate promo code for Sales Form submission
  validatePromo: async (
    code: string,
    packagePrice: number = 0,
    installFee: number = 50000
  ): Promise<PromoValidationResponse> => {
    const uppercaseCode = code.trim().toUpperCase();
    try {
      const res = await apiClient.post<any>('/promos/validate', {
        code: uppercaseCode,
        package_price: packagePrice,
        installation_fee: installFee,
      });
      return {
        is_valid: true,
        message: res.message || `Kode promo '${uppercaseCode}' berhasil dipasang!`,
        discount_amount: res.discount_amount || 0,
        discount_text: res.discount_text || `Potongan Rp ${Number(res.discount_amount || 0).toLocaleString('id-ID')}`,
        final_total: res.final_total || Math.max(0, packagePrice + installFee - (res.discount_amount || 0)),
        promo: res.promo,
      };
    } catch (err: any) {
      // Local fallback calculation if server returns error or offline
      const localPromo = defaultMockPromos.find(
        (p) => p.code.toUpperCase() === uppercaseCode && p.status === 'active'
      );

      if (!localPromo) {
        return {
          is_valid: false,
          message: err?.response?.data?.message || `Kode promo '${uppercaseCode}' tidak valid atau sudah tidak aktif`,
        };
      }

      let discountAmount = 0;
      let discountText = '';

      if (localPromo.type === 'fixed') {
        discountAmount = Math.min(localPromo.value, packagePrice);
        discountText = `Potongan Rp ${discountAmount.toLocaleString('id-ID')}`;
      } else if (localPromo.type === 'percentage') {
        discountAmount = Math.round((packagePrice * localPromo.value) / 100);
        discountText = `Diskon ${localPromo.value}% (Rp ${discountAmount.toLocaleString('id-ID')})`;
      } else if (localPromo.type === 'free_installation') {
        discountAmount = installFee;
        discountText = `Gratis Biaya Instalasi (Rp ${installFee.toLocaleString('id-ID')})`;
      }

      return {
        is_valid: true,
        message: `Kode promo '${localPromo.code}' berhasil dipasang! ${discountText}`,
        discount_amount: discountAmount,
        discount_text: discountText,
        final_total: Math.max(0, packagePrice + installFee - discountAmount),
        promo: {
          id: localPromo.id,
          code: localPromo.code,
          name: localPromo.name,
          type: localPromo.type,
          value: localPromo.value,
        },
      };
    }
  },
};
