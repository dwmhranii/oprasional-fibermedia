export interface Package {
  id?: string;
  code: string;
  name: string;
  speed_mbps: number;
  speed?: string;
  price: number;
  installFee?: number;
  installationFee?: number;
  category: string | null;
  description: string | null;
  is_popular: boolean;
  is_active?: boolean;
  synced_at?: string | null;
}

export interface PackagesResponse {
  data: Package[];
  synced_at: string | null;
}

export interface SyncPackagesResult {
  success: boolean;
  synced: number;
  synced_at: string | null;
  message: string;
}
