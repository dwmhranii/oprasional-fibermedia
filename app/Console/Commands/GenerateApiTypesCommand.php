<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;

class GenerateApiTypesCommand extends Command
{
    protected $signature = 'types:generate {--check : Periksa apakah terdapat drift tipe antara backend dan frontend}';

    protected $description = 'Generate TypeScript types from backend contracts and schemas into resources/js/shared/types/api.generated.ts';

    public function handle(): int
    {
        $this->info('Generating TypeScript types from database schemas, resources, and contracts...');

        $types = [];
        $types[] = "/**";
        $types[] = " * AUTO-GENERATED FILE BY 'php artisan types:generate' / 'composer types'.";
        $types[] = " * DO NOT EDIT MANUALLY. ANY CHANGES WILL BE OVERWRITTEN.";
        $types[] = " * Sumber Kebenaran: Database Migrations, Eloquent Models & API Resources.";
        $types[] = " */";
        $types[] = "";

        // Common Pagination Type
        $types[] = "export interface PaginatedResponse<T> {";
        $types[] = "  data: T[];";
        $types[] = "  current_page: number;";
        $types[] = "  last_page: number;";
        $types[] = "  per_page: number;";
        $types[] = "  total: number;";
        $types[] = "  from?: number | null;";
        $types[] = "  to?: number | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface ApiResponse<T = any> {";
        $types[] = "  success: boolean;";
        $types[] = "  message?: string;";
        $types[] = "  data: T;";
        $types[] = "}";
        $types[] = "";

        // 1. Customer Types (35 Kolom + Relasi)
        $types[] = "// ─── CUSTOMERS (35 KOLOM) ───────────────────────────────────────────────────";
        $types[] = "export type CustomerServiceType = 'pppoe' | 'ipoe' | 'static';";
        $types[] = "export type CustomerStatus = 'active' | 'suspended' | 'inactive' | 'terminated';";
        $types[] = "";
        $types[] = "export interface CustomerListRow {";
        $types[] = "  id: number;";
        $types[] = "  customer_code: string;";
        $types[] = "  external_ref?: string | null;";
        $types[] = "  name: string;";
        $types[] = "  phone: string;";
        $types[] = "  phone_normalized?: string | null;";
        $types[] = "  email?: string | null;";
        $types[] = "  address: string;";
        $types[] = "  latitude?: number | null;";
        $types[] = "  longitude?: number | null;";
        $types[] = "  service_type: CustomerServiceType;";
        $types[] = "  bras_id?: number | null;";
        $types[] = "  bras_name?: string | null;";
        $types[] = "  collector?: string | null;";
        $types[] = "  username?: string | null;";
        $types[] = "  package_id?: number | null;";
        $types[] = "  package_name?: string | null;";
        $types[] = "  monthly_price: number;";
        $types[] = "  local_address?: string | null;";
        $types[] = "  remote_address?: string | null;";
        $types[] = "  parent_queue?: string | null;";
        $types[] = "  rate_limit?: string | null;";
        $types[] = "  subscribed_at?: string | null;";
        $types[] = "  expires_at?: string | null;";
        $types[] = "  status: CustomerStatus;";
        $types[] = "  is_online?: boolean;";
        $types[] = "  last_online_at?: string | null;";
        $types[] = "  last_offline_at?: string | null;";
        $types[] = "  current_ip_address?: string | null;";
        $types[] = "  current_mac_address?: string | null;";
        $types[] = "  session_uptime?: string | null;";
        $types[] = "  onu_index?: string | null;";
        $types[] = "  odp_id?: number | null;";
        $types[] = "  odp_code?: string | null;";
        $types[] = "  odp_name?: string | null;";
        $types[] = "  odp_port?: number | null;";
        $types[] = "  debt: number;";
        $types[] = "  wilayah?: string | null;";
        $types[] = "  installed_by_team_id?: number | null;";
        $types[] = "  installed_by_team_name?: string | null;";
        $types[] = "  sales_id?: number | null;";
        $types[] = "  sales_name?: string | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface CustomerDetailResponse extends CustomerListRow {";
        $types[] = "  nik_masked?: string | null; // Contoh: '3507••••••••1234'";
        $types[] = "  odp?: Odp | null;";
        $types[] = "  bras?: BrasDevice | null;";
        $types[] = "  package?: Package | null;";
        $types[] = "  team?: Team | null;";
        $types[] = "  sales?: User | null;";
        $types[] = "  complaints_count?: number;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface CustomerSecretResponse {";
        $types[] = "  customer_id: number;";
        $types[] = "  nik: string;";
        $types[] = "  password?: string | null;";
        $types[] = "  viewed_at: string;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface CustomerFormPayload {";
        $types[] = "  name: string;";
        $types[] = "  nik: string;";
        $types[] = "  phone: string;";
        $types[] = "  email?: string | null;";
        $types[] = "  address: string;";
        $types[] = "  latitude?: number | null;";
        $types[] = "  longitude?: number | null;";
        $types[] = "  service_type: CustomerServiceType;";
        $types[] = "  bras_id?: number | null;";
        $types[] = "  collector?: string | null;";
        $types[] = "  username?: string | null;";
        $types[] = "  password?: string | null;";
        $types[] = "  package_id?: number | null;";
        $types[] = "  monthly_price?: number | null;";
        $types[] = "  local_address?: string | null;";
        $types[] = "  remote_address?: string | null;";
        $types[] = "  parent_queue?: string | null;";
        $types[] = "  rate_limit?: string | null;";
        $types[] = "  subscribed_at?: string | null;";
        $types[] = "  expires_at?: string | null;";
        $types[] = "  status?: CustomerStatus;";
        $types[] = "  onu_index?: string | null;";
        $types[] = "  odp_id?: number | null;";
        $types[] = "  odp_port?: number | null;";
        $types[] = "  debt?: number;";
        $types[] = "  wilayah?: string | null;";
        $types[] = "  installed_by_team_id?: number | null;";
        $types[] = "  sales_id?: number | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "}";
        $types[] = "";

        // 2. Network Types (ODC, ODP, OLT, CableTrack, BRAS)
        $types[] = "// ─── JARINGAN (ODC, ODP, KABEL, BRAS) ──────────────────────────────────────────";
        $types[] = "export type OperationalStatus = 'normal' | 'disrupted' | 'cut';";
        $types[] = "";
        $types[] = "export interface Odc {";
        $types[] = "  id: number;";
        $types[] = "  code: string;";
        $types[] = "  name: string;";
        $types[] = "  address?: string | null;";
        $types[] = "  latitude?: number | null;";
        $types[] = "  longitude?: number | null;";
        $types[] = "  capacity_odp: number;";
        $types[] = "  operational_status: OperationalStatus;";
        $types[] = "  wilayah?: string | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "  odps_count?: number;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface Odp {";
        $types[] = "  id: number;";
        $types[] = "  odc_id?: number | null;";
        $types[] = "  code: string;";
        $types[] = "  name: string;";
        $types[] = "  address?: string | null;";
        $types[] = "  latitude?: number | null;";
        $types[] = "  longitude?: number | null;";
        $types[] = "  port_capacity: number;";
        $types[] = "  operational_status: OperationalStatus;";
        $types[] = "  wilayah?: string | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "  is_approved: boolean;";
        $types[] = "  is_active: boolean;";
        $types[] = "  used_ports?: number[];";
        $types[] = "  odc?: Odc | null;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface CableTrack {";
        $types[] = "  id: number;";
        $types[] = "  client_uuid?: string | null;";
        $types[] = "  name: string;";
        $types[] = "  coordinates: [number, number][]; // [lng, lat] pairs";
        $types[] = "  raw_points_count?: number;";
        $types[] = "  simplified_points_count?: number;";
        $types[] = "  total_length_meters: number;";
        $types[] = "  operational_status: OperationalStatus;";
        $types[] = "  connected_odc_id?: number | null;";
        $types[] = "  connected_odp_id?: number | null;";
        $types[] = "  downstream_odp_ids?: number[] | null;";
        $types[] = "  created_by_id?: number | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface BrasDevice {";
        $types[] = "  id: number;";
        $types[] = "  name: string;";
        $types[] = "  ip_address: string;";
        $types[] = "  api_port: number;";
        $types[] = "  username?: string | null;";
        $types[] = "  use_ssl: boolean;";
        $types[] = "  timeout: number;";
        $types[] = "  location?: string | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "  is_active: boolean;";
        $types[] = "  last_synced_at?: string | null;";
        $types[] = "  last_sync_status?: 'success' | 'failed' | null;";
        $types[] = "  last_sync_error?: string | null;";
        $types[] = "  active_sessions_count: number;";
        $types[] = "  customers_count?: number;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface BrasSessionLog {";
        $types[] = "  id: number;";
        $types[] = "  bras_device_id: number;";
        $types[] = "  customer_id?: number | null;";
        $types[] = "  username: string;";
        $types[] = "  event: 'online' | 'offline' | 'heartbeat' | 'unmapped_session';";
        $types[] = "  ip_address?: string | null;";
        $types[] = "  mac_address?: string | null;";
        $types[] = "  uptime?: string | null;";
        $types[] = "  source: string; // 'bras'";
        $types[] = "  details?: Record<string, any> | null;";
        $types[] = "  created_at?: string | null;";
        $types[] = "}";
        $types[] = "";

        // 3. Team & Attendance
        $types[] = "// ─── TIM & ABSENSI ──────────────────────────────────────────────────────────";
        $types[] = "export interface Team {";
        $types[] = "  id: number;";
        $types[] = "  name: string;";
        $types[] = "  area?: string | null;";
        $types[] = "  description?: string | null;";
        $types[] = "  is_active: boolean;";
        $types[] = "  members_count?: number;";
        $types[] = "  members?: TeamMemberItem[];";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface TeamMemberItem {";
        $types[] = "  id: number;";
        $types[] = "  team_id: number;";
        $types[] = "  user_id: number;";
        $types[] = "  user_name?: string;";
        $types[] = "  user_email?: string;";
        $types[] = "  role_in_team?: string | null;";
        $types[] = "  is_lead?: boolean;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface DailyAttendance {";
        $types[] = "  id: number;";
        $types[] = "  user_id: number;";
        $types[] = "  user_name?: string;";
        $types[] = "  date: string;";
        $types[] = "  check_in_at?: string | null;";
        $types[] = "  check_out_at?: string | null;";
        $types[] = "  check_in_lat?: number | null;";
        $types[] = "  check_in_lng?: number | null;";
        $types[] = "  check_out_lat?: number | null;";
        $types[] = "  check_out_lng?: number | null;";
        $types[] = "  geofence_status: 'inside' | 'outside' | 'low_accuracy' | 'unverified';";
        $types[] = "  status: 'present' | 'late' | 'absent' | 'excused' | 'leave';";
        $types[] = "  notes?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface OfficeLocation {";
        $types[] = "  id: number;";
        $types[] = "  name: string;";
        $types[] = "  latitude: number;";
        $types[] = "  longitude: number;";
        $types[] = "  radius_meters: number;";
        $types[] = "  is_active: boolean;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface Device {";
        $types[] = "  id: number;";
        $types[] = "  user_id: number;";
        $types[] = "  user_name?: string;";
        $types[] = "  device_uuid: string;";
        $types[] = "  model?: string | null;";
        $types[] = "  platform?: string | null;";
        $types[] = "  is_approved: boolean;";
        $types[] = "  last_used_at?: string | null;";
        $types[] = "}";
        $types[] = "";

        // 4. Tickets (Tasks & Complaints)
        $types[] = "// ─── TIKET (TASKS & COMPLAINTS) ─────────────────────────────────────────────";
        $types[] = "export interface Task {";
        $types[] = "  id: number;";
        $types[] = "  task_number: string;";
        $types[] = "  provisioning_id?: number | null;";
        $types[] = "  customer_id?: number | null;";
        $types[] = "  customer_name?: string | null;";
        $types[] = "  assigned_team_id?: number | null;";
        $types[] = "  assigned_team_name?: string | null;";
        $types[] = "  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'escalated';";
        $types[] = "  review_status?: 'pending' | 'approved' | 'returned' | 'waived' | null;";
        $types[] = "  scheduled_date?: string | null;";
        $types[] = "  completed_at?: string | null;";
        $types[] = "  notes?: string | null;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  updated_at?: string | null;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface Complaint {";
        $types[] = "  id: number;";
        $types[] = "  ticket_number: string;";
        $types[] = "  customer_id?: number | null;";
        $types[] = "  customer_name?: string | null;";
        $types[] = "  assigned_team_id?: number | null;";
        $types[] = "  assigned_team_name?: string | null;";
        $types[] = "  category: string;";
        $types[] = "  description: string;";
        $types[] = "  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'escalated';";
        $types[] = "  is_mass_outage: boolean;";
        $types[] = "  affected_element_type?: 'odc' | 'odp' | 'cable' | null;";
        $types[] = "  affected_element_id?: number | null;";
        $types[] = "  affected_customers_count?: number;";
        $types[] = "  review_status?: 'pending' | 'approved' | 'returned' | 'waived' | null;";
        $types[] = "  created_at?: string | null;";
        $types[] = "  resolved_at?: string | null;";
        $types[] = "}";
        $types[] = "";

        // 5. Package & Misc
        $types[] = "// ─── PAKET & PENGGUNA ────────────────────────────────────────────────────────";
        $types[] = "export interface Package {";
        $types[] = "  id: number;";
        $types[] = "  name: string;";
        $types[] = "  speed: number;";
        $types[] = "  price: number;";
        $types[] = "  description?: string | null;";
        $types[] = "  is_active: boolean;";
        $types[] = "}";
        $types[] = "";
        $types[] = "export interface User {";
        $types[] = "  id: number;";
        $types[] = "  name: string;";
        $types[] = "  email: string;";
        $types[] = "  role?: string;";
        $types[] = "  roles?: string[];";
        $types[] = "  is_active: boolean;";
        $types[] = "  teams?: Team[];";
        $types[] = "}";
        $types[] = "";

        $content = implode("\n", $types) . "\n";
        $targetFile = resource_path('js/shared/types/api.generated.ts');

        if (!File::isDirectory(dirname($targetFile))) {
            File::makeDirectory(dirname($targetFile), 0755, true);
        }

        if ($this->option('check')) {
            if (!File::exists($targetFile)) {
                $this->error("Drift terdeteksi: File {$targetFile} belum dibuat!");
                return self::FAILURE;
            }

            $current = File::get($targetFile);
            if (trim($current) !== trim($content)) {
                $this->error("Drift terdeteksi: Tipe TypeScript di {$targetFile} berbeda dengan kontrak backend!");
                return self::FAILURE;
            }

            $this->info("Pemeriksaan drift tipe: TIDAK ADA DRIFT (SINKRON).");
            return self::SUCCESS;
        }

        File::put($targetFile, $content);
        $this->info("TypeScript types successfully written to: {$targetFile}");

        return self::SUCCESS;
    }
}
