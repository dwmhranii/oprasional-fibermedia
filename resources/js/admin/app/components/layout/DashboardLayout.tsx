import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import {
  LayoutDashboard,
  FileText,
  Users,
  Shield,
  ShieldCheck,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ClipboardList,
  Wrench,
  BarChart3,
  AlertTriangle,
  Activity,
  Package,
  Download,
  Smartphone,
  ChevronDown,
  PanelLeft,
  PanelLeftClose,
  Server,
  Clock,
  Calendar,
  MapPin,
  TrendingUp,
  Star,
  Sliders,
  Map,
  Network,
  CheckSquare,
  FileSpreadsheet,
  ChevronsUpDown,
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
  is_available?: boolean;
  available_from_phase?: string | null;
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

  const isSuperadmin =
    user?.role?.toLowerCase() === 'superadmin' ||
    user?.roles?.some((r: any) => (typeof r === 'string' ? r : r.name)?.toLowerCase() === 'superadmin');

  // Desktop collapse state (persisted in localStorage with try/catch)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fm-admin:sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Collapsed sections in sidebar (persisted in localStorage with try/catch)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fm-admin:sidebar_collapsed_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Scroll shadows state
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [hasScrollTop, setHasScrollTop] = useState(false);
  const [hasScrollBottom, setHasScrollBottom] = useState(false);
  const activeMenuRef = useRef<HTMLButtonElement>(null);

  const checkScrollShadows = () => {
    const el = navScrollRef.current;
    if (!el) return;
    setHasScrollTop(el.scrollTop > 4);
    setHasScrollBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 6);
  };

  useEffect(() => {
    checkScrollShadows();
    const el = navScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollShadows);
      window.addEventListener('resize', checkScrollShadows);
      return () => {
        el.removeEventListener('scroll', checkScrollShadows);
        window.removeEventListener('resize', checkScrollShadows);
      };
    }
  }, []);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupName]: !prev[groupName] };
      try {
        localStorage.setItem('fm-admin:sidebar_collapsed_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
    setTimeout(checkScrollShadows, 150);
  };

  const toggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('fm-admin:sidebar_collapsed', String(next));
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
  const { data: menuResponse, isLoading: isMenuLoading } = useQuery<any>({
    queryKey: ['dynamicMenu'],
    queryFn: async () => {
      return await apiClient.get('/menu');
    },
    staleTime: 60000,
  });

  // 2. Fetch Badges from backend (cache 30s di backend, polling 60s di frontend)
  const { data: badgesResponse } = useQuery<any>({
    queryKey: ['menuBadges'],
    queryFn: async () => {
      return await apiClient.get('/menu/badges');
    },
    refetchInterval: 60000,
  });

  const badges: Record<string, number> = useMemo(() => {
    if (!badgesResponse) return {};
    if (typeof badgesResponse === 'object' && 'data' in badgesResponse && typeof (badgesResponse as any).data === 'object') {
      return (badgesResponse as any).data || {};
    }
    if (typeof badgesResponse === 'object') {
      return badgesResponse as Record<string, number>;
    }
    return {};
  }, [badgesResponse]);

  const rawMenuGroups: ApiMenuGroup[] = useMemo(() => {
    if (!menuResponse) return [];
    if (Array.isArray(menuResponse)) {
      return menuResponse;
    }
    if (Array.isArray((menuResponse as any)?.data)) {
      return (menuResponse as any).data;
    }
    return [];
  }, [menuResponse]);

  const menuGroups: ApiMenuGroup[] = useMemo(() => {
    return rawMenuGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          if (!isSuperadmin) return item.is_available !== false;
          return true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [rawMenuGroups, isSuperadmin]);

  // Penentuan menu aktif berbasis prinsip Satu Pintu (parent hub tetap aktif saat membuka tab/sub-path)
  const isItemActive = (item: { title?: string; route: string } | string): boolean => {
    const itemRoute = typeof item === 'string' ? item : item.route;
    const itemTitle = typeof item === 'string' ? '' : item.title || '';

    if (itemRoute === '/dashboard' || itemRoute === '/admin') {
      return currentPath === '/dashboard' || currentPath === '/admin' || currentPath === '/';
    }
    // Satu Pintu Hub Jaringan (OLT, ODC, ODP, Kabel, BRAS, Persetujuan)
    if (itemRoute === '/network/odp' || itemRoute === '/network/nodes' || itemTitle === 'OLT, ODC, ODP & Kabel') {
      return currentPath.startsWith('/network/') && currentPath !== '/network/map';
    }
    // Peta Jaringan
    if (itemRoute === '/network/map' || itemTitle === 'Peta Jaringan') {
      return currentPath === '/network/map' || currentPath.startsWith('/network/map/');
    }
    // Satu Pintu Hub Absensi (Hari ini, Rekap, Kantor)
    if (itemRoute === '/attendance/today' || itemRoute === '/attendance' || itemTitle === 'Absensi') {
      return currentPath.startsWith('/attendance') || currentPath.startsWith('/office-locations');
    }
    // Satu Pintu Hub Pengguna & Hak Akses (Users, Roles, Matrix, Devices, History)
    if (itemRoute === '/access/users' || itemRoute === '/access' || itemTitle === 'Pengguna & Hak Akses') {
      return currentPath.startsWith('/access') || currentPath.startsWith('/users') || currentPath.startsWith('/devices');
    }
    // Satu Pintu Hub Pengaturan Sistem (SLA, Gangguan, Kantor, Hari Libur, 2FA)
    if (
      itemTitle === 'Pengaturan Sistem' ||
      itemRoute === '/settings/system' ||
      itemRoute === '/settings/sla'
    ) {
      return [
        '/settings/system',
        '/settings/sla',
        '/settings/complaint-types',
        '/settings/offices',
        '/settings/holidays',
        '/settings/2fa',
      ].some((p) => currentPath === p || currentPath.startsWith(p + '/'));
    }
    // Satu Pintu Hub Pengaturan Operasional (Dispatch, Peta, Log Aktivitas)
    if (
      itemTitle === 'Pengaturan Operasional' ||
      itemRoute === '/settings/dispatch' ||
      itemRoute === '/settings/operasional'
    ) {
      return [
        '/settings/dispatch',
        '/settings/map',
        '/settings/activity-log',
        '/activity-log',
      ].some((p) => currentPath === p || currentPath.startsWith(p + '/'));
    }
    // Satu Pintu Hub KPI (Dasbor, Rating, Pengaturan)
    if (itemRoute === '/kpi' || itemTitle === 'KPI') {
      return currentPath.startsWith('/kpi');
    }
    // Satu Pintu Hub Pelanggan (Pelanggan, Submissions)
    if (itemRoute === '/customers' || itemTitle === 'Pelanggan') {
      return currentPath.startsWith('/customers') || currentPath.startsWith('/submissions');
    }
    if (itemRoute === '/settings') {
      return currentPath === '/settings';
    }
    return currentPath === itemRoute || currentPath.startsWith(itemRoute + '/');
  };

  // Akordeon: grup yang berisi menu aktif otomatis terbuka, grup lain terlipat secara default
  useEffect(() => {
    if (menuGroups.length > 0) {
      menuGroups.forEach((group) => {
        if (!group.group) return;
        const hasActiveItem = group.items.some((item) => isItemActive(item));

        if (hasActiveItem && collapsedGroups[group.group]) {
          setCollapsedGroups((prev) => {
            const next = { ...prev, [group.group]: false };
            try {
              localStorage.setItem('fm-admin:sidebar_collapsed_groups', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      });
      setTimeout(() => {
        checkScrollShadows();
        if (activeMenuRef.current) {
          activeMenuRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 100);
    }
  }, [currentPath, menuGroups]);

  // Flat menu items for command palette
  const flatMenuItems: FlatMenuItem[] = useMemo(() => {
    const list: FlatMenuItem[] = [];
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.is_available !== false) {
          list.push({
            group: group.group || 'Utama',
            title: item.title,
            route: item.route,
            icon: item.icon,
          });
        }
      });
    });
    return list;
  }, [menuGroups]);

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
      case 'LayoutDashboard': return <LayoutDashboard className="w-4 h-4 shrink-0" />;
      case 'Users': return <Users className="w-4 h-4 shrink-0" />;
      case 'Users2': return <Users className="w-4 h-4 shrink-0" />;
      case 'FileText': return <FileText className="w-4 h-4 shrink-0" />;
      case 'AlertTriangle': return <AlertTriangle className="w-4 h-4 shrink-0" />;
      case 'Wrench': return <Wrench className="w-4 h-4 shrink-0" />;
      case 'Package': return <Package className="w-4 h-4 shrink-0" />;
      case 'ClipboardList': return <ClipboardList className="w-4 h-4 shrink-0" />;
      case 'Settings': return <Settings className="w-4 h-4 shrink-0" />;
      case 'Server': return <Server className="w-4 h-4 shrink-0" />;
      case 'Clock': return <Clock className="w-4 h-4 shrink-0" />;
      case 'Calendar': return <Calendar className="w-4 h-4 shrink-0" />;
      case 'Smartphone': return <Smartphone className="w-4 h-4 shrink-0" />;
      case 'MapPin': return <MapPin className="w-4 h-4 shrink-0" />;
      case 'TrendingUp': return <TrendingUp className="w-4 h-4 shrink-0" />;
      case 'Star': return <Star className="w-4 h-4 shrink-0" />;
      case 'Sliders': return <Sliders className="w-4 h-4 shrink-0" />;
      case 'BarChart3': return <BarChart3 className="w-4 h-4 shrink-0" />;
      case 'Shield': return <Shield className="w-4 h-4 shrink-0" />;
      case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 shrink-0" />;
      case 'Map': return <Map className="w-4 h-4 shrink-0" />;
      case 'Network': return <Network className="w-4 h-4 shrink-0" />;
      case 'CheckSquare': return <CheckSquare className="w-4 h-4 shrink-0" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4 shrink-0" />;
      default: return <Activity className="w-4 h-4 shrink-0" />;
    }
  };

  const formatBadgeDisplay = (val: number): string => {
    return val > 99 ? '99+' : String(val);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors flex">
      {/* Top Navbar */}
      <header
        className={`fixed top-0 right-0 h-16 bg-card/95 backdrop-blur-xs border-b border-border z-20 transition-all duration-300 ${
          isCollapsed ? 'lg:left-20' : 'lg:left-64'
        } left-0`}
      >
        <div className="h-full px-4 flex items-center justify-between">
          {/* Mobile hamburger button */}
          <div className="flex items-center space-x-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted"
              onClick={toggleSidebar}
              aria-label="Toggle Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div
              className="flex items-center cursor-pointer select-none"
              onClick={() => navigate('/dashboard')}
            >
              <img src="/logo-fibermedia.png" alt="Fibermedia" className="h-7 object-contain" />
            </div>
          </div>

          {/* Center: Command Palette Quick Search Button */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted rounded-lg border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Pencarian cepat (menu, pelanggan, tiket)...</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-card border border-border rounded">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right - Dark Mode Setting, Install PWA, Notifications & User */}
          <div className="flex items-center space-x-2 sm:space-x-3 ml-auto">
            <ThemeToggle />

            <Button
              variant="outline"
              size="sm"
              onClick={handlePwaInstallClick}
              className="hidden sm:flex items-center gap-1.5 border-border bg-muted/40 hover:bg-muted font-medium text-xs h-9 px-3 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              Pasang Aplikasi
            </Button>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2.5 h-10 hover:bg-muted px-2">
                  <Avatar className="w-8 h-8">
                    {user?.avatar && (
                      <AvatarImage src={user.avatar} alt={user?.name || 'User'} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {getInitials(user?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                      {user?.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {user?.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-xl">
                <DropdownMenuLabel className="text-foreground">Akun Saya</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePwaInstallClick} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4 text-primary" />
                  Pasang Aplikasi (PWA)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation: 100dvh dengan 3 Bagian (Kepala, Tengah, Kaki) */}
      <aside
        className={`fixed top-0 left-0 h-[100dvh] bg-card border-r border-border z-30 transition-all duration-300 ease-in-out flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64 lg:translate-x-0`}
      >
        {/* BAGIAN 1: KEPALA SIDEBAR (Logo + Tombol Perkecil Menu) */}
        <div className="h-16 px-3.5 border-b border-border flex items-center justify-between shrink-0 bg-card">
          {!isCollapsed ? (
            <>
              <div
                className="flex items-center cursor-pointer select-none"
                onClick={() => navigate('/dashboard')}
                title="Dashboard Fibermedia"
              >
                <img
                  src="/logo-fibermedia.png"
                  alt="Fibermedia"
                  className="h-8 object-contain"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex text-muted-foreground hover:bg-muted hover:text-foreground h-8 w-8"
                onClick={toggleSidebar}
                title="Perkecil Menu"
                aria-label="Perkecil Menu"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:bg-muted h-9 w-9"
                onClick={toggleSidebar}
                title="Perbesar Menu"
                aria-label="Perbesar Menu"
              >
                <PanelLeft className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>

        {/* BAGIAN 2: TENGAH (Daftar Menu Satu-satunya yang Menggulir dengan flex-1 min-h-0) */}
        <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
          {/* Scroll shadow top */}
          <div
            className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-card to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              hasScrollTop ? 'opacity-100' : 'opacity-0'
            }`}
          />


          {/* Area Scroll Menu Utama */}
          <div
            ref={navScrollRef}
            className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 min-h-0 overflow-x-hidden scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/40"
          >
            <nav aria-label="Menu Utama" className="space-y-2">
              {isMenuLoading && menuGroups.length === 0 && (
                <div className="space-y-2 p-2" aria-busy="true">
                  <div className="h-3.5 bg-muted/60 animate-pulse rounded w-2/3 mb-2" />
                  <div className="h-8 bg-muted/40 animate-pulse rounded-lg" />
                  <div className="h-8 bg-muted/40 animate-pulse rounded-lg" />
                  <div className="h-3.5 bg-muted/60 animate-pulse rounded w-1/2 mt-4 mb-2" />
                  <div className="h-8 bg-muted/40 animate-pulse rounded-lg" />
                  <div className="h-8 bg-muted/40 animate-pulse rounded-lg" />
                </div>
              )}

              {menuGroups.map((group) => {
                const isNoGroup = !group.group || group.group.trim() === '';
                const isGroupCollapsed = !isNoGroup && !!collapsedGroups[group.group];

                return (
                  <div key={group.group || 'root'} className="space-y-0.5">
                    {/* Collapsible Group Header */}
                    {!isNoGroup && !isCollapsed && (
                      <button
                        type="button"
                        aria-expanded={!isGroupCollapsed}
                        onClick={() => toggleGroup(group.group)}
                        className="w-full flex items-center justify-between px-2.5 py-1 cursor-pointer select-none text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
                      >
                        <span className="truncate">{group.group}</span>
                        <ChevronDown
                          className={`w-3 h-3 transition-transform duration-200 ${
                            isGroupCollapsed ? '-rotate-90' : ''
                          }`}
                        />
                      </button>
                    )}

                    {/* Divider di mode Collapsed */}
                    {!isNoGroup && isCollapsed && (
                      <div className="my-1.5 border-t border-border mx-1.5" />
                    )}

                    {/* Group Items */}
                    {(isNoGroup || !isGroupCollapsed || isCollapsed) && (
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isAvailable = item.is_available !== false;
                          const isActive = isAvailable && isItemActive(item);

                          const badgeCount = item.badge_key ? badges[item.badge_key] : null;
                          const hasBadge = badgeCount !== null && badgeCount !== undefined && badgeCount > 0;

                          const handleClick = (e: React.MouseEvent) => {
                            if (!isAvailable) {
                              e.preventDefault();
                              toast.info(
                                `Modul ${item.title} segera hadir setelah ${
                                  item.available_from_phase || 'fase berikutnya'
                                }.`
                              );
                              return;
                            }
                            navigate(item.route);
                            setMobileOpen(false);
                          };

                          return (
                            <button
                              key={item.route}
                              ref={isActive ? activeMenuRef : undefined}
                              type="button"
                              aria-current={isActive ? 'page' : undefined}
                              onClick={handleClick}
                              title={
                                !isAvailable
                                  ? `${item.title} — Tersedia setelah ${item.available_from_phase || 'fase berikutnya'}`
                                  : item.title
                              }
                              className={`relative w-full flex items-center justify-between px-2.5 h-9 rounded-lg text-xs font-medium transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                !isAvailable
                                  ? 'opacity-60 cursor-not-allowed hover:bg-muted/40 text-muted-foreground'
                                  : isActive
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                  : 'text-foreground hover:bg-muted'
                              } ${isCollapsed ? 'justify-center px-0' : ''}`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <span
                                  className={
                                    isActive
                                      ? 'text-primary-foreground'
                                      : !isAvailable
                                      ? 'text-muted-foreground/60'
                                      : 'text-muted-foreground group-hover:text-foreground'
                                  }
                                >
                                  {renderIcon(item.icon)}
                                </span>
                                {!isCollapsed && (
                                  <span className="truncate">{item.title}</span>
                                )}
                              </div>

                              {/* Label "Segera" untuk menu modul fase berikutnya */}
                              {!isCollapsed && !isAvailable && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                  Segera
                                </span>
                              )}

                              {/* Badge angka di Desktop Expanded */}
                              {!isCollapsed && isAvailable && hasBadge && (
                                <Badge
                                  className={`h-4 px-1.5 text-[9px] font-bold ${
                                    isActive
                                      ? 'bg-primary-foreground text-primary'
                                      : 'bg-destructive text-destructive-foreground'
                                  }`}
                                >
                                  {formatBadgeDisplay(badgeCount)}
                                  <span className="sr-only">tindakan diperlukan</span>
                                </Badge>
                              )}

                              {/* Dot Badge di Collapsed Mode */}
                              {isCollapsed && isAvailable && hasBadge && (
                                <span
                                  className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center shadow-2xs"
                                  title={`${badgeCount} butuh tindakan`}
                                >
                                  {formatBadgeDisplay(badgeCount)}
                                  <span className="sr-only">{badgeCount} tindakan diperlukan</span>
                                </span>
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

          {/* Scroll shadow bottom */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-card to-transparent pointer-events-none z-10 transition-opacity duration-200 ${
              hasScrollBottom ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* BAGIAN 3: KAKI SIDEBAR (Kartu "Peran Saat Ini" Ringkas 1 Baris) */}
        <div className="p-2 border-t border-border bg-card shrink-0 space-y-2">
          {!isCollapsed && user?.role === 'admin' && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="text-muted-foreground leading-snug">
                  <span className="font-semibold text-foreground block text-[11px]">Absen Harian</span>
                  <span className="text-[10px]">Buka aplikasi PWA di ponsel Anda untuk absen.</span>
                </div>
              </div>
            </div>
          )}
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-muted/30">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="w-6 h-6 shrink-0 ring-1 ring-border">
                  {user?.avatar && <AvatarImage src={user.avatar} alt={user?.name || ''} />}
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {getInitials(user?.name || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 leading-tight">
                  <div className="text-xs font-semibold text-foreground truncate max-w-[105px]">
                    {user?.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 capitalize font-semibold bg-background"
                >
                  {user?.role}
                </Badge>
                <span
                  className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background shrink-0 animate-pulse"
                  title="Status: Aktif"
                />
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center py-1 relative group cursor-pointer"
              title={`${user?.name} (${user?.role}) — Aktif`}
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-border">
                {getInitials(user?.name || '')}
              </div>
              <span className="absolute bottom-0.5 right-4 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`pt-16 transition-all duration-300 ease-in-out min-h-screen flex-1 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        items={flatMenuItems}
      />

      {/* Install PWA Modal */}
      <InstallPwaModal open={pwaModalOpen} onOpenChange={setPwaModalOpen} />
    </div>
  );
};

export default DashboardLayout;