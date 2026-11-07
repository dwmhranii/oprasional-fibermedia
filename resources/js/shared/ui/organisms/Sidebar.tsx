import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import {
  LayoutDashboard,
  Users,
  Radio,
  MapPin,
  UserCheck,
  Layers,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { Avatar, IconButton } from '../atoms';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export interface SidebarProps {
  activeScreenId: string;
  onNavigate: (screenId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreenId,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isDarkMode,
  onToggleDarkMode,
  userName = 'Admin NOC',
  userRole = 'Superadmin',
  onLogout,
  className = '',
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dasbor', icon: LayoutDashboard },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'dispatch', label: 'Dispatch Tiket', icon: Radio, badgeCount: 3 },
    { id: 'gis-map', label: 'Peta GIS ODP', icon: MapPin },
    { id: 'attendance-review', label: 'Tinjauan Absensi', icon: UserCheck, badgeCount: 5 },
    { id: 'component-gallery', label: 'Galeri Komponen', icon: Layers },
  ];

  return (
    <aside
      className={`relative h-screen flex flex-col border-r border-border bg-card transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && <BrandLogo variant="admin" size="sm" />}
        {isCollapsed && <BrandLogo variant="plain" size="sm" />}

        <IconButton
          icon={isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          ariaLabel={isCollapsed ? 'Perluas bilah samping' : 'Ciutkan bilah samping'}
          variant="ghost"
          size="sm"
          density="compact"
          onClick={onToggleCollapse}
          className="hidden lg:flex"
        />
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const IconComp = item.icon;
          const isActive = activeScreenId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm shadow-cyan-500/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <IconComp className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Profile & Theme toggle */}
      <div className="p-3 border-t border-border space-y-2">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl bg-muted/30 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={userName} size="sm" status="online" />
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{userRole}</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <IconButton
              icon={isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              ariaLabel="Ganti tema terang/gelap"
              variant="ghost"
              size="sm"
              density="compact"
              onClick={onToggleDarkMode}
            />
          )}
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Keluar' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar Sistem</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

