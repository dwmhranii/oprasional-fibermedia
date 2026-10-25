/**
 * Complaint Management Types
 * Fibermedia Provisioning FE
 */

export type ComplaintStatus =
  | 'open'              // Tiket baru dibuat oleh Admin
  | 'assigned'          // Sudah ditugaskan ke teknisi
  | 'in_progress'       // Teknisi sedang menangani
  | 'pending_customer'  // Menunggu respons pelanggan (SLA dijeda)
  | 'phase_1_completed' // Tahap 1 Selesai (menunggu absensi tim / rekan)
  | 'resolved'          // Teknisi selesai & bukti/absen lengkap
  | 'closed'            // Admin memverifikasi bukti & menutup tiket (final)
  | 'cancelled'         // Dibatalkan oleh Admin (final)
  | 'reopened';         // Dibuka kembali (maks 7 hari dari closed)

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintCategory =
  | 'no_signal'    // Internet mati total (indikator LOS merah)
  | 'slow_speed'   // Internet lambat
  | 'intermittent' // Koneksi putus-putus
  | 'equipment'    // Perangkat ONT/Adaptor rusak
  | 'billing'      // Tagihan/administrasi (tidak dapat di-assign ke teknisi)
  | 'relocation'   // Geser kabel/relokasi ONT
  | 'other';       // Lainnya

export type ResolutionCategory =
  | 'cable_broken'       // Kabel dropcore putus/tertekuk
  | 'ont_faulty'         // Ganti ONT baru
  | 'ont_reset'          // Reset/rekonfigurasi router
  | 'splitter_odp_issue' // Masalah di ODP/Splitter
  | 'config_issue'       // Perbaikan VLAN/PPPoE/IP
  | 'customer_side'      // Masalah perangkat pelanggan/kabel LAN sendiri
  | 'billing_resolved'   // Administrasi diselesaikan
  | 'other';

export interface TeamMember {
  id: number;
  name: string;
  phone?: string;
}

export interface AvailableTeam {
  id: number | string;
  name: string;
  order_index?: number;
  member_count: number;
  active_tickets_count: number;
  technicians: TeamMember[];
  is_available: boolean;
}

export interface ComplaintEvidence {
  photos: string[];          // URL foto bukti fisik pekerjaan teknisi
  description?: string;      // Catatan/ringkasan teknisi
  submitted_at?: string;
  opm_redaman?: string;      // Nilai redaman optik terakhir (dBm)
}

export interface ComplaintAttendance {
  id: number;
  user_id: number;
  technician_name: string;
  selfie_url: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  distance_meters?: number;
  is_within_radius?: boolean;
  clocked_at: string;
}

export interface ComplaintTeamAttendanceResponse {
  assigned_team: string;
  all_team_members_attended: boolean;
  team_members: TeamMember[];
  attendances: ComplaintAttendance[];
}

export interface ComplaintAssignment {
  id: number;
  complaint_id: number;
  technician_id?: number;
  technician_name?: string;
  assigned_team?: string;
  team_members?: TeamMember[];
  technician_phone?: string;
  assigned_by_id?: number;
  assigned_by_role?: 'admin' | 'superadmin' | 'system';
  is_manual_assignment?: boolean; // true jika dipilih manual oleh Superadmin
  status: 'assigned' | 'in_progress' | 'resolved' | 'returned';
  scheduled_visit_at?: string;
  notes?: string;
  evidence?: ComplaintEvidence;
  assigned_at: string;
  started_at?: string;
  resolved_at?: string;
  returned_at?: string;
  return_reason?: string;
}

export interface ComplaintNote {
  id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface ComplaintActivityLog {
  id: number;
  action: string;
  from_status?: ComplaintStatus;
  to_status?: ComplaintStatus;
  reason?: string;
  actor_name: string;
  actor_role?: string;
  created_at: string;
}

export interface ComplaintAttachment {
  id: number;
  url: string;
  filename: string;
  file_size?: number;
  created_at?: string;
}

export interface Complaint {
  id: number;
  ticket_number: string;        // Contoh: COMP-2026-00123

  // Identitas Pelanggan (Tidak dikirim WA konfirmasi)
  customer_code?: string;
  customer_name: string;
  customer_phone: string;       // No WA pelapor
  customer_address: string;     // Alamat lengkap penanganan teknisi
  customer_lat?: number;
  customer_lng?: number;
  area: string;                 // Kunci pemfilteran penugasan teknisi
  assigned_team?: string;
  team_members?: TeamMember[];
  whatsapp_message?: string;    // Referensi copy pesan WA asli

  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;

  created_by_id: number;
  created_by_name: string;

  // Penugasan & Bukti
  current_assignment?: ComplaintAssignment;
  all_assignments?: ComplaintAssignment[];

  // Resolusi
  resolution_type?: 'remote' | 'onsite';
  resolution_category?: ResolutionCategory;
  verified_by_id?: number;
  verified_by_name?: string;
  verified_at?: string;
  status_reason?: string;       // Alasan batalkan / return / reopen / pending

  // 2-Phase Status Tracking & Absensi
  phase_1_completed_at?: string;
  phase_2_completed_at?: string;
  all_team_members_attended?: boolean;
  attendances?: ComplaintAttendance[];
  opm_redaman?: string;

  notes: ComplaintNote[];
  attachments?: Array<ComplaintAttachment | string>;
  activity_log: ComplaintActivityLog[];

  // SLA Timers
  sla_response_due_at?: string;
  sla_resolve_due_at?: string;
  sla_paused_at?: string;
  is_sla_breached: boolean;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;

  created_at: string;
  updated_at: string;
}

// Item ringkas untuk tabel list
export interface ComplaintListItem {
  id: number;
  ticket_number: string;
  customer_name: string;
  customer_phone: string;
  customer_code?: string;
  area: string;
  category: ComplaintCategory;
  subject: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assigned_to_name?: string;
  assigned_team?: string;
  sla_resolve_due_at?: string;
  is_sla_breached: boolean;
  phase_1_completed_at?: string;
  all_team_members_attended?: boolean;
  created_at: string;
  updated_at?: string;
}

// Statistik Complaint Dashboard
export interface ComplaintStats {
  total: number;
  open: number;
  assigned: number;
  in_progress: number;
  pending_customer: number;
  resolved: number;
  resolved_today: number;
  closed: number;
  sla_breached: number;
  avg_resolve_hours: number;
}

// Profil teknisi untuk filter Superadmin
export interface AvailableTechnician {
  id: number;
  name: string;
  phone?: string;
  availability: 'active' | 'leave' | 'off_duty';
  coverage_areas: string[];
  active_tickets_count: number;
  max_active_tickets: number;
}

// Payload Buat Tiket
export interface ComplaintCreatePayload {
  customer_name: string;
  customer_phone: string;
  customer_code?: string;
  customer_address: string;
  customer_lat?: number;
  customer_lng?: number;
  area: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  priority: ComplaintPriority;
  whatsapp_message?: string;
  attachments?: File[];
}

// Payload Penugasan (Admin = tanpa technician_id; Superadmin = boleh sertakan technician_id)
export interface ComplaintAssignPayload {
  team?: string;
  technician_id?: number;
  notes?: string;
}

// Payload Selesai Remote oleh Admin
export interface ComplaintResolveRemotePayload {
  resolution_category: ResolutionCategory;
  notes?: string;
}

// Payload Teknisi Selesai Kerja & Upload Bukti (Tahap 1)
export interface ComplaintResolveTechnicianPayload {
  resolution_category: ResolutionCategory;
  description?: string;
  photos: File[]; // Minimal 1 foto bukti
  opm_redaman?: string;
}

export interface ComplaintPhase1Payload {
  resolution_category: ResolutionCategory;
  description: string;
  photos: File[]; // Minimal 1 foto bukti fisik, max 5
  opm_redaman?: string;
}

// Payload Teknisi Absensi Mandiri (Tahap 2)
export interface ComplaintPhase2Payload {
  selfie_photo: File; // Foto selfie dari kamera depan
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Payload Verifikasi Bukti & Close oleh Admin
export interface ComplaintVerifyPayload {
  evidence_verified: boolean;
  notes?: string;
}

// Payload Reusable untuk Alasan (Reason)
export interface ComplaintReasonPayload {
  reason: string;
}

// Filter List
export interface ComplaintFilters {
  status?: string;
  priority?: string;
  category?: string;
  area?: string;
  team?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sla_breached?: boolean;
  page?: number;
  per_page?: number;
}
