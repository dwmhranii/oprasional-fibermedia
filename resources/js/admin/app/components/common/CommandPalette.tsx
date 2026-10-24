import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '../ui/dialog';
import { Search, ArrowRight, CornerDownLeft } from 'lucide-react';

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

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  items,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Reset query on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const filteredItems = items.filter((item) => {
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.group.toLowerCase().includes(q) ||
      item.route.toLowerCase().includes(q)
    );
  });

  const handleSelect = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredItems.length - 1) : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].route);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl rounded-xl">
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            placeholder="Cari menu atau tekan Esc untuk keluar..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200 dark:bg-slate-800 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400">
              Tidak ada menu yang sesuai dengan "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={`${item.route}-${index}`}
                  onClick={() => handleSelect(item.route)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.group}
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`text-xs ${
                        isSelected ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {item.route}
                    </span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 ml-1" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-[11px] text-slate-400">
          <span>Gunakan panah ↑↓ untuk memilih</span>
          <span>Tekan ↵ untuk membuka</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
