import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Tag } from 'lucide-react';
import { PackagesManagement } from './PackagesManagement';
import { PromoManagement } from './PromoManagement';

export interface CatalogHubProps {
  defaultTab?: 'packages' | 'promo';
}

export const CatalogHub: React.FC<CatalogHubProps> = ({ defaultTab = 'packages' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'packages' | 'promo'>(() => {
    return tabParam === 'promo' ? 'promo' : defaultTab;
  });

  useEffect(() => {
    if (tabParam === 'promo') {
      setActiveTab('promo');
    } else {
      setActiveTab('packages');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'packages' | 'promo') => {
    setActiveTab(tab);
    if (tab === 'promo') {
      setSearchParams({ tab: 'promo' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('packages')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'packages'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Paket Internet</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('promo')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'promo'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Kode Promo</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'packages' ? <PackagesManagement /> : <PromoManagement />}
      </div>
    </div>
  );
};

export default CatalogHub;
