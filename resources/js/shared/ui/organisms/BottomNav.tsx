import React from 'react';
import { UserCheck, Wrench, FileCheck, UploadCloud, Layers } from 'lucide-react';

export interface BottomNavTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
}

export interface BottomNavProps {
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  outboxCount?: number;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTabId,
  onSelectTab,
  outboxCount = 0,
  className = '',
}) => {
  const tabs: BottomNavTab[] = [
    { id: 'attendance', label: 'Absensi', icon: UserCheck },
    { id: 'tasks', label: 'Tugas', icon: Wrench, badgeCount: 2 },
    { id: 'bast', label: 'BAST', icon: FileCheck },
    { id: 'outbox', label: 'Outbox', icon: UploadCloud, badgeCount: outboxCount },
    { id: 'gallery', label: 'Galeri', icon: Layers },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah Lapangan"
      className={`fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md px-2 py-1 shadow-lg select-none ${className}`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTabId === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-12 py-1 px-1 rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-95 ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <IconComp
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 text-primary drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : ''
                  }`}
                />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-card">
                    {tab.badgeCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-0.5 tracking-tight ${
                  isActive ? 'font-bold text-primary' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

