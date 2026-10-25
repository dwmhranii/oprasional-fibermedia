import React, { ReactNode } from 'react';

export interface DetailTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface DetailLayoutProps {
  header?: ReactNode;
  summaryCards?: ReactNode;
  tabs?: DetailTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export const DetailLayout: React.FC<DetailLayoutProps> = ({
  header,
  summaryCards,
  tabs,
  activeTab,
  onTabChange,
  children,
  sidebar,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {header && <div>{header}</div>}

      {summaryCards && <div>{summaryCards}</div>}

      {/* Main Grid: Content + Optional Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className={sidebar ? 'lg:col-span-3 space-y-6' : 'lg:col-span-4 space-y-6'}>
          {/* Tabs bar */}
          {tabs && tabs.length > 0 && (
            <div className="border-b border-border">
              <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar" aria-label="Tabs">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange?.(tab.id)}
                      className={`inline-flex items-center py-3 px-2 sm:px-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4 mr-2" />}
                      <span>{tab.label}</span>
                      {typeof tab.count === 'number' && (
                        <span
                          className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Active Tab Content */}
          <div className="space-y-6">{children}</div>
        </div>

        {/* Sidebar panel */}
        {sidebar && (
          <div className="lg:col-span-1 space-y-6">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailLayout;
