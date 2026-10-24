import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import {
  LayoutDashboard,
  FileText,
  Users,
  Shield,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Wifi,
  ClipboardList,
  CheckCircle,
  Wrench,
  BarChart3,
  User,
  AlertTriangle,
  Activity,
  Package,
  Tag,
  Download,
  Smartphone,
  MessageSquareWarning,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  Layers,
  Radio,
  Server,
  Clock,
  Calendar,
  MapPin,
  TrendingUp,
  Star,
  Sliders,
  Map,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { NotificationBell } from '../common/NotificationBell';
import { InstallPwaModal } from '../common/InstallPwaModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { CommandPalette, FlatMenuItem } from '../common/CommandPalette';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { toast } from 'sonner';

interface ApiMenuItem {
  title: string;
  icon: string;
  route: string;
  permission: string | null;
  order: number;
  badge_key: string | null;
}

interface ApiMenuGroup {
  group: string;
  group_order: number;
  items: ApiMenuItem[];
}

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Desktop collapse state (persisted in localStorage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Collapsed sections in sidebar (persisted in localStorage)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupName]: !prev[groupName] };
      try {
        localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('sidebar_collapsed', String(next));
        } catch {}
        return next;
      });
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { isInstalled, triggerDirectInstall } = usePWAInstall();

  const handlePwaInstallClick = async () => {
    if (isInstalled) {
      toast.info('Aplikasi Fibermedia sudah terpasang di perangkat ini.');
      return;
    }
    const { triggered, accepted } = await triggerDirectInstall();
    if (accepted) {
      toast.success('Aplikasi Fibermedia berhasil dipasang!');
    } else if (!triggered) {
      setPwaModalOpen(true);
    }
  };

  // 1. Fetch Dynamic Menu from backend
  const { data: menuResponse } = useQuery<{ success: boolean; data: ApiMenuGroup[] }>({
    queryKey: ['dynamicMenu'],
    queryFn: async () => {
      return await apiClient.get('/menu');
    },
    staleTime: 60000,
  });

  // 2. Fetch Badges from backend (cached few seconds)
  const { data: badgesResponse } = useQuery<{ success: boolean; data: Record<string, number> }>({
    queryKey: ['menuBadges'],
    queryFn: async () => {
      return await apiClient.get('/menu/badges');
    },
    refetchInterval: 15000,
  });

  const badges = badgesResponse?.data || {};
  const menuGroups = menuResponse?.data || [];

  // Flat menu items for command palette
  const flatMenuItems: FlatMenuItem[] = [];
  menuGroups.forEach((group) => {
    group.items.forEach((item) => {
      flatMenuItems.push({
        group: group.group,
        title: item.title,
        route: item.route,
        icon: item.icon,
      });
    });
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard': return <LayoutDashboard className="w-5 h-5 shrink-0" />;
      case 'Users': return <Users className="w-5 h-5 shrink-0" />;
      case 'Users2': return <Users className="w-5 h-5 shrink-0" />;
      case 'FileText': return <FileText className="w-5 h-5 shrink-0" />;
      case 'AlertTriangle': return <AlertTriangle className="w-5 h-5 shrink-0" />;
      case 'Wrench': return <Wrench className="w-5 h-5 shrink-0" />;
      case 'Package': return <Package className="w-5 h-5 shrink-0" />;
      case 'ClipboardList': return <ClipboardList className="w-5 h-5 shrink-0" />;
      case 'Settings': return <Settings className="w-5 h-5 shrink-0" />;
      case 'Server': return <Server className="w-5 h-5 shrink-0" />;
      case 'Clock': return <Clock className="w-5 h-5 shrink-0" />;
      case 'Calendar': return <Calendar className="w-5 h-5 shrink-0" />;
      case 'Smartphone': return <Smartphone className="w-5 h-5 shrink-0" />;
      case 'MapPin': return <MapPin className="w-5 h-5 shrink-0" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 shrink-0" />;
      case 'Star': return <Star className="w-5 h-5 shrink-0" />;
      case 'Sliders': return <Sliders className="w-5 h-5 shrink-0" />;
      case 'BarChart3': return <BarChart3 className="w-5 h-5 shrink-0" />;
      case 'Shield': return <Shield className="w-5 h-5 shrink-0" />;
      case 'Map': return <Map className="w-5 h-5 shrink-0" />;
      default: return <Activity className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 z-30 transition-colors">
        <div className="h-full px-4 flex items-center justify-between">
          {/* Left - Logo & Menu Toggle */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              onClick={toggleSidebar}
              title={isCollapsed ? 'Perbesar Sidebar (Buka)' : 'Perkecil Sidebar (Tutup)'}
            >
              <span className="lg:hidden">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </span>
              <span className="hidden lg:inline-flex">
                {isCollapsed ? (
                  <PanelLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <PanelLeftClose className="w-5 h-5 text-gray-600 dark:text-slate-400" />
                )}
              </span>
            </Button>

            <div
              className="flex items-center cursor-pointer select-none"
              onClick={() => navigate('/dashboard')}
              title="Dashboard Fibermedia"
            >
              <img
                src="/logo-fibermedia.png"
                alt="Fibermedia Play"
                className="h-9 object-contain"
              />
            </div>
          </div>

          {/* Center: Command Palette Quick Search Button */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Pencarian cepat modul...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-2xs">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right - Dark Mode Setting, Install PWA, Notifications & User */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={handlePwaInstallClick}
              className="hidden sm:flex items-center gap-1.5 border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs h-9 px-3 rounded-lg shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </Button>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 h-10 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <Avatar className="w-8 h-8">
                    {user?.avatar && (
                      <AvatarImage src={user.avatar} alt={user?.name || 'User'} className="object-cover" />
                    )}
                    <AvatarFallback style={{ backgroundColor: '#667eea', color: 'white' }}>
                      {getInitials(user?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-xl">
                <DropdownMenuLabel className="text-gray-800 dark:text-slate-200">Akun Saya</DropdownMenuLabel>
                <DropdownMenuSeparator className="dark:bg-slate-800" />
                <DropdownMenuItem onClick={handlePwaInstallClick} className="cursor-pointer dark:hover:bg-slate-800">
                  <Download className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Install Aplikasi (PWA)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer dark:hover:bg-slate-800">
                  <Settings className="mr-2 h-4 w-4 text-gray-500 dark:text-slate-400" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator className="dark:bg-slate-800" />
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 cursor-pointer dark:hover:bg-slate-800">
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-16 left-0 bottom-0 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 z-20 transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } w-64 lg:translate-x-0 flex flex-col justify-between`}
      >
        <div className="h-full flex flex-col justify-between overflow-hidden">
          {/* Scrollable Navigation Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 overflow-x-hidden">
            <nav className="space-y-3">
              {menuGroups.map((group) => {
                const isGroupCollapsed = !!collapsedGroups[group.group];

                return (
                  <div key={group.group} className="space-y-1">
                    {/* Collapsible Group Header */}
                    {!isCollapsed ? (
                      <div
                        onClick={() => toggleGroup(group.group)}
                        className="flex items-center justify-between px-3 py-1 cursor-pointer select-none text-[11px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                      >
                        <span className="truncate">{group.group}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isGroupCollapsed ? '-rotate-90' : ''
                          }`}
                        />
                      </div>
                    ) : (
                      <div className="my-2 border-t border-slate-100 dark:border-slate-800 mx-2" />
                    )}

                    {/* Group Items (Hidden if group is collapsed on desktop expanded mode) */}
                    {(!isGroupCollapsed || isCollapsed) && (
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isActive =
                            currentPath === item.route ||
                            (item.route !== '/dashboard' && currentPath.startsWith(item.route));
                          const badgeCount = item.badge_key ? badges[item.badge_key] : null;

                          return (
                            <button
                              key={item.route}
                              onClick={() => {
                                navigate(item.route);
                                setMobileOpen(false);
                              }}
                              title={item.title}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                              } ${isCollapsed ? 'justify-center px-2' : ''}`}
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <span className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600'}>
                                  {renderIcon(item.icon)}
                                </span>
                                {!isCollapsed && (
                                  <span className="truncate">{item.title}</span>
                                )}
                              </div>

                              {!isCollapsed && badgeCount !== null && badgeCount !== undefined && badgeCount > 0 && (
                                <Badge
                                  className={`h-4 px-1.5 text-[9px] ${
                                    isActive
                                      ? 'bg-white text-blue-600'
                                      : 'bg-red-500 text-white'
                                  }`}
                                >
                                  {badgeCount}
                                </Badge>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Footer of Sidebar */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-800">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <Search className="w-4 h-4" />
              {!isCollapsed && <span>Cari Cepat (Ctrl+K)</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`pt-16 transition-all duration-300 ease-in-out min-h-screen ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>

      {/* Command Palette Modal */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        items={flatMenuItems}
      />

      {/* Install PWA Modal */}
      <InstallPwaModal
        open={pwaModalOpen}
        onOpenChange={setPwaModalOpen}
      />
    </div>
  );
};