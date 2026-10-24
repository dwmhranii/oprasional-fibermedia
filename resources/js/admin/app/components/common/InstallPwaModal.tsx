import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Smartphone, Monitor, Share2, PlusSquare, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { toast } from 'sonner';

interface InstallPwaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ open, onOpenChange }) => {
  const { isInstalled, triggerDirectInstall } = usePWAInstall();

  const handleInstallButtonClick = async () => {
    const { triggered, accepted } = await triggerDirectInstall();
    if (accepted) {
      toast.success('Aplikasi Fibermedia berhasil dipasang di perangkat Anda!');
      onOpenChange(false);
    } else if (!triggered) {
      toast.info('Gunakan menu browser (⋮ atau Share) untuk memasang aplikasi');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Install Aplikasi Fibermedia
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Aplikasi PWA untuk Sales & Teknisi Lapangan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-emerald-900 text-sm">Aplikasi Sudah Terpasang!</p>
              <p className="text-xs text-emerald-700">
                Anda sudah menjalankan aplikasi Fibermedia dalam mode PWA / Standalone.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3 text-center">
                <p className="text-xs font-semibold text-indigo-900">
                  Pasang aplikasi langsung ke layar utama HP / Laptop Anda:
                </p>
                <Button
                  onClick={handleInstallButtonClick}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download & Install Aplikasi Sekarang
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700">
                  Jika tombol di atas tidak memicu otomatis (tergantung browser):
                </p>

                {/* Android Guide */}
                <div className="p-3 bg-gray-50 border rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Android (Chrome / Edge)
                  </div>
                  <p className="text-gray-600 leading-relaxed text-[11px]">
                    1. Ketuk ikon titik tiga <strong>⋮</strong> di sudut kanan atas browser.<br />
                    2. Pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                  </p>
                </div>

                {/* iOS Guide */}
                <div className="p-3 bg-gray-50 border rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    iPhone / iPad (Safari)
                  </div>
                  <p className="text-gray-600 leading-relaxed text-[11px]">
                    1. Ketuk tombol Bagikan <strong><Share2 className="w-3 h-3 inline" /> (Share)</strong> di navigasi Safari.<br />
                    2. Geser ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" <PlusSquare className="w-3 h-3 inline text-gray-700" /></strong>.
                  </p>
                </div>

                {/* Desktop Guide */}
                <div className="p-3 bg-gray-50 border rounded-xl space-y-1 text-xs">
                  <div className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-purple-600" />
                    Laptop / PC (Chrome / Edge)
                  </div>
                  <p className="text-gray-600 leading-relaxed text-[11px]">
                    Klik ikon instalasi <strong>⊕</strong> di sebelah kanan bilah alamat (URL bar) browser Anda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
