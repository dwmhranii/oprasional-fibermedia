import React from 'react';

export interface FieldLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  bottomNav: React.ReactNode;
  offlineBanner?: React.ReactNode;
  toast?: React.ReactNode;
  maxWidth?: 'pwa' | 'wide';
}

export const FieldLayout: React.FC<FieldLayoutProps> = ({
  header,
  children,
  bottomNav,
  offlineBanner,
  toast,
  maxWidth = 'pwa',
}) => {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-surface-canvas text-content-primary transition-colors duration-200">
      {/* Top Header with Fiber Topology Decoration */}
      {header}

      {/* Main Content Container */}
      <main
        className={`flex-1 w-full mx-auto px-3.5 pt-4 ${
          maxWidth === 'wide' ? 'max-w-5xl' : 'max-w-lg lg:max-w-2xl'
        }`}
      >
        {children}
      </main>

      {/* Toast Notification Slot */}
      {toast}

      {/* Offline Banner Slot */}
      {offlineBanner}

      {/* Bottom Navigation Bar */}
      {bottomNav}
    </div>
  );
};
