import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UnifiedSuperadminDashboard } from '../dashboard/UnifiedSuperadminDashboard';
import { AdminOperationalDashboard } from './AdminOperationalDashboard';
import { NocDashboard } from '../network/NocDashboard';
import { SalesDashboard } from '../sales/SalesDashboard';
import { TeknisiDashboard } from '../teknisi/TeknisiDashboard';
import { CollectorDashboard } from '../collector/CollectorDashboard';
import {
  Shield,
  Headphones,
  Activity,
  TrendingUp,
  Wrench,
  CreditCard,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate?: (path: string) => void;
}

type DashboardRoleTab = 'superadmin' | 'admin' | 'noc' | 'sales' | 'teknisi' | 'collector';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { user, isSuperadmin } = useAuth();

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      navigate(path);
    }
  };

  // Deteksi role primer dari sesi user
  const resolveInitialRole = (): DashboardRoleTab => {
    if (isSuperadmin) return 'superadmin';
    const roleStr = (user?.role || '').toLowerCase();
    const rolesArray = Array.isArray(user?.roles)
      ? user.roles.map((r: any) => (typeof r === 'string' ? r : r.name || '').toLowerCase())
      : [];

    const hasRole = (r: string) => roleStr === r || roleStr.includes(r) || rolesArray.some((x: string) => x === r || x.includes(r));

    if (hasRole('superadmin')) return 'superadmin';
    if (hasRole('noc') || hasRole('dispatcher')) return 'noc';
    if (hasRole('sales')) return 'sales';
    if (hasRole('teknisi')) return 'teknisi';
    if (hasRole('collector') || hasRole('kolektor')) return 'collector';
    if (hasRole('admin') || hasRole('cs')) return 'admin';

    return 'admin';
  };

  const [activeRoleView, setActiveRoleView] = useState<DashboardRoleTab>(resolveInitialRole);

  // Superadmin memiliki hak untuk berpindah tinjauan antar role dashboard
  const canSwitchRoleView = isSuperadmin || (user?.role || '').toLowerCase() === 'superadmin';

  const roleTabs = [
    { id: 'superadmin' as const, label: 'Super Admin', icon: Shield },
    { id: 'admin' as const, label: 'Operasional & CS', icon: Headphones },
    { id: 'noc' as const, label: 'NOC & Jaringan', icon: Activity },
    { id: 'sales' as const, label: 'Penjualan', icon: TrendingUp },
    { id: 'teknisi' as const, label: 'Teknisi', icon: Wrench },
    { id: 'collector' as const, label: 'Penagihan', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Switcher Tab Khusus Superadmin untuk memantau tampilan tiap peran */}
      {canSwitchRoleView && (
        <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-xl border border-border w-fit overflow-x-auto max-w-full">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase px-2 tracking-wider shrink-0">
            Tampilan Peran:
          </span>
          {roleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRoleView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRoleView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isActive
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Render Dashboard Sesuai Peran Aktif */}
      {activeRoleView === 'superadmin' && <UnifiedSuperadminDashboard />}
      {activeRoleView === 'admin' && <AdminOperationalDashboard onNavigate={handleNav} />}
      {activeRoleView === 'noc' && <NocDashboard onNavigate={handleNav} />}
      {activeRoleView === 'sales' && <SalesDashboard onNavigate={handleNav} />}
      {activeRoleView === 'teknisi' && <TeknisiDashboard />}
      {activeRoleView === 'collector' && <CollectorDashboard onNavigate={handleNav} />}
    </div>
  );
};

export default AdminDashboard;
