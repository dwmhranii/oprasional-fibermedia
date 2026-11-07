import React, { useState } from 'react';
import { Sidebar } from '../organisms/Sidebar';
import { TopBar } from '../organisms/TopBar';

export interface AdminLayoutProps {
  pageTitle: string;
  pageSubtitle?: string;
  activeScreenId: string;
  onNavigate: (screenId: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  pageTitle,
  pageSubtitle,
  activeScreenId,
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
  children,
  userName = 'Admin NOC',
  userRole = 'Superadmin',
  onLogout,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar
          activeScreenId={activeScreenId}
          onNavigate={onNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-64 h-full bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeScreenId={activeScreenId}
              onNavigate={(id) => {
                onNavigate(id);
                setIsMobileMenuOpen(false);
              }}
              isCollapsed={false}
              onToggleCollapse={() => {}}
              isDarkMode={isDarkMode}
              onToggleDarkMode={onToggleDarkMode}
              userName={userName}
              userRole={userRole}
              onLogout={onLogout}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopBar
          pageTitle={pageTitle}
          pageSubtitle={pageSubtitle}
          onToggleSidebar={() => setIsMobileMenuOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={onToggleDarkMode}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

