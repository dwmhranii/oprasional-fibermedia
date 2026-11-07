import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '../ui/dialog';
import { Search, CornerDownLeft, Users, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { apiClient } from '../../lib/api';

export interface FlatMenuItem {
  group: string;
  title: string;
  route: string;
  icon?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: FlatMenuItem[];
}

interface SearchItem {
  id: string;
  category: 'menu' | 'customer' | 'ticket';
  categoryLabel: string;
  title: string;
  subtitle?: string;
  route: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [apiCustomers, setApiCustomers] = useState<any[]>([]);
  const [apiTickets, setApiTickets] = useState<any[]>([]);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef<any>(null);

  // Reset query on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setApiCustomers([]);
      setApiTickets([]);
    }
  }, [open]);

  // Search API for customers and complaints with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setApiCustomers([]);
      setApiTickets([]);
      setIsSearchingApi(false);
      return;
    }

    setIsSearchingApi(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const [customerRes, complaintRes] = await Promise.allSettled([
          apiClient.get<any>(`/customers?search=${encodeURIComponent(trimmed)}&per_page=4`),
          apiClient.get<any>(`/complaints?search=${encodeURIComponent(trimmed)}&per_page=4`),
        ]);

        if (customerRes.status === 'fulfilled') {
          const resData = customerRes.value?.data ?? customerRes.value;
          setApiCustomers(Array.isArray(resData) ? resData.slice(0, 4) : resData?.data?.slice(0, 4) || []);
        } else {
          setApiCustomers([]);
        }

        if (complaintRes.status === 'fulfilled') {
          const resData = complaintRes.value?.data ?? complaintRes.value;
          setApiTickets(Array.isArray(resData) ? resData.slice(0, 4) : resData?.data?.slice(0, 4) || []);
        } else {
          setApiTickets([]);
        }
      } catch {
        // Silently fail if unauthorized or error
      } finally {
        setIsSearchingApi(false);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // 1. Filter local menus
  const filteredMenuItems: SearchItem[] = items
    .filter((item) => {
      const q = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q)
      );
    })
    .slice(0, 6)
    .map((item) => ({
      id: `menu-${item.route}`,
      category: 'menu',
      categoryLabel: item.group || 'Menu',
      title: item.title,
      subtitle: item.route,
      route: item.route,
    }));

  // 2. Format customer results
  const customerItems: SearchItem[] = apiCustomers.map((c) => ({
    id: `cust-${c.id}`,
    category: 'customer',
    categoryLabel: 'Pelanggan',
    title: c.name || c.customer_name || 'Pelanggan',
    subtitle: `${c.customer_id || c.customer_code || ''} • ${c.phone || c.phone_number || ''}`,
    route: `/customers/${c.id}`,
  }));

  // 3. Format ticket results
  const ticketItems: SearchItem[] = apiTickets.map((t) => ({
    id: `ticket-${t.id}`,
    category: 'ticket',
    categoryLabel: 'Tiket Pengaduan',
    title: t.ticket_number || `Tiket #${t.id}`,
    subtitle: `${t.title || t.subject || 'Pengaduan'} (${t.status || 'open'})`,
    route: `/complaints/${t.id}`,
  }));

  // All combined searchable items
  const allResults = [...filteredMenuItems, ...customerItems, ...ticketItems];

  const handleSelect = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, allResults.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelect(allResults[selectedIndex].route);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border border-border bg-card text-foreground shadow-2xl rounded-xl">
        <div className="flex items-center border-b border-border px-3.5 py-3 bg-muted/40">
          <Search className="w-4 h-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
            placeholder="Cari menu, nama/ID/telepon pelanggan, nomor tiket..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {isSearchingApi && <Loader2 className="w-4 h-4 text-primary animate-spin mr-2" />}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allResults.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Tidak ada hasil yang sesuai dengan "{query}"
            </div>
          ) : (
            allResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.route)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : item.category === 'customer'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : item.category === 'ticket'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.categoryLabel}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.title}</div>
                      {item.subtitle && (
                        <div
                          className={`text-xs truncate ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 ml-2">
                    {isSelected && <CornerDownLeft className="w-4 h-4" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-3 py-2 bg-muted/40 flex justify-between items-center text-[11px] text-muted-foreground">
          <div className="flex items-center space-x-2">
            <span>↑↓ Pilih</span>
            <span>•</span>
            <span>↵ Buka</span>
          </div>
          <span>Mencakup Menu, Pelanggan, & Tiket</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
