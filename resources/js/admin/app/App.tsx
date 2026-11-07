import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth, RequirePermission } from './context/AuthContext';
import { EchoProvider } from './providers/EchoProvider';
import { MaintenanceProvider } from './context/MaintenanceContext';
import { AdminLoginScreen } from './screens/AdminLoginScreen';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { NotFound } from './components/error/NotFound';
import { AccessDenied } from './components/error/AccessDenied';
import { Toaster, toast } from 'sonner';
import { PageLoadingSkeleton } from '@shared/ui/PageLoadingSkeleton';

// Route-Based Code Splitting (Lazy Loading) untuk optimasi ukuran bundle
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard || m.default })));
const SalesDashboard = React.lazy(() => import('./components/sales/SalesDashboard').then((m) => ({ default: m.SalesDashboard || m.default })));
const NewSubmissionForm = React.lazy(() => import('./components/sales/NewSubmissionForm').then((m) => ({ default: m.NewSubmissionForm || m.default })));
const EditSubmissionForm = React.lazy(() => import('./components/sales/EditSubmissionForm').then((m) => ({ default: m.EditSubmissionForm || m.default })));
const SubmissionList = React.lazy(() => import('./components/sales/SubmissionList').then((m) => ({ default: m.SubmissionList || m.default })));
const SubmissionDetail = React.lazy(() => import('./components/sales/SubmissionDetail').then((m) => ({ default: m.SubmissionDetail || m.default })));
const SalesReportPage = React.lazy(() => import('./components/sales/SalesReportPage').then((m) => ({ default: m.SalesReportPage || m.default })));

// Pelanggan & Validasi
const CustomerManagement = React.lazy(() => import('./components/superadmin/CustomerManagement').then((m) => ({ default: m.CustomerManagement || m.default })));
const CustomerDetail = React.lazy(() => import('./components/superadmin/CustomerDetail').then((m) => ({ default: m.CustomerDetail || m.default })));
const ProvisioningValidationHub = React.lazy(() => import('./components/superadmin/ProvisioningValidationHub').then((m) => ({ default: m.ProvisioningValidationHub || m.default })));
const ValidationReview = React.lazy(() => import('./components/superadmin/ValidationReview').then((m) => ({ default: m.ValidationReview || m.default })));
const ProvisioningCreate = React.lazy(() => import('./components/superadmin/ProvisioningCreate').then((m) => ({ default: m.ProvisioningCreate || m.default })));
const ProvisioningDetail = React.lazy(() => import('./components/superadmin/ProvisioningDetail').then((m) => ({ default: m.ProvisioningDetail || m.default })));
const AdminTaskDetail = React.lazy(() => import('./components/superadmin/TaskDetail').then((m) => ({ default: m.TaskDetail || m.default })));

// Operasional
const ComplaintDashboard = React.lazy(() => import('./components/complaints/ComplaintDashboard').then((m) => ({ default: m.ComplaintDashboard || m.default })));
const ComplaintCreateForm = React.lazy(() => import('./components/complaints/ComplaintCreateForm').then((m) => ({ default: m.ComplaintCreateForm || m.default })));
const ComplaintDetail = React.lazy(() => import('./components/complaints/ComplaintDetail').then((m) => ({ default: m.ComplaintDetail || m.default })));
const AdminWorkOrderList = React.lazy(() => import('./components/admin/AdminWorkOrderList').then((m) => ({ default: m.AdminWorkOrderList || m.default })));
const DispatchManagement = React.lazy(() => import('./components/admin/DispatchManagement').then((m) => ({ default: m.DispatchManagement || m.default })));

// Jaringan (Peta MapLibre GL JS & PMTiles di-lazy load)
const NetworkMapView = React.lazy(() => import('./components/network/NetworkMapView').then((m) => ({ default: m.NetworkMapView || m.default })));
const NetworkNodesHub = React.lazy(() => import('./components/network/NetworkNodesHub').then((m) => ({ default: m.NetworkNodesHub || m.default })));
const NetworkApprovals = React.lazy(() => import('./components/network/NetworkApprovals').then((m) => ({ default: m.NetworkApprovals || m.default })));
const BrasManagement = React.lazy(() => import('./components/network/BrasManagement').then((m) => ({ default: m.BrasManagement || m.default })));
const KmzImportExportManagement = React.lazy(() => import('./components/network/KmzImportExportManagement').then((m) => ({ default: m.KmzImportExportManagement || m.default })));

// Tim & Absensi
const DailyAttendanceManagement = React.lazy(() => import('./components/admin/DailyAttendanceManagement').then((m) => ({ default: m.DailyAttendanceManagement || m.default })));
const AttendanceRecapManagement = React.lazy(() => import('./components/admin/AttendanceRecapManagement').then((m) => ({ default: m.AttendanceRecapManagement || m.default })));
const TeamManagement = React.lazy(() => import('./components/superadmin/TeamManagement').then((m) => ({ default: m.TeamManagement || m.default })));
const DeviceManagement = React.lazy(() => import('./components/admin/DeviceManagement').then((m) => ({ default: m.DeviceManagement || m.default })));
const OfficeLocationManagement = React.lazy(() => import('./components/admin/OfficeLocationManagement').then((m) => ({ default: m.OfficeLocationManagement || m.default })));

// KPI & Laporan (Chart.js di-lazy load)
const KpiDashboard = React.lazy(() => import('./components/admin/KpiDashboard').then((m) => ({ default: m.KpiDashboard || m.default })));
const AnalyticsDashboard = React.lazy(() => import('./components/admin/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard || m.default })));
const SlaDashboard = React.lazy(() => import('./components/admin/SlaDashboard').then((m) => ({ default: m.SlaDashboard || m.default })));
const SlaDetail = React.lazy(() => import('./components/admin/SlaDetail').then((m) => ({ default: m.SlaDetail || m.default })));
const SalesReport = React.lazy(() => import('./components/superadmin/SalesReport').then((m) => ({ default: m.SalesReport || m.default })));

// Produk & Pengaturan
const CatalogHub = React.lazy(() => import('./components/admin/CatalogHub').then((m) => ({ default: m.CatalogHub || m.default })));
const PackagesManagement = React.lazy(() => import('./components/admin/PackagesManagement').then((m) => ({ default: m.PackagesManagement || m.default })));
const PromoManagement = React.lazy(() => import('./components/admin/PromoManagement').then((m) => ({ default: m.PromoManagement || m.default })));
const UserManagement = React.lazy(() => import('./components/superadmin/UserManagement').then((m) => ({ default: m.UserManagement || m.default })));
const UserDetail = React.lazy(() => import('./components/superadmin/UserDetail').then((m) => ({ default: m.UserDetail || m.default })));
const AccessControlHub = React.lazy(() => import('./components/access/AccessControlHub').then((m) => ({ default: m.AccessControlHub || m.default })));
const AccessControlManagement = React.lazy(() => import('./components/superadmin/AccessControlManagement').then((m) => ({ default: m.AccessControlManagement || m.default })));
const AuditLogs = React.lazy(() => import('./components/superadmin/AuditLogs').then((m) => ({ default: m.AuditLogs || m.default })));
const SuperadminSettingsHub = React.lazy(() => import('./components/superadmin/SuperadminSettingsHub').then((m) => ({ default: m.SuperadminSettingsHub || m.default })));
const Settings = React.lazy(() => import('./components/common/Settings').then((m) => ({ default: m.Settings || m.default })));
const MaintenanceManagement = React.lazy(() => import('./components/admin/MaintenanceManagement').then((m) => ({ default: m.MaintenanceManagement || m.default })));
const AdminPortalApp = React.lazy(() => import('./AdminPortalApp').then((m) => ({ default: m.AdminPortalApp || m.default })));

const isWebAdminRole = (user: any): boolean => {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const roles = Array.isArray(user.roles)
    ? user.roles.map((r: any) => (typeof r === 'string' ? r : r.name || '').toLowerCase())
    : [];
  return (
    role === 'superadmin' ||
    role === 'admin' ||
    role.includes('admin') ||
    role === 'noc' ||
    role.includes('dispatcher') ||
    role === 'cs' ||
    roles.some((r: string) => r.includes('admin') || r === 'superadmin' || r === 'noc' || r.includes('dispatcher') || r === 'cs')
  );
};

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoadingSkeleton />}>
        <Outlet />
      </Suspense>
    </DashboardLayout>
  );
};

const PublicLayout = () => {
  const { isAuthenticated, can, isSuperadmin, user } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname;
    if (from && from !== '/' && from !== '/login' && (!from.startsWith('/pwa') || !isWebAdminRole(user))) {
      return <Navigate to={from} replace />;
    }
    if (isSuperadmin || isWebAdminRole(user) || can('dashboard.view') || can('view_dashboard')) {
      return <Navigate to="/dashboard" replace />;
    }
    if (can('pwa.access')) {
      window.location.href = '/pwa';
      return null;
    }
    return <Navigate to="/403" replace />;
  }

  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <Outlet />
    </Suspense>
  );
};

const RootRedirect = () => {
  const { isAuthenticated, can, isSuperadmin, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (isSuperadmin || isWebAdminRole(user) || can('dashboard.view') || can('view_dashboard')) {
    return <Navigate to="/dashboard" replace />;
  }
  if (can('pwa.access')) {
    window.location.href = '/pwa';
    return null;
  }
  return <Navigate to="/403" replace />;
};

const DynamicRedirect = ({ to }: { to: string }) => {
  const params = useParams();
  let target = to;
  Object.entries(params).forEach(([key, value]) => {
    target = target.replace(`:${key}`, value || '');
  });
  return <Navigate to={target} replace />;
};

const AppContent = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Root redirect: / -> /dashboard if logged in, /login if not */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<AdminLoginScreen />} />
      </Route>

      {/* Error Pages */}
      <Route path="/403" element={<AccessDenied />} />
      <Route path="/404" element={<NotFound />} />

      {/* Legacy Redirects (301) from role-based paths */}
      {/* Superadmin Legacy Paths */}
      <Route path="/superadmin/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/superadmin/users" element={<Navigate to="/access/users" replace />} />
      <Route path="/superadmin/users/:id" element={<DynamicRedirect to="/access/users/:id" /> /* Navigate */} />
      <Route path="/superadmin/roles" element={<Navigate to="/settings/access" replace />} />
      <Route path="/superadmin/audit-logs" element={<Navigate to="/activity-log" replace />} />
      <Route path="/superadmin/teams" element={<Navigate to="/teams" replace />} />

      {/* Admin Legacy Paths */}
      <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin/customers" element={<Navigate to="/customers" replace />} />
      <Route path="/admin/customers/:id" element={<DynamicRedirect to="/customers/:id" /> /* Navigate */} />
      <Route path="/admin/pelanggan" element={<Navigate to="/customers" replace />} />
      <Route path="/admin/pelanggan/:id" element={<DynamicRedirect to="/customers/:id" /> /* Navigate */} />
      <Route path="/admin/submissions" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/admin/submissions/:id" element={<DynamicRedirect to="/customers/submissions/:id" /> /* Navigate */} />
      <Route path="/admin/validations" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/admin/complaints" element={<Navigate to="/complaints" replace />} />
      <Route path="/admin/complaints/new" element={<Navigate to="/complaints/new" replace />} />
      <Route path="/admin/complaints/:id" element={<DynamicRedirect to="/complaints/:id" /> /* Navigate */} />
      <Route path="/admin/psb" element={<Navigate to="/psb" replace />} />
      <Route path="/admin/psb/:id" element={<DynamicRedirect to="/psb/:id" /> /* Navigate */} />
      <Route path="/admin/provisionings" element={<Navigate to="/psb" replace />} />
      <Route path="/admin/provisionings/create" element={<Navigate to="/psb/create" replace />} />
      <Route path="/admin/provisionings/:id" element={<DynamicRedirect to="/psb/:id" /> /* Navigate */} />
      <Route path="/admin/work-orders" element={<Navigate to="/work-orders" replace />} />
      <Route path="/admin/evidence-review" element={<Navigate to="/work-orders" replace />} />
      <Route path="/admin/tasks/:id" element={<DynamicRedirect to="/work-orders/:id" /> /* Navigate */} />
      <Route path="/admin/network/map" element={<Navigate to="/network/map" replace />} />
      <Route path="/admin/tracking/live-map" element={<Navigate to="/network/map" replace />} />
      <Route path="/admin/network/nodes" element={<Navigate to="/network/nodes" replace />} />
      <Route path="/admin/network/odps" element={<Navigate to="/network/nodes?tab=odp" replace />} />
      <Route path="/admin/network/odcs" element={<Navigate to="/network/nodes?tab=odc" replace />} />
      <Route path="/admin/network/cables" element={<Navigate to="/network/nodes?tab=cable" replace />} />
      <Route path="/admin/network/bras" element={<Navigate to="/network/bras" replace />} />
      <Route path="/admin/network/approvals" element={<Navigate to="/network/approvals" replace />} />
      <Route path="/admin/network/kmz" element={<Navigate to="/network/kmz" replace />} />
      <Route path="/admin/attendance/today" element={<Navigate to="/attendance/today" replace />} />
      <Route path="/admin/attendances/daily" element={<Navigate to="/attendance/today" replace />} />
      <Route path="/admin/attendance/recap" element={<Navigate to="/attendance/recap" replace />} />
      <Route path="/admin/attendances/recap" element={<Navigate to="/attendance/recap" replace />} />
      <Route path="/admin/teams" element={<Navigate to="/teams" replace />} />
      <Route path="/admin/devices" element={<Navigate to="/devices" replace />} />
      <Route path="/admin/office-locations" element={<Navigate to="/office-locations" replace />} />
      <Route path="/admin/kpi" element={<Navigate to="/kpi" replace />} />
      <Route path="/admin/kpi/ratings" element={<Navigate to="/kpi/ratings" replace />} />
      <Route path="/admin/kpi/settings" element={<Navigate to="/kpi/settings" replace />} />
      <Route path="/admin/analytics" element={<Navigate to="/reports" replace />} />
      <Route path="/analytics" element={<Navigate to="/reports" replace />} />
      <Route path="/admin/sla-breaches" element={<Navigate to="/kpi" replace />} />
      <Route path="/admin/sla-breaches/:id" element={<Navigate to="/kpi" replace />} />
      <Route path="/sla-breaches" element={<Navigate to="/kpi" replace />} />
      <Route path="/sla-breaches/:id" element={<Navigate to="/kpi" replace />} />
      <Route path="/admin/packages" element={<Navigate to="/catalog" replace />} />
      <Route path="/admin/promos" element={<Navigate to="/catalog?tab=promo" replace />} />
      <Route path="/promos" element={<Navigate to="/catalog?tab=promo" replace />} />
      <Route path="/admin/sales-report" element={<Navigate to="/reports" replace />} />
      <Route path="/sales-report" element={<Navigate to="/reports" replace />} />
      <Route path="/sales/dashboard" element={<Navigate to="/dashboard" replace />} />
      <Route path="/sales/submissions" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/sales/submissions/new" element={<Navigate to="/pwa/submissions/new" replace />} />
      <Route path="/sales/submissions/:id/edit" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/sales/reports" element={<Navigate to="/reports" replace />} />
      <Route path="/admin/settings/dispatch" element={<Navigate to="/settings/dispatch" replace />} />
      <Route path="/admin/dispatch" element={<Navigate to="/settings/dispatch" replace />} />
      <Route path="/admin/dispatch-settings" element={<Navigate to="/settings/dispatch" replace />} />
      <Route path="/admin/users" element={<Navigate to="/access/users" replace />} />
      <Route path="/admin/users/:id" element={<DynamicRedirect to="/access/users/:id" /> /* Navigate */} />
      <Route path="/admin/hak-akses" element={<Navigate to="/access/roles" replace />} />
      <Route path="/admin/access-control" element={<Navigate to="/access/roles" replace />} />
      <Route path="/admin/roles" element={<Navigate to="/access/roles" replace />} />
      <Route path="/admin/activity-log" element={<Navigate to="/settings/activity-log" replace />} />

      {/* Legacy Redirects to Single-Door 14-Menu Paths */}
      <Route path="/pelanggan" element={<Navigate to="/customers" replace />} />
      <Route path="/pelanggan/:id" element={<DynamicRedirect to="/customers/:id" /> /* Navigate */} />
      <Route path="/pelanggan/pengajuan" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/customer" element={<Navigate to="/customers" replace />} />
      <Route path="/customer/:id" element={<DynamicRedirect to="/customers/:id" /> /* Navigate */} />
      <Route path="/customer/submissions" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/submissions" element={<Navigate to="/customers/submissions" replace />} />
      <Route path="/submissions/:id" element={<DynamicRedirect to="/customers/submissions/:id" /> /* Navigate */} />
      <Route path="/network/nodes" element={<Navigate to="/network/odp" replace />} />
      <Route path="/network/kmz" element={<Navigate to="/network/odp?action=import-kmz" replace />} />
      <Route path="/attendance" element={<Navigate to="/attendance/today" replace />} />
      <Route path="/attendance/daily" element={<Navigate to="/attendance/today" replace />} />
      <Route path="/office-locations" element={<Navigate to="/attendance/offices" replace />} />
      <Route path="/devices" element={<Navigate to="/access/devices" replace />} />
      <Route path="/users" element={<Navigate to="/access/users" replace />} />
      <Route path="/users/:id" element={<DynamicRedirect to="/access/users/:id" /> /* Navigate */} />
      <Route path="/settings/access" element={<Navigate to="/access/roles" replace />} />
      <Route path="/activity-log" element={<Navigate to="/settings/activity-log" replace />} />

      {/* Teknisi Legacy Paths */}
      <Route path="/teknisi/dashboard" element={<Navigate to="/work-orders" replace />} />
      <Route path="/teknisi/tasks" element={<Navigate to="/work-orders?type=psb" replace />} />
      <Route path="/teknisi/tasks/:id" element={<DynamicRedirect to="/work-orders/:id" /> /* Navigate */} />
      <Route path="/teknisi/tasks/:id/complete" element={<DynamicRedirect to="/work-orders/:id" /> /* Navigate */} />
      <Route path="/teknisi/complaints" element={<Navigate to="/complaints" replace />} />
      <Route path="/teknisi/complaints/:id" element={<DynamicRedirect to="/complaints/:id" /> /* Navigate */} />
      <Route path="/teknisi/work-orders" element={<Navigate to="/work-orders" replace />} />
      <Route path="/teknisi/settings" element={<Navigate to="/settings" replace />} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />

      {/* Component-First Design System Portal & Showcase */}
      <Route path="/portal/*" element={<Suspense fallback={<PageLoadingSkeleton />}><AdminPortalApp /></Suspense>} />
      <Route path="/gallery" element={<Suspense fallback={<PageLoadingSkeleton />}><AdminPortalApp /></Suspense>} />

      {/* Protected Layout Routes (All unified, 14-menu single-door paths) */}
      <Route element={<ProtectedLayout />}>
        {/* 1. Core Dashboard */}
        <Route path="/dashboard" element={<RequirePermission can={['dashboard.view', 'view_dashboard']}><AdminDashboard onNavigate={navigate} /></RequirePermission>} />
        
        {/* 2. Pelanggan (Tab Daftar & Pengajuan) */}
        <Route path="/customers" element={<RequirePermission can="customers.view"><CustomerManagement /></RequirePermission>} />
        <Route path="/customers/:id" element={<RequirePermission can="customers.view"><CustomerDetail /></RequirePermission>} />
        <Route path="/customers/submissions" element={<RequirePermission can={['submissions.view', 'submissions.create']}><ProvisioningValidationHub defaultTab="validation" /></RequirePermission>} />
        <Route path="/customers/submissions/:id" element={<RequirePermission can={['submissions.view', 'submissions.create']}><ValidationReview /></RequirePermission>} />
        <Route path="/submissions/new" element={<RequirePermission can="submissions.create"><NewSubmissionForm onNavigate={navigate} /></RequirePermission>} />
        <Route path="/submissions/:id/edit" element={<RequirePermission can="submissions.update_own"><EditSubmissionForm /></RequirePermission>} />

        {/* 3. Operasional: Tiket Pengaduan */}
        <Route path="/complaints/new" element={<RequirePermission can="complaints.create"><ComplaintCreateForm /></RequirePermission>} />
        <Route path="/complaints/:id" element={<RequirePermission can={['complaints.view', 'complaints.view_own']}><ComplaintDetail /></RequirePermission>} />
        <Route path="/complaints" element={<RequirePermission can={['complaints.view', 'complaints.view_own']}><ComplaintDashboard /></RequirePermission>} />

        {/* 4. Operasional: Pemasangan (PSB) */}
        <Route path="/psb/create" element={<RequirePermission can="psb.view"><ProvisioningCreate /></RequirePermission>} />
        <Route path="/psb/:id" element={<RequirePermission can="psb.view"><ProvisioningDetail /></RequirePermission>} />
        <Route path="/psb" element={<RequirePermission can="psb.view"><ProvisioningValidationHub defaultTab="provisioning" /></RequirePermission>} />

        {/* 5. Operasional: Work Order */}
        <Route path="/work-orders/:id" element={<RequirePermission can="workorders.view"><AdminTaskDetail /></RequirePermission>} />
        <Route path="/work-orders" element={<RequirePermission can="workorders.view"><AdminWorkOrderList /></RequirePermission>} />

        {/* 6. Jaringan: Peta Jaringan */}
        <Route path="/network/map" element={<RequirePermission can="network.view"><NetworkMapView /></RequirePermission>} />

        {/* 7. Jaringan: OLT, ODC, ODP & Kabel (Satu Pintu 6 Tab) */}
        <Route path="/network/olt" element={<RequirePermission can="network.view"><NetworkNodesHub defaultTab="olt" /></RequirePermission>} />
        <Route path="/network/odc" element={<RequirePermission can="network.view"><NetworkNodesHub defaultTab="odc" /></RequirePermission>} />
        <Route path="/network/odp" element={<RequirePermission can="network.view"><NetworkNodesHub defaultTab="odp" /></RequirePermission>} />
        <Route path="/network/cable" element={<RequirePermission can="network.view"><NetworkNodesHub defaultTab="cable" /></RequirePermission>} />
        <Route path="/network/bras" element={<RequirePermission can="network.view"><BrasManagement /></RequirePermission>} />
        <Route path="/network/approvals" element={<RequirePermission can="network.approve"><NetworkApprovals /></RequirePermission>} />
        <Route path="/network/:type/:id" element={<RequirePermission can="network.view"><NetworkNodesHub /></RequirePermission>} />

        {/* 8. Absensi & Tim: Absensi (Tab Hari Ini, Rekap, Titik Kantor) */}
        <Route path="/attendance/today" element={<RequirePermission can="attendance.view"><DailyAttendanceManagement /></RequirePermission>} />
        <Route path="/attendance/recap" element={<RequirePermission can="attendance.view"><AttendanceRecapManagement /></RequirePermission>} />
        <Route path="/attendance/offices" element={<RequirePermission can="settings.manage"><OfficeLocationManagement /></RequirePermission>} />

        {/* 9. Absensi & Tim: Tim dan Anggota */}
        <Route path="/teams" element={<RequirePermission can="teams.view"><TeamManagement /></RequirePermission>} />

        {/* 10. KPI (Tab Dasbor, Rating, Pengaturan) */}
        <Route path="/kpi/ratings" element={<RequirePermission can="kpi.view"><KpiDashboard defaultTab="teams" initialRatingOpen={true} /></RequirePermission>} />
        <Route path="/kpi/settings" element={<RequirePermission can="kpi.manage"><KpiDashboard defaultTab="settings" /></RequirePermission>} />
        <Route path="/kpi" element={<RequirePermission can="kpi.view"><KpiDashboard defaultTab="teams" /></RequirePermission>} />

        {/* 11. Produk & Penjualan: Katalog & Promo */}
        <Route path="/catalog" element={<RequirePermission can="catalog.view"><CatalogHub /></RequirePermission>} />

        {/* 12. Produk & Penjualan: Laporan Sales & Revenue */}
        <Route path="/reports" element={<RequirePermission can="reports.view"><SalesReport /></RequirePermission>} />

        {/* 13. Pengaturan: Pengguna & Hak Akses (Tab Pengguna, Role, Matriks, Perangkat, Riwayat) */}
        <Route path="/access" element={<Navigate to="/access/users" replace />} />
        <Route path="/access/users" element={<RequirePermission can="users.view"><AccessControlHub activeTab="users" /></RequirePermission>} />
        <Route path="/access/users/:id" element={<RequirePermission can="users.view"><UserDetail /></RequirePermission>} />
        <Route path="/access/roles" element={<RequirePermission can="access.manage"><AccessControlHub activeTab="roles" /></RequirePermission>} />
        <Route path="/access/matrix" element={<RequirePermission can="access.manage"><AccessControlHub activeTab="matrix" /></RequirePermission>} />
        <Route path="/access/devices" element={<RequirePermission can="devices.view"><AccessControlHub activeTab="devices" /></RequirePermission>} />
        <Route path="/access/history" element={<RequirePermission can="audit.view"><AccessControlHub activeTab="history" /></RequirePermission>} />

        {/* 14. Pengaturan: Pengaturan Sistem (SLA, Jenis Gangguan, Kantor, Hari Libur, 2FA) */}
        <Route path="/settings/system" element={<RequirePermission can="settings.manage"><SuperadminSettingsHub /></RequirePermission>} />
        <Route path="/settings/sla" element={<RequirePermission can="settings.manage"><SuperadminSettingsHub /></RequirePermission>} />
        <Route path="/settings/complaint-types" element={<RequirePermission can="settings.manage"><SuperadminSettingsHub /></RequirePermission>} />
        <Route path="/settings/offices" element={<RequirePermission can="settings.manage"><SuperadminSettingsHub /></RequirePermission>} />
        <Route path="/settings/holidays" element={<RequirePermission can="settings.manage"><SuperadminSettingsHub /></RequirePermission>} />
        <Route path="/settings/2fa" element={<RequirePermission can="settings.manage"><SuperadminSettingsHub /></RequirePermission>} />
        <Route path="/settings/dispatch" element={<RequirePermission can="settings.manage"><DispatchManagement /></RequirePermission>} />
        <Route path="/settings/map" element={<RequirePermission can="settings.manage"><Settings defaultTab="map" /></RequirePermission>} />
        <Route path="/settings/activity-log" element={<RequirePermission can="audit.view"><AuditLogs /></RequirePermission>} />

        {/* Pengaturan Umum & Pemeliharaan */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/maintenance" element={<RequirePermission can="settings.manage"><MaintenanceManagement /></RequirePermission>} />

        {/* Catch-all 404 */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>
    </Routes>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error: any) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
      } else if (status === 403) {
        toast.error(message || 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.');
      } else if (status >= 500) {
        toast.error('Terjadi kesalahan pada peladen. Silakan coba beberapa saat lagi.');
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
      } else if (status === 403) {
        toast.error(message || 'Akses ditolak. Anda tidak memiliki izin untuk melakukan aksi ini.');
      } else if (status === 422) {
        const errors = error?.response?.data?.errors;
        if (errors) {
          const firstError = Object.values(errors)[0];
          if (Array.isArray(firstError) && firstError[0]) {
            toast.error(String(firstError[0]));
            return;
          }
        }
        toast.error(message || 'Validasi gagal. Periksa kembali isian formulir.');
      } else if (status >= 500) {
        toast.error('Gagal memproses permintaan pada peladen.');
      }
    },
  }),
});

export const App: React.FC = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EchoProvider>
            <MaintenanceProvider>
              <BrowserRouter>
                <AppContent />
                <Toaster position="top-right" richColors closeButton />
              </BrowserRouter>
            </MaintenanceProvider>
          </EchoProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;