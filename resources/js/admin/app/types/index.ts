// User Roles
export type UserRole = 'sales' | 'admin' | 'teknisi' | 'superadmin';

// User Type (matches API response)
export interface User {
  id: number;
  username: string;
  email: string;
  nama_lengkap: string;
  status: 'active' | 'inactive';
  roles: string[];
  permissions: string[];
  // Legacy field for backward compatibility in UI
  name?: string;
  role?: UserRole;
  displayRole?: string;
  phone?: string;
  avatar?: string;
  last_login_at?: string;
  last_login_ip?: string;
}

// API Request/Response Types
export interface LoginRequest {
  login: string;
  email?: string;
  username?: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  message?: string;
  access_token: string;
  token: string; // Keep for fallback/legacy if any
  token_type: string;
  expires_in?: number;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// Submission Status
export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'pending'
  | 'pending_validation'
  | 'need_info'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'provisioning'
  | 'provisioned'
  | 'scheduling'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// Package Type
export interface Package {
  id: string;
  name: string;
  speed: string;
  price: number;
  installationFee: number;
  description: string;
  popular?: boolean;
}

// Customer Data
export interface Customer {
  ktp: string;
  name: string;
  phone: string;
  whatsapp: boolean;
  email?: string;
}

export interface GpsLocation {
  available: boolean;
  latitude: number;
  longitude: number;
  accuracy?: number;
  captured_at?: string;
}

// Address Data
export interface Address {
  ktpAddress: string;
  installAddress: string;
  sameAsKtp: boolean;
  province: string;
  city: string;
  district: string;
  subDistrict: string;
  postalCode: string;
  customerLocation?: GpsLocation;
  completionLocation?: GpsLocation;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Documents
export interface DocumentItem {
  id: number;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  document_type: string;
}

export interface Documents {
  ktp?: DocumentItem | File | string;
  kk?: DocumentItem | File | string;
  rumah?: DocumentItem | File | string;
  selfie?: DocumentItem | File | string;
  lainnya?: DocumentItem | File | string;
  // Legacy
  housePhotos?: {
    front?: DocumentItem | File | string;
    side?: DocumentItem | File | string;
    inside?: DocumentItem | File | string;
  };
}

// Submission
export interface Submission {
  id: string;
  submissionNumber: string;
  status: SubmissionStatus;
  customer: Customer;
  address: Address;
  documents: Documents;
  package: Package;
  promoCode?: string;
  discount: number;
  totalPrice: number;
  salesId: string;
  salesName: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  taskId?: string;
  customerCode?: string;
  customer_code?: string;
  nomor_pelanggan?: string;
  serviceChain?: {
    submission_number: string;
    provisioning_number?: string;
    task_number?: string;
    customer_code?: string;
    status: string;
    stage: string;
  };
  service_chain?: {
    submission_number: string;
    provisioning_number?: string;
    task_number?: string;
    customer_code?: string;
    status: string;
    stage: string;
  };
  duplicateWarnings?: string[];
  duplicate_warnings?: string[];
  timeline: TimelineEvent[];
  customer_signature_url?: string;
  customer_signature_path?: string;
  signature_url?: string;
  evidence?: {
    signature_url?: string;
    signature_path?: string;
    [key: string]: any;
  };
  current_assignment?: {
    id?: number;
    evidence?: {
      signature_url?: string;
      signature_path?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

// Timeline Event
export interface TimelineEvent {
  id: string;
  type?: string;
  description?: string;
  user?: any;
  timestamp?: string;
  metadata?: any;
  event?: string;
  title?: string;
  status?: string;
  notes?: string;
  reason?: string;
  document_name?: string;
  actor?: any;
  reviewer?: any;
  created_at?: string;
  date?: string;
}

// BFASS Account
export interface BfassAccount {
  id: string;
  submissionId: string;
  username: string;
  password: string;
  nasServer: string;
  ipPool: string;
  serviceType: 'pppoe' | 'static';
  bandwidthUp: number;
  bandwidthDown: number;
  status: 'active' | 'suspended' | 'terminated';
  createdAt: string;
  createdBy: string;
}

// Installation Task
export interface InstallationTask {
  id: string;
  taskNumber: string;
  submissionId: string;
  submissionNumber: string;
  customer: Customer;
  address: Address;
  package: Package;
  bfassAccount?: BfassAccount;
  status: 'assigned' | 'on_way' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string;
  technicianName: string;
  scheduledDate: string;
  scheduledTime: string;
  startTime?: string;
  endTime?: string;
  checklist?: ChecklistItem[];
  photos?: TaskPhotos;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_team?: {
    id: number;
    name: string;
  };
  progress?: {
    total: number;
    submitted: number;
    approved: number;
  };
  current_assignment?: {
    id: number;
    task_id: number;
    user_id: number;
    status: string;
    evidence?: {
      checklist?: ChecklistItem[];
      gps?: any;
      signature_url?: string;
      photos?: any;
    };
  };
  all_assignments?: any[];
  customer_signature_path?: string;
  completion_location?: any;
}

// Checklist Item
export interface ChecklistItem {
  id?: string | number;
  label?: string;
  item_name?: string;
  completed?: boolean;
  is_completed?: boolean;
}

// Task Photos
export interface TaskPhotos {
  before: (File | string)[];
  during: (File | string)[];
  after: (File | string)[];
}

// Stats
export interface Stats {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  color?: string;
}

export * from './packages';
export * from './complaint';

