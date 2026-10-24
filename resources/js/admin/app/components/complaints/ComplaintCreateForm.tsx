import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  User,
  Phone,
  MapPin,
  Tag,
  AlertCircle,
  Upload,
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useDebounce } from '../../hooks/useDebounce';
import { useCreateComplaint, useCheckDuplicateComplaint, useAreaHierarchy } from '../../hooks/useComplaints';
import { MALANG_REGIONS_HIERARCHY } from '../../data/malangRegions';
import { ComplaintDuplicateAlert } from './ComplaintDuplicateAlert';
import { ComplaintAssignModal } from './ComplaintAssignModal';
import { ComplaintAssignSuccessModal } from './ComplaintAssignSuccessModal';
import type { Complaint, ComplaintCategory, ComplaintPriority } from '../../types/complaint';

// Pemetaan urutan kolom form untuk scroll-to-error & fokus otomatis
const FIELD_ORDER: Array<{ key: string; id: string; label: string }> = [
  { key: 'customerName', id: 'field-customer-name', label: 'Nama Pelanggan' },
  { key: 'customerPhone', id: 'field-customer-phone', label: 'Nomor WhatsApp Pelapor' },
  { key: 'area', id: 'field-area', label: 'Wilayah Operasional (Malang Raya)' },
  { key: 'customerAddress', id: 'field-customer-address', label: 'Alamat Lengkap Lokasi' },
  { key: 'subject', id: 'field-subject', label: 'Subjek Pengaduan' },
  { key: 'description', id: 'field-description', label: 'Deskripsi Kendala' },
  { key: 'attachments', id: 'field-attachments', label: 'Lampiran Screenshot / Foto Bukti' },
];

// Default areas managed via MALANG_REGIONS_HIERARCHY

const CATEGORIES: { value: ComplaintCategory; label: string; isBilling?: boolean }[] = [
  { value: 'no_signal', label: 'Internet Mati Total (LOS Merah / No Signal)' },
  { value: 'slow_speed', label: 'Kecepatan Lambat (Slow Speed)' },
  { value: 'intermittent', label: 'Koneksi Putus-Putus (Intermittent)' },
  { value: 'equipment', label: 'Kerusakan Perangkat (ONT / Router / Adaptor)' },
  { value: 'billing', label: 'Kendala Tagihan / Billing (Diselesaikan Admin)', isBilling: true },
  { value: 'relocation', label: 'Relokasi / Pemindahan Perangkat' },
  { value: 'other', label: 'Kendala Lainnya' },
];

export const ComplaintCreateForm: React.FC = () => {
  const navigate = useNavigate();
  const { data: areaHierarchy = MALANG_REGIONS_HIERARCHY } = useAreaHierarchy();

  // Cascading Area States (Kota/Kab Malang -> Kecamatan -> Kelurahan/Desa)
  const defaultCity = areaHierarchy[0]?.city || 'Kota Malang';
  const defaultDistrict = areaHierarchy[0]?.districts[0]?.name || 'Lowokwaru';
  const defaultVillage = areaHierarchy[0]?.districts[0]?.villages[0] || 'Dinoyo';

  const [selectedCity, setSelectedCity] = useState<string>(defaultCity);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(defaultDistrict);
  const [selectedVillage, setSelectedVillage] = useState<string>(defaultVillage);

  // Available options derived from current selection
  const availableDistricts = areaHierarchy.find((c) => c.city === selectedCity)?.districts || [];
  const availableVillages = availableDistricts.find((d) => d.name === selectedDistrict)?.villages || [];

  const handleCityChange = (newCity: string) => {
    setSelectedCity(newCity);
    const cityData = areaHierarchy.find((c) => c.city === newCity);
    const firstDist = cityData?.districts[0]?.name || '';
    setSelectedDistrict(firstDist);
    const firstVill = cityData?.districts[0]?.villages[0] || '';
    setSelectedVillage(firstVill);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    const distData = availableDistricts.find((d) => d.name === newDistrict);
    const firstVill = distData?.villages[0] || '';
    setSelectedVillage(firstVill);
  };

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('no_signal');
  const [priority, setPriority] = useState<ComplaintPriority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal assignment popup states
  const [createdComplaint, setCreatedComplaint] = useState<Complaint | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignedSuccessComplaint, setAssignedSuccessComplaint] = useState<Complaint | null>(null);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);

  // Debounced phone and code for duplicate ticket check
  const debouncedPhone = useDebounce(customerPhone, 500);
  const debouncedCode = useDebounce(customerCode, 500);

  const { data: duplicateData } = useCheckDuplicateComplaint(
    debouncedPhone.length >= 9 ? debouncedPhone : undefined,
    debouncedCode.length >= 3 ? debouncedCode : undefined
  );

  const createMutation = useCreateComplaint();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachments((prev) => [...prev, ...filesArray].slice(0, 5)); // max 5
      if (errors.attachments) {
        setErrors((prev) => ({ ...prev, attachments: '' }));
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setErrors((errs) => ({ ...errs, attachments: 'Lampiran tangkapan layar (screenshot)/foto bukti kendala wajib diunggah (minimal 1 file)' }));
      }
      return next;
    });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!customerName.trim()) errs.customerName = 'Nama pelanggan wajib diisi';
    if (!customerPhone.trim()) {
      errs.customerPhone = 'Nomor WhatsApp wajib diisi';
    } else if (!/^[0-9]+$/.test(customerPhone.trim())) {
      errs.customerPhone = 'Nomor WhatsApp hanya boleh berupa angka';
    } else if (customerPhone.trim().length < 9) {
      errs.customerPhone = 'Nomor WhatsApp minimal 9 digit';
    } else if (customerPhone.trim().length > 14) {
      errs.customerPhone = 'Nomor WhatsApp maksimal 14 digit';
    }
    if (!selectedDistrict) errs.area = 'Kecamatan wilayah operasional wajib dipilih';
    if (!customerAddress.trim()) errs.customerAddress = 'Alamat lengkap lokasi wajib diisi';
    if (!subject.trim()) errs.subject = 'Subjek pengaduan wajib diisi';
    if (!description.trim()) errs.description = 'Deskripsi kendala wajib diisi';

    if (attachments.length === 0) {
      errs.attachments = 'Lampiran tangkapan layar (screenshot)/foto bukti kendala wajib diunggah (minimal 1 file)';
    }

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Auto-scroll ke kolom error pertama yang belum terisi/salah
      const firstError = FIELD_ORDER.find((item) => errs[item.key]);
      if (firstError) {
        setTimeout(() => {
          const el = document.getElementById(firstError.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = el.querySelector<HTMLElement>('input, textarea, select');
            if (focusable && typeof focusable.focus === 'function') {
              focusable.focus();
            }
          }
        }, 80);
      }
      return false;
    }

    return true;
  };

  const handleAssignModalClose = () => {
    setIsAssignModalOpen(false);
    if (createdComplaint) {
      navigate(`/admin/complaints/${createdComplaint.id}`);
    }
  };

  const handleAssigned = (updated: Complaint) => {
    setIsAssignModalOpen(false);
    // Tampilkan pop-up hasil konfirmasi tim yang berhasil dipilih/ditugaskan
    setAssignedSuccessComplaint(updated);
    setIsAssignSuccessModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const res = await createMutation.mutateAsync({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_code: customerCode.trim() || undefined,
        customer_address: customerAddress.trim(),
        area: selectedCity ? `${selectedDistrict} (${selectedCity})` : selectedDistrict,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        whatsapp_message: whatsappMessage.trim() || undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (category === 'billing') {
        navigate(`/admin/complaints/${res.id}`);
      } else {
        setCreatedComplaint(res);
        setIsAssignModalOpen(true);
      }
    } catch {
      // Error handled by hook toast
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/complaints')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Kembali ke Daftar
          </Button>
          <div className="h-4 w-px bg-gray-300 dark:bg-slate-700" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buat Tiket Pengaduan Baru</h1>
        </div>
      </div>

      {/* Duplicate Check Warning Banner */}
      {duplicateData?.has_duplicate && (
        <ComplaintDuplicateAlert
          duplicates={duplicateData.active_complaints}
          onViewTicket={(id) => navigate(`/admin/complaints/${id}`)}
        />
      )}

      {/* Error Validation Summary Banner with Quick Scroll Links */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900/60 rounded-xl p-4 text-xs shadow-sm transition-all animate-shake">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <h4 className="font-bold text-red-900 dark:text-red-200 text-sm">
                  Terdapat {Object.keys(errors).length} data yang belum terisi atau belum sesuai
                </h4>
                <span className="text-[11px] text-red-600 dark:text-red-400 font-medium bg-red-100/70 dark:bg-red-900/40 px-2 py-0.5 rounded">
                  Layar otomatis dialihkan ke kolom pertama
                </span>
              </div>
              <p className="text-red-700 dark:text-red-300">
                Klik tombol di bawah untuk langsung meloncat ke kolom yang perlu diperbaiki:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {FIELD_ORDER.filter((f) => errors[f.key]).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(f.id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const focusable = el.querySelector<HTMLElement>('input, textarea, select');
                        if (focusable && typeof focusable.focus === 'function') focusable.focus();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 hover:bg-red-100/70 dark:hover:bg-red-900/50 font-medium cursor-pointer transition-all shadow-2xs text-[11px]"
                  >
                    <span className="font-bold">&bull; {f.label}:</span>
                    <span className="font-normal text-red-600 dark:text-red-400">{errors[f.key]}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Data Pelanggan */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              1. Informasi Pelanggan (Dari Pesan WhatsApp)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="field-customer-name" className={`transition-all rounded-lg p-1 ${errors.customerName ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nama Pelanggan <span className="text-red-500">*</span>
              </label>
              <Input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) {
                    setErrors((prev) => ({ ...prev, customerName: '' }));
                  }
                }}
                placeholder="Contoh: Pak Herman"
                className={`text-xs ${errors.customerName ? 'border-red-500 ring-2 ring-red-400/40' : ''}`}
              />
              {errors.customerName && (
                <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.customerName}
                </p>
              )}
            </div>

            <div id="field-customer-phone" className={`transition-all rounded-lg p-1 ${errors.customerPhone ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nomor WhatsApp Pelapor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  value={customerPhone}
                  onChange={(e) => {
                    const numbersOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 14);
                    setCustomerPhone(numbersOnly);
                    if (errors.customerPhone) {
                      setErrors((prev) => ({ ...prev, customerPhone: '' }));
                    }
                  }}
                  placeholder="081234567890 (maks. 14 digit angka)"
                  className={`text-xs pl-9 font-mono ${errors.customerPhone ? 'border-red-500 ring-2 ring-red-400/40' : ''}`}
                />
              </div>
              {errors.customerPhone ? (
                <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.customerPhone}
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 flex justify-between">
                  <span>Hanya angka, 9 s/d 14 digit (tanpa huruf/spasi)</span>
                  <span className="font-mono text-[10px]">{customerPhone.length}/14</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                ID / Kode Pelanggan <span className="text-gray-400 dark:text-slate-500">(opsional)</span>
              </label>
              <Input
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="Contoh: FM-00452"
                className="text-xs"
              />
            </div>
          </div>

          {/* Cascading Regional Dropdowns (Kab/Kota -> Kecamatan -> Desa/Kelurahan) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-1 pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Pilih Wilayah Operasional (Malang Raya) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih Kab/Kota &rarr; Kecamatan &rarr; Desa/Kelurahan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Level 1: Kab / Kota */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  1. Kabupaten / Kota <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {areaHierarchy.map((h) => (
                    <option key={h.city} value={h.city}>
                      {h.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 2: Kecamatan */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  2. Kecamatan <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableDistricts.map((d) => (
                    <option key={d.name} value={d.name}>
                      Kec. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 3: Desa / Kelurahan */}
              <div>
                <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  3. Desa / Kelurahan
                </label>
                <select
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 text-slate-800 dark:text-slate-100 shadow-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {availableVillages.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Selection Badge & Auto Insert */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 dark:text-slate-400">Area Penugasan:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {selectedCity} &bull; Kec. {selectedDistrict} {selectedVillage ? `&bull; ${selectedVillage}` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const villageStr = selectedVillage ? `Desa/Kel. ${selectedVillage}, ` : '';
                  const locationStr = `${villageStr}Kec. ${selectedDistrict}, ${selectedCity}`;
                  setCustomerAddress((prev) => {
                    const clean = prev.trim();
                    if (!clean) return locationStr;
                    if (clean.includes(selectedDistrict)) return clean;
                    return `${clean}, ${locationStr}`;
                  });
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium cursor-pointer underline flex items-center gap-1"
              >
                + Sisipkan ke Alamat
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Alamat Lengkap Lokasi <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <Textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Nama perumahan, blok, nomor rumah, RT/RW, dan patokan..."
                rows={2}
                className={`text-xs pl-9 resize-none ${errors.customerAddress ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.customerAddress && (
              <p className="text-[11px] text-red-600 mt-1">{errors.customerAddress}</p>
            )}
          </div>
        </div>

        {/* Card 2: Rincian Gangguan & Kategori */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
            <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              2. Kategori & Rincian Pengaduan
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Kategori Masalah <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                className="w-full text-xs h-9 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-gray-800 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {category === 'billing' && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Kategori billing diselesaikan oleh Admin dan tidak dapat di-assign ke teknisi.</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Tingkat Prioritas <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full text-xs h-9 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-gray-800 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="low">Rendah (Low - SLA 72 Jam)</option>
                <option value="medium">Sedang (Medium - SLA 48 Jam)</option>
                <option value="high">Tinggi (High - SLA 24 Jam)</option>
                <option value="critical">Kritis (Critical - SLA 4 Jam)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Subjek Singkat <span className="text-red-500">*</span>
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Lampu modem merah sejak sore"
              className={`text-xs ${errors.subject ? 'border-red-500' : ''}`}
              maxLength={100}
            />
            {errors.subject && (
              <p className="text-[11px] text-red-600 mt-1">{errors.subject}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Deskripsi Kendala <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan detail keluhan, riwayat penanganan pertama oleh CS, dan indikasi perangkat..."
              rows={4}
              className={`text-xs resize-none ${errors.description ? 'border-red-500' : ''}`}
            />
            {errors.description && (
              <p className="text-[11px] text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Salinan Chat WhatsApp Asli <span className="text-gray-400 dark:text-slate-500 font-normal">(opsional untuk referensi audit)</span>
            </label>
            <Textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Paste pesan pelapor dari WhatsApp di sini jika diperlukan..."
              rows={3}
              className="text-xs resize-none bg-slate-50 dark:bg-slate-950 font-mono text-[11px]"
            />
          </div>
        </div>

        {/* Card 3: Lampiran Foto dari Chat */}
        <div className={`bg-white dark:bg-slate-900 rounded-xl border ${errors.attachments ? 'border-red-500' : 'border-gray-200 dark:border-slate-800'} shadow-xs p-6 space-y-4`}>
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
            <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              3. Lampiran Screenshot / Foto Bukti Kendala (Wajib, Maks 5 File) <span className="text-red-500">*</span>
            </h2>
          </div>

          <div className="space-y-3">
            <div className={`flex items-center justify-center p-6 border-2 border-dashed ${errors.attachments ? 'border-red-400 bg-red-50/40 dark:bg-red-950/20' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'} rounded-lg transition-colors`}>
              <label className="flex flex-col items-center cursor-pointer text-center">
                <Upload className={`w-8 h-8 ${errors.attachments ? 'text-red-400' : 'text-gray-400 dark:text-slate-500'} mb-1`} />
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Pilih file foto screenshot / bukti</span>
                <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">PNG, JPG hingga 5MB per file (Wajib minimal 1 file)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {errors.attachments && (
              <p className="text-[11px] text-red-600 font-medium">{errors.attachments}</p>
            )}

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <span className="truncate max-w-[120px] text-slate-700 dark:text-slate-200">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 font-bold ml-1 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/complaints')}
            disabled={createMutation.isPending}
            className="dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan & Buat Tiket'
            )}
          </Button>
        </div>
      </form>

      {/* Modal Penugasan Tim Teknisi Langsung Pasca Simpan */}
      <ComplaintAssignModal
        isOpen={isAssignModalOpen}
        onClose={handleAssignModalClose}
        onAssigned={handleAssigned}
        complaint={createdComplaint}
      />

      {/* Modal Konfirmasi Hasil Penugasan Berhasil */}
      <ComplaintAssignSuccessModal
        isOpen={isAssignSuccessModalOpen}
        onClose={() => {
          setIsAssignSuccessModalOpen(false);
          if (assignedSuccessComplaint) {
            navigate(`/admin/complaints/${assignedSuccessComplaint.id}`);
          }
        }}
        complaint={assignedSuccessComplaint}
        onViewDetail={() => {
          setIsAssignSuccessModalOpen(false);
          if (assignedSuccessComplaint) {
            navigate(`/admin/complaints/${assignedSuccessComplaint.id}`);
          }
        }}
        onBackToList={() => {
          setIsAssignSuccessModalOpen(false);
          navigate('/admin/complaints');
        }}
      />
    </div>
  );
};
