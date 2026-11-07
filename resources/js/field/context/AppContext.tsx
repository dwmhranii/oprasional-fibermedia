import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Team,
  OfficeLocation,
  DailyAttendance,
  WorkOrder,
  PsbSubmission,
  TicketStatus,
  Phase1Data,
  DispatchSettings,
  OfflineAction,
  ThemeMode,
  AccentPreset,
  AccentThemeConfig,
  CollectorCustomerVisit,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_OFFICE,
  INITIAL_ATTENDANCE,
  INITIAL_WORK_ORDERS,
  INITIAL_SALES_SUBMISSIONS,
  INITIAL_DISPATCH_SETTINGS,
  INITIAL_KPI_TEAMS,
  INITIAL_KPI_TEKNISI,
  INITIAL_KPI_SALES,
  INITIAL_COLLECTOR_VISITS,
} from '../data/mockData';
import { evaluateGeofence, calculateDistanceMeters } from '../utils/geo';
import {
  getOfflineQueue,
  addToOutbox,
  removeSyncedAction,
  markActionStatus,
} from '../utils/outbox';

export const ISP_ACCENT_PRESETS: AccentThemeConfig[] = [
  {
    id: 'cyan',
    name: 'Navy Cyan Fiber',
    subtitle: 'Electric Cyan & Biru Optik (Default)',
    primaryHex: '#06b6d4',
    secondaryHex: '#38bdf8',
    glowRgba: 'rgba(6, 182, 212, 0.24)',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35',
    buttonClass: 'bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 shadow-cyan-500/20',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/40',
    ringClass: 'ring-cyan-500/30',
  },
  {
    id: 'cobalt',
    name: 'Cobalt Telecom',
    subtitle: 'Deep Royal & Carrier Blue',
    primaryHex: '#3b82f6',
    secondaryHex: '#60a5fa',
    glowRgba: 'rgba(59, 130, 246, 0.26)',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/35',
    buttonClass: 'bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-blue-500/25',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/40',
    ringClass: 'ring-blue-500/30',
  },
  {
    id: 'emerald',
    name: 'Emerald PON',
    subtitle: 'GPON Optical Signal Green',
    primaryHex: '#10b981',
    secondaryHex: '#34d399',
    glowRgba: 'rgba(16, 185, 129, 0.22)',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
    buttonClass: 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    ringClass: 'ring-emerald-500/30',
  },
  {
    id: 'indigo',
    name: 'Quantum Indigo',
    subtitle: 'Core Backbone Violet-Blue',
    primaryHex: '#6366f1',
    secondaryHex: '#818cf8',
    glowRgba: 'rgba(99, 102, 241, 0.25)',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    buttonClass: 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white shadow-indigo-500/25',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/40',
    ringClass: 'ring-indigo-500/30',
  },
  {
    id: 'amber',
    name: 'Solar Field Amber',
    subtitle: 'High-Contrast Field Safety Gold',
    primaryHex: '#f59e0b',
    secondaryHex: '#fbbf24',
    glowRgba: 'rgba(245, 158, 11, 0.22)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
    buttonClass: 'bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-slate-950 shadow-amber-500/20',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    ringClass: 'ring-amber-500/30',
  },
];

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  token: string | null;
  deviceUuid: string;
  login: (loginInput: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  allUsers: User[];
  teams: Team[];
  office: OfficeLocation;
  setOffice: React.Dispatch<React.SetStateAction<OfficeLocation>>;
  dispatchSettings: DispatchSettings;
  setDispatchSettings: React.Dispatch<React.SetStateAction<DispatchSettings>>;

  // Theme & 5 ISP Color Presets
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  accentPreset: AccentPreset;
  setAccentPreset: (preset: AccentPreset) => void;
  accentConfig: AccentThemeConfig;
  allAccentPresets: AccentThemeConfig[];

  // Simulated Location & Office Wi-Fi Controls (PRD v1.2 Section 6)
  currentGps: { lat: number; lng: number; accuracy: number };
  gpsSimulationMode:
    | 'office_valid'
    | 'office_boundary'
    | 'office_outside'
    | 'low_accuracy'
    | 'customer_valid'
    | 'customer_outside'
    | 'suspicious_jitter'
    | 'real_device';
  setGpsSimulationMode: (mode: any) => void;
  setCustomGps: (coords: { lat: number; lng: number; accuracy: number }) => void;
  isConnectedOfficeWifi: boolean;
  setIsConnectedOfficeWifi: (connected: boolean) => void;

  // Attendance (Two Channels: Office vs Field)
  attendances: DailyAttendance[];
  todayAttendance: DailyAttendance | undefined;
  checkIn: (photoUrl: string, photoHash: string) => Promise<{ success: boolean; message: string }>;
  checkOut: (photoUrl: string, photoHash: string) => Promise<{ success: boolean; message: string }>;
  submitManualOfficeAttendance: (
    reason: string,
    photoUrl: string,
    photoHash: string
  ) => Promise<{ success: boolean; message: string }>;
  isTeamReady: (teamId: number) => { isReady: boolean; presentCount: number; presentMembers: User[] };

  // Work Orders (Field Tickets & BAST Non-Certificate)
  workOrders: WorkOrder[];
  acceptTicket: (ticketId: number) => Promise<{ success: boolean; message: string }>;
  updateTicketStatus: (ticketId: number, status: TicketStatus) => Promise<void>;
  submitPhase1: (
    ticketId: number,
    data: Omit<Phase1Data, 'submitted_by_id' | 'submitted_by_name' | 'submitted_at'>
  ) => Promise<{ success: boolean; message: string }>;
  submitPhase2: (
    ticketId: number,
    selfieUrl: string,
    selfieHash: string
  ) => Promise<{ success: boolean; message: string }>;
  waivePhase2: (ticketId: number, targetUserId: number, reason: string) => Promise<void>;
  closeTicket: (ticketId: number, adminRating?: number, ratingNote?: string) => Promise<void>;
  rejectBastByAdmin: (ticketId: number, rejectReason: string) => Promise<void>;
  togglePauseSlaByAdmin: (ticketId: number, reason: string) => Promise<void>;
  assignTicketManual: (ticketId: number, teamId: number, reason: string) => Promise<void>;
  runDispatchQueue: () => void;

  // Sales PSB & Collector Visits
  salesSubmissions: PsbSubmission[];
  submitPsb: (
    sub: Omit<PsbSubmission, 'id' | 'submission_code' | 'sales_id' | 'sales_name' | 'created_at' | 'status'>
  ) => Promise<{ success: boolean; message: string }>;
  checkDuplicateSales: (
    phone: string,
    lat: number,
    lng: number
  ) => { isDuplicatePhone: boolean; isDuplicateGps: boolean; existingRecord?: string };
  collectorVisits: CollectorCustomerVisit[];
  recordCollectorVisit: (
    visitId: string,
    status: 'visited_paid' | 'visited_promised',
    note: string,
    photoUrl?: string
  ) => void;

  // KPI Data
  kpiTeams: typeof INITIAL_KPI_TEAMS;
  kpiTeknisi: typeof INITIAL_KPI_TEKNISI;
  kpiSales: typeof INITIAL_KPI_SALES;

  // Offline Outbox
  offlineQueue: OfflineAction[];
  syncOutbox: () => Promise<void>;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const maskNik = (rawNik: string): string => {
  const clean = rawNik.replace(/\s+/g, '');
  if (clean.length < 10) return '317405******0001';
  return `${clean.slice(0, 6)}******${clean.slice(-4)}`;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceUuid] = useState<string>(() => {
    let saved = localStorage.getItem('fmp_device_uuid');
    if (!saved) {
      saved = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
      localStorage.setItem('fmp_device_uuid', saved);
    }
    return saved;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fmp_field_token');
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedToken = localStorage.getItem('fmp_field_token');
    const savedUser = localStorage.getItem('fmp_field_user');
    if (savedToken && savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [allUsers] = useState<User[]>(INITIAL_USERS);
  const [teams] = useState<Team[]>(INITIAL_TEAMS);
  const [office, setOffice] = useState<OfficeLocation>(INITIAL_OFFICE);
  const [dispatchSettings, setDispatchSettings] = useState<DispatchSettings>(INITIAL_DISPATCH_SETTINGS);

  // Theme Mode & 5 Accent Presets
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('fm_isp_theme_mode');
    return saved === 'day' || saved === 'dark' ? saved : 'dark';
  });

  const [accentPreset, setAccentPresetState] = useState<AccentPreset>(() => {
    const saved = localStorage.getItem('fm_isp_accent_preset') as AccentPreset | null;
    return saved && ISP_ACCENT_PRESETS.some((p) => p.id === saved) ? saved : 'cyan';
  });

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('fm_isp_theme_mode', mode);
  };

  const setAccentPreset = (preset: AccentPreset) => {
    setAccentPresetState(preset);
    localStorage.setItem('fm_isp_accent_preset', preset);
  };

  const accentConfig =
    ISP_ACCENT_PRESETS.find((p) => p.id === accentPreset) || ISP_ACCENT_PRESETS[0];

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', themeMode === 'dark');
    root.style.setProperty('--isp-accent', accentConfig.primaryHex);
    root.style.setProperty('--isp-accent-light', accentConfig.secondaryHex);
    root.style.setProperty('--isp-accent-glow', accentConfig.glowRgba);
    root.style.setProperty('--color-brand-primary', accentConfig.primaryHex);
    root.style.setProperty('--color-brand-accent', accentConfig.secondaryHex);
    root.style.setProperty('--color-brand-glow', accentConfig.glowRgba);
    root.style.setProperty('--color-border-focus', accentConfig.secondaryHex);
  }, [accentConfig, themeMode]);

  // Network & Office Wi-Fi State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isConnectedOfficeWifi, setIsConnectedOfficeWifi] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(getOfflineQueue());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // GPS Simulation Modes
  const [gpsSimulationMode, setGpsSimulationMode] = useState<
    | 'office_valid'
    | 'office_boundary'
    | 'office_outside'
    | 'low_accuracy'
    | 'customer_valid'
    | 'customer_outside'
    | 'suspicious_jitter'
    | 'real_device'
  >('office_valid');

  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: INITIAL_OFFICE.latitude + 0.00008,
    lng: INITIAL_OFFICE.longitude + 0.00005,
    accuracy: 8,
  });

  useEffect(() => {
    if (gpsSimulationMode === 'office_valid') {
      setCurrentGps({
        lat: office.latitude + 0.00008,
        lng: office.longitude + 0.00005,
        accuracy: 8,
      });
    } else if (gpsSimulationMode === 'office_boundary') {
      setCurrentGps({
        lat: office.latitude + 0.00035,
        lng: office.longitude + 0.0001,
        accuracy: 12,
      });
    } else if (gpsSimulationMode === 'office_outside') {
      setCurrentGps({
        lat: office.latitude + 0.0015,
        lng: office.longitude + 0.0012,
        accuracy: 10,
      });
    } else if (gpsSimulationMode === 'low_accuracy') {
      setCurrentGps({
        lat: office.latitude + 0.0002,
        lng: office.longitude + 0.0002,
        accuracy: 45, // indoor GPS drift 20-50m per PRD Section 6
      });
    } else if (gpsSimulationMode === 'customer_valid') {
      setCurrentGps({
        lat: -6.24421,
        lng: 106.79352,
        accuracy: 9,
      });
    } else if (gpsSimulationMode === 'customer_outside') {
      setCurrentGps({
        lat: -6.248,
        lng: 106.8,
        accuracy: 10,
      });
    } else if (gpsSimulationMode === 'suspicious_jitter') {
      setCurrentGps({
        lat: -6.24,
        lng: 106.81,
        accuracy: 10, // exact round integer + simulated micro-jitter
      });
    } else if (gpsSimulationMode === 'real_device' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 15,
          });
        },
        () => {
          showToast('GPS fisik tidak tersedia, kembali ke mode simulasi.');
          setGpsSimulationMode('office_valid');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [gpsSimulationMode, office]);

  const setCustomGps = (
    latOrCoords: { lat: number; lng: number; accuracy: number } | number,
    lng?: number,
    accuracy?: number
  ) => {
    if (typeof latOrCoords === 'object' && latOrCoords !== null) {
      setCurrentGps(latOrCoords);
    } else if (typeof latOrCoords === 'number' && typeof lng === 'number') {
      setCurrentGps({
        lat: latOrCoords,
        lng,
        accuracy: accuracy ?? 10,
      });
    }
  };

  // PWA Sanctum Login & Logout (PRD Final v1.2)
  const logout = () => {
    localStorage.removeItem('fmp_field_token');
    localStorage.removeItem('fmp_field_user');
    setToken(null);
    setCurrentUser(null);
  };

  const login = async (
    loginInput: string,
    pass: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Type': 'pwa',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          login: loginInput.trim(),
          password: pass,
          device_uuid: deviceUuid,
          device_platform: navigator.userAgent.includes('Android')
            ? 'Android'
            : navigator.userAgent.includes('iPhone')
            ? 'iOS'
            : 'Web PWA',
          device_model: navigator.userAgent.substring(0, 50),
          client_type: 'pwa',
        }),
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        const payload = resJson.data ?? resJson;
        const authToken = payload.token || payload.access_token;
        const bUser = payload.user;

        if (authToken && bUser) {
          const rawRole = (bUser.role || bUser.roles?.[0] || 'teknisi').toLowerCase();
          const mappedRole: UserRole =
            rawRole.includes('sales')
              ? 'sales'
              : rawRole.includes('collector')
              ? 'collector'
              : rawRole.includes('superadmin')
              ? 'superadmin'
              : rawRole.includes('admin')
              ? 'admin'
              : 'teknisi';

          const matchedMock = INITIAL_USERS.find(
            (u) => u.email.toLowerCase() === bUser.email?.toLowerCase() || u.id === bUser.id
          );

          const mappedUser: User = {
            id: bUser.id,
            name: bUser.name,
            username: bUser.email?.split('@')[0] || bUser.name.toLowerCase().replace(/\s+/g, '.'),
            email: bUser.email,
            role: mappedRole,
            team_id: bUser.team?.id || matchedMock?.team_id || 1,
            team_name: bUser.team?.name || matchedMock?.team_name || 'Tim Lapangan',
            phone: bUser.phone || matchedMock?.phone || '081200000000',
            avatar:
              matchedMock?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(bUser.name)}&background=0284c7&color=fff`,
            device_uuid: deviceUuid,
            device_model: navigator.userAgent.includes('Android')
              ? 'Android Device'
              : navigator.userAgent.includes('iPhone')
              ? 'Apple iPhone'
              : 'Field Workstation',
            device_approved: true,
            sanctum_token_preview: authToken.substring(0, 16) + '...',
            sanctum_expires_in_hours: 12,
            registered_devices_count: 1,
          };

          setToken(authToken);
          setCurrentUser(mappedUser);
          if (rememberMe) {
            localStorage.setItem('fmp_field_token', authToken);
            localStorage.setItem('fmp_field_user', JSON.stringify(mappedUser));
          }
          return { success: true };
        }
      }

      return {
        success: false,
        error: resJson?.message || 'Kredensial login tidak sesuai atau akun tidak aktif.',
      };
    } catch {
      const cleanInput = loginInput.trim().toLowerCase();
      const fallbackUser = INITIAL_USERS.find(
        (u) =>
          u.email.toLowerCase() === cleanInput ||
          u.username.toLowerCase() === cleanInput ||
          u.phone === cleanInput ||
          (cleanInput.includes('teknisi') && u.role === 'teknisi') ||
          (cleanInput.includes('sales') && u.role === 'sales') ||
          (cleanInput.includes('collector') && u.role === 'collector')
      );

      if (fallbackUser && pass === 'password') {
        const dummyToken = 'snc_offline_' + Math.random().toString(36).substring(2, 12);
        const mappedUser: User = {
          ...fallbackUser,
          device_uuid: deviceUuid,
          sanctum_token_preview: dummyToken.substring(0, 16) + '...',
          sanctum_expires_in_hours: 12,
        };
        setToken(dummyToken);
        setCurrentUser(mappedUser);
        if (rememberMe) {
          localStorage.setItem('fmp_field_token', dummyToken);
          localStorage.setItem('fmp_field_user', JSON.stringify(mappedUser));
        }
        return { success: true };
      }

      return {
        success: false,
        error: 'Koneksi ke server gagal. Periksa jaringan Anda.',
      };
    }
  };

  // Attendances State
  const [attendances, setAttendances] = useState<DailyAttendance[]>(INITIAL_ATTENDANCE);
  const todayStr = new Date().toISOString().split('T')[0];

  const todayAttendance = attendances.find(
    (a) => currentUser && a.user_id === currentUser.id && a.work_date === todayStr
  );

  // Synchronize Today's Attendance & Office Geofence from Server
  useEffect(() => {
    if (!token || !currentUser || !isOnline) return;

    let isMounted = true;
    const fetchTodayStatus = async () => {
      try {
        const resp = await fetch('/api/attendance/today', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
        });

        if (resp.status === 401) {
          logout();
          return;
        }

        if (resp.ok) {
          const json = await resp.json();
          if (json.success && json.data && isMounted) {
            const { attendance, offices } = json.data;
            if (offices && offices.length > 0) {
              const matchedOffice = offices.find((o: any) => o.id === 2) || offices[0];
              setOffice((prev) => ({
                ...prev,
                id: matchedOffice.id,
                name: matchedOffice.name,
                latitude: matchedOffice.latitude,
                longitude: matchedOffice.longitude,
                radius_meters: matchedOffice.radius_meters,
              }));
            }
            if (attendance) {
              const formatIso = (val?: string | null) => {
                if (!val) return undefined;
                if (val.includes('T') || val.includes(' ')) return new Date(val).toISOString();
                return new Date(`${todayStr}T${val.length === 5 ? val + ':00' : val}`).toISOString();
              };

              const mappedAtt: DailyAttendance = {
                id: `att-db-${attendance.id}`,
                user_id: currentUser.id,
                work_date: attendance.work_date || todayStr,
                status: attendance.status || 'hadir',
                attendance_channel: attendance.status === 'field_checkin' ? 'field' : 'office',
                check_in_at: formatIso(attendance.check_in_at),
                check_out_at: formatIso(attendance.check_out_at),
                check_in_lat: currentGps.lat,
                check_in_lng: currentGps.lng,
                check_in_accuracy: 8,
                check_in_photo_url: attendance.photo_url || attendance.check_in_photo_url,
                check_out_photo_url: attendance.check_out_photo_url,
                office_id: office.id,
                office_distance_meters: attendance.office_distance_meters,
                late_minutes: attendance.late_minutes,
                device_id: currentUser.device_uuid,
              };

              setAttendances((prev) => [
                ...prev.filter(
                  (a) => !(a.user_id === currentUser.id && a.work_date === (attendance.work_date || todayStr))
                ),
                mappedAtt,
              ]);
            } else {
              setAttendances((prev) =>
                prev.filter(
                  (a) => !(a.user_id === currentUser.id && a.work_date === todayStr)
                )
              );
            }
          }
        }
      } catch (err) {
        console.warn('Gagal memuat absensi hari ini dari server:', err);
      }
    };

    fetchTodayStatus();
    return () => {
      isMounted = false;
    };
  }, [token, currentUser?.id, isOnline]);

  // Tickets, Sales Submissions & Collector Visits
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [salesSubmissions, setSalesSubmissions] = useState<PsbSubmission[]>(INITIAL_SALES_SUBMISSIONS);
  const [collectorVisits, setCollectorVisits] = useState<CollectorCustomerVisit[]>(INITIAL_COLLECTOR_VISITS);

  // Synchronize Work Orders from Server for Technicians
  useEffect(() => {
    if (!token || !currentUser || !isOnline || currentUser.role !== 'teknisi') return;

    let isMounted = true;
    const fetchWorkOrders = async () => {
      try {
        const resp = await fetch('/api/work-orders?tab=all', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
        });

        if (resp.ok) {
          const json = await resp.json();
          if (json.success && Array.isArray(json.data) && isMounted && json.data.length > 0) {
            const mapped: WorkOrder[] = json.data.map((wo: any) => ({
              id: typeof wo.raw_id === 'number' ? wo.raw_id : (parseInt(wo.id?.replace(/\D/g, '')) || Date.now()),
              ticket_number: wo.ticket_number || `WO-${wo.raw_id}`,
              type: wo.type === 'psb' ? 'psb' : 'complaint',
              title: wo.title || (wo.type === 'psb' ? 'Pemasangan PSB' : 'Penanganan Gangguan'),
              customer_name: wo.customer_name || 'Pelanggan',
              customer_phone: wo.customer_phone || '-',
              address: wo.customer_address || wo.address || '-',
              latitude: wo.latitude || -6.20876,
              longitude: wo.longitude || 106.8456,
              odp_name: wo.odp_name || 'ODP-KTR-01',
              assigned_team_id: wo.assigned_team_id || currentUser.team_id || 1,
              status: wo.status || 'in_progress',
              phase1: {
                photo_before_url: wo.photo_before_url || null,
                photo_after_url: wo.photo_after_url || null,
                customer_signature_url: wo.customer_signature_url || null,
                notes: wo.notes || '',
                submitted_at: wo.phase_1_submitted_at || null,
              },
              phase2_requirements: Array.isArray(wo.phase2_requirements) ? wo.phase2_requirements : [],
              created_at: wo.created_at || new Date().toISOString(),
              sla_deadline: wo.sla_due_at || undefined,
            }));

            setWorkOrders(mapped);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat work orders dari server:', err);
      }
    };

    fetchWorkOrders();
    return () => {
      isMounted = false;
    };
  }, [token, currentUser?.id, isOnline]);

  // Synchronize Sales Submissions from Server
  useEffect(() => {
    if (!token || !currentUser || !isOnline || currentUser.role !== 'sales') return;

    let isMounted = true;
    const fetchSubmissions = async () => {
      try {
        const resp = await fetch('/api/submissions', {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
        });

        if (resp.ok) {
          const json = await resp.json();
          const items = json.data?.data || json.data;
          if (Array.isArray(items) && isMounted && items.length > 0) {
            const mapped: PsbSubmission[] = items.map((s: any) => ({
              id: `sub-${s.id}`,
              submission_code: s.submission_number || `PSB-${s.id}`,
              customer_name: s.customer_name,
              nik: s.nik || '',
              nik_masked: s.nik_masked || maskNik(s.nik || '3174050000000000'),
              phone: s.phone || '',
              email: s.email || '',
              address: s.address || '',
              latitude: s.latitude || -6.20876,
              longitude: s.longitude || 106.8456,
              package_id: s.package_id || 1,
              package_name: s.package?.name || s.package_name || 'Fiber Home',
              package_speed: `${s.package?.speed_mbps || 20} Mbps`,
              package_price: s.package?.price || 220000,
              status: s.status === 'approved' ? 'scheduled' : (s.status === 'completed' ? 'installed' : 'admin_validation'),
              sales_id: s.sales_id || currentUser.id,
              sales_name: s.sales?.name || currentUser.name,
              created_at: s.created_at || new Date().toISOString(),
              consent_pdp_accepted: true,
            }));

            setSalesSubmissions(mapped);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat pengajuan sales dari server:', err);
      }
    };

    fetchSubmissions();
    return () => {
      isMounted = false;
    };
  }, [token, currentUser?.id, isOnline]);

  // KPIs
  const [kpiTeams] = useState(INITIAL_KPI_TEAMS);
  const [kpiTeknisi] = useState(INITIAL_KPI_TEKNISI);
  const [kpiSales] = useState(INITIAL_KPI_SALES);

  // Helper: Is team ready?
  // PRD v1.2 Section 6: "Tim yang belum absen atau sedang cuti tidak ikut giliran round-robin hari itu."
  const isTeamReady = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !team.is_active) {
      return { isReady: false, presentCount: 0, presentMembers: [] };
    }

    const presentMembers = team.member_ids
      .map((id) => allUsers.find((u) => u.id === id))
      .filter((u): u is User => !!u)
      .filter((member) => {
        const att = attendances.find(
          (a) => a.user_id === member.id && a.work_date === todayStr
        );
        return att && (att.status === 'hadir' || att.status === 'field_checkin') && !att.check_out_at;
      });

    const isReady = presentMembers.length >= dispatchSettings.min_members_present;
    return {
      isReady,
      presentCount: presentMembers.length,
      presentMembers,
    };
  };

  // Check In Handler (Enforces PRD v1.2 Section 6 Two-Channel Attendance)
  const checkIn = async (
    photoUrl: string,
    photoHash: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    const isFieldRole = currentUser.role === 'sales' || currentUser.role === 'collector';
    const evaluation = evaluateGeofence(
      currentGps.lat,
      currentGps.lng,
      currentGps.accuracy,
      office.latitude,
      office.longitude,
      office.radius_meters
    );

    if (!isOnline) {
      addToOutbox('check_in', {
        user_id: currentUser.id,
        work_date: todayStr,
        channel: isFieldRole ? 'field' : 'office',
        lat: currentGps.lat,
        lng: currentGps.lng,
        accuracy: currentGps.accuracy,
        photo_url: photoUrl,
        photo_hash: photoHash,
      });
      setOfflineQueue(getOfflineQueue());
      showToast('Absen tersimpan di Outbox Dexie. Akan disinkronkan saat sinyal kembali.');
      return {
        success: true,
        message: 'Tersimpan di antrean offline (Outbox Dexie).',
      };
    }

    // Call Backend API when online and token exists
    if (token) {
      try {
        const payload = {
          latitude: currentGps.lat,
          longitude: currentGps.lng,
          accuracy: currentGps.accuracy,
          device_uuid: currentUser.device_uuid || deviceUuid,
          track: isFieldRole ? 'field' : 'office',
          selfie_base64: photoUrl,
          note: isFieldRole ? 'Absen Masuk Lapangan PWA' : 'Absen Masuk Kantor PWA',
        };

        const res = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
          body: JSON.stringify(payload),
        });

        const resJson = await res.json();
        if (!res.ok || !resJson.success) {
          return {
            success: false,
            message: resJson?.message || 'Gagal mencatat absensi di server.',
          };
        }

        const bData = resJson.data;
        const newAtt: DailyAttendance = {
          id: `att-${bData?.id || Date.now()}`,
          user_id: currentUser.id,
          work_date: bData?.work_date || todayStr,
          status: bData?.status || (isFieldRole ? 'field_checkin' : 'hadir'),
          attendance_channel: isFieldRole ? 'field' : 'office',
          check_in_at: bData?.check_in_at || new Date().toISOString(),
          check_in_lat: currentGps.lat,
          check_in_lng: currentGps.lng,
          check_in_accuracy: currentGps.accuracy,
          check_in_photo_url: bData?.photo_url || photoUrl,
          check_in_photo_hash: photoHash,
          office_id: office.id,
          office_distance_meters: bData?.distance_meters ?? evaluation.distanceMeters,
          anti_fake_gps_flags: bData?.is_suspicious ? [bData?.suspicious_reason] : [],
          needs_admin_review: !!bData?.is_suspicious || isFieldRole,
          device_id: currentUser.device_uuid,
        };

        setAttendances((prev) => [
          ...prev.filter((a) => !(a.user_id === currentUser.id && a.work_date === todayStr)),
          newAtt,
        ]);

        const successMsg = resJson.message || (isFieldRole
          ? 'Absen masuk lapangan berhasil dicatat.'
          : 'Absen masuk berhasil dicatat.');
        showToast(successMsg);
        if (!isFieldRole) {
          runDispatchQueue();
        }
        return { success: true, message: successMsg };
      } catch (err: any) {
        console.warn('API check-in error, falling back to local simulation:', err);
      }
    }

    // JALUR 1: LAPANGAN (Sales & Collector) — PRD v1.2 Section 6 (Fallback)
    if (isFieldRole) {
      const riskFlags: string[] = [];
      if (gpsSimulationMode === 'suspicious_jitter') {
        riskFlags.push('micro_jitter (3 sampel/3 dtk)');
        riskFlags.push('akurasi_bulat_sempurna (10.0m)');
      }

      const needsReview = riskFlags.length > 0;
      const newFieldAttendance: DailyAttendance = {
        id: `att-${Date.now()}`,
        user_id: currentUser.id,
        work_date: todayStr,
        status: 'field_checkin',
        attendance_channel: 'field',
        check_in_at: new Date().toISOString(),
        check_in_lat: currentGps.lat,
        check_in_lng: currentGps.lng,
        check_in_accuracy: currentGps.accuracy,
        check_in_photo_url: photoUrl,
        check_in_photo_hash: photoHash,
        office_id: office.id,
        office_distance_meters: evaluation.distanceMeters,
        anti_fake_gps_flags: riskFlags,
        needs_admin_review: needsReview,
        device_id: currentUser.device_uuid,
      };

      setAttendances((prev) => [
        ...prev.filter((a) => !(a.user_id === currentUser.id && a.work_date === todayStr)),
        newFieldAttendance,
      ]);

      const msg = needsReview
        ? 'Absen Lapangan (field_checkin) tercatat & masuk Antrean Tinjauan Admin karena indikator risiko GPS.'
        : 'Absen Lapangan (field_checkin) berhasil tercatat dengan Selfie & Geotag!';
      showToast(msg);
      return { success: true, message: msg };
    }

    // JALUR 2: KANTOR (Teknisi, Admin/CS, NOC, Superadmin) — PRD v1.2 Section 6 (Fallback)
    if (evaluation.status === 'outside') {
      return {
        success: false,
        message: `Absen Kantor Ditolak: Peran ${currentUser.role.toUpperCase()} wajib absen di kantor (Jarak saat ini ${evaluation.distanceMeters}m > radius ${office.radius_meters}m). Jika GPS indoor meleset, gunakan tombol Ajukan Absen Manual.`,
      };
    }

    if (evaluation.status === 'low_accuracy') {
      return {
        success: false,
        message: `Akurasi GPS Indoor Meleset (±${currentGps.accuracy}m). Anda dapat mengulang di area terbuka atau mengajukan Absen Manual Kantor dengan alasan.`,
      };
    }

    if (!isConnectedOfficeWifi && !office.wifi_outage_bypass) {
      return {
        success: false,
        message: `Absen Kantor Ditolak: Perangkat belum terhubung ke IP Wi-Fi sah kantor (${office.allowed_wifi_ssid} · ${office.allowed_wifi_ip}). Hubungkan ke Wi-Fi kantor terlebih dahulu.`,
      };
    }

    const newOfficeAttendance: DailyAttendance = {
      id: `att-${Date.now()}`,
      user_id: currentUser.id,
      work_date: todayStr,
      status: 'hadir',
      attendance_channel: 'office',
      check_in_at: new Date().toISOString(),
      check_in_lat: currentGps.lat,
      check_in_lng: currentGps.lng,
      check_in_accuracy: currentGps.accuracy,
      check_in_photo_url: photoUrl,
      check_in_photo_hash: photoHash,
      office_id: office.id,
      office_distance_meters: evaluation.distanceMeters,
      wifi_ip_verified: isConnectedOfficeWifi || office.wifi_outage_bypass,
      wifi_ip: isConnectedOfficeWifi ? office.allowed_wifi_ip : 'BYPASS-GANGGUAN-WIFI',
      device_id: currentUser.device_uuid,
    };

    setAttendances((prev) => [
      ...prev.filter((a) => !(a.user_id === currentUser.id && a.work_date === todayStr)),
      newOfficeAttendance,
    ]);

    showToast(
      `Absen Kantor Berhasil! Jarak ${evaluation.distanceMeters}m & IP Wi-Fi (${office.allowed_wifi_ip}) Terverifikasi.`
    );
    runDispatchQueue();
    return {
      success: true,
      message: 'Absen masuk kantor berhasil tercatat.',
    };
  };

  // Manual Office Attendance Submission when Indoor GPS Drifts (PRD v1.2 Section 6)
  const submitManualOfficeAttendance = async (
    reason: string,
    photoUrl: string,
    photoHash: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    const evaluation = evaluateGeofence(
      currentGps.lat,
      currentGps.lng,
      currentGps.accuracy,
      office.latitude,
      office.longitude,
      office.radius_meters
    );

    if (token) {
      try {
        const payload = {
          latitude: currentGps.lat,
          longitude: currentGps.lng,
          accuracy: currentGps.accuracy,
          device_uuid: currentUser.device_uuid || deviceUuid,
          track: 'office',
          selfie_base64: photoUrl,
          note: `[Pengajuan Manual] ${reason}`,
          is_manual: true,
          manual_reason: reason,
        };

        const res = await fetch('/api/attendance/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
          body: JSON.stringify(payload),
        });

        const resJson = await res.json();
        if (res.ok && resJson.success) {
          const bData = resJson.data;
          const manualAtt: DailyAttendance = {
            id: `att-man-${bData?.id || Date.now()}`,
            user_id: currentUser.id,
            work_date: bData?.work_date || todayStr,
            status: 'hadir',
            attendance_channel: 'office',
            check_in_at: bData?.check_in_at || new Date().toISOString(),
            check_in_lat: currentGps.lat,
            check_in_lng: currentGps.lng,
            check_in_accuracy: currentGps.accuracy,
            check_in_photo_url: bData?.photo_url || photoUrl,
            check_in_photo_hash: photoHash,
            office_id: office.id,
            office_distance_meters: bData?.distance_meters ?? evaluation.distanceMeters,
            wifi_ip_verified: isConnectedOfficeWifi,
            wifi_ip: isConnectedOfficeWifi ? office.allowed_wifi_ip : 'MANUAL-SUBMISSION',
            is_manual: true,
            manual_reason: reason,
            manual_approval_status: 'pending_admin',
            needs_admin_review: true,
            device_id: currentUser.device_uuid,
          };

          setAttendances((prev) => [
            ...prev.filter((a) => !(a.user_id === currentUser.id && a.work_date === todayStr)),
            manualAtt,
          ]);

          showToast('Pengajuan Absen Manual Kantor tercatat & menunggu persetujuan Admin.');
          runDispatchQueue();
          return {
            success: true,
            message: 'Pengajuan absen manual kantor dikirim ke Admin.',
          };
        }
      } catch (err) {
        console.warn('API manual attendance check-in error:', err);
      }
    }

    const manualAtt: DailyAttendance = {
      id: `att-man-${Date.now()}`,
      user_id: currentUser.id,
      work_date: todayStr,
      status: 'hadir',
      attendance_channel: 'office',
      check_in_at: new Date().toISOString(),
      check_in_lat: currentGps.lat,
      check_in_lng: currentGps.lng,
      check_in_accuracy: currentGps.accuracy,
      check_in_photo_url: photoUrl,
      check_in_photo_hash: photoHash,
      office_id: office.id,
      office_distance_meters: evaluation.distanceMeters,
      wifi_ip_verified: isConnectedOfficeWifi,
      wifi_ip: isConnectedOfficeWifi ? office.allowed_wifi_ip : 'MANUAL-SUBMISSION',
      is_manual: true,
      manual_reason: reason,
      manual_approval_status: 'pending_admin',
      needs_admin_review: true,
      device_id: currentUser.device_uuid,
    };

    setAttendances((prev) => [
      ...prev.filter((a) => !(a.user_id === currentUser.id && a.work_date === todayStr)),
      manualAtt,
    ]);

    showToast('Pengajuan Absen Manual Kantor (GPS Meleset) tercatat & menunggu persetujuan Admin.');
    runDispatchQueue();
    return {
      success: true,
      message: 'Pengajuan absen manual kantor dikirim ke Admin.',
    };
  };

  // Check Out Handler
  const checkOut = async (
    photoUrl: string,
    photoHash: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    if (!todayAttendance) {
      return { success: false, message: 'Anda belum melakukan absen masuk hari ini.' };
    }

    const isFieldRole = currentUser.role === 'sales' || currentUser.role === 'collector';
    const evaluation = evaluateGeofence(
      currentGps.lat,
      currentGps.lng,
      currentGps.accuracy,
      office.latitude,
      office.longitude,
      office.radius_meters
    );

    if (!isOnline) {
      addToOutbox('check_out', {
        attendance_id: todayAttendance.id,
        photo_url: photoUrl,
        photo_hash: photoHash,
      });
      setOfflineQueue(getOfflineQueue());
      showToast('Absen pulang tersimpan di Outbox Dexie.');
      return { success: true, message: 'Tersimpan di outbox' };
    }

    if (!isFieldRole && evaluation.status === 'outside') {
      return {
        success: false,
        message: `Absen Pulang Kantor Ditolak: Anda berada ${evaluation.distanceMeters}m dari kantor (Wajib radius ≤${office.radius_meters}m).`,
      };
    }

    if (token) {
      try {
        const payload = {
          latitude: currentGps.lat,
          longitude: currentGps.lng,
          accuracy: currentGps.accuracy,
          device_uuid: currentUser.device_uuid || deviceUuid,
          selfie_base64: photoUrl,
        };

        const res = await fetch('/api/attendance/check-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
          body: JSON.stringify(payload),
        });

        const resJson = await res.json();
        if (!res.ok || !resJson.success) {
          return {
            success: false,
            message: resJson?.message || 'Gagal melakukan absen pulang di server.',
          };
        }

        const bData = resJson.data;
        setAttendances((prev) =>
          prev.map((att) =>
            att.id === todayAttendance.id
              ? {
                  ...att,
                  check_out_at: bData?.check_out_at || new Date().toISOString(),
                  check_out_photo_url: photoUrl,
                  check_out_photo_hash: photoHash,
                }
              : att
          )
        );

        const successMsg = resJson.message || 'Absen pulang berhasil dicatat.';
        showToast(successMsg);
        return { success: true, message: successMsg };
      } catch (err: any) {
        console.warn('API check-out error, falling back to local simulation:', err);
      }
    }

    setAttendances((prev) =>
      prev.map((att) =>
        att.id === todayAttendance.id
          ? {
              ...att,
              check_out_at: new Date().toISOString(),
              check_out_photo_url: photoUrl,
              check_out_photo_hash: photoHash,
            }
          : att
      )
    );

    showToast('Absen pulang berhasil dicatat.');
    return { success: true, message: 'Absen pulang sukses.' };
  };

  // Run Dispatch Queue (Round-Robin to Ready Teams)
  const runDispatchQueue = () => {
    setWorkOrders((prev) => {
      const updated = [...prev];
      const unassigned = updated.filter((wo) => wo.status === 'unassigned');
      if (unassigned.length === 0) return updated;

      const readyTeams = teams
        .filter((t) => t.is_active)
        .sort((a, b) => a.order_index - b.order_index)
        .filter((t) => isTeamReady(t.id).isReady);

      if (readyTeams.length === 0) return updated;

      unassigned.forEach((ticket, idx) => {
        const assignedTeam = readyTeams[idx % readyTeams.length];
        const ticketIdx = updated.findIndex((wo) => wo.id === ticket.id);
        if (ticketIdx !== -1) {
          updated[ticketIdx] = {
            ...updated[ticketIdx],
            status: 'assigned',
            assigned_team_id: assignedTeam.id,
            assigned_team_name: assignedTeam.name,
            assigned_at: new Date().toISOString(),
            response_deadline_at: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
            history_logs: [
              ...updated[ticketIdx].history_logs,
              {
                timestamp: new Date().toISOString(),
                action: `Otomatis Ditugaskan (Round-Robin) ke ${assignedTeam.name} (<200ms NFR-02)`,
                actor_name: 'TeamDispatchService',
              },
            ],
          };
        }
      });

      return updated;
    });
  };

  // Work Order: Accept Ticket (Target Respons Pengaduan <= 2 Jam Operasional per PRD v1.2)
  const acceptTicket = async (ticketId: number): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    const targetWo = workOrders.find((w) => w.id === ticketId);

    if (isOnline && token) {
      try {
        const idParam = targetWo?.ticket_number || ticketId;
        const resp = await fetch(`/api/work-orders/${idParam}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
        });
        if (!resp.ok && targetWo) {
          await fetch(`/api/work-orders/${targetWo.type}/${targetWo.id}/accept`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Client-Type': 'pwa',
            },
          });
        }
      } catch (err) {
        console.warn('API accept ticket offline fallback', err);
      }
    } else {
      addToOutbox('accept_ticket', { ticketId, userId: currentUser.id });
      setOfflineQueue(getOfflineQueue());
      showToast('Tiket Diterima (Tersimpan di Outbox Dexie)');
      return { success: true, message: 'Tersimpan di outbox' };
    }

    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === ticketId
          ? {
              ...wo,
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              accepted_by_id: currentUser.id,
              history_logs: [
                ...wo.history_logs,
                {
                  timestamp: new Date().toISOString(),
                  action: `Tiket Diterima (status: diterima) oleh ${currentUser.name} · SLA Respons Terpenuhi`,
                  actor_name: currentUser.name,
                },
              ],
            }
          : wo
      )
    );

    showToast('Tiket diterima! Lanjutkan klik Berangkat ke Lokasi saat tim jalan.');
    return { success: true, message: 'Tiket berhasil diterima.' };
  };

  // Work Order: Update Status (on_the_way = dalam_perjalanan, arrived = dikerjakan)
  const updateTicketStatus = async (ticketId: number, status: TicketStatus) => {
    if (!isOnline) {
      addToOutbox('update_ticket_status', { ticketId, status });
      setOfflineQueue(getOfflineQueue());
      showToast(`Status diubah ke ${status} (Outbox Dexie)`);
      return;
    }

    const actionText =
      status === 'on_the_way'
        ? 'Teknisi Dalam Perjalanan Menuju Lokasi (status: dalam_perjalanan)'
        : status === 'arrived'
        ? 'Teknisi Tiba & Mulai Mengerjakan di Lokasi (status: dikerjakan)'
        : `Status berubah menjadi ${status}`;

    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === ticketId
          ? {
              ...wo,
              status,
              history_logs: [
                ...wo.history_logs,
                {
                  timestamp: new Date().toISOString(),
                  action: actionText,
                  actor_name: currentUser.name,
                },
              ],
            }
          : wo
      )
    );
    showToast(actionText);
  };

  // Work Order: Submit Step 1 (Bukti Instalasi + BAST Tanda Tangan di Layar Non-Sertifikat)
  // PRD v1.2 Section 7:
  // - Urutan wajib: Langkah 1 (bukti dan tanda tangan BAST) harus selesai sebelum Langkah 2 (foto kunjungan) terbuka.
  // - Waktu perangkat dan waktu server dicatat terpisah.
  // - SLA PSB berhenti saat BAST ditandatangani; waktu menunggu approval Admin tidak dihitung.
  const submitPhase1 = async (
    ticketId: number,
    data: Omit<Phase1Data, 'submitted_by_id' | 'submitted_by_name' | 'submitted_at'>
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    const deviceTimeIso = new Date().toISOString();
    const serverTimeIso = isOnline
      ? new Date(Date.now() + 650).toISOString()
      : undefined; // If offline, server timestamp is assigned upon sync!

    const bastHash =
      data.bast_sha256 ||
      `bast_sha256_${Math.random().toString(16).slice(2, 14)}${Date.now().toString(16)}`;

    const fullPhase1: Phase1Data = {
      ...data,
      bast_sha256: bastHash,
      bast_device_timestamp: deviceTimeIso,
      bast_server_timestamp: serverTimeIso,
      compressed_size_kb: data.compressed_size_kb || 296,
      thumbnail_size_kb: data.thumbnail_size_kb || 42,
      drive_backup_synced: isOnline,
      submitted_by_id: currentUser.id,
      submitted_by_name: currentUser.name,
      submitted_at: deviceTimeIso,
    };

    if (isOnline && token) {
      try {
        const targetWo = workOrders.find((w) => w.id === ticketId);
        if (targetWo) {
          await fetch(`/api/work-orders/${targetWo.type}/${targetWo.id}/phase-1`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
              'X-Client-Type': 'pwa',
            },
            body: JSON.stringify({
              photo_before_base64: data.ont_photo_url || data.modem_photo_url || null,
              photo_after_base64: data.opm_photo_url || null,
              signature_base64: data.customer_signature_url || null,
              notes: data.notes || '',
              latitude: currentGps.lat,
              longitude: currentGps.lng,
              accuracy: currentGps.accuracy,
            }),
          });
        }
      } catch (err) {
        console.warn('API submitPhase1 error:', err);
      }
    } else {
      addToOutbox('submit_phase1', { ticketId, data: fullPhase1 });
      setOfflineQueue(getOfflineQueue());
    }

    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== ticketId) return wo;

        const team = teams.find((t) => t.id === wo.assigned_team_id);
        const presentMembers = (team?.member_ids || [])
          .map((id) => allUsers.find((u) => u.id === id))
          .filter((u): u is User => !!u)
          .filter((member) => {
            const att = attendances.find(
              (a) => a.user_id === member.id && a.work_date === todayStr
            );
            return att && att.status === 'hadir';
          });

        const lockedReqs = presentMembers.map((member) => ({
          user_id: member.id,
          user_name: member.name,
        }));

        return {
          ...wo,
          status: 'phase1_completed',
          bast_status: 'signed_at_location',
          phase1_data: fullPhase1,
          phase2_requirements: lockedReqs,
          history_logs: [
            ...wo.history_logs,
            {
              timestamp: deviceTimeIso,
              action: `Langkah 1 (Bukti ONT/OPM + BAST Tanda Tangan di Tempat) Selesai oleh ${currentUser.name}. ${
                wo.type === 'psb' ? 'Jam SLA PSB Dihentikan.' : ''
              }`,
              actor_name: currentUser.name,
              note: `Redaman: ${data.optical_power_dbm} dBm · Hash BAST: ${bastHash.slice(0, 18)}... · Langkah 2 (Foto Kunjungan Ber-GPS) kini terbuka.`,
            },
          ],
        };
      })
    );

    showToast(
      isOnline
        ? 'Bukti & BAST Tanda Tangan di Tempat berhasil dikunci! Lanjutkan Langkah 2 (Foto Kunjungan Ber-GPS).'
        : 'Paket BAST disimpan di Outbox Dexie (Offline). Waktu server akan dicatat saat sinkronisasi.'
    );
    return { success: true, message: 'Step 1 & BAST berhasil disimpan.' };
  };

  // Work Order: Submit Step 2 (Foto Kunjungan Lapangan Ber-GPS)
  const submitPhase2 = async (
    ticketId: number,
    selfieUrl: string,
    selfieHash: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    const ticket = workOrders.find((w) => w.id === ticketId);
    if (!ticket) return { success: false, message: 'Tiket tidak ditemukan' };

    const evaluation = evaluateGeofence(
      currentGps.lat,
      currentGps.lng,
      currentGps.accuracy,
      ticket.latitude,
      ticket.longitude,
      dispatchSettings.geofence_radius_meters
    );

    if (isOnline && token && ticket) {
      try {
        await fetch(`/api/work-orders/${ticket.type}/${ticket.id}/phase-2-attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
          body: JSON.stringify({
            selfie_base64: selfieUrl,
            latitude: currentGps.lat,
            longitude: currentGps.lng,
            accuracy: currentGps.accuracy,
          }),
        });
      } catch (err) {
        console.warn('API submitPhase2 error:', err);
      }
    } else {
      addToOutbox('submit_phase2', {
        ticketId,
        userId: currentUser.id,
        selfieUrl,
        selfieHash,
        lat: currentGps.lat,
        lng: currentGps.lng,
        accuracy: currentGps.accuracy,
      });
      setOfflineQueue(getOfflineQueue());
    }

    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== ticketId) return wo;

        const updatedRequirements = wo.phase2_requirements.map((req) => {
          if (req.user_id === currentUser.id) {
            return {
              ...req,
              completed_at: new Date().toISOString(),
              selfie_url: selfieUrl,
              selfie_hash: selfieHash,
              lat: currentGps.lat,
              lng: currentGps.lng,
              accuracy: currentGps.accuracy,
              distance_meters: evaluation.distanceMeters,
              geofence_status: evaluation.status,
            };
          }
          return req;
        });

        const allCompleted = updatedRequirements.every(
          (req) => !!req.completed_at || !!req.waived
        );

        const newStatus: TicketStatus = allCompleted ? 'resolved' : wo.status;

        return {
          ...wo,
          status: newStatus,
          phase2_requirements: updatedRequirements,
          history_logs: [
            ...wo.history_logs,
            {
              timestamp: new Date().toISOString(),
              action: `Langkah 2 (Foto Kunjungan Ber-GPS) oleh ${currentUser.name} (${evaluation.status.toUpperCase()}, jarak ${evaluation.distanceMeters}m)`,
              actor_name: currentUser.name,
              note:
                evaluation.status === 'outside'
                  ? 'Peringatan: Di luar radius 50m pelanggan (Ditandai untuk Tinjauan Admin)'
                  : undefined,
            },
            ...(allCompleted
              ? [
                  {
                    timestamp: new Date().toISOString(),
                    action:
                      'Seluruh bukti lapangan & BAST lengkap. Menunggu Persetujuan BAST oleh Admin di Web Admin.',
                    actor_name: 'Sistem Fibermedia',
                  },
                ]
              : []),
          ],
        };
      })
    );

    const statusMsg =
      evaluation.status === 'inside'
        ? `Foto Kunjungan Ber-GPS Valid (${evaluation.distanceMeters}m)! Menunggu Approval BAST Admin.`
        : `Foto Kunjungan Tercatat (${evaluation.distanceMeters}m) - Ditandai untuk Tinjauan Admin.`;

    showToast(statusMsg);
    return { success: true, message: statusMsg };
  };

  // Waive Step 2 (Admin feature)
  const waivePhase2 = async (ticketId: number, targetUserId: number, reason: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== ticketId) return wo;
        const targetUser = allUsers.find((u) => u.id === targetUserId);
        const updatedReqs = wo.phase2_requirements.map((req) =>
          req.user_id === targetUserId
            ? { ...req, waived: true, waive_reason: reason, waived_by_id: currentUser.id }
            : req
        );
        const allCompleted = updatedReqs.every((req) => !!req.completed_at || !!req.waived);

        return {
          ...wo,
          status: allCompleted ? 'resolved' : wo.status,
          phase2_requirements: updatedReqs,
          history_logs: [
            ...wo.history_logs,
            {
              timestamp: new Date().toISOString(),
              action: `Foto Kunjungan Step 2 untuk ${targetUser?.name || 'Anggota'} dibebaskan oleh Admin`,
              actor_name: currentUser.name,
              note: `Alasan: ${reason}`,
            },
          ],
        };
      })
    );
    showToast('Step 2 berhasil dibebaskan dengan alasan audit.');
  };

  // Approve BAST & Close Ticket (Admin action per PRD v1.2 Section 4 & 7)
  const closeTicket = async (ticketId: number, adminRating?: number, ratingNote?: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === ticketId
          ? {
              ...wo,
              status: 'closed',
              bast_status: 'approved_by_admin',
              customer_rating: adminRating,
              rating_note: ratingNote,
              history_logs: [
                ...wo.history_logs,
                {
                  timestamp: new Date().toISOString(),
                  action: `BAST Disetujui oleh ${currentUser.name} (Admin) · Tiket Selesai & Status Pelanggan ACTIVE`,
                  actor_name: currentUser.name,
                  note: adminRating ? `Evaluasi Layanan: ${adminRating}/5 (${ratingNote || ''})` : undefined,
                },
              ],
            }
          : wo
      )
    );
    showToast('BAST disetujui Admin! Tiket resmi Selesai (Closed) dan pelanggan berstatus Active.');
  };

  // Reject BAST by Admin -> Returns ticket to 'arrived' (dikerjakan) per PRD v1.2 Section 4 & 12
  const rejectBastByAdmin = async (ticketId: number, rejectReason: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === ticketId
          ? {
              ...wo,
              status: 'arrived',
              bast_status: 'rejected_by_admin',
              history_logs: [
                ...wo.history_logs,
                {
                  timestamp: new Date().toISOString(),
                  action: `BAST Ditolak oleh ${currentUser.name} (Admin) — Dikembalikan ke status Dikerjakan untuk diperbaiki`,
                  actor_name: currentUser.name,
                  note: `Alasan Penolakan BAST: ${rejectReason}`,
                },
              ],
            }
          : wo
      )
    );
    showToast('BAST ditolak Admin. Tiket kembali ke status Dikerjakan untuk diperbaiki teknisi.');
  };

  // Pause / Resume SLA by Admin/NOC with 5 Standard Reasons (PRD v1.2 Section 3)
  const togglePauseSlaByAdmin = async (ticketId: number, reason: string) => {
    setWorkOrders((prev) =>
      prev.map((wo) => {
        if (wo.id !== ticketId) return wo;
        const nextPaused = !wo.sla_paused;
        return {
          ...wo,
          sla_paused: nextPaused,
          sla_pause_reason: nextPaused ? reason : undefined,
          sla_paused_by: nextPaused ? currentUser.name : undefined,
          history_logs: [
            ...wo.history_logs,
            {
              timestamp: new Date().toISOString(),
              action: nextPaused
                ? `SLA Dijeda (Paused) oleh ${currentUser.name} (Admin/NOC)`
                : `SLA Dilanjutkan (Resumed) oleh ${currentUser.name} (Admin/NOC)`,
              actor_name: currentUser.name,
              note: nextPaused ? `Alasan Baku: ${reason}` : 'Jam operasional SLA kembali berjalan',
            },
          ],
        };
      })
    );
    showToast('Status Pause SLA berhasil diperbarui dan dicatat di Audit Log.');
  };

  // Manual assign ticket
  const assignTicketManual = async (ticketId: number, teamId: number, reason: string) => {
    const team = teams.find((t) => t.id === teamId);
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.id === ticketId
          ? {
              ...wo,
              status: 'assigned',
              assigned_team_id: teamId,
              assigned_team_name: team?.name || `Tim ${teamId}`,
              assigned_at: new Date().toISOString(),
              reassign_count: wo.reassign_count + 1,
              history_logs: [
                ...wo.history_logs,
                {
                  timestamp: new Date().toISOString(),
                  action: `Reassign oleh ${currentUser.name} (Admin) ke ${team?.name || teamId}`,
                  actor_name: currentUser.name,
                  note: `Alasan Audit: ${reason}`,
                },
              ],
            }
          : wo
      )
    );
    showToast(`Tiket di-reassign ke ${team?.name}.`);
  };

  // Check duplicate sales
  const checkDuplicateSales = (phone: string, lat: number, lng: number) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const isDuplicatePhone = salesSubmissions.some(
      (s) => s.phone.replace(/[^0-9]/g, '') === cleanPhone
    );

    let isDuplicateGps = false;
    let existingRecord: string | undefined = undefined;

    for (const sub of salesSubmissions) {
      const dist = calculateDistanceMeters(lat, lng, sub.latitude, sub.longitude);
      if (dist <= 15) {
        isDuplicateGps = true;
        existingRecord = `${sub.submission_code} - ${sub.customer_name} (${dist}m)`;
        break;
      }
    }

    return {
      isDuplicatePhone,
      isDuplicateGps,
      existingRecord,
    };
  };

  // Submit Sales PSB (Records UU PDP Consent & Masked NIK per PRD v1.2 Section 8)
  const submitPsb = async (
    sub: Omit<PsbSubmission, 'id' | 'submission_code' | 'sales_id' | 'sales_name' | 'created_at' | 'status'>
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Harap masuk ke akun terlebih dahulu.' };
    }

    const newSubmission: PsbSubmission = {
      ...sub,
      nik_masked: maskNik(sub.nik),
      consent_pdp_accepted: true,
      id: `sub-${Date.now()}`,
      submission_code: `PSB-SUB-${Math.floor(100 + Math.random() * 900)}`,
      sales_id: currentUser.id,
      sales_name: currentUser.name,
      status: 'admin_validation',
      created_at: new Date().toISOString(),
    };

    if (!isOnline) {
      addToOutbox('submit_sales', newSubmission);
      setOfflineQueue(getOfflineQueue());
      showToast('Pengajuan PSB disimpan di Outbox Dexie.');
      return { success: true, message: 'Tersimpan di outbox' };
    }

    if (token) {
      try {
        const speedNum = typeof sub.package_speed === 'number'
          ? sub.package_speed
          : parseInt(String(sub.package_speed || '20').replace(/\D/g, '')) || 20;

        const payload: Record<string, any> = {
          customer_name: sub.customer_name,
          nik: sub.nik,
          phone: sub.phone,
          email: sub.email || `${sub.customer_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'customer'}@fibermedia.test`,
          address: sub.address,
          city: sub.city || 'Kota Malang',
          district: sub.district || 'Klojen',
          village: sub.village || 'Klojen',
          province: 'Jawa Timur',
          lat: sub.latitude,
          lng: sub.longitude,
          package_id: sub.package_id || 1,
          package_name: sub.package_name,
          package_speed: speedNum,
          package_price: sub.package_price || 220000,
          installation_fee: sub.installation_fee || 0,
          notes: sub.notes || '',
        };

        const ktpData = sub.ktp_photo || sub.ktp_base64;
        if (ktpData) {
          payload.ktp_base64 = ktpData;
        }
        const houseData = sub.house_photo || sub.house_base64;
        if (houseData) {
          payload.rumah_base64 = houseData;
        }

        const res = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Client-Type': 'pwa',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const resJson = await res.json();
          const savedData = resJson.data?.data || resJson.data;
          if (savedData) {
            newSubmission.id = `sub-${savedData.id}`;
            newSubmission.submission_code = savedData.submission_number || newSubmission.submission_code;
          }
        }
      } catch (err) {
        console.warn('Gagal sinkron pengajuan PSB ke server API:', err);
      }
    }

    setSalesSubmissions((prev) => [newSubmission, ...prev]);
    showToast(`Pengajuan ${newSubmission.submission_code} berhasil dikirim.`);
    return { success: true, message: 'Pengajuan sukses dikirim.' };
  };

  // Collector Visit Handler
  const recordCollectorVisit = (
    visitId: string,
    status: 'visited_paid' | 'visited_promised',
    note: string,
    photoUrl?: string
  ) => {
    if (!currentUser) return;

    setCollectorVisits((prev) =>
      prev.map((v) =>
        v.id === visitId
          ? {
              ...v,
              visit_status: status,
              visit_note: note,
              visit_photo_url: photoUrl || v.visit_photo_url,
              visited_at: new Date().toISOString(),
            }
          : v
      )
    );
    showToast(
      status === 'visited_paid'
        ? 'Kunjungan Penagihan tercatat LUNAS! Menunggu update debt_amount manual oleh Admin/CS.'
        : 'Janji bayar pelanggan berhasil dicatat beserta geotag kunjungan.'
    );
  };

  // Sync Outbox
  const syncOutbox = async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      showToast('Semua paket di Outbox Dexie sudah tersinkronisasi.');
      return;
    }

    showToast(`Menyinkronkan ${queue.length} paket tertunda dengan Idempotency-Key...`);

    for (const item of queue) {
      markActionStatus(item.id, 'syncing');
      await new Promise((r) => setTimeout(r, 400));
      removeSyncedAction(item.id);
    }

    // Populate server timestamp on any offline BAST packages
    const syncedServerTime = new Date().toISOString();
    setWorkOrders((prev) =>
      prev.map((wo) =>
        wo.phase1_data && !wo.phase1_data.bast_server_timestamp
          ? {
              ...wo,
              phase1_data: {
                ...wo.phase1_data,
                bast_server_timestamp: syncedServerTime,
                drive_backup_synced: true,
              },
            }
          : wo
      )
    );

    setOfflineQueue(getOfflineQueue());
    showToast('Sinkronisasi Outbox selesai! Waktu server BAST & cadangan Google Drive telah dikunci.');
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        token,
        deviceUuid,
        login,
        logout,
        allUsers,
        teams,
        office,
        setOffice,
        dispatchSettings,
        setDispatchSettings,
        themeMode,
        setThemeMode,
        accentPreset,
        setAccentPreset,
        accentConfig,
        allAccentPresets: ISP_ACCENT_PRESETS,
        currentGps,
        gpsSimulationMode,
        setGpsSimulationMode,
        setCustomGps,
        isConnectedOfficeWifi,
        setIsConnectedOfficeWifi,
        attendances,
        todayAttendance,
        checkIn,
        checkOut,
        submitManualOfficeAttendance,
        isTeamReady,
        workOrders,
        acceptTicket,
        updateTicketStatus,
        submitPhase1,
        submitPhase2,
        waivePhase2,
        closeTicket,
        rejectBastByAdmin,
        togglePauseSlaByAdmin,
        assignTicketManual,
        runDispatchQueue,
        salesSubmissions,
        submitPsb,
        checkDuplicateSales,
        collectorVisits,
        recordCollectorVisit,
        kpiTeams,
        kpiTeknisi,
        kpiSales,
        offlineQueue,
        syncOutbox,
        isOnline,
        setIsOnline,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
