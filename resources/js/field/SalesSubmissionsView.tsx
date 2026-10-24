import React, { useState, useEffect } from 'react';
import {
  FileText,
  PlusCircle,
  Search,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Camera,
  RefreshCw,
  Eye,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  FileCheck,
  Send,
} from 'lucide-react';
import {
  compressImageFile,
  enqueueOfflineRequest,
  getServerTimeIso,
} from '../shared';

interface SalesSubmission {
  id: string | number;
  submission_number: string;
  customer_name: string;
  nik: string;
  phone: string;
  email: string | null;
  address: string;
  district: string;
  city: string;
  province: string;
  lat: number | null;
  lng: number | null;
  package_name: string;
  package_speed: number;
  package_price: number;
  installation_fee: number;
  total_price: number;
  status: string;
  rejection_reason?: string | null;
  validation_notes?: string | null;
  duplicate_warnings?: string[];
  created_at: string;
  documents?: Array<{
    id: number;
    document_type: string;
    url: string;
    status: string;
  }>;
  timeline?: Array<{
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: string;
  }>;
}

interface SalesSubmissionsViewProps {
  token: string;
  currentCoords: { lat: number; lng: number; accuracy?: number } | null;
  deviceUuid: string;
}

export const SalesSubmissionsView: React.FC<SalesSubmissionsViewProps> = ({
  token,
  currentCoords,
  deviceUuid,
}) => {
  const [submissions, setSubmissions] = useState<SalesSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [nik, setNik] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('Jawa Barat');
  const [village, setVillage] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');

  // Packages selection
  const packagesList = [
    { name: 'Mini Deluxe', speed: 30, price: 125000 },
    { name: 'Big Diamond', speed: 50, price: 155000 },
    { name: 'Big Elite', speed: 85, price: 220000 },
    { name: 'Big Premier', speed: 100, price: 260000 },
    { name: 'Big Fiber', speed: 170, price: 330000 },
  ];
  const [selectedPkgIndex, setSelectedPkgIndex] = useState(1); // Big Diamond default

  // Documents
  const [ktpBase64, setKtpBase64] = useState<string | null>(null);
  const [ktpSizeKb, setKtpSizeKb] = useState<number | null>(null);
  const [kkBase64, setKkBase64] = useState<string | null>(null);
  const [isCompressingKtp, setIsCompressingKtp] = useState(false);

  // Duplicate warning state
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Detail Modal
  const [selectedSubmission, setSelectedSubmission] = useState<SalesSubmission | null>(null);

  const fetchSubmissions = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/sales/submissions', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : (json.data?.data || []);
        setSubmissions(items);
      }
    } catch (e) {
      console.error('Gagal mengambil daftar pengajuan sales', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  // Handle GPS Auto-Fill
  const handleUseCurrentLocation = () => {
    if (currentCoords) {
      setLat(currentCoords.lat.toFixed(6));
      setLng(currentCoords.lng.toFixed(6));
    } else {
      alert('Lokasi GPS belum terdeteksi. Pastikan izin lokasi aktif.');
    }
  };

  // Cek duplikat real-time
  const handleCheckDuplicate = async () => {
    if (!nik && !phone && (!lat || !lng)) return;
    setIsCheckingDuplicate(true);
    try {
      const res = await fetch('/api/sales/submissions/check-duplicate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          nik,
          phone,
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
          address,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.warnings && json.warnings.length > 0) {
          setDuplicateWarnings(json.warnings);
        } else {
          setDuplicateWarnings([]);
        }
      }
    } catch (e) {
      console.warn('Gagal cek duplikat', e);
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Handle Foto KTP (Kompres 1600 px / <= 600 KB)
  const handleKtpCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingKtp(true);
    try {
      const compressed = await compressImageFile(file, true, {
        latitude: currentCoords?.lat,
        longitude: currentCoords?.lng,
        accuracy: currentCoords?.accuracy,
        timestampIso: getServerTimeIso(),
        deviceId: deviceUuid,
      });

      setKtpBase64(compressed.base64);
      setKtpSizeKb(Math.round(compressed.sizeBytes / 1024));
    } catch (err) {
      alert('Gagal memproses gambar KTP: ' + (err as Error).message);
    } finally {
      setIsCompressingKtp(false);
    }
  };

  // Submit Pengajuan Baru
  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !nik || !phone || !address || !district || !city) {
      setFormAlert({ text: 'Mohon lengkapi seluruh field wajib bertanda bintang.', type: 'error' });
      return;
    }

    if (nik.length !== 16) {
      setFormAlert({ text: 'NIK harus tepat 16 digit.', type: 'error' });
      return;
    }

    const chosenPkg = packagesList[selectedPkgIndex];
    const idempotencyKey = 'idemp_sub_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();

    const payload: any = {
      customer_name: customerName,
      nik,
      phone,
      email: email || null,
      address,
      district,
      city,
      province,
      village: village || null,
      postal_code: postalCode || null,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      package_name: chosenPkg.name,
      package_speed: chosenPkg.speed,
      package_price: chosenPkg.price,
      installation_fee: 50000,
    };

    if (ktpBase64) {
      payload.ktp_base64 = ktpBase64;
    }
    if (kkBase64) {
      payload.kk_base64 = kkBase64;
    }

    setIsSubmitting(true);
    setFormAlert(null);

    try {
      const res = await fetch('/api/sales/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setIsFormOpen(false);
        resetForm();
        fetchSubmissions();
        alert(
          json.duplicate_warnings && json.duplicate_warnings.length > 0
            ? 'Pengajuan berhasil disimpan dengan catatan potensi duplikasi:\n- ' + json.duplicate_warnings.join('\n- ')
            : 'Pengajuan pelanggan baru berhasil diajukan ke admin!'
        );
      } else {
        setFormAlert({ text: json.message || 'Gagal menyimpan pengajuan.', type: 'error' });
      }
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueOfflineRequest('/api/sales/submissions', 'POST', payload, token);
        setIsFormOpen(false);
        resetForm();
        alert('Offline: Pengajuan disimpan di antrean Dexie dan akan otomatis dikirim saat online.');
      } else {
        setFormAlert({ text: 'Terjadi kesalahan jaringan.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setNik('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDistrict('');
    setCity('');
    setVillage('');
    setPostalCode('');
    setLat('');
    setLng('');
    setKtpBase64(null);
    setKtpSizeKb(null);
    setKkBase64(null);
    setDuplicateWarnings([]);
    setFormAlert(null);
  };

  // Filter Submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchStatus = statusFilter === 'all' || (sub.status && sub.status.toLowerCase() === statusFilter.toLowerCase());
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !searchQuery ||
      (sub.customer_name && sub.customer_name.toLowerCase().includes(query)) ||
      (sub.submission_number && sub.submission_number.toLowerCase().includes(query)) ||
      (sub.phone && sub.phone.includes(query));
    return matchStatus && matchQuery;
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-sky-400" />
            Pengajuan Pelanggan Sales
          </h2>
          <p className="text-xs text-slate-400">Total {submissions.length} Pengajuan Anda</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            if (currentCoords) {
              setLat(currentCoords.lat.toFixed(6));
              setLng(currentCoords.lng.toFixed(6));
            }
            setIsFormOpen(true);
          }}
          className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          Pengajuan Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama, nomor pengajuan, atau HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {['all', 'pending', 'approved', 'need_info', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
                statusFilter === st
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {st === 'all'
                ? 'Semua'
                : st === 'pending'
                ? 'Menunggu'
                : st === 'approved'
                ? 'Disetujui'
                : st === 'need_info'
                ? 'Butuh Info'
                : 'Ditolak'}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
          Memuat daftar pengajuan...
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl text-xs text-slate-500">
          <FileCheck className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          Belum ada pengajuan dengan filter ini.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSubmissions.map((sub) => {
            const hasDuplicateWarning = sub.duplicate_warnings && sub.duplicate_warnings.length > 0;
            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubmission(sub)}
                className="bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 rounded-xl p-3.5 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {sub.submission_number}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sub.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : sub.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : sub.status === 'need_info'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {sub.status === 'approved'
                      ? 'Disetujui'
                      : sub.status === 'rejected'
                      ? 'Ditolak'
                      : sub.status === 'need_info'
                      ? 'Butuh Info'
                      : 'Menunggu Validasi'}
                  </span>
                </div>

                <div>
                  <div className="text-sm font-semibold text-white">{sub.customer_name}</div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{sub.phone}</span>
                    <span>•</span>
                    <span className="text-slate-300">{sub.package_name} ({sub.package_speed} Mbps)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{sub.address}, {sub.district}</span>
                  </div>
                </div>

                {hasDuplicateWarning && (
                  <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Peringatan potensi duplikasi terdeteksi oleh sistem</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETAIL PENGAJUAN */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs font-bold text-sky-400">{selectedSubmission.submission_number}</span>
                <h3 className="text-sm font-bold text-white">{selectedSubmission.customer_name}</h3>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px]">No. Telepon / WA</span>
                  <span className="font-medium text-white">{selectedSubmission.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">NIK</span>
                  <span className="font-medium text-white">{selectedSubmission.nik}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Paket</span>
                  <span className="font-medium text-white">{selectedSubmission.package_name} ({selectedSubmission.package_speed} Mbps)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Total Tagihan</span>
                  <span className="font-medium text-emerald-400">Rp {Number(selectedSubmission.total_price || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">Alamat Pemasangan</span>
                <p className="text-slate-200 mt-0.5">
                  {selectedSubmission.address}, {selectedSubmission.district}, {selectedSubmission.city}
                </p>
                {selectedSubmission.lat && selectedSubmission.lng && (
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5 block">
                    📍 {selectedSubmission.lat}, {selectedSubmission.lng}
                  </span>
                )}
              </div>

              {selectedSubmission.rejection_reason && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
                  <span className="font-bold block text-[11px] mb-1 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Alasan Penolakan Admin:
                  </span>
                  <span>{selectedSubmission.rejection_reason}</span>
                </div>
              )}

              {selectedSubmission.duplicate_warnings && selectedSubmission.duplicate_warnings.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 space-y-1">
                  <span className="font-bold block text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Peringatan Duplikasi Tercatat:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {selectedSubmission.duplicate_warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM PENGAJUAN BARU */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl my-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-sky-400" />
                Form Pengajuan Pelanggan Baru
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formAlert && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  formAlert.type === 'error'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                }`}
              >
                {formAlert.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                <span>{formAlert.text}</span>
              </div>
            )}

            {/* Peringatan duplikat live */}
            {duplicateWarnings.length > 0 && (
              <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl text-xs text-amber-200 space-y-1.5 animate-pulse">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Peringatan: Terdeteksi Potensi Duplikasi</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-300/90">
                  {duplicateWarnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-amber-400/80 italic">
                  * Sistem tidak memblokir. Pengajuan tetap dapat disimpan dan akan ditinjau oleh Admin.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitNew} className="space-y-3.5 text-xs">
              {/* Identitas Calon Pelanggan */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                  1. Data Pelanggan
                </span>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    placeholder="Sesuai KTP"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">NIK (16 Digit) *</label>
                    <input
                      type="text"
                      required
                      maxLength={16}
                      placeholder="3201..."
                      value={nik}
                      onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                      onBlur={handleCheckDuplicate}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">No. Telepon / WA *</label>
                    <input
                      type="text"
                      required
                      placeholder="0812..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={handleCheckDuplicate}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Email (Opsional)</label>
                  <input
                    type="email"
                    placeholder="pelanggan@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Alamat & Lokasi Pemasangan */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                  2. Lokasi Pemasangan
                </span>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Alamat Pemasangan *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Nama jalan, nomor rumah, RT/RW..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Kecamatan / District *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Sukajadi"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Kota / Kabupaten *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bandung"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Titik Koordinat GPS */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      Titik Koordinat GPS
                    </span>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-lg hover:bg-indigo-500/30"
                    >
                      📍 Ambil Lokasi Saya
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Latitude"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-white"
                    />
                    <input
                      type="text"
                      placeholder="Longitude"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Pilihan Paket Layanan */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                  3. Paket Layanan
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {packagesList.map((pkg, idx) => (
                    <label
                      key={pkg.name}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        selectedPkgIndex === idx
                          ? 'bg-sky-500/15 border-sky-500 text-white'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="package_radio"
                          checked={selectedPkgIndex === idx}
                          onChange={() => setSelectedPkgIndex(idx)}
                          className="text-sky-500"
                        />
                        <span className="font-semibold text-white">{pkg.name}</span>
                        <span className="text-[11px] text-slate-400">({pkg.speed} Mbps)</span>
                      </div>
                      <span className="font-bold text-emerald-400 font-mono">
                        Rp {pkg.price.toLocaleString('id-ID')}/bln
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Unggah KTP Kompresi 1600 px / <= 600 KB */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  4. Foto KTP Pelanggan (Kompresi Maks. 1600px / 600KB)
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl p-3 text-center cursor-pointer">
                    <span className="text-xs font-semibold text-sky-300 flex items-center justify-center gap-1.5">
                      <Camera className="w-4 h-4" />
                      {isCompressingKtp ? 'Mengompres Gambar...' : ktpBase64 ? 'Ganti Foto KTP' : 'Foto / Ambil KTP'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleKtpCapture}
                      className="hidden"
                    />
                  </label>
                  {ktpBase64 && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/50 shrink-0">
                      <img src={ktpBase64} alt="KTP" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center text-emerald-300 font-mono">
                        {ktpSizeKb} KB
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting || isCompressingKtp}
                  className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 text-xs transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan Pengajuan...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      KIRIM PENGAJUAN PELANGGAN
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesSubmissionsView;
