/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav, TabKey } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OutboxModal } from './components/OutboxModal';
import { DashboardScreen } from './screens/DashboardScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { WorkOrdersScreen } from './screens/WorkOrdersScreen';
import { SalesScreen } from './screens/SalesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PwaLoginScreen } from './screens/PwaLoginScreen';
import { FieldLayout, ToastItem } from './design-system';

const MainContent: React.FC = () => {
  const { currentUser, toastMessage } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('beranda');
  const [salesMode, setSalesMode] = useState<'list' | 'new_form'>('list');
  const [isOutboxOpen, setIsOutboxOpen] = useState<boolean>(false);

  // Ensure activeTab is always valid for the current user's role when switching users
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'teknisi' && activeTab === 'sales') {
      setActiveTab('beranda');
    } else if (currentUser.role === 'sales' && activeTab === 'tugas') {
      setActiveTab('beranda');
    } else if (
      (currentUser.role === 'admin' || currentUser.role === 'superadmin') &&
      (activeTab === 'tugas' || activeTab === 'sales')
    ) {
      setActiveTab('beranda');
    }
  }, [currentUser?.role, activeTab]);

  const handleNavigateTab = (
    tab: TabKey,
    options?: { salesMode?: 'list' | 'new_form' }
  ) => {
    if (options?.salesMode) {
      setSalesMode(options.salesMode);
    } else if (tab === 'sales') {
      setSalesMode('list');
    }
    setActiveTab(tab);
  };

  return (
    <>
      <FieldLayout
        maxWidth="pwa"
        header={<Header onOpenOutbox={() => setIsOutboxOpen(true)} />}
        toast={toastMessage ? <ToastItem message={toastMessage} tone="safe" /> : undefined}
        offlineBanner={<OfflineIndicator />}
        bottomNav={
          <BottomNav
            activeTab={activeTab}
            onChangeTab={(tab) => handleNavigateTab(tab)}
          />
        }
      >
        {activeTab === 'beranda' && (
          <DashboardScreen onNavigateTab={handleNavigateTab} />
        )}
        {activeTab === 'tugas' && currentUser?.role === 'teknisi' && (
          <WorkOrdersScreen />
        )}
        {activeTab === 'sales' && currentUser?.role === 'sales' && (
          <SalesScreen initialMode={salesMode} />
        )}
        {activeTab === 'absensi' && <AttendanceScreen />}
        {activeTab === 'profil' && (
          <ProfileScreen onOpenOutbox={() => setIsOutboxOpen(true)} />
        )}
      </FieldLayout>

      {/* Outbox Modal */}
      <OutboxModal isOpen={isOutboxOpen} onClose={() => setIsOutboxOpen(false)} />
    </>
  );
};

const AuthGuard: React.FC = () => {
  const { currentUser, token } = useApp();

  // Jika belum masuk atau token sesi PWA tidak aktif, tampilkan Layar Masuk PWA
  if (!currentUser || !token) {
    return <PwaLoginScreen />;
  }

  return <MainContent />;
};

export default function App() {
  return (
    <AppProvider>
      <AuthGuard />
    </AppProvider>
  );
}
