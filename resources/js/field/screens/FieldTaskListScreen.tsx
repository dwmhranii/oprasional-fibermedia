import React, { useState } from 'react';
import {
  TicketCard,
  SearchBox,
  Button,
  Badge,
  EmptyState,
} from '@shared/ui';
import { Wrench, CheckCircle2 } from 'lucide-react';

export interface FieldTaskItem {
  id: string;
  ticketNumber: string;
  title: string;
  customerName: string;
  address: string;
  status: string;
  priority: string;
  slaStatus: 'safe' | 'warning' | 'breached' | 'paused';
  slaTimeText: string;
  odpCode: string;
}

export interface FieldTaskListScreenProps {
  onSelectTask: (task: FieldTaskItem) => void;
}

export const FieldTaskListScreen: React.FC<FieldTaskListScreenProps> = ({
  onSelectTask,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'on_the_way' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tasks: FieldTaskItem[] = [
    {
      id: 'task-1',
      ticketNumber: 'TKT-2026-0914',
      title: 'Kabel Dropcore Putus Tertimpa Pohon',
      customerName: 'Bambang Sudiro',
      address: 'Jl. Danau Toba No. 12, Sawojajar, Malang',
      status: 'in_progress',
      priority: 'Kritis',
      slaStatus: 'warning',
      slaTimeText: '00:18:40',
      odpCode: 'ODP-SWJ-02/01',
    },
    {
      id: 'task-2',
      ticketNumber: 'TKT-2026-0915',
      title: 'Redaman Optik Melemah -29 dBm',
      customerName: 'Dr. Hendra Wijaya',
      address: 'Perumahan Araya Blok B2/14, Malang',
      status: 'on_the_way',
      priority: 'Tinggi',
      slaStatus: 'safe',
      slaTimeText: '01:42:00',
      odpCode: 'ODP-ARY-04/08',
    },
    {
      id: 'task-3',
      ticketNumber: 'TKT-2026-0919',
      title: 'Pemasangan Baru (PSB) FTTH 50 Mbps',
      customerName: 'Ratna Sari Dewi',
      address: 'Jl. Kawi No. 19, Kauman, Malang',
      status: 'completed',
      priority: 'Normal',
      slaStatus: 'safe',
      slaTimeText: 'Selesai',
      odpCode: 'ODP-KPN-01/02',
    },
  ];

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      activeFilter === 'all' || task.status === activeFilter;

    const matchesSearch =
      task.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const filterTabs = [
    { id: 'all', label: 'Semua Tugas' },
    { id: 'on_the_way', label: 'Perjalanan' },
    { id: 'in_progress', label: 'Dikerjakan' },
    { id: 'completed', label: 'Selesai' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Search Input */}
      <SearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Cari nama pelanggan, tiket, alamat..."
        density="comfortable"
      />

      {/* Filter Tabs Bar (min-h-12 friendly) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 select-none ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="Tidak Ada Tugas"
          description="Tidak ditemukan tiket atau tugas yang cocok dengan filter."
          icon={Wrench}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TicketCard
              key={task.id}
              ticketNumber={task.ticketNumber}
              title={task.title}
              customerName={task.customerName}
              address={task.address}
              status={task.status}
              priority={task.priority}
              slaStatus={task.slaStatus}
              slaTimeText={task.slaTimeText}
              density="comfortable"
              onClick={() => onSelectTask(task)}
              actionLabel="Buka Tugas"
              onActionClick={() => onSelectTask(task)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

