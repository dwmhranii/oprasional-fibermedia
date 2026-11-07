import React from 'react';
import { IconButton, Badge } from '../atoms';
import { SearchBox } from '../molecules';
import { Bell, Moon, Sun, Menu, Radio, CheckCircle2 } from 'lucide-react';

export interface TopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
  onToggleSidebar?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  className?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  pageTitle,
  pageSubtitle,
  onToggleSidebar,
  isDarkMode,
  onToggleDarkMode,
  notificationCount = 2,
  onOpenNotifications,
  className = '',
}) => {
  return (
    <header
      className={`h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 ${className}`}
    >
      {/* Left: Mobile Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <IconButton
            icon={<Menu className="w-5 h-5" />}
            ariaLabel="Buka menu navigasi"
            variant="ghost"
            size="sm"
            density="compact"
            onClick={onToggleSidebar}
            className="lg:hidden"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="hidden sm:block text-xs text-muted-foreground truncate">{pageSubtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Network Status Pill, Notification, Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Network BRAS Pulse Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>BRAS-01 Online (99.98%)</span>
        </div>

        {/* Theme Toggle */}
        <IconButton
          icon={isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          ariaLabel="Ganti tema"
          variant="ghost"
          size="sm"
          density="compact"
          onClick={onToggleDarkMode}
        />

        {/* Notifications */}
        <div className="relative">
          <IconButton
            icon={<Bell className="w-4 h-4" />}
            ariaLabel="Pemberitahuan"
            variant="ghost"
            size="sm"
            density="compact"
            onClick={onOpenNotifications}
          />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card" />
          )}
        </div>
      </div>
    </header>
  );
};

