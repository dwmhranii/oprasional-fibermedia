import React, { useState, useMemo } from 'react';
import {
  Users,
  Download,
  Search,
  MessageSquare,
  Split,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import apiClient from '../../lib/api';

export interface AffectedCustomerItem {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  address?: string;
  odp_id?: number;
  odp_code?: string;
  odp_name?: string;
  odp_port?: number | string;
  package?: string;
  status?: string;
  state: 'affected' | 'restored' | 'split';
  first_seen_at?: string;
  restored_at?: string;
  split_complaint_id?: number | null;
  split_ticket_number?: string | null;
  whatsapp_url?: string | null;
}

interface AffectedCustomersTabProps {
  incidentId?: number;
  complaintId: number | string;
  customers: AffectedCustomerItem[];
  canManage?: boolean;
  onRefresh?: () => void;
}

export const AffectedCustomersTab: React.FC<AffectedCustomersTabProps> = ({
  incidentId,
  complaintId,
  customers = [],
  canManage = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOdp, setSelectedOdp] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');

  // Split Modal State
  const [splitTarget, setSplitTarget] = useState<AffectedCustomerItem | null>(null);
  const [splitReason, setSplitReason] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  // Extract unique ODPs
  const odpList = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => {
      const code = c.odp_code || (c.odp_id ? `ODP #${c.odp_id}` : 'Tanpa ODP');
      const name = c.odp_name || code;
      map.set(code, name);
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [customers]);

  // Filtered List
  const filteredCustomers = useMemo(() => {
    return customers.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchCode = item.customer_code?.toLowerCase().includes(q);
        const matchPhone = item.phone?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone) return false;
      }

      // ODP
      if (selectedOdp !== 'all') {
        const itemOdp = item.odp_code || (item.odp_id ? `ODP #${item.odp_id}` : 'Tanpa ODP');
        if (itemOdp !== selectedOdp) return false;
      }

      // State
      if (selectedState !== 'all' && item.state !== selectedState) {
        return false;
      }

      return true;
    });
  }, [customers, searchQuery, selectedOdp, selectedState]);

  const totalCount = customers.length;
  const affectedCount = customers.filter((c) => c.state === 'affected').length;
  const restoredCount = customers.filter((c) => c.state === 'restored').length;
  const splitCount = customers.filter((c) => c.state === 'split').length;

  const handleExportCsv = () => {
    const url = incidentId
      ? `/api/network/mass-outage/export?incident_id=${incidentId}`
      : `/api/network/mass-outage/export`;
    window.open(url, '_blank');
  };

  const handleSplitSubmit = async () => {
    if (!splitTarget || !incidentId) return;

    try {
      setIsSplitting(true);
      await apiClient.post('/network/mass-outage/split', {
        incident_id: incidentId,
        customer_id: splitTarget.id,
        reason: splitReason || 'Gangguan berlanjut setelah penanganan massal',
      });

      setSplitTarget(null);
      setSplitReason('');
      onRefresh?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memisahkan tiket pengaduan.');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl border border-border shadow-xs p-5 space-y-4">
      {/* Header & Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-semibold text-foreground">
              Pelanggan Terdampak Gangguan Massal
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {totalCount} pelanggan ({affectedCount} terdampak, {restoredCount} pulih, {splitCount} dipisahkan)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 border-border text-foreground hover:bg-muted"
            onClick={handleExportCsv}
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID pelanggan, nama, atau no. telepon..."
            className="h-8 text-xs pl-8 bg-background border-border"
          />
        </div>

        {/* Filter ODP */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={selectedOdp}
            onChange={(e) => setSelectedOdp(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua ODP ({odpList.length})</option>
            {odpList.map((odp) => (
              <option key={odp.code} value={odp.code}>
                {odp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter State */}
        <div className="flex items-center gap-1">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded-md px-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Status ({totalCount})</option>
            <option value="affected">Terdampak ({affectedCount})</option>
            <option value="restored">Dipulihkan ({restoredCount})</option>
            <option value="split">Dipisahkan ({splitCount})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-b border-border">
              <TableHead className="text-xs font-semibold text-muted-foreground">Pelanggan</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Telepon / WhatsApp</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">ODP & Port</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Status Layanan</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Status Dampak</TableHead>
              <TableHead className="text-right text-xs font-semibold text-muted-foreground">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Tidak ada pelanggan terdampak yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((item) => (
                <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <TableCell className="text-xs">
                    <div className="font-semibold text-foreground">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{item.customer_code}</div>
                  </TableCell>

                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground">{item.phone}</span>
                      {item.whatsapp_url && (
                        <a
                          href={item.whatsapp_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 transition-colors"
                          title="Kirim pesan WhatsApp pemberitahuan gangguan"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          Kirim WA
                        </a>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-foreground">
                    <div>{item.odp_name || item.odp_code || '-'}</div>
                    <div className="text-[11px] text-muted-foreground">Port: {item.odp_port ?? '-'}</div>
                  </TableCell>

                  <TableCell className="text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-foreground border border-border">
                      {item.package ?? 'Internet'} &bull; {item.status ?? 'active'}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs">
                    {item.state === 'affected' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Terdampak
                      </span>
                    )}
                    {item.state === 'restored' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Dipulihkan
                      </span>
                    )}
                    {item.state === 'split' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Split className="w-3 h-3 text-amber-600" />
                        Dipisahkan
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    {item.state === 'affected' && canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] h-7 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        onClick={() => {
                          setSplitTarget(item);
                          setSplitReason('');
                        }}
                      >
                        <Split className="w-3 h-3 mr-1" />
                        Pisahkan
                      </Button>
                    )}

                    {item.state === 'split' && item.split_complaint_id && (
                      <a
                        href={`/complaints/${item.split_complaint_id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Lihat Tiket
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Split Modal */}
      {splitTarget && (
        <Dialog open={true} onOpenChange={() => setSplitTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Split className="w-4 h-4 text-amber-600" />
                Pisahkan ke Tiket Mandiri
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                Pelanggan <strong className="text-foreground">{splitTarget.name}</strong> ({splitTarget.customer_code}) akan dipisahkan dari gangguan massal ini dan dibuatkan tiket pengaduan individual tersendiri ke antrean dispatch teknisi.
              </p>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Alasan Pemisahan:
                </label>
                <Textarea
                  value={splitReason}
                  onChange={(e) => setSplitReason(e.target.value)}
                  placeholder="Misal: Redaman dropcore rumah pelanggan masih tinggi / kabel putus di dalam rumah..."
                  className="text-xs h-20"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSplitTarget(null)}
                disabled={isSplitting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                onClick={handleSplitSubmit}
                disabled={isSplitting}
              >
                {isSplitting ? 'Memproses...' : 'Ya, Pisahkan Tiket'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
