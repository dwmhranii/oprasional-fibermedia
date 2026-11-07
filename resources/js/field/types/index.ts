export type UserRole = 'teknisi' | 'sales' | 'collector' | 'admin' | 'superadmin';

export type ThemeMode = 'dark' | 'day';

export type AccentPreset = 'cyan' | 'cobalt' | 'emerald' | 'indigo' | 'amber';

export interface AccentThemeConfig {
  id: AccentPreset;
  name: string;
  subtitle: string;
  primaryHex: string;
  secondaryHex: string;
  glowRgba: string;
  badgeClass: string;
  buttonClass: string;
  textClass: string;
  borderClass: string;
  ringClass: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  team_id?: number;
  team_name?: string;
  phone: string;
  avatar: string;
  device_uuid: string;
  device_model: string;
  device_approved: boolean;
  sanctum_token_preview?: string;
  sanctum_expires_in_hours?: number;
  registered_devices_count?: number; // max 2 per PRD v1.2, 1 active session
}

export interface Team {
  id: number;
  name: string;
  description: string;
  order_index: number;
  is_active: boolean;
  member_ids: number[];
}

export interface OfficeLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number; // default 50m per PRD v1.2
  allowed_wifi_ip: string; // e.g. 103.144.82.10 per PRD v1.2 Section 6
  allowed_wifi_ssid: string;
  wifi_outage_bypass: boolean; // Admin flag if office Wi-Fi is down today
  is_active: boolean;
}

export type AttendanceStatus = 'hadir' | 'field_checkin' | 'izin' | 'sakit' | 'alpa';

export type AttendanceChannel = 'office' | 'field';

export interface DailyAttendance {
  id: string;
  user_id: number;
  work_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  attendance_channel?: AttendanceChannel; // 'office' for Teknisi/Admin, 'field' for Sales/Collector
  check_in_at?: string; // ISO
  check_in_lat?: number;
  check_in_lng?: number;
  check_in_accuracy?: number;
  check_in_photo_url?: string;
  check_in_photo_hash?: string;
  check_out_at?: string; // ISO
  check_out_photo_url?: string;
  check_out_photo_hash?: string;
  office_id: number;
  office_distance_meters?: number;
  wifi_ip_verified?: boolean;
  wifi_ip?: string;
  is_manual?: boolean;
  manual_reason?: string;
  manual_approval_status?: 'pending_admin' | 'approved' | 'rejected';
  anti_fake_gps_flags?: string[]; // e.g. ['micro_jitter', 'round_accuracy', 'impossible_travel']
  needs_admin_review?: boolean;
  late_minutes?: number;
  device_id: string;
}

export type TicketType = 'psb' | 'complaint';

export type TicketPriority = 'kritis' | 'tinggi' | 'sedang';

export type TicketStatus =
  | 'unassigned'
  | 'assigned'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'phase1_completed'
  | 'resolved'
  | 'closed'
  | 'needs_admin';

export interface Phase1Data {
  photo_before: string; // Speedtest Sistem snapshot
  photo_before_hash: string;
  photo_after: string; // Foto Rumah ber-GPS (<=400 KB)
  photo_after_hash: string;
  photo_ont: string; // Foto ONT + OPM ber-GPS (<=400 KB)
  photo_ont_hash: string;
  optical_power_dbm: number; // e.g. -18.5 dBm (-13 to -24 standard)
  checklist: {
    dropcore_installed: boolean;
    ont_powered: boolean;
    wifi_configured: boolean;
    redaman_standard: boolean;
    speedtest_verified: boolean;
  };
  customer_signature: string; // BAST on-screen signature data URL (non-certificate)
  bast_sha256?: string;
  bast_device_timestamp?: string;
  bast_server_timestamp?: string;
  compressed_size_kb?: number; // <= 400 KB per NFR-04
  thumbnail_size_kb?: number; // 30-50 KB per NFR-04
  drive_backup_synced?: boolean;
  submitted_by_id: number;
  submitted_by_name: string;
  submitted_at: string;
}

export type GeofenceStatus = 'inside' | 'outside' | 'low_accuracy' | 'unverified';

export interface Phase2Requirement {
  user_id: number;
  user_name: string;
  completed_at?: string;
  selfie_url?: string;
  selfie_hash?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  distance_meters?: number;
  geofence_status?: GeofenceStatus;
  waived?: boolean;
  waive_reason?: string;
  waived_by_id?: number;
}

export interface WorkOrder {
  id: number;
  ticket_number: string;
  type: TicketType;
  priority?: TicketPriority; // Set by Admin before dispatch for complaint tickets
  sla_target_minutes: number; // Copied from sla_settings at creation (PSB: 1440m, Kritis: 180m, Tinggi: 360m, Sedang: 1440m)
  sla_elapsed_operational_minutes: number; // Counts only 08:00-20:00 WIB Mon-Sat excluding national holidays
  sla_response_deadline_minutes?: number; // 120 operational minutes (2 hours) for complaint response
  sla_paused?: boolean;
  sla_pause_reason?: string; // 1 of 5 standard reasons by Admin/NOC
  sla_paused_by?: string;
  title: string;
  customer_name: string;
  customer_code: string;
  customer_nik_masked?: string; // Masked NIK per PRD Section 7 & 8
  onu_serial?: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  package_name: string;
  area: string;
  odp_name: string;
  odp_port: number;
  status: TicketStatus;
  bast_status?: 'pending_bast' | 'signed_at_location' | 'approved_by_admin' | 'rejected_by_admin';
  assigned_team_id?: number;
  assigned_team_name?: string;
  assigned_at?: string;
  accepted_at?: string;
  accepted_by_id?: number;
  response_deadline_at?: string;
  reassign_count: number;
  unassigned_since?: string;
  phase1_data?: Phase1Data;
  phase2_requirements: Phase2Requirement[];
  customer_rating?: number;
  rating_note?: string;
  history_logs: Array<{
    timestamp: string;
    action: string;
    actor_name: string;
    note?: string;
  }>;
}

export interface PsbSubmission {
  id: string;
  submission_code: string;
  sales_id: number;
  sales_name: string;
  customer_name: string;
  nik: string;
  nik_masked?: string;
  consent_pdp_accepted?: boolean; // UU PDP consent recorded at registration per PRD Section 8
  phone: string;
  email: string;
  address: string;
  city?: string;
  district?: string;
  village?: string;
  latitude: number;
  longitude: number;
  package_id: number;
  package_name: string;
  package_speed?: number | string;
  package_price: number;
  installation_fee?: number;
  promo_code?: string;
  ktp_photo: string;
  house_photo: string;
  ktp_base64?: string;
  house_base64?: string;
  notes?: string;
  status: 'draft' | 'submitted' | 'admin_validation' | 'scheduled' | 'installed' | 'rejected';
  created_at: string;
}

export interface CollectorCustomerVisit {
  id: string;
  customer_code: string;
  customer_name: string;
  nik_masked: string;
  phone: string;
  address: string;
  area: string;
  package_name: string;
  debt_amount: number; // Manual column per PRD v1.2 Section 1 & 2
  billing_cycle_day: number; // Manual column per PRD v1.2 Section 1 & 2
  customer_status: 'active' | 'suspended' | 'terminated';
  odp_name: string;
  odp_port: number;
  visit_status: 'pending' | 'visited_paid' | 'visited_promised';
  visit_note?: string;
  visit_photo_url?: string;
  visited_at?: string;
}

export interface KpiTeamMetrics {
  team_id: number;
  team_name: string;
  sla_ontime_rate: number;
  repeat_ticket_rate: number;
  proof_quality_rate: number;
  satisfaction_score: number;
  response_rate: number;
  total_score: number;
  total_tickets: number;
}

export interface KpiTechnicianMetrics {
  user_id: number;
  user_name: string;
  attendance_rate: number;
  phase2_completion_rate: number;
  location_validity_rate: number;
  sla_timeliness_rate: number;
  total_score: number;
  work_days: number;
  present_days: number;
}

export interface KpiSalesMetrics {
  user_id: number;
  user_name: string;
  conversion_rate: number;
  retention_3month_rate: number;
  ontime_payment_first_month: number;
  data_quality_rate: number;
  attendance_rate: number;
  total_score: number;
  total_submissions: number;
}

export interface OfflineAction {
  id: string;
  action_type:
    | 'check_in'
    | 'check_out'
    | 'accept_ticket'
    | 'update_ticket_status'
    | 'submit_phase1'
    | 'submit_phase2'
    | 'submit_sales';
  payload: any;
  idempotency_key: string;
  timestamp: string; // Device timestamp
  server_synced_at?: string; // Server timestamp on sync
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict_reassigned';
  retry_count: number;
}

export interface DispatchSettings {
  min_members_present: number;
  max_open_tickets_per_team: number;
  auto_reassign_enabled_complaint: boolean;
  auto_reassign_enabled_psb: boolean;
  response_timeout_minutes: number; // 120 minutes (2 operational hours) per PRD v1.2
  max_auto_reassign: number;
  geofence_radius_meters: number; // default 50
  attendance_radius_meters: number; // default 50
}
