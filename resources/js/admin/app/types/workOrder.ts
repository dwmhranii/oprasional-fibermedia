export type WorkOrderType = 'psb' | 'complaint';

export type WorkOrderPriority = 'critical' | 'high' | 'medium' | 'low';

export type WorkOrderStatus = 
  | 'assigned' 
  | 'on_the_way' 
  | 'in_progress' 
  | 'phase_1_done' 
  | 'phase_1_submitted' 
  | 'phase_2_done' 
  | 'phase_2_complete'
  | 'submitted'
  | 'approved'
  | 'completed' 
  | 'returned' 
  | 'cancelled';

export interface WorkOrderCoordinates {
  lat: number;
  lng: number;
}

export interface WorkOrderItem {
  id: string; // e.g. "WO-CMP-12" | "WO-TSK-4"
  raw_id: number;
  type: WorkOrderType;
  type_label: string;
  ticket_number: string;
  title: string;
  category: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  area: string;
  coordinates?: WorkOrderCoordinates;
  priority: WorkOrderPriority;
  status: WorkOrderStatus | string;
  assigned_team?: string;
  is_two_phase: boolean;
  phase_1_done: boolean;
  phase_2_done: boolean;
  tab_category?: string;
  auto_reassign_due_at?: string | null;
  sla_due_at: string | null;
  is_sla_breached: boolean;
  created_at: string;
}

export type WorkOrderTab = 
  | 'all' 
  | 'unassigned' 
  | 'waiting_acceptance' 
  | 'in_progress' 
  | 'needs_review' 
  | 'completed';

export interface WorkOrderCounts {
  all: number;
  unassigned: number;
  waiting_acceptance: number;
  in_progress: number;
  needs_review: number;
  completed: number;
}

export interface FleetTeamMember {
  id: number;
  name: string;
  phone: string;
}

export interface FleetTeamCurrentWorkOrder {
  id: string;
  type: WorkOrderType;
  ticket_number: string;
  customer_name: string;
  status: string;
}

export interface FleetTeam {
  name: string;
  member_count: number;
  members: FleetTeamMember[];
  total_active_wos: number;
  psb_count: number;
  complaint_count: number;
  status: 'busy' | 'standby';
  current_work_order: FleetTeamCurrentWorkOrder | null;
}

export interface FleetMapWorkOrder {
  id: string;
  type: WorkOrderType;
  ticket_number: string;
  title: string;
  customer_name: string;
  coordinates: WorkOrderCoordinates;
  status: string;
  assigned_team: string;
}

export interface LiveFleetSummary {
  total_active_work_orders: number;
  active_psb_count: number;
  active_complaints_count: number;
  active_teams_count: number;
}

export interface LiveFleetMapData {
  summary: LiveFleetSummary;
  teams: FleetTeam[];
  work_orders: FleetMapWorkOrder[];
}

export interface WorkOrderFilters {
  type?: 'all' | 'psb' | 'complaint';
  status?: 'active' | 'completed' | 'all';
  tab?: WorkOrderTab | string;
  date?: string;
  team?: string;
  search?: string;
}
