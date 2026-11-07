import React, { useState } from 'react';
import { FieldLayout } from '@shared/ui/templates';
import { ComponentGalleryScreen } from '@shared/ui/gallery/ComponentGalleryScreen';
import {
  FieldClockInScreen,
  FieldTaskListScreen,
  FieldTaskDetailScreen,
  FieldBastScreen,
  FieldOutboxScreen,
} from './screens';

export const FieldUnifiedApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [outboxCount, setOutboxCount] = useState(2);
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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'attendance':
        return { title: 'Absen Masuk', subtitle: 'Verifikasi Lokasi & Swafoto Kehadiran' };
      case 'tasks':
        return selectedTask
          ? { title: 'Detail Pengerjaan Tiket', subtitle: `Tiket #${selectedTask.ticketNumber}` }
          : { title: 'Daftar Tugas Hari Ini', subtitle: 'Work Order Teknisi Lapangan' };
      case 'bast':
        return { title: 'Berita Acara (BAST)', subtitle: 'Tanda Tangan & Konfirmasi Pelanggan' };
      case 'outbox':
        return { title: 'Outbox Antrean Luring', subtitle: 'Sinkronisasi Data Lapangan' };
      case 'gallery':
        return { title: 'Galeri Komponen PWA', subtitle: 'Atomic Design Tokens & Varian' };
      default:
        return { title: 'Fibermedia Field', subtitle: 'Operasional Lapangan' };
    }
  };

  const tabInfo = getTabTitle();

  return (
    <FieldLayout
      activeTabId={activeTab}
      onSelectTab={(tabId) => {
        setActiveTab(tabId);
        if (tabId === 'tasks') {
          // Keep or reset selected task
        } else {
          setSelectedTask(null);
        }
      }}
      title={tabInfo.title}
      subtitle={tabInfo.subtitle}
      isOffline={isOffline}
      outboxCount={outboxCount}
      isDarkMode={isDarkMode}
      onToggleDarkMode={toggleDarkMode}
      userName="Ahmad Fauzi"
      userRole="Teknisi Tim Alpha"
      onSyncNow={() => {
        alert('Memulai sinkronisasi antrean outbox dengan peladen...');
        setOutboxCount(0);
      }}
    >
      {activeTab === 'attendance' && (
        <FieldClockInScreen
          onClockInSuccess={(record) => {
            setActiveTab('tasks');
          }}
        />
      )}

      {activeTab === 'tasks' && !selectedTask && (
        <FieldTaskListScreen
          onSelectTask={(task) => setSelectedTask(task)}
        />
      )}

      {activeTab === 'tasks' && selectedTask && (
        <FieldTaskDetailScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
          onProceedToBast={() => {
            setActiveTab('bast');
          }}
        />
      )}

      {activeTab === 'bast' && (
        <FieldBastScreen
          ticketNumber={selectedTask?.ticketNumber || 'TKT-2026-0914'}
          customerName={selectedTask?.customerName || 'Bambang Sudiro'}
          onBack={() => {
            setActiveTab('tasks');
            setSelectedTask(null);
          }}
          onBastSubmitted={(data) => {
            setOutboxCount((prev) => prev + 1);
            setActiveTab('outbox');
          }}
        />
      )}

      {activeTab === 'outbox' && (
        <FieldOutboxScreen
          isOffline={isOffline}
          onToggleConnectionSimulation={() => setIsOffline(!isOffline)}
        />
      )}

      {activeTab === 'gallery' && <ComponentGalleryScreen />}
    </FieldLayout>
  );
};

export default FieldUnifiedApp;

