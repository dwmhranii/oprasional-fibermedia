import React from 'react';
import { BrandLogo } from '../brand/BrandLogo';
import { BottomNav } from '../organisms/BottomNav';
import { OfflineBanner } from '../organisms/OfflineBanner';
import { Avatar, IconButton } from '../atoms';
import { Moon, Sun } from 'lucide-react';

export interface FieldLayoutProps {
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  title?: string;
  subtitle?: string;
  isOffline?: boolean;
  outboxCount?: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  userName?: string;
  userRole?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
}

export const FieldLayout: React.FC<FieldLayoutProps> = ({
  activeTabId,
  onSelectTab,
  title,
  subtitle,
  isOffline = false,
  outboxCount = 0,
  onSyncNow,
  isSyncing = false,
  isDarkMode = false,
  onToggleDarkMode,
  userName = 'Teknisi Lapangan',
  userRole = 'Tim Alpha',
  children,
  headerAction,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col max-w-md mx-auto shadow-2xl relative ${className}`}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo variant="field" size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {headerAction}

          {onToggleDarkMode && (
            <IconButton
              icon={isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              ariaLabel="Ganti tema"
              variant="ghost"
              size="sm"
              density="compact"
              onClick={onToggleDarkMode}
            />
          )}

          <div className="flex items-center gap-2 pl-1 border-l border-border">
            <Avatar name={userName} size="sm" status="online" />
          </div>
        </div>
      </header>

      {/* Offline Alert Banner */}
      <OfflineBanner
        isOffline={isOffline}
        queuedCount={outboxCount}
        onSyncNow={onSyncNow}
        isSyncing={isSyncing}
      />

      {/* Page Title & Subtitle if provided */}
      {(title || subtitle) && (
        <div className="px-4 pt-4 pb-1">
          {title && <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>}
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      )}

      {/* Scrollable Content (padded at bottom to clear BottomNav) */}
      <main className="flex-1 px-4 py-3 pb-24 overflow-y-auto space-y-4">
        {children}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        activeTabId={activeTabId}
        onSelectTab={onSelectTab}
        outboxCount={outboxCount}
      />
    </div>
  );
};

