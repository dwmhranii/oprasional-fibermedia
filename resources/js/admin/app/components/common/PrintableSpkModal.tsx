import React from 'react';
import {
  Dialog,
  DialogContent,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { printSpkDocument } from '../../lib/printSpkHelper';

interface PrintableSpkModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
}

export const PrintableSpkModal: React.FC<PrintableSpkModalProps> = ({
  isOpen,
  onClose,
  submission,
}) => {
  if (!submission) return null;

  const handlePrint = () => {
    printSpkDocument(submission);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'MENUNGGU VALIDASI',
      pending_validation: 'MENUNGGU VALIDASI',
      approved: 'DISETUJUI',
      rejected: 'DITOLAK',
      need_info: 'BUTUH INFO TAMBAHAN',
      provisioning: 'DALAM PROSES PROVISI',
      completed: 'SELESAI / AKTIF',
    };
    return labels[status?.toLowerCase()] || status?.toUpperCase() || 'PENDING';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl print:shadow-none print:max-w-none print:w-full print:h-auto print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="bg-gray-900 text-white p-4 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Pratinjau SPK & Detail Pengajuan</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak Dokumen / Simpan PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Sheet Body */}
        <div className="p-6 bg-white overflow-y-auto print:overflow-visible text-gray-800 space-y-4 id-printable-area">
          {/* Header with Official Logo */}
          <div className="flex items-center justify-between border-b-2 border-blue-600 pb-3">
            <div className="flex items-center space-x-3">
              <img
                src="/logo-fibermedia.png"
                alt="Fibermedia Play Logo"
                className="h-12 object-contain"
              />
              <div>
                <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none">
                  FIBERMEDIA PLAY
                </h1>
                <p className="text-[11px] font-semibold text-blue-600">
                  PT Fibermedia Play Indonesia — Provisioning System
                </p>
                <p className="text-[10px] text-gray-400">
                  Layanan Internet High-Speed Fiber Optik
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono">
                {submission.submissionNumber || `SUB-${submission.id}`}
              </span>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Tanggal: <span className="font-semibold text-gray-800">{formatDate(submission.createdAt)}</span>
              </p>
            </div>
          </div>

          {/* Document Title Banner */}
          <div className="text-center py-1.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-lg border border-blue-100">
            <h2 className="text-xs font-bold uppercase text-blue-900 tracking-wide">
              SURAT PERINTAH KERJA (SPK) & DETAIL PENGAJUAN
            </h2>
            <p className="text-[10px] text-gray-500">
              Formulir Pendaftaran & Verifikasi Pemasangan Baru WiFi Internet
            </p>
          </div>

          {/* Customer Information Section */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5">
              I. Informasi Pelanggan (Customer Information)
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs">
              <div>
                <p className="text-gray-500 text-[10px]">Nama Lengkap:</p>
                <p className="font-bold text-gray-900">{submission.customer?.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px]">Nomor NIK KTP:</p>
                <p className="font-mono font-bold text-gray-900">{submission.customer?.ktp || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px]">Nomor Telepon / WhatsApp:</p>
                <p className="font-bold text-gray-900">
                  +62{submission.customer?.phone || '-'}
                  {submission.customer?.whatsapp && <span className="ml-1 text-green-600 font-normal">(WA)</span>}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px]">Alamat Email:</p>
                <p className="font-semibold text-gray-900">{submission.customer?.email || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500 text-[10px]">Alamat Lengkap Pemasangan:</p>
                <p className="font-semibold text-gray-900">
                  {submission.address?.installAddress || submission.address?.ktpAddress || '-'}
                  {submission.address?.district && `, Kec. ${submission.address.district}`}
                  {submission.address?.city && `, ${submission.address.city}`}
                  {submission.address?.province && `, ${submission.address.province}`}
                </p>
              </div>
            </div>
          </div>

          {/* Package & Pricing Section */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5">
              II. Informasi Paket Layanan & Pembayaran (Package & Billing)
            </h3>
            <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Paket Internet Yang Dipilih:</span>
                <span className="font-bold text-blue-700 text-xs">
                  {submission.package?.name} ({submission.package?.speed})
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Biaya Berlangganan Bulanan:</span>
                <span className="font-semibold">Rp {Number(submission.package?.price || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Biaya Instalasi Pemasangan:</span>
                <span className="font-semibold">Rp {Number(submission.package?.installationFee || 50000).toLocaleString('id-ID')}</span>
              </div>
              {submission.promoCode && (
                <div className="flex justify-between items-center text-green-700 font-semibold">
                  <span>Diskon Promo ({submission.promoCode}):</span>
                  <span>-Rp {Number(submission.discount || 0).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 font-bold text-xs text-gray-900">
                <span>Total Biaya Pertama:</span>
                <span className="text-blue-700 font-extrabold text-sm">
                  Rp {Number(submission.totalPrice || (submission.package?.price || 0) + (submission.package?.installationFee || 50000)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* System & Verification Status Section */}
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5">
              III. Status Sistem & Catatan Verifikasi (System Verification)
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs">
              <div>
                <p className="text-gray-500 text-[10px]">Status Pengajuan:</p>
                <p className="font-bold text-blue-700 mt-0.5">{getStatusLabel(submission.status)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-[10px]">Petugas Sales (Inputor):</p>
                <p className="font-bold text-gray-900 mt-0.5">{submission.salesName || 'Staf Sales'}</p>
              </div>
              {submission.notes && (
                <div className="col-span-2">
                  <p className="text-gray-500 text-[10px]">Catatan Verifikasi Admin:</p>
                  <p className="italic text-gray-800 bg-white p-1.5 rounded border border-gray-200 mt-0.5 text-[11px]">
                    "{submission.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
            <div>
              <p className="text-gray-500 mb-8 text-[11px]">Petugas Sales / Admin System,</p>
              <div className="border-t border-gray-400 w-44 mx-auto pt-1 font-bold text-gray-900">
                {submission.salesName || 'Tanda Tangan & Nama Terang'}
              </div>
            </div>
            <div>
              <p className="text-gray-500 mb-8 text-[11px]">Pelanggan Pendaftar,</p>
              <div className="border-t border-gray-400 w-44 mx-auto pt-1 font-bold text-gray-900">
                {submission.customer?.name || 'Tanda Tangan Pelanggan'}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
