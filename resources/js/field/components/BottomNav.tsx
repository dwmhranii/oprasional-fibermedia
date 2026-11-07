import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  ClipboardList,
  Clock,
  UserPlus,
  User,
  Wallet,
} from 'lucide-react';

export type TabKey = 'beranda' | 'tugas' | 'sales' | 'absensi' | 'profil';

interface BottomNavProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const {
    currentUser,
    workOrders,
    salesSubmissions,
    collectorVisits,
    todayAttendance,
  } = useApp();

  // Active tickets badge for technician's team
  const myTeamTicketsCount = workOrders.filter(
    (wo) =>
      wo.assigned_team_id === currentUser.team_id &&
      ['assigned', 'accepted', 'on_the_way', 'arrived', 'phase1_completed'].includes(wo.status)
  ).length;

  // Pending sales submissions badge for sales
  const myActiveSalesCount = salesSubmissions.filter(
    (sub) => sub.sales_id === currentUser.id && sub.status !== 'installed' && sub.status !== 'rejected'
  ).length;

  // Pending collector visits badge
  const pendingCollectorCount = collectorVisits.filter(
    (v) => v.visit_status === 'pending'
  ).length;

  const needsCheckIn = !todayAttendance;

  // Build role-specific navigation tabs (Pure PWA Field Operations — Teknisi, Sales, Collector)
  const getTabsForRole = (): Array<{
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    badge?: number | boolean;
  }> => {
    if (currentUser.role === 'teknisi') {
      return [
        {
          key: 'beranda',
          label: 'Beranda',
          icon: <Home className="w-5 h-5" />,
        },
        {
          key: 'tugas',
          label: 'Tugas',
          icon: <ClipboardList className="w-5 h-5" />,
          badge: myTeamTicketsCount > 0 ? myTeamTicketsCount : undefined,
        },
        {
          key: 'absensi',
          label: 'Absen',
          icon: <Clock className="w-5 h-5" />,
          badge: needsCheckIn,
        },
        {
          key: 'profil',
          label: 'Profil',
          icon: <User className="w-5 h-5" />,
        },
      ];
    }

    if (currentUser.role === 'sales') {
      return [
        {
          key: 'beranda',
          label: 'Beranda',
          icon: <Home className="w-5 h-5" />,
        },
        {
          key: 'sales',
          label: 'Pengajuan',
          icon: <UserPlus className="w-5 h-5" />,
          badge: myActiveSalesCount > 0 ? myActiveSalesCount : undefined,
        },
        {
          key: 'absensi',
          label: 'Absen',
          icon: <Clock className="w-5 h-5" />,
          badge: needsCheckIn,
        },
        {
          key: 'profil',
          label: 'Profil',
          icon: <User className="w-5 h-5" />,
        },
      ];
    }

    if (currentUser.role === 'collector') {
      return [
        {
          key: 'beranda',
          label: 'Beranda',
          icon: <Home className="w-5 h-5" />,
        },
        {
          key: 'sales',
          label: 'Kunjungan',
          icon: <Wallet className="w-5 h-5" />,
          badge: pendingCollectorCount > 0 ? pendingCollectorCount : undefined,
        },
        {
          key: 'absensi',
          label: 'Absen',
          icon: <Clock className="w-5 h-5" />,
          badge: needsCheckIn,
        },
        {
          key: 'profil',
          label: 'Profil',
          icon: <User className="w-5 h-5" />,
        },
      ];
    }

    // Admin / CS / Superadmin in PWA
    return [
      {
        key: 'beranda',
        label: 'Beranda',
        icon: <Home className="w-5 h-5" />,
      },
      {
        key: 'absensi',
        label: 'Absen',
        icon: <Clock className="w-5 h-5" />,
        badge: needsCheckIn,
      },
      {
        key: 'profil',
        label: 'Profil',
        icon: <User className="w-5 h-5" />,
      },
    ];
  };

  const tabs = getTabsForRole();
  const gridColsClass = tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <nav
      aria-label="Navigasi Utama"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-edge-subtle bg-surface-card/95 backdrop-blur-md shadow-token-elevated transition-colors"
    >
      <div className={`max-w-md mx-auto grid ${gridColsClass} items-center h-16 px-2`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChangeTab(tab.key)}
              className={`min-h-touch flex flex-col items-center justify-center rounded-token-md py-1 px-1 transition duration-150 cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-edge-focus ${
                isActive
                  ? 'text-brand-accent font-extrabold'
                  : 'text-content-muted hover:text-content-primary font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {typeof tab.badge === 'number' && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-token-sm bg-brand-primary text-brand-on-primary text-xs font-mono font-extrabold">
                    {tab.badge}
                  </span>
                )}
                {tab.badge === true && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-token-sm bg-status-warning-fg" />
                )}
              </div>
              <span className="text-xs tracking-tight mt-1 whitespace-nowrap">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-7 h-0.5 rounded-token-sm bg-brand-accent shadow-token-glow" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
