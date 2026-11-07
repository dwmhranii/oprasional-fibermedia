import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Shield, KeyRound, Smartphone, History } from 'lucide-react';
import { PageHeader } from '@shared/ui/PageHeader';
import { UserManagement } from '../superadmin/UserManagement';
import { RoleManagementTab } from './RoleManagementTab';
import { PermissionMatrixTab } from './PermissionMatrixTab';
import { DeviceManagement } from '../admin/DeviceManagement';
import { AccessHistoryTab } from './AccessHistoryTab';

export type AccessTabKey = 'users' | 'roles' | 'matrix' | 'devices' | 'history';

interface AccessControlHubProps {
  activeTab?: AccessTabKey;
}

export const AccessControlHub: React.FC<AccessControlHubProps> = ({ activeTab: initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { can, isSuperadmin } = useAuth();

  // Determine active tab from prop or URL pathname
  const currentTabFromUrl = (): AccessTabKey => {
    const path = location.pathname;
    if (path.includes('/access/roles')) return 'roles';
    if (path.includes('/access/matrix')) return 'matrix';
    if (path.includes('/access/devices')) return 'devices';
    if (path.includes('/access/history')) return 'history';
    return 'users';
  };

  const [activeTab, setActiveTab] = useState<AccessTabKey>(initialTab || currentTabFromUrl());
  const [matrixSelectedRoleId, setMatrixSelectedRoleId] = useState<number | undefined>(undefined);

  useEffect(() => {
    setActiveTab(initialTab || currentTabFromUrl());
  }, [location.pathname, initialTab]);

  const handleTabChange = (tab: AccessTabKey) => {
    setActiveTab(tab);
    navigate(`/access/${tab}`);
  };

  const handleSelectRoleInMatrix = (roleId: number) => {
    setMatrixSelectedRoleId(roleId);
    setActiveTab('matrix');
    navigate('/access/matrix');
  };

  // Define tab definitions with permission requirements
  const tabs = [
    {
      key: 'users' as AccessTabKey,
      label: 'Pengguna',
      icon: Users,
      allowed: isSuperadmin || can('users.view'),
    },
    {
      key: 'roles' as AccessTabKey,
      label: 'Role',
      icon: Shield,
      allowed: isSuperadmin || can('access.manage'),
    },
    {
      key: 'matrix' as AccessTabKey,
      label: 'Matriks Izin',
      icon: KeyRound,
      allowed: isSuperadmin || can('access.manage'),
    },
    {
      key: 'devices' as AccessTabKey,
      label: 'Perangkat',
      icon: Smartphone,
      allowed: isSuperadmin || can('devices.view'),
    },
    {
      key: 'history' as AccessTabKey,
      label: 'Riwayat',
      icon: History,
      allowed: isSuperadmin || can('audit.view'),
    },
  ];

  const visibleTabs = tabs.filter((t) => t.allowed);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengguna & Hak Akses"
        subtitle="Manajemen akun pengguna staf, perizinan matriks role, otorisasi perangkat seluler, dan jejak audit"
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="pt-2">
        {activeTab === 'users' && (isSuperadmin || can('users.view')) && <UserManagement />}
        {activeTab === 'roles' && (isSuperadmin || can('access.manage')) && (
          <RoleManagementTab onSelectMatrixRole={handleSelectRoleInMatrix} />
        )}
        {activeTab === 'matrix' && (isSuperadmin || can('access.manage')) && (
          <PermissionMatrixTab initialRoleId={matrixSelectedRoleId} />
        )}
        {activeTab === 'devices' && (isSuperadmin || can('devices.view')) && <DeviceManagement />}
        {activeTab === 'history' && (isSuperadmin || can('audit.view')) && <AccessHistoryTab />}
      </div>
    </div>
  );
};

export default AccessControlHub;
