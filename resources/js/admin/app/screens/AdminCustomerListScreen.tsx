import React, { useState } from 'react';
import {
  DataTable,
  FilterBar,
  StatusBadge,
  Button,
  IconButton,
  Column,
} from '@shared/ui';
import { Eye, EyeOff, Copy, FileSpreadsheet, Plus, Check } from 'lucide-react';
import { ACTIONS } from '@shared/i18n/id';

export interface CustomerRow {
  id: string;
  customerCode: string;
  name: string;
  nik: string;
  phone: string;
  planName: string;
  odpCode: string;
  portNumber: number;
  status: 'active' | 'suspended' | 'terminated';
  onuSerial: string;
}

export const AdminCustomerListScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [revealedNiks, setRevealedNiks] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const rawCustomers: CustomerRow[] = [
    {
      id: 'cust-1',
      customerCode: 'FM-2026-00101',
      name: 'Ahmad Subandi',
      nik: '3507123456780001',
      phone: '0812-3456-7890',
      planName: 'Fiber Home 20 Mbps',
      odpCode: 'ODP-KPN-01/02',
      portNumber: 3,
      status: 'active',
      onuSerial: 'ZTEG-F670-8812',
    },
    {
      id: 'cust-2',
      customerCode: 'FM-2026-00102',
      name: 'Siti Rahmawati',
      nik: '3507987654320002',
      phone: '0813-9876-5432',
      planName: 'Fiber Prime 50 Mbps',
      odpCode: 'ODP-KPN-01/04',
      portNumber: 7,
      status: 'active',
      onuSerial: 'HWTC-EG81-3391',
    },
    {
      id: 'cust-3',
      customerCode: 'FM-2026-00103',
      name: 'Budi Santoso',
      nik: '3507112233440003',
      phone: '0857-1122-3344',
      planName: 'Fiber Ultra 100 Mbps',
      odpCode: 'ODP-SWJ-02/01',
      portNumber: 1,
      status: 'suspended', // Terisolir
      onuSerial: 'FHTT-HG68-0021',
    },
    {
      id: 'cust-4',
      customerCode: 'FM-2026-00104',
      name: 'Dewi Lestari',
      nik: '3507556677880004',
      phone: '0821-5566-7788',
      planName: 'Fiber Home 20 Mbps',
      odpCode: 'ODP-DNY-03/06',
      portNumber: 5,
      status: 'active',
      onuSerial: 'HWTC-EG81-7744',
    },
    {
      id: 'cust-5',
      customerCode: 'FM-2026-00105',
      name: 'Hendra Gunawan',
      nik: '3507998877660005',
      phone: '0878-9988-7766',
      planName: 'Fiber Prime 50 Mbps',
      odpCode: 'ODP-ARY-04/08',
      portNumber: 8,
      status: 'terminated', // Berhenti
      onuSerial: 'ZTEG-F670-1922',
    },
  ];

  // Mask NIK helper: 3507********0001
  const maskNik = (nik: string, isRevealed: boolean) => {
    if (isRevealed || nik.length < 8) return nik;
    const prefix = nik.slice(0, 4);
    const suffix = nik.slice(-4);
    return `${prefix}********${suffix}`;
  };

  const toggleRevealNik = (id: string) => {
    setRevealedNiks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered data
  const filteredData = rawCustomers.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nik.includes(searchQuery) ||
      item.phone.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns: Column<CustomerRow>[] = [
    {
      key: 'customerCode',
      header: 'ID Pelanggan',
      sortable: true,
      width: '140px',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
          {row.customerCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nama Pelanggan',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground text-xs">{row.name}</p>
          <p className="text-[11px] text-muted-foreground font-mono">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'nik',
      header: 'NIK (Masked)',
      render: (row) => {
        const isRevealed = Boolean(revealedNiks[row.id]);
        const masked = maskNik(row.nik, isRevealed);
        const isCopied = copiedId === row.id;

        return (
          <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-muted/30 px-2 py-1 rounded-md border border-border">
            <span>{masked}</span>
            <button
              type="button"
              aria-label={isRevealed ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
              onClick={() => toggleRevealNik(row.id)}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              aria-label="Salin NIK"
              onClick={() => copyToClipboard(row.nik, row.id)}
              className="text-muted-foreground hover:text-foreground p-0.5"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      },
    },
    {
      key: 'planName',
      header: 'Paket Layanan',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-foreground font-medium">{row.planName}</span>
      ),
    },
    {
      key: 'odpCode',
      header: 'ODP / Port',
      render: (row) => (
        <div className="font-mono text-xs">
          <span className="text-foreground font-semibold">{row.odpCode}</span>
          <span className="text-muted-foreground ml-1.5 font-normal">(Port {row.portNumber})</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '120px',
      render: (row) => (
        <StatusBadge status={row.status} category="customer" size="sm" />
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            density="compact"
            onClick={() => alert(`Membuka rincian pelanggan ${row.name}`)}
          >
            {ACTIONS.viewDetails}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header filter & actions */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari ID Pelanggan, Nama, NIK, atau Telepon..."
        filters={[
          {
            id: 'status',
            value: statusFilter,
            onChange: setStatusFilter,
            placeholder: 'Semua Status',
            options: [
              { value: 'all', label: 'Semua Status Pelanggan' },
              { value: 'active', label: 'Aktif' },
              { value: 'suspended', label: 'Terisolir' },
              { value: 'terminated', label: 'Berhenti' },
            ],
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('all');
        }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              density="compact"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={() => alert('Mengekspor daftar pelanggan ke file Excel')}
            >
              {ACTIONS.exportExcel}
            </Button>
            <Button
              variant="primary"
              size="sm"
              density="compact"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => alert('Membuka formulir registrasi pelanggan baru')}
            >
              Tambah Pelanggan
            </Button>
          </div>
        }
        density="compact"
      />

      {/* Reusable Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyExtractor={(row) => row.id}
        density="compact"
        currentPage={currentPage}
        totalPages={1}
        totalItems={filteredData.length}
        pageSize={10}
        onPageChange={setCurrentPage}
        emptyTitle="Pelanggan Tidak Ditemukan"
        emptyDescription="Tidak ada data pelanggan yang sesuai dengan kata kunci pencarian atau filter status terpilih."
      />
    </div>
  );
};

