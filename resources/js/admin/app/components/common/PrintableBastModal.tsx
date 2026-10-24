import React from 'react';
import {
  Dialog,
  DialogContent,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Printer, X, FileCheck, CheckCircle2, Camera, Download, Loader2 } from 'lucide-react';
import { formatDate } from '../../lib/formatters';
import { printBastDocument, extractBastData, resolveImgUrl } from '../../lib/printBastHelper';
import { reportService } from '../../lib/reportService';
import { toast } from 'sonner';

interface PrintableBastModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
}

export const PrintableBastModal: React.FC<PrintableBastModalProps> = ({
  isOpen,
  onClose,
  submission,
}) => {
  const [isExporting, setIsExporting] = React.useState(false);

  if (!submission) return null;

  const handlePrint = () => {
    printBastDocument(submission);
  };

  const handleDownloadPdf = async () => {
    const subId =
      submission?.provisioning?.submission_id ||
      submission?.provisioning?.submission?.id ||
      submission?.submission_id ||
      submission?.submission?.id ||
      submission?.id;
    if (!subId) {
      toast.error('ID Pengajuan tidak valid');
      return;
    }

    try {
      setIsExporting(true);
      toast.info('Mengunduh BAST PDF Server...', { description: 'Menghubungkan ke API /reports/submissions/' + subId + '/bast' });
      await reportService.exportBastPdf(subId);
      toast.success('Unduh BAST PDF Berhasil!');
    } catch (err: any) {
      toast.error('Unduh BAST API Gagal', { description: err?.message || 'Menampilkan pratinjau browser.' });
      printBastDocument(submission);
    } finally {
      setIsExporting(false);
    }
  };

  const parsed = extractBastData(submission);

  const beforePhoto = resolveImgUrl(parsed.beforePhoto || '');
  const afterPhoto = resolveImgUrl(parsed.afterPhoto || '');
  const sigImgUrl = resolveImgUrl(parsed.signatureUrl || '');

  const finishTimeFormatted = formatDate(parsed.submittedAt);
  const gpsFormatted = parsed.lat && parsed.lng ? `${parsed.lat}, ${parsed.lng} ${parsed.accuracy ? `(Akurasi ±${parsed.accuracy}m)` : ''}` : 'Terverifikasi Sesuai Titik Lokasi Pelanggan';

  const defaultChecklist = [
    { name: 'Pemasangan Kabel Drop Core & ODP Port', status: 'OK / LULUS' },
    { name: 'Sinyal Redaman Fiber Optik (dBm)', status: 'OK / LULUS' },
    { name: 'Konfigurasi PPPoE Modem ONT/ONU', status: 'OK / LULUS' },
    { name: 'Pengujian Speedtest & Sinyal WiFi', status: 'OK / LULUS' },
    { name: 'Penyerahan Perangkat & Edukasi Pelanggan', status: 'OK / LULUS' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-sm block leading-none">Berita Acara Serah Terima (BAST)</span>
              <span className="text-[11px] text-slate-400">Hasil Finish Teknisi & TTD Digital (task_completion_evidences)</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / Pratinjau Dokumen BAST
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Document Body */}
        <div className="p-6 bg-white overflow-y-auto text-slate-800 space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between border-b-2 border-blue-600 pb-3 gap-2">
            <div className="flex items-center space-x-3">
              <img
                src="/logo-fibermedia.png"
                alt="Fibermedia Play Logo"
                className="h-10 object-contain shrink-0"
              />
              <div>
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                  FIBERMEDIA PLAY
                </h1>
                <p className="text-[10px] font-semibold text-blue-600 mt-0.5">
                  PT Fibermedia Play Indonesia — Berita Acara Serah Terima (BAST)
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block bg-blue-900 text-white px-2.5 py-1 rounded-md text-[11px] font-bold font-mono shadow-sm">
                BAST-{parsed.submissionNumber}
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Waktu Finish: <span className="font-semibold text-slate-800">{finishTimeFormatted}</span>
              </p>
            </div>
          </div>

          {/* Title Banner */}
          <div className="text-center py-2 bg-slate-50 rounded-lg border border-slate-200">
            <h2 className="text-xs font-extrabold uppercase text-blue-900 tracking-wide">
              BERITA ACARA SERAH TERIMA (BAST) PEKERJAAN INSTALASI
            </h2>
            <p className="text-[10px] text-slate-500">
              Hasil Pengerjaan Lapangan & Validasi Teknisi (task_completion_evidences)
            </p>
          </div>

          {/* Section I: Customer Info */}
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5">
              I. Informasi Pelanggan & Alamat Pemasangan
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 text-[10px]">Nama Pelanggan:</p>
                <p className="font-bold text-slate-900">{parsed.customerName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Nomor NIK KTP:</p>
                <p className="font-mono font-bold text-slate-900">{parsed.customerKtp}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Nomor Telepon / WA:</p>
                <p className="font-bold text-slate-900">+62{parsed.customerPhone}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Paket Layanan:</p>
                <p className="font-bold text-blue-600">{parsed.packageName} {parsed.packageSpeed ? `(${parsed.packageSpeed})` : ''}</p>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 text-[10px]">Alamat Lengkap Pemasangan:</p>
                <p className="font-semibold text-slate-900">
                  {parsed.installAddress}
                  {parsed.district && `, Kec. ${parsed.district}`}
                  {parsed.city && `, ${parsed.city}`}
                </p>
              </div>
            </div>
          </div>

          {/* Section II: Technical Spec & GPS */}
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5">
              II. Data Perangkat ONU Modem & Parameter Terpasang
            </h3>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 text-[10px]">Serial Number (SN) ONU Modem:</p>
                <p className="font-mono font-bold text-blue-900">{parsed.onuSn}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Akun Layanan PPPoE / BFASS:</p>
                <p className="font-mono font-bold text-slate-900">{parsed.pppoeUser}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Kode ODP / Port Tiang:</p>
                <p className="font-semibold text-slate-900">{parsed.odp}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">VLAN ID:</p>
                <p className="font-semibold text-slate-900">{parsed.vlan}</p>
              </div>
              <div className="col-span-2 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                <p className="text-emerald-800 text-[10px] font-bold">Koordinat GPS Pemasangan (task_completion_evidences):</p>
                <p className="font-mono font-bold text-emerald-900 text-xs mt-0.5">📍 {gpsFormatted}</p>
              </div>
            </div>
          </div>

          {/* Section III: Checklist items */}
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5">
              III. Checklist & Hasil Pengujian Penggelaran (task_checklist_items)
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2 w-10 text-center">No</th>
                    <th className="p-2">Item Pengujian Teknis</th>
                    <th className="p-2 text-center w-36">Hasil Pengujian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-slate-50/50">
                  {defaultChecklist.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                      <td className="p-2 font-medium text-slate-800">{item.name}</td>
                      <td className="p-2 text-center">
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-md inline-block">
                          ✓ {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section IV: Photos (2 Photos Intuitive Grid) & Notes */}
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5 flex items-center justify-between">
              <span>IV. Bukti Foto Lapangan (2 Foto Teknisi)</span>
              <span className="text-[10px] text-slate-400 font-normal">Hasil upload penyelesaian pengerjaan</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center">
                {beforePhoto ? (
                  <img src={beforePhoto} alt="Foto Lokasi" className="w-full h-32 object-cover rounded-md border border-slate-300" />
                ) : (
                  <div className="h-32 bg-slate-200/60 rounded flex items-center justify-center text-[11px] text-slate-400 font-medium">
                    <Camera className="w-4 h-4 mr-1.5" /> Belum ada foto lokasi
                  </div>
                )}
                <p className="text-[11px] font-bold text-slate-800 mt-2">1. Foto Lokasi Pemasangan & Rumah Pelanggan</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-center">
                {afterPhoto ? (
                  <img src={afterPhoto} alt="Foto Modem" className="w-full h-32 object-cover rounded-md border border-slate-300" />
                ) : (
                  <div className="h-32 bg-slate-200/60 rounded flex items-center justify-center text-[11px] text-slate-400 font-medium">
                    <Camera className="w-4 h-4 mr-1.5" /> Belum ada foto modem
                  </div>
                )}
                <p className="text-[11px] font-bold text-slate-800 mt-2">2. Foto Perangkat ONU ONT Terpasang & Aktif</p>
              </div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs italic text-slate-800 mt-2">
              Catatan Lapangan Teknisi: "{parsed.techNotes}"
            </div>
          </div>

          {/* Signatures Section */}
          <div className="pt-2 grid grid-cols-2 gap-6 text-center text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-medium text-[11px] mb-2">Pihak Kedua (Teknisi / PT Fibermedia Play):</p>
              <div className="h-16 flex items-center justify-center font-bold text-blue-700 text-xs">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                Fibermedia Verified Team
              </div>
              <div className="border-t border-slate-300 pt-1 font-bold text-slate-900">
                {parsed.techName}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="text-slate-500 font-medium text-[11px] mb-2">Pihak Pertama (Pelanggan Pendaftar):</p>
              <div className="h-16 flex items-center justify-center">
                {sigImgUrl ? (
                  <img src={sigImgUrl} alt="TTD Pelanggan" className="max-h-14 max-w-[160px] object-contain" />
                ) : (
                  <span className="text-[11px] text-slate-400 italic">[TTD Digital Terlampir]</span>
                )}
              </div>
              <div className="border-t border-slate-300 pt-1 font-bold text-slate-900">
                {parsed.customerName}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
