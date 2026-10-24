import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EchoProvider } from './providers/EchoProvider';
import { MaintenanceProvider } from './context/MaintenanceContext';
import { LoginPage } from './components/auth/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { SalesDashboard } from './components/sales/SalesDashboard';
import { NewSubmissionForm } from './components/sales/NewSubmissionForm';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeknisiDashboard } from './components/teknisi/TeknisiDashboard';
import { TaskList } from './components/teknisi/TaskList';
import { TaskDetail } from './components/teknisi/TaskDetail';
import { TaskComplete } from './components/teknisi/TaskComplete';
import { SuperadminDashboard } from './components/superadmin/SuperadminDashboard';
import { UserDetail } from './components/superadmin/UserDetail';
import { RolesViewer } from './components/superadmin/RolesViewer';
import { AuditLogs } from './components/superadmin/AuditLogs';
import { SalesReport } from './components/superadmin/SalesReport';
import { ValidationQueue } from './components/superadmin/ValidationQueue';
import { ValidationReview } from './components/superadmin/ValidationReview';
import { ProvisioningManagement } from './components/superadmin/ProvisioningManagement';
import { ProvisioningValidationHub } from './components/superadmin/ProvisioningValidationHub';
import { ProvisioningCreate } from './components/superadmin/ProvisioningCreate';
import { ProvisioningDetail } from './components/superadmin/ProvisioningDetail';
import { TaskDetail as AdminTaskDetail } from './components/superadmin/TaskDetail';
import { UserManagement } from './components/superadmin/UserManagement';
import { MaintenanceManagement } from './components/admin/MaintenanceManagement';
import { Settings } from './components/common/Settings';
import { EditSubmissionForm } from './components/sales/EditSubmissionForm';
import { SalesReportPage } from './components/sales/SalesReportPage';
import { SubmissionList } from './components/sales/SubmissionList';
import { SubmissionDetail } from './components/sales/SubmissionDetail';
import { NotFound } from './components/error/NotFound';
import { AccessDenied } from './components/error/AccessDenied';
import { Toaster, toast } from 'sonner';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { SlaDashboard } from './components/admin/SlaDashboard';
import { SlaDetail } from './components/admin/SlaDetail';
import { PackagesManagement } from './components/admin/PackagesManagement';
import { PromoManagement } from './components/admin/PromoManagement';
import { RoleManagement } from './components/superadmin/RoleManagement';
import { TeamManagement } from './components/superadmin/TeamManagement';
import { CustomerManagement } from './components/superadmin/CustomerManagement';
import { CustomerDetail } from './components/superadmin/CustomerDetail';
import { ComplaintDashboard } from './components/complaints/ComplaintDashboard';
import { ComplaintCreateForm } from './components/complaints/ComplaintCreateForm';
import { ComplaintDetail } from './components/complaints/ComplaintDetail';
import { TeknisiComplaintList } from './components/complaints/TeknisiComplaintList';
import { TeknisiWorkOrderList } from './components/teknisi/TeknisiWorkOrderList';
import { LiveFleetTracking } from './components/admin/LiveFleetTracking';
import { AdminWorkOrderList } from './components/admin/AdminWorkOrderList';
import { DispatchManagement } from './components/admin/DispatchManagement';
import { TicketEvidenceReview } from './components/admin/TicketEvidenceReview';
import { DailyAttendanceManagement } from './components/admin/DailyAttendanceManagement';
import { AttendanceRecapManagement } from './components/admin/AttendanceRecapManagement';
import { KpiDashboard } from './components/admin/KpiDashboard';
import { NetworkCableManagement } from './components/network/NetworkCableManagement';
import { OdcManagement } from './components/network/OdcManagement';
import { OdpManagement } from './components/network/OdpManagement';
import { BrasManagement } from './components/network/BrasManagement';
import { DeviceManagement } from './components/admin/DeviceManagement';
import { OfficeLocationManagement } from './components/admin/OfficeLocationManagement';

const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

const PublicLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }

  return <Outlet />;
};

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role || '')) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

const DashboardSwitcher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'sales') {
    return <SalesDashboard onNavigate={navigate} />;
  }
  if (user?.role === 'admin') {
    return <AdminDashboard onNavigate={navigate} />;
  }
  if (user?.role === 'teknisi') {
    return <Navigate to="/teknisi/work-orders" replace />;
  }
  if (user?.role === 'superadmin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const AppContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Error Pages outside ProtectedLayout */}
      <Route path="/403" element={<AccessDenied />} />
      <Route path="/404" element={<NotFound />} />

      {/* Protected Layout Routes */}
      <Route element={<ProtectedLayout />}>
        {/* Core Dashboard */}
        <Route path="/dashboard" element={<DashboardSwitcher />} />
        
        {/* Sales Routes */}
        <Route path="/submissions/new" element={<RoleRoute allowedRoles={['sales', 'superadmin']}><NewSubmissionForm onNavigate={navigate} /></RoleRoute>} />
        <Route path="/submissions/:id/edit" element={<RoleRoute allowedRoles={['sales', 'superadmin']}><EditSubmissionForm /></RoleRoute>} />
        <Route path="/submissions" element={<RoleRoute allowedRoles={['sales', 'admin', 'superadmin']}><SubmissionList /></RoleRoute>} />
        <Route path="/submissions/:id" element={<RoleRoute allowedRoles={['sales', 'admin', 'superadmin']}><SubmissionDetail /></RoleRoute>} />
        
        {/* Admin/Superadmin Validation & Provisioning & Maintenance */}
        <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><AnalyticsDashboard /></RoleRoute>} />
        <Route path="/admin/kpi" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><KpiDashboard /></RoleRoute>} />
        <Route path="/admin/sla-breaches" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><SlaDashboard /></RoleRoute>} />
        <Route path="/admin/sla-breaches/:id" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><SlaDetail /></RoleRoute>} />
        <Route path="/admin/submissions" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ProvisioningValidationHub defaultTab="validation" /></RoleRoute>} />
        <Route path="/admin/validations" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ProvisioningValidationHub defaultTab="validation" /></RoleRoute>} />
        <Route path="/admin/submissions/:id" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ValidationReview /></RoleRoute>} />
        <Route path="/admin/provisionings" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ProvisioningValidationHub defaultTab="validation" /></RoleRoute>} />
        <Route path="/admin/provisionings/create" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ProvisioningCreate /></RoleRoute>} />
        <Route path="/admin/provisionings/:id" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ProvisioningDetail /></RoleRoute>} />
        <Route path="/admin/packages" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><PackagesManagement /></RoleRoute>} />
        <Route path="/admin/promos" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><PromoManagement /></RoleRoute>} />
        <Route path="/admin/customers" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><CustomerManagement /></RoleRoute>} />
        <Route path="/admin/customers/:id" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><CustomerDetail /></RoleRoute>} />
        <Route path="/admin/tasks/:id" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><AdminTaskDetail /></RoleRoute>} />
        <Route path="/admin/dispatch" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><DispatchManagement /></RoleRoute>} />
        <Route path="/admin/evidence-review" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><TicketEvidenceReview /></RoleRoute>} />
        <Route path="/admin/network/cables" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><NetworkCableManagement /></RoleRoute>} />
        <Route path="/admin/network/odcs" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><OdcManagement /></RoleRoute>} />
        <Route path="/admin/network/odps" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><OdpManagement /></RoleRoute>} />
        <Route path="/admin/network/bras" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><BrasManagement /></RoleRoute>} />

        {/* Tim & Absensi (Fase 1) */}
        <Route path="/admin/attendances/daily" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><DailyAttendanceManagement /></RoleRoute>} />
        <Route path="/admin/attendances/recap" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><AttendanceRecapManagement /></RoleRoute>} />
        <Route path="/admin/devices" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><DeviceManagement /></RoleRoute>} />
        <Route path="/admin/office-locations" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><OfficeLocationManagement /></RoleRoute>} />

        <Route path="/maintenance" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><MaintenanceManagement /></RoleRoute>} />
        
        {/* Complaints Management Routes */}
        <Route path="/admin/complaints" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ComplaintDashboard /></RoleRoute>} />
        <Route path="/admin/complaints/new" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ComplaintCreateForm /></RoleRoute>} />
        <Route path="/admin/complaints/:id" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><ComplaintDetail /></RoleRoute>} />

        {/* Technical Installer tasks & complaints (Unified Work Orders) */}
        <Route path="/teknisi/dashboard" element={<Navigate to="/teknisi/work-orders" replace />} />
        <Route path="/teknisi/tasks" element={<Navigate to="/teknisi/work-orders?type=psb" replace />} />
        <Route path="/teknisi/tasks/:id" element={<RoleRoute allowedRoles={['teknisi', 'superadmin']}><TaskDetail /></RoleRoute>} />
        <Route path="/teknisi/tasks/:id/complete" element={<RoleRoute allowedRoles={['teknisi', 'superadmin']}><TaskComplete /></RoleRoute>} />
        
        {/* Teknisi Complaints Routes */}
        <Route path="/teknisi/complaints" element={<Navigate to="/teknisi/work-orders?type=complaint" replace />} />
        <Route path="/teknisi/complaints/:id" element={<RoleRoute allowedRoles={['teknisi', 'superadmin']}><ComplaintDetail /></RoleRoute>} />
        
        {/* Unified Work Orders (Section 7) */}
        <Route path="/teknisi/work-orders" element={<RoleRoute allowedRoles={['teknisi', 'superadmin']}><TeknisiWorkOrderList /></RoleRoute>} />
        <Route path="/admin/tracking/live-map" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><LiveFleetTracking /></RoleRoute>} />
        <Route path="/admin/work-orders" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><AdminWorkOrderList /></RoleRoute>} />
        
        {/* Sales Reports */}
        <Route path="/sales-report" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><SalesReport /></RoleRoute>} />
        <Route path="/admin/reports" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><SalesReport /></RoleRoute>} />
        
        {/* Generic Reports Route */}
        <Route path="/reports" element={
          user?.role === 'superadmin' ? <SalesReport /> :
          user?.role === 'sales' ? <SalesReportPage /> :
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl mb-2" style={{ color: '#1f2937' }}>Laporan</h1>
              <p style={{ color: '#6b7280' }}>Lihat dan unduh laporan</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
              <p style={{ color: '#1f2937' }}>Halaman laporan segera hadir...</p>
            </div>
          </div>
        } />

        {/* Superadmin User Administration & Logs & Roles */}
        <Route path="/superadmin/dashboard" element={<RoleRoute allowedRoles={['superadmin']}><SuperadminDashboard /></RoleRoute>} />
        <Route path="/superadmin/teams" element={<RoleRoute allowedRoles={['superadmin']}><TeamManagement /></RoleRoute>} />
        <Route path="/superadmin/users" element={<RoleRoute allowedRoles={['superadmin']}><UserManagement /></RoleRoute>} />
        <Route path="/superadmin/users/:id" element={<RoleRoute allowedRoles={['superadmin']}><UserDetail /></RoleRoute>} />
        <Route path="/superadmin/roles" element={<RoleRoute allowedRoles={['superadmin']}><RoleManagement /></RoleRoute>} />
        <Route path="/superadmin/audit-logs" element={<RoleRoute allowedRoles={['superadmin']}><AuditLogs /></RoleRoute>} />
        
        {/* Profile & Settings */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/teknisi/settings" element={<Navigate to="/settings" replace />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />


        {/* Default redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
      // 401 is handled globally by api.ts throwing event
      if (error?.status === 401 || error?.status === 404) return;
      if (error?.status === 403) {
        toast.error("Akses Ditolak. Anda tidak memiliki izin.");
        return;
      }
      toast.error(error?.message || "Terjadi kesalahan pada sistem. Silakan coba lagi.");
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      if (error?.status === 401) return;
      if (error?.status === 403) {
        toast.error("Akses Ditolak. Anda tidak memiliki izin.");
        return;
      }
      // 422 is handled per form
      if (error?.status === 422) return;
      if (error?.status === 409) {
        toast.error(error?.message || "Terjadi konflik data.");
        return;
      }
      toast.error(error?.message || "Terjadi kesalahan saat memproses data.");
    },
  }),
});

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <EchoProvider>
              <MaintenanceProvider>
                <AppContent />
              </MaintenanceProvider>
              <Toaster />
            </EchoProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}