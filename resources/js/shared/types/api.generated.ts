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
  odps?: Odp[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OdpPortItem {
  port_number: number;
  is_occupied: boolean;
  customer?: {
    id: number;
    customer_code: string;
    name: string;
    status: string;
  } | null;
}

export interface Odp {
  id: number;
  odc_id?: number | null;
  code: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  proposed_latitude?: number | null;
  proposed_longitude?: number | null;
  has_pending_relocation?: boolean;
  port_capacity: number;
  occupied_ports_count?: number;
  available_ports_count?: number;
  operational_status: OperationalStatus;
  wilayah?: string | null;
  notes?: string | null;
  is_approved: boolean;
  is_active: boolean;
  status?: string | null;
  client_uuid?: string | null;
  ports?: OdpPortItem[];
  odc?: Odc | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CableTrack {
  id: number;
  client_uuid?: string | null;
  name: string;
  coordinates: [number, number][]; // [lng, lat] pairs
  coordinates_count?: number;
  is_drawn?: boolean;
  total_length_meters: number;
  status?: string;
  operational_status: OperationalStatus;
  is_approved?: boolean;
  connected_odc_id?: number | null;
  connected_odc?: { id: number; code: string; name: string } | null;
  connected_odp_id?: number | null;
  connected_odp?: { id: number; code: string; name: string } | null;
  downstream_odp_ids?: number[] | null;
  creator?: { id: number; name: string } | null;
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
  has_password?: boolean;
  location?: string | null;
  notes?: string | null;
  is_active: boolean;
  status?: string;
  last_sync_at?: string | null;
  last_error?: string | null;
  total_active_sessions?: number;
  cpu_load?: number | null;
  free_memory?: number | null;
  uptime?: string | null;
  customers_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface NetworkStatusLog {
  id: number;
  log_name: string;
  description: string;
  subject_type: string;
  subject_id?: number | null;
  element_code?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  reason?: string | null;
  notes?: string | null;
  affected_customers_count?: number;
  causer?: { id: number; name: string } | null;
  created_at?: string | null;
}

export interface NetworkApprovalsResponse {
  pending_odps: Odp[];
  pending_cable_tracks: CableTrack[];
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

