/**
 * AUTO-GENERATED FILE BY 'php artisan types:generate' / 'composer types'.
 * DO NOT EDIT MANUALLY. ANY CHANGES WILL BE OVERWRITTEN.
 * Sumber Kebenaran: Database Migrations, Eloquent Models & API Resources.
 */

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

// ─── CUSTOMERS (35 KOLOM) ───────────────────────────────────────────────────
export type CustomerServiceType = 'pppoe' | 'ipoe' | 'static';
export type CustomerStatus = 'active' | 'suspended' | 'inactive' | 'terminated';

export interface CustomerListRow {
  id: number;
  customer_code: string;
  external_ref?: string | null;
  name: string;
  phone: string;
  phone_normalized?: string | null;
  email?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  service_type: CustomerServiceType;
  bras_id?: number | null;
  bras_name?: string | null;
  collector?: string | null;
  username?: string | null;
  package_id?: number | null;
  package_name?: string | null;
  monthly_price: number;
  local_address?: string | null;
  remote_address?: string | null;
  parent_queue?: string | null;
  rate_limit?: string | null;
  subscribed_at?: string | null;
  expires_at?: string | null;
  status: CustomerStatus;
  is_online?: boolean;
  last_online_at?: string | null;
  last_offline_at?: string | null;
  current_ip_address?: string | null;
  current_mac_address?: string | null;
  session_uptime?: string | null;
  onu_index?: string | null;
  odp_id?: number | null;
  odp_code?: string | null;
  odp_name?: string | null;
  odp_port?: number | null;
  debt: number;
  wilayah?: string | null;
  installed_by_team_id?: number | null;
  installed_by_team_name?: string | null;
  sales_id?: number | null;
  sales_name?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CustomerDetailResponse extends CustomerListRow {
  nik_masked?: string | null; // Contoh: '3507••••••••1234'
  odp?: Odp | null;
  bras?: BrasDevice | null;
  package?: Package | null;
  team?: Team | null;
  sales?: User | null;
  complaints_count?: number;
}

export interface CustomerSecretResponse {
  id: number;
  customer_code: string;
  name: string;
  username?: string | null;
  nik?: string | null;
  password?: string | null;
}

export interface CustomerFormPayload {
  name: string;
  nik: string;
  phone: string;
  email?: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  service_type: CustomerServiceType;
  bras_id?: number | null;
  collector?: string | null;
  username?: string | null;
  password?: string | null;
  package_id?: number | null;
  monthly_price?: number | null;
  local_address?: string | null;
  remote_address?: string | null;
  parent_queue?: string | null;
  rate_limit?: string | null;
  subscribed_at?: string | null;
  expires_at?: string | null;
  status?: CustomerStatus;
  onu_index?: string | null;
  odp_id?: number | null;
  odp_port?: number | null;
  debt?: number;
  wilayah?: string | null;
  installed_by_team_id?: number | null;
  sales_id?: number | null;
  notes?: string | null;
}

// ─── JARINGAN (ODC, ODP, KABEL, BRAS) ──────────────────────────────────────────
export type OperationalStatus = 'normal' | 'disrupted' | 'cut';

export interface Odc {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity_odp: number;
  operational_status: OperationalStatus;
  wilayah?: string | null;
  notes?: string | null;
  odps_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Odp {
  id: number;
  odc_id?: number | null;
  code: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  port_capacity: number;
  operational_status: OperationalStatus;
  wilayah?: string | null;
  notes?: string | null;
  is_approved: boolean;
  is_active: boolean;
  used_ports?: number[];
  odc?: Odc | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CableTrack {
  id: number;
  client_uuid?: string | null;
  name: string;
  coordinates: [number, number][]; // [lng, lat] pairs
  raw_points_count?: number;
  simplified_points_count?: number;
  total_length_meters: number;
  operational_status: OperationalStatus;
  connected_odc_id?: number | null;
  connected_odp_id?: number | null;
  downstream_odp_ids?: number[] | null;
  created_by_id?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BrasDevice {
  id: number;
  name: string;
  ip_address: string;
  api_port: number;
  username?: string | null;
  use_ssl: boolean;
  timeout: number;
  location?: string | null;
  notes?: string | null;
  is_active: boolean;
  last_synced_at?: string | null;
  last_sync_status?: 'success' | 'failed' | null;
  last_sync_error?: string | null;
  active_sessions_count: number;
  customers_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BrasSessionLog {
  id: number;
  bras_device_id: number;
  customer_id?: number | null;
  username: string;
  event: 'online' | 'offline' | 'heartbeat' | 'unmapped_session';
  ip_address?: string | null;
  mac_address?: string | null;
  uptime?: string | null;
  source: string; // 'bras'
  details?: Record<string, any> | null;
  created_at?: string | null;
}

// ─── TIM & ABSENSI ──────────────────────────────────────────────────────────
export interface Team {
  id: number;
  name: string;
  area?: string | null;
  description?: string | null;
  is_active: boolean;
  members_count?: number;
  members?: TeamMemberItem[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TeamMemberItem {
  id: number;
  team_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  role_in_team?: string | null;
  is_lead?: boolean;
}

export interface DailyAttendance {
  id: number;
  user_id: number;
  user_name?: string;
  date: string;
  check_in_at?: string | null;
  check_out_at?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  geofence_status: 'inside' | 'outside' | 'low_accuracy' | 'unverified';
  status: 'present' | 'late' | 'absent' | 'excused' | 'leave';
  notes?: string | null;
}

export interface OfficeLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

export interface Device {
  id: number;
  user_id: number;
  user_name?: string;
  device_uuid: string;
  model?: string | null;
  platform?: string | null;
  is_approved: boolean;
  last_used_at?: string | null;
}

// ─── TIKET (TASKS & COMPLAINTS) ─────────────────────────────────────────────
export interface Task {
  id: number;
  task_number: string;
  provisioning_id?: number | null;
  customer_id?: number | null;
  customer_name?: string | null;
  assigned_team_id?: number | null;
  assigned_team_name?: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'escalated';
  review_status?: 'pending' | 'approved' | 'returned' | 'waived' | null;
  scheduled_date?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Complaint {
  id: number;
  ticket_number: string;
  customer_id?: number | null;
  customer_name?: string | null;
  assigned_team_id?: number | null;
  assigned_team_name?: string | null;
  category: string;
  description: string;
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
  is_mass_outage: boolean;
  affected_element_type?: 'odc' | 'odp' | 'cable' | null;
  affected_element_id?: number | null;
  affected_customers_count?: number;
  review_status?: 'pending' | 'approved' | 'returned' | 'waived' | null;
  created_at?: string | null;
  resolved_at?: string | null;
}

// ─── PAKET & PENGGUNA ────────────────────────────────────────────────────────
export interface Package {
  id: number;
  name: string;
  speed: number;
  price: number;
  description?: string | null;
  is_active: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
  roles?: string[];
  is_active: boolean;
  teams?: Team[];
}

