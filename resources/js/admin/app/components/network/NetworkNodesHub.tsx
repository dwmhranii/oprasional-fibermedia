import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Network, Server, Layers, Cable } from 'lucide-react';
import { OltManagement } from './OltManagement';
import { OdpManagement } from './OdpManagement';
import { OdcManagement } from './OdcManagement';
import { NetworkCableManagement } from './NetworkCableManagement';
import { PageHeader } from '@shared/ui/PageHeader';

type TabKey = 'olt' | 'odc' | 'odp' | 'cable';

export const NetworkNodesHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'odp';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabKey;
    if (tabFromUrl && ['olt', 'odc', 'odp', 'cable'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="OLT, ODC, ODP & Kabel"
        subtitle="Manajemen simpul perangkat pasif dan aktif jaringan FTTH Fibermedia"
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-border space-x-2">
        <button
          type="button"
          onClick={() => handleTabChange('olt')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'olt'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>OLT</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('odc')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'odc'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>ODC</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('odp')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'odp'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>ODP</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('cable')}
          className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'cable'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Cable className="w-4 h-4" />
          <span>Kabel Distribusi & Feeder</span>
        </button>
      </div>

      {/* Content Rendering */}
      <div>
        {activeTab === 'olt' && <OltManagement />}

        {activeTab === 'odc' && <OdcManagement />}

        {activeTab === 'odp' && <OdpManagement />}

        {activeTab === 'cable' && <NetworkCableManagement />}
      </div>
    </div>
  );
};

export default NetworkNodesHub;
