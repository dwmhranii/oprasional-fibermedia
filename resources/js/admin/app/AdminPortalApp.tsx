import React, { useState } from 'react';
import { AdminLayout } from '@shared/ui/templates';
import { ComponentGalleryScreen } from '@shared/ui/gallery/ComponentGalleryScreen';
import {
  AdminLoginScreen,
  AdminDashboardScreen,
  AdminCustomerListScreen,
  AdminTicketDispatchScreen,
  AdminGisOdpMapScreen,
  AdminAttendanceReviewScreen,
} from './screens';

export const AdminPortalApp: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark');
  });

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const getPageInfo = () => {
    switch (activeScreen) {
      case 'dashboard':
        return { title: 'Dasbor Operasional', subtitle: 'Monitoring Sentral Jaringan FTTH & SLA' };
      case 'customers':
        return { title: 'Daftar Pelanggan', subtitle: 'Pencarian & Manajemen Pelanggan (NIK Terlindungi)' };
      case 'dispatch':
        return { title: 'Dispatch Tiket', subtitle: 'Penugasan Teknisi & Pengendalian Jeda SLA' };
      case 'gis-map':
        return { title: 'Peta GIS ODP', subtitle: 'Pemetaan Jalur Fiber & Kapasitas Port ODP' };
      case 'attendance-review':
        return { title: 'Tinjauan Absensi', subtitle: 'Verifikasi Lokasi Geofence & Swafoto Kehadiran Staf' };
      case 'component-gallery':
        return { title: 'Galeri Komponen & Design Tokens', subtitle: 'Spesifikasi Komponen Atomic Design System' };
      default:
        return { title: 'Fibermedia Admin', subtitle: 'Sistem Operasi Jaringan FTTH' };
    }
  };

  const pageInfo = getPageInfo();

  if (activeScreen === 'login') {
    return (
      <AdminLoginScreen
        onLoginSuccess={() => setActiveScreen('dashboard')}
      />
    );
  }

  return (
    <AdminLayout
      pageTitle={pageInfo.title}
      pageSubtitle={pageInfo.subtitle}
      activeScreenId={activeScreen}
      onNavigate={setActiveScreen}
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
      userName="Hendra Wijaya"
      userRole="Dispatcher NOC"
      onLogout={() => setActiveScreen('login')}
    >
      {activeScreen === 'dashboard' && <AdminDashboardScreen onNavigate={setActiveScreen} />}
      {activeScreen === 'customers' && <AdminCustomerListScreen />}
      {activeScreen === 'dispatch' && <AdminTicketDispatchScreen />}
      {activeScreen === 'gis-map' && (
        <AdminGisOdpMapScreen onNavigateToDispatch={() => setActiveScreen('dispatch')} />
      )}
      {activeScreen === 'attendance-review' && <AdminAttendanceReviewScreen />}
      {activeScreen === 'component-gallery' && <ComponentGalleryScreen />}
    </AdminLayout>
  );
};

export default AdminPortalApp;

