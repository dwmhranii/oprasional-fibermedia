import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkOrderDetailModal } from './WorkOrderDetailModal';
import { LiveFieldMap } from '../components/LiveFieldMap';
import {
  FilterBar,
  TicketCard,
  EmptyState,
  Button,
} from '../design-system';
import { Map, List, Radio } from 'lucide-react';

export const WorkOrdersScreen: React.FC = () => {
  const { currentUser, workOrders, acceptTicket } = useApp();

  const [activeFilter, setActiveFilter] = useState<'active' | 'psb' | 'complaint' | 'done' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Technicians only see Work Orders assigned to their team
  const myTeamWorkOrders = workOrders.filter((wo) =>
    currentUser.role === 'teknisi' ? wo.assigned_team_id === currentUser.team_id : true
  );

  const activeCount = myTeamWorkOrders.filter(
    (w) => w.status !== 'closed' && w.status !== 'resolved'
  ).length;
  const psbCount = myTeamWorkOrders.filter((w) => w.type === 'psb').length;
  const complaintCount = myTeamWorkOrders.filter((w) => w.type === 'complaint').length;
  const doneCount = myTeamWorkOrders.filter(
    (w) => w.status === 'closed' || w.status === 'resolved'
  ).length;

  // Filtered tickets
  const filteredTickets = myTeamWorkOrders.filter((wo) => {
    if (activeFilter === 'active') {
      if (wo.status === 'closed' || wo.status === 'resolved') return false;
    } else if (activeFilter === 'psb') {
      if (wo.type !== 'psb') return false;
    } else if (activeFilter === 'complaint') {
      if (wo.type !== 'complaint') return false;
    } else if (activeFilter === 'done') {
      if (wo.status !== 'closed' && wo.status !== 'resolved') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        wo.ticket_number.toLowerCase().includes(q) ||
        wo.customer_name.toLowerCase().includes(q) ||
        wo.address.toLowerCase().includes(q) ||
        wo.odp_name.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Always get fresh ticket state from context
  const selectedTicket = selectedTicketId
    ? workOrders.find((w) => w.id === selectedTicketId) || null
    : null;

  return (
    <div className="space-y-3.5 pb-24">
      {/* Header & Map/List Toggle using Design System Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-extrabold text-content-primary tracking-tight">
            Work Order {currentUser.team_name || 'Tim'}
          </h1>
          <p className="text-xs text-content-muted">
            Daftar tugas penanganan tiket lapangan
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            leftIcon={<List className="w-3.5 h-3.5" />}
            onClick={() => setViewMode('list')}
          >
            Daftar
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'map' ? 'primary' : 'secondary'}
            leftIcon={<Map className="w-3.5 h-3.5" />}
            onClick={() => setViewMode('map')}
          >
            Peta ODP
          </Button>
        </div>
      </div>

      {/* Map View Mode */}
      {viewMode === 'map' && (
        <div className="space-y-3">
          <LiveFieldMap onSelectTicket={(t) => setSelectedTicketId(t.id)} />
        </div>
      )}

      {/* Search and Filter using Reusable FilterBar Organism */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nomor WO, nama pelanggan, alamat, atau kode ODP..."
        tabs={[
          { id: 'active', label: 'Aktif', count: activeCount },
          { id: 'psb', label: 'PSB', count: psbCount },
          { id: 'complaint', label: 'Gangguan', count: complaintCount },
          { id: 'done', label: 'Selesai', count: doneCount },
          { id: 'all', label: 'Semua', count: myTeamWorkOrders.length },
        ]}
        activeTabId={activeFilter}
        onTabChange={(id) => setActiveFilter(id as any)}
      />

      {/* Ticket List Cards using Reusable TicketCard & EmptyState */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <EmptyState
            icon={<Radio className="w-5 h-5" />}
            title="Tidak Ada Tugas pada Filter Ini"
            description="Pilih tab filter lain atau bersihkan kata kunci pencarian Anda."
            actionLabel="Tampilkan Semua Tugas"
            onAction={() => {
              setActiveFilter('all');
              setSearchQuery('');
            }}
          />
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              workOrder={ticket}
              density="comfortable"
              onSelect={(wo) => setSelectedTicketId(wo.id)}
              onAccept={(wo) => acceptTicket(wo.id)}
            />
          ))
        )}
      </div>

      {/* Selected Work Order Modal */}
      {selectedTicket && (
        <WorkOrderDetailModal
          workOrder={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
};
