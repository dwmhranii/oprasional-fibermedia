import React, { useState } from 'react';
import { Eye, Image as ImageIcon, CheckCircle, Calendar, FileText } from 'lucide-react';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';
import { resolveImgUrl } from '../../lib/printBastHelper';
import { formatDate } from '../../lib/formatters';
import type { ResolutionCategory } from '../../types/complaint';

interface ComplaintEvidenceGalleryProps {
  photos?: string[];
  description?: string;
  resolutionCategory?: ResolutionCategory;
  submittedAt?: string;
  technicianName?: string;
  opmRedaman?: string;
  className?: string;
}

export const RESOLUTION_CATEGORY_LABELS: Record<ResolutionCategory, string> = {
  cable_broken: 'Kabel Dropcore Putus / Tertekuk',
  ont_faulty: 'Perangkat ONT Rusak (Ganti Baru)',
  ont_reset: 'Reset & Konfigurasi Ulang ONT/Router',
  splitter_odp_issue: 'Kendala ODP / Port Splitter',
  config_issue: 'Perbaikan Konfigurasi Sistem / IP',
  customer_side: 'Kendala Sisi Pelanggan (LAN/Device)',
  billing_resolved: 'Kendala Administrasi / Billing Selesai',
  other: 'Penyelesaian Lainnya',
};

export const ComplaintEvidenceGallery: React.FC<ComplaintEvidenceGalleryProps> = ({
  photos = [],
  description,
  resolutionCategory,
  submittedAt,
  technicianName,
  opmRedaman,
  className = '',
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Bukti Teknisi');

  const handleOpenPreview = (url: string, index: number) => {
    setSelectedPhoto(resolveImgUrl(url));
    setPreviewTitle(`Bukti Teknisi #${index + 1} - ${technicianName || 'Pengerjaan'}`);
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs p-4 space-y-4 ${className}`}>
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Bukti Lapangan dari Teknisi (Tahap 1)
            </h4>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {technicianName ? `Diselesaikan oleh ${technicianName}` : 'Laporan teknisi lapangan'}
              {submittedAt && ` • ${formatDate(submittedAt)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {opmRedaman && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              OPM: {opmRedaman}
            </span>
          )}
          {resolutionCategory && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {RESOLUTION_CATEGORY_LABELS[resolutionCategory] || resolutionCategory}
            </span>
          )}
        </div>
      </div>

      {/* Description / Summary from Technician */}
      {description && (
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-xs text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 mb-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Catatan Teknisi:</span>
          </div>
          <p className="leading-relaxed whitespace-pre-wrap">{description}</p>
        </div>
      )}

      {/* Photo Gallery Grid */}
      <div>
        <div className="text-xs font-medium text-gray-700 mb-2 flex items-center justify-between">
          <span>Foto Bukti Fisik ({photos.length} Foto)</span>
          <span className="text-[11px] text-gray-400">Klik foto untuk perbesar</span>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
            <ImageIcon className="w-8 h-8 mb-1.5 text-gray-300" />
            <p className="text-xs">Belum ada foto bukti fisik yang diunggah.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((photo, index) => {
              const fullUrl = resolveImgUrl(photo);
              return (
                <div
                  key={index}
                  onClick={() => handleOpenPreview(photo, index)}
                  className="group relative aspect-video sm:aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:border-indigo-400 transition-all"
                >
                  <img
                    src={fullUrl}
                    alt={`Bukti ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Eye className="w-5 h-5 drop-shadow" />
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                    #{index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reused Image Preview Modal */}
      {selectedPhoto && (
        <ImagePreviewModal
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          imageUrl={selectedPhoto}
          title={previewTitle}
        />
      )}
    </div>
  );
};
