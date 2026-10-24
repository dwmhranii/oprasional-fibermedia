import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-6 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                Syarat & Ketentuan Layanan WiFi/Internet
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100 mt-1">
                Fibermedia Play — Harap baca dengan saksama sebelum melakukan pendaftaran.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700 leading-relaxed max-h-[55vh]">
          {/* Section 1 */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-2">
            <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                1
              </span>
              Persyaratan Pemasangan
            </h4>
            <ul className="list-disc pl-8 space-y-1.5 text-gray-600">
              <li>Data yang saya isi (identitas & alamat) untuk pendaftaran adalah benar dan lengkap.</li>
              <li>Lokasi pemasangan bisa disurvei terlebih dahulu oleh teknisi sebelum instalasi dijadwalkan.</li>
              <li>Jika lokasi di luar jangkauan layanan, permohonan dapat ditolak atau dikenakan biaya tambahan.</li>
              <li>Saya akan menyediakan akses yang wajar bagi teknisi untuk instalasi, pemeliharaan, atau perbaikan.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-2">
            <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                2
              </span>
              Biaya & Pembayaran
            </h4>
            <ul className="list-disc pl-8 space-y-1.5 text-gray-600">
              <li>Biaya pemasangan bersifat sekali bayar dan tidak dapat dikembalikan (non-refundable).</li>
              <li>Biaya berlangganan bulanan dibayar sesuai paket, terpisah dari biaya pemasangan.</li>
              <li>Perubahan biaya akan diinfokan minimal 30 hari sebelum berlaku.</li>
              <li>Keterlambatan pembayaran lebih dari batas waktu yang ditentukan dapat membuat layanan ditangguhkan (suspend).</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-2">
            <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                3
              </span>
              Perangkat Layanan
            </h4>
            <ul className="list-disc pl-8 space-y-1.5 text-gray-600">
              <li>Modem/router yang dipasang tetap menjadi milik penyedia layanan, kecuali program beli putus.</li>
              <li>Saya bertanggung jawab menjaga perangkat; kerusakan akibat kelalaian saya menjadi beban saya.</li>
              <li>Perangkat wajib dikembalikan dalam kondisi baik saat layanan diakhiri.</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-2">
            <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                4
              </span>
              Penggunaan Layanan
            </h4>
            <ul className="list-disc pl-8 space-y-1.5 text-gray-600">
              <li>Saya akan menggunakan layanan sesuai hukum yang berlaku, tidak untuk kegiatan ilegal atau penyalahgunaan jaringan.</li>
              <li>Saya tidak akan memindahtangankan atau membagikan layanan ke pihak lain tanpa izin tertulis.</li>
              <li>Saya memahami layanan tidak dijamin bebas gangguan 100%, namun akan dijaga sesuai standar wajar.</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 space-y-2">
            <h4 className="font-bold text-sm text-blue-800 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                5
              </span>
              Pembatalan & Pemutusan
            </h4>
            <ul className="list-disc pl-8 space-y-1.5 text-gray-600">
              <li>Saya dapat mengajukan berhenti berlangganan dengan pemberitahuan tertulis sesuai tenggat yang berlaku.</li>
              <li>Penyedia layanan berhak memutus layanan jika saya menunggak atau melanggar ketentuan penggunaan.</li>
              <li className="font-semibold text-gray-800 pt-1">
                Saya memahami dan menyetujui seluruh Syarat & Ketentuan pemasangan baru layanan WiFi/Internet ini secara keseluruhan.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-gray-400">
            PT Fibermedia Play Indonesia © 2026
          </p>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-9">
              Tutup
            </Button>
            {onAccept && (
              <Button
                size="sm"
                onClick={() => {
                  onAccept();
                  onClose();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Saya Setuju & Mengerti
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
