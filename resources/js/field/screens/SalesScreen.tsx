import React, { useState, useEffect } from 'react';
import { useApp, maskNik } from '../context/AppContext';
import { PsbSubmission, WorkOrder } from '../types';
import { INITIAL_PACKAGES, INITIAL_ODPS } from '../data/mockData';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { PsbLocationPickerMap } from '../components/PsbLocationPickerMap';
import {
  MALANG_REGIONS,
  getDistrictsByCity,
  getVillagesByDistrict,
  formatFullAddress,
} from '../data/malangRegions';
import { ProcessedPhotoResult } from '../utils/watermark';
import { Badge, Button } from '../design-system';
import {
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Camera,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Check,
  ShieldCheck,
  Wallet,
  Calendar,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react';

interface SalesScreenProps {
  initialMode?: 'list' | 'new_form';
}

export const formatSubmissionStatus = (status: PsbSubmission['status']): string => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Terkirim';
    case 'admin_validation':
      return 'Validasi Admin';
    case 'scheduled':
      return 'Dijadwalkan Pasang';
    case 'installed':
      return 'Terpasang (Active)';
    case 'rejected':
      return 'Ditolak / Revisi';
    default:
      return status;
  }
};

export const SalesScreen: React.FC<SalesScreenProps> = ({ initialMode = 'list' }) => {
  const {
    currentUser,
    salesSubmissions,
    submitPsb,
    checkDuplicateSales,
    collectorVisits,
    recordCollectorVisit,
    currentGps,
    workOrders,
    teams,
    isTeamReady,
    showToast,
    themeMode,
    accentConfig,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'list' | 'new_form'>(initialMode);
  const [statusFilter, setStatusFilter] = useState<'all' | 'admin_validation' | 'scheduled' | 'installed'>('all');
  const [formStep, setFormStep] = useState<number>(1);

  const isDark = themeMode === 'dark';

  const cardSurfaceClass = isDark
    ? 'bg-[#0B1730]/90 border-blue-900/60 text-slate-100 shadow-lg'
    : 'bg-white border-slate-200 text-slate-900 shadow-xs';

  const inputClass = isDark
    ? 'bg-[#071022] border-blue-900/80 text-white placeholder:text-slate-500 focus:border-cyan-400'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white';

  useEffect(() => {
    setActiveTab(initialMode);
  }, [initialMode]);

  // Approval state for Admin
  const [approvingSub, setApprovingSub] = useState<PsbSubmission | null>(null);
  const [assignOdp, setAssignOdp] = useState<string>(INITIAL_ODPS[0].name);
  const [assignPort, setAssignPort] = useState<number>(1);

  // Collector visit modal state
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [visitNoteInput, setVisitNoteInput] = useState<string>(
    'Pelanggan membayar tagihan bulanan, mohon Admin/CS update debt_amount manual.'
  );

  // Address Region Hierarchy (Malang Raya)
  const [city, setCity] = useState<string>('Kota Malang');
  const [district, setDistrict] = useState<string>('Lowokwaru');
  const [village, setVillage] = useState<string>('Dinoyo');
  const [isCustomVillage, setIsCustomVillage] = useState<boolean>(false);
  const [customVillageName, setCustomVillageName] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');

  // Packages State (Katalog Admin vs Manual Input)
  const [catalogPackages, setCatalogPackages] = useState<any[]>(INITIAL_PACKAGES);
  const [packageMode, setPackageMode] = useState<'catalog' | 'manual'>('catalog');
  const [customPackage, setCustomPackage] = useState({
    name: '',
    speed_mbps: 50,
    price: 175000,
  });

  // Fetch Live Package Catalog from Admin API
  useEffect(() => {
    let isMounted = true;
    const loadPackages = async () => {
      try {
        const res = await fetch('/api/packages');
        const json = await res.json();
        if (
          isMounted &&
          json.success &&
          Array.isArray(json.data?.packages) &&
          json.data.packages.length > 0
        ) {
          const activePkgs = json.data.packages
            .filter((p: any) => p.is_active !== false)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              speed: `${p.speed_mbps || 0} Mbps`,
              speed_mbps: p.speed_mbps || 0,
              price: parseFloat(p.price) || 0,
              category: p.category || 'Internet',
              is_popular: Boolean(p.is_popular),
            }));
          if (activePkgs.length > 0) {
            setCatalogPackages(activePkgs);
          }
        }
      } catch {
        // Fallback to INITIAL_PACKAGES
      }
    };
    loadPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync Address string from region hierarchy
  useEffect(() => {
    const activeVillage = isCustomVillage ? customVillageName : village;
    const compiled = formatFullAddress(streetAddress, activeVillage, district, city);
    setFormData((prev) => ({
      ...prev,
      address: compiled,
    }));
  }, [streetAddress, village, isCustomVillage, customVillageName, district, city]);

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const districts = getDistrictsByCity(newCity);
    const firstDistrict = districts.length > 0 ? districts[0].name : '';
    setDistrict(firstDistrict);
    const villages = firstDistrict ? getVillagesByDistrict(newCity, firstDistrict) : [];
    setVillage(villages.length > 0 ? villages[0] : '');
    setIsCustomVillage(false);
    setCustomVillageName('');
  };

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const villages = newDistrict ? getVillagesByDistrict(city, newDistrict) : [];
    setVillage(villages.length > 0 ? villages[0] : '');
    setIsCustomVillage(false);
    setCustomVillageName('');
  };

  // Available districts and villages based on selections
  const availableDistricts = getDistrictsByCity(city);
  const availableVillages = district ? getVillagesByDistrict(city, district) : [];

  // New Submission Form Data
  const [formData, setFormData] = useState({
    customer_name: '',
    nik: '',
    phone: '',
    email: '',
    address: '',
    latitude: currentGps.lat,
    longitude: currentGps.lng,
    package_id: INITIAL_PACKAGES[0].id,
    promo_code: '',
    ktp_photo: '',
    house_photo: '',
    notes: '',
    consent_pdp_accepted: false,
  });

  // Camera state for sales document capture
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraTarget, setCameraTarget] = useState<'ktp' | 'house'>('ktp');

  // Real-time duplicate detection warning
  const duplicateWarning = checkDuplicateSales(
    formData.phone,
    formData.latitude,
    formData.longitude
  );

  // ============================================================================
  // TAMPILAN KHUSUS PERAN COLLECTOR (PENAGIHAN LAPANGAN MANUAL PRD v1.2)
  // ============================================================================
  if (currentUser.role === 'collector') {
    return (
      <div className="space-y-4 pb-24">
        <div>
          <h1 className="text-base font-extrabold tracking-tight">
            Kunjungan Penagihan Lapangan (Collector)
          </h1>
          <p className="text-xs text-slate-400">
            PRD v1.2 Bagian 1 & 2: Kolom <span className="font-mono">debt_amount</span> &{' '}
            <span className="font-mono">billing_cycle_day</span> dikelola manual oleh Admin/CS dengan jejak audit.
          </p>
        </div>

        <div className="space-y-3">
          {collectorVisits.map((visit) => (
            <div
              key={visit.id}
              className={`rounded-2xl p-4 border space-y-3 text-xs ${cardSurfaceClass}`}
            >
              <div className="flex items-center justify-between border-b border-blue-900/50 pb-2">
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold">{visit.customer_code}</span>
                  <span>·</span>
                  <Badge
                    tone={visit.customer_status === 'active' ? 'safe' : 'danger'}
                    mono
                  >
                    {visit.customer_status.toUpperCase()}
                  </Badge>
                </div>
                <Badge
                  tone={
                    visit.visit_status === 'visited_paid'
                      ? 'safe'
                      : visit.visit_status === 'visited_promised'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {visit.visit_status === 'visited_paid'
                    ? 'Sudah Dibayar'
                    : visit.visit_status === 'visited_promised'
                    ? 'Janji Bayar'
                    : 'Belum Dikunjungi'}
                </Badge>
              </div>

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold">{visit.customer_name}</h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    NIK Masked: {visit.nik_masked} · {visit.phone}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{visit.address}</span>
                  </p>
                </div>
                <div className="text-right font-mono shrink-0">
                  <span className="text-[10px] text-slate-400 block">TUNGGAKAN (DEBT)</span>
                  <span className="text-sm font-extrabold text-amber-400 tabular-nums">
                    Rp {visit.debt_amount.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] text-slate-400 block flex items-center justify-end gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> Tgl Siklus: {visit.billing_cycle_day}
                  </span>
                </div>
              </div>

              {visit.visit_note && (
                <div className="p-2.5 rounded-xl bg-[#071022] border border-blue-950 text-[11px] text-slate-300">
                  Catatan Kunjungan: {visit.visit_note}
                </div>
              )}

              {visit.visit_status === 'pending' && (
                <div className="pt-2 border-t border-blue-900/50 space-y-2">
                  {activeVisitId === visit.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={visitNoteInput}
                        onChange={(e) => setVisitNoteInput(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                        placeholder="Catatan hasil penagihan lapangan..."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            recordCollectorVisit(visit.id, 'visited_promised', visitNoteInput);
                            setActiveVisitId(null);
                          }}
                        >
                          Catat Janji Bayar
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Wallet className="w-3.5 h-3.5" />}
                          onClick={() => {
                            recordCollectorVisit(visit.id, 'visited_paid', visitNoteInput);
                            setActiveVisitId(null);
                          }}
                        >
                          Konfirmasi Bayar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      fullWidth
                      onClick={() => setActiveVisitId(visit.id)}
                    >
                      Catat Bukti Kunjungan Penagihan Ber-GPS
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleNextStep = () => {
    if (formStep === 1) {
      if (!formData.customer_name.trim() || !formData.phone.trim() || !formData.nik.trim()) {
        showToast('Mohon lengkapi Nama Pelanggan, NIK 16 digit, dan Nomor Telepon.');
        return;
      }
      if (formData.nik.length !== 16 || !/^\d+$/.test(formData.nik)) {
        showToast('NIK wajib 16 digit angka.');
        return;
      }
    }
    if (formStep === 2) {
      if (!city.trim()) {
        showToast('Mohon pilih Kota atau Kabupaten.');
        return;
      }
      if (!district.trim()) {
        showToast('Mohon pilih Kecamatan.');
        return;
      }
      const activeVillage = isCustomVillage ? customVillageName : village;
      if (!activeVillage.trim()) {
        showToast('Mohon pilih atau masukkan Desa/Kelurahan.');
        return;
      }
      if (!streetAddress.trim()) {
        showToast('Mohon lengkapi alamat (nama jalan, RT/RW, dan patokan lokasi).');
        return;
      }
      if (!Number.isFinite(formData.latitude) || !Number.isFinite(formData.longitude)) {
        showToast('Mohon tentukan titik lokasi pemasangan pada peta.');
        return;
      }
    }
    if (formStep === 3) {
      if (packageMode === 'manual') {
        if (!customPackage.name.trim()) {
          showToast('Nama paket kustom tidak boleh kosong.');
          return;
        }
        if (!customPackage.price || customPackage.price <= 0) {
          showToast('Harga paket kustom harus lebih dari Rp 0.');
          return;
        }
      }
    }
    setFormStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setFormStep((prev) => Math.max(prev - 1, 1));
  };

  const handleOpenDocCamera = (target: 'ktp' | 'house') => {
    setCameraTarget(target);
    setIsCameraOpen(true);
  };

  const handlePhotoCaptured = (res: ProcessedPhotoResult) => {
    if (cameraTarget === 'ktp') {
      setFormData((prev) => ({ ...prev, ktp_photo: res.dataUrl }));
    } else {
      setFormData((prev) => ({ ...prev, house_photo: res.dataUrl }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.ktp_photo || !formData.house_photo) {
      showToast('Wajib melampirkan Foto KTP dan Foto Rumah calon pelanggan (≤400 KB).');
      return;
    }
    if (!formData.consent_pdp_accepted) {
      showToast(
        'Wajib mencentang Persetujuan Pelanggan (Consent UU PDP) atas pengumpulan NIK, lokasi, dan foto rumah.'
      );
      return;
    }

    let finalPackageId = formData.package_id;
    let finalPackageName = '';
    let finalPackagePrice = 0;

    if (packageMode === 'manual') {
      finalPackageId = 0;
      finalPackageName = customPackage.name.trim() || 'Paket Manual';
      finalPackagePrice = Number(customPackage.price) || 0;
    } else {
      const selectedPkg =
        catalogPackages.find((p) => p.id === formData.package_id) ||
        catalogPackages[0] ||
        INITIAL_PACKAGES[0];
      finalPackageId = selectedPkg.id;
      finalPackageName = selectedPkg.name;
      finalPackagePrice = selectedPkg.price;
    }

    const activeVillage = isCustomVillage ? customVillageName : village;
    const fullAddress = formatFullAddress(streetAddress, activeVillage, district, city);

    await submitPsb({
      customer_name: formData.customer_name,
      nik: formData.nik,
      nik_masked: maskNik(formData.nik),
      consent_pdp_accepted: formData.consent_pdp_accepted,
      phone: formData.phone,
      email: formData.email,
      address: fullAddress,
      city: city || 'Kota Malang',
      district: district || 'Klojen',
      village: activeVillage || 'Klojen',
      latitude: formData.latitude,
      longitude: formData.longitude,
      package_id: finalPackageId,
      package_name: finalPackageName,
      package_price: finalPackagePrice,
      package_speed: packageMode === 'custom' ? customPackage.speed_mbps : (catalogPackages.find((p) => p.id === finalPackageId)?.speed_mbps || 20),
      installation_fee: 0,
      promo_code: formData.promo_code,
      ktp_photo: formData.ktp_photo,
      house_photo: formData.house_photo,
      notes: formData.notes,
    });

    setFormData({
      customer_name: '',
      nik: '',
      phone: '',
      email: '',
      address: '',
      latitude: currentGps.lat,
      longitude: currentGps.lng,
      package_id: catalogPackages[0]?.id || INITIAL_PACKAGES[0].id,
      promo_code: '',
      ktp_photo: '',
      house_photo: '',
      notes: '',
      consent_pdp_accepted: false,
    });
    setStreetAddress('');
    setPackageMode('catalog');
    setCustomPackage({ name: '', speed_mbps: 50, price: 175000 });
    setFormStep(1);
    setActiveTab('list');
  };

  // Admin Approval: Converts Sales Submission into active PSB Ticket
  const handleApproveSubmission = (sub: PsbSubmission) => {
    const readyTeams = teams
      .filter((t) => t.is_active)
      .sort((a, b) => a.order_index - b.order_index)
      .filter((t) => isTeamReady(t.id).isReady);

    const assignedTeam = readyTeams.length > 0 ? readyTeams[0] : null;
    const ticketNumber = `PSB-2026-1031-${Math.floor(100 + Math.random() * 900)}`;

    const newTicket: WorkOrder = {
      id: Date.now(),
      ticket_number: ticketNumber,
      type: 'psb',
      sla_target_minutes: 1440,
      sla_elapsed_operational_minutes: 0,
      title: `Pemasangan Baru: ${sub.package_name}`,
      customer_name: sub.customer_name,
      customer_code: `FM-CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      customer_nik_masked: sub.nik_masked || maskNik(sub.nik),
      phone: sub.phone,
      address: sub.address,
      latitude: sub.latitude,
      longitude: sub.longitude,
      package_name: sub.package_name,
      area: 'Jakarta Selatan',
      odp_name: assignOdp,
      odp_port: assignPort,
      status: assignedTeam ? 'assigned' : 'unassigned',
      bast_status: 'pending_bast',
      assigned_team_id: assignedTeam?.id,
      assigned_team_name: assignedTeam?.name,
      assigned_at: assignedTeam ? new Date().toISOString() : undefined,
      reassign_count: 0,
      phase2_requirements: [],
      history_logs: [
        {
          timestamp: new Date().toISOString(),
          action: `Pengajuan ${sub.submission_code} Disetujui oleh ${currentUser.name} (Admin) · Target SLA PSB 24 Jam Operasional`,
          actor_name: currentUser.name,
          note: `ODP: ${assignOdp} Port #${assignPort} (Constraint unik port active/held)`,
        },
        ...(assignedTeam
          ? [
              {
                timestamp: new Date().toISOString(),
                action: `Ditugaskan Otomatis (Round-Robin) ke ${assignedTeam.name}`,
                actor_name: 'TeamDispatchService',
              },
            ]
          : [
              {
                timestamp: new Date().toISOString(),
                action: 'Menunggu di Antrean PSB Belum Ditugaskan',
                actor_name: 'TeamDispatchService',
              },
            ]),
      ],
    };

    sub.status = 'scheduled';
    workOrders.unshift(newTicket);

    showToast(
      `Pengajuan ${sub.submission_code} disetujui! WO ${ticketNumber} masuk ke ${
        assignedTeam ? assignedTeam.name : 'Antrean'
      }.`
    );
    setApprovingSub(null);
  };

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  const mySubmissions =
    currentUser.role === 'sales'
      ? salesSubmissions.filter((s) => s.sales_id === currentUser.id)
      : salesSubmissions;

  const filteredSubmissions = mySubmissions.filter((s) =>
    statusFilter === 'all' ? true : s.status === statusFilter
  );

  return (
    <div className="space-y-4 pb-24">
      {/* NAVBAR UNTUK FORMULIR BARU (MEMUAT HALAMAN BARU DENGAN NAVBAR KEMBALI KE MENU AWAL) */}
      {activeTab === 'new_form' ? (
        <div
          className={`sticky top-0 z-30 -mx-1 -mt-1 mb-2 px-3.5 py-2.5 rounded-2xl border flex items-center justify-between shadow-md backdrop-blur-md ${cardSurfaceClass}`}
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer hover:opacity-80 ${inputClass}`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Menu Awal</span>
            </button>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">Input PSB Pelanggan Baru</h2>
              <p className="text-[11px] text-slate-400">Pendaftaran pelanggan baru & titik pasang</p>
            </div>
          </div>
          <div className="text-right">
            <span
              className="font-mono text-xs font-bold"
              style={{ color: accentConfig.secondaryHex }}
            >
              Langkah {formStep}/4
            </span>
            <p className="text-[10px] text-slate-400">{formStep * 25}% Selesai</p>
          </div>
        </div>
      ) : (
        /* TAMPILAN DAFTAR PENGAJUAN: HEADER + TOMBOL INPUT PSB BARU */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-base font-extrabold tracking-tight">
                Pengajuan PSB
              </h1>
              <p className="text-xs text-slate-400">
                Daftar pengajuan calon pelanggan baru
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFormStep(1);
                setActiveTab('new_form');
              }}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl text-slate-950 font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition hover:opacity-95"
              style={{
                background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
              }}
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Input PSB Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: LIST SUBMISSIONS */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {(
              [
                { id: 'all', label: `Semua (${mySubmissions.length})` },
                {
                  id: 'admin_validation',
                  label: `Validasi Admin (${
                    mySubmissions.filter((s) => s.status === 'admin_validation').length
                  })`,
                },
                {
                  id: 'scheduled',
                  label: `Dijadwalkan (${
                    mySubmissions.filter((s) => s.status === 'scheduled').length
                  })`,
                },
                {
                  id: 'installed',
                  label: `Terpasang (${
                    mySubmissions.filter((s) => s.status === 'installed').length
                  })`,
                },
              ] as const
            ).map((btn) => {
              const isSelected = statusFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id)}
                  style={
                    isSelected
                      ? {
                          background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                          color: '#020617',
                        }
                      : undefined
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'shadow-xs'
                      : isDark
                      ? 'bg-[#0B1730] border border-blue-900/60 text-slate-300'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className={`rounded-2xl p-4 border space-y-2.5 text-xs ${cardSurfaceClass}`}
            >
              <div
                className={`flex items-center justify-between pb-2 border-b ${
                  isDark ? 'border-blue-900/60' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-xs">{sub.submission_code}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(sub.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    sub.status === 'installed'
                      ? 'text-emerald-400'
                      : sub.status === 'scheduled'
                      ? 'text-cyan-400'
                      : sub.status === 'admin_validation'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {formatSubmissionStatus(sub.status)}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-extrabold text-sm">{sub.customer_name}</h3>
                  <p className="text-slate-400 font-mono text-[11px]">
                    NIK Masked: {sub.nik_masked || maskNik(sub.nik)} · {sub.phone}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="font-bold font-mono"
                    style={{
                      color: isDark ? accentConfig.secondaryHex : accentConfig.primaryHex,
                    }}
                  >
                    {sub.package_name}
                  </span>
                  <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Rp {sub.package_price.toLocaleString('id-ID')}/bln
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: accentConfig.secondaryHex }}
                  />
                  <span className="truncate">{sub.address}</span>
                </span>
                <span className="text-emerald-400 font-mono font-bold shrink-0 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Consent PDP
                </span>
              </div>

              {sub.notes && (
                <div
                  className={`p-2 rounded-lg text-[11px] italic ${
                    isDark ? 'bg-[#071022] text-slate-300' : 'bg-slate-50 text-slate-600'
                  }`}
                >
                  "{sub.notes}"
                </div>
              )}

              {sub.status === 'admin_validation' && isAdminOrSuper && (
                <div
                  className={`pt-2 border-t flex items-center justify-between ${
                    isDark ? 'border-blue-900/60' : 'border-slate-100'
                  }`}
                >
                  <span className="text-[11px] text-amber-400 font-mono font-bold">
                    Menunggu Persetujuan Admin
                  </span>
                  <button
                    onClick={() => setApprovingSub(sub)}
                    className="px-3 py-1.5 rounded-lg text-slate-950 font-extrabold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                    style={{
                      background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Setujui & Tugaskan Tim
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin Approval Sub-modal */}
      {approvingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className={`w-full max-w-md rounded-2xl p-5 border shadow-2xl space-y-3.5 text-xs ${cardSurfaceClass}`}>
            <h3 className="text-sm font-extrabold">
              Validasi & Alokasi ODP: {approvingSub.customer_name}
            </h3>
            <p className="text-slate-400 text-xs">
              Constraint PRD v1.2 Bagian 5: Satu port ODP hanya untuk satu pelanggan active atau port berstatus held (30 hari pasca-terminated).
            </p>

            <div className="space-y-2">
              <div>
                <label className="font-bold block mb-1">Pilih Master ODP:</label>
                <select
                  value={assignOdp}
                  onChange={(e) => setAssignOdp(e.target.value)}
                  className={`w-full p-2 rounded-xl border text-xs ${inputClass}`}
                >
                  {INITIAL_ODPS.map((odp) => (
                    <option key={odp.code} value={odp.name}>
                      {odp.code} - {odp.name} (Aktif: {odp.active_ports}/{odp.capacity} · Held: {odp.held_ports})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">Alokasi Port ODP:</label>
                <select
                  value={assignPort}
                  onChange={(e) => setAssignPort(parseInt(e.target.value))}
                  className={`w-full p-2 rounded-xl border text-xs ${inputClass}`}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((port) => (
                    <option key={port} value={port}>
                      Port #{port} (Unik per Pelanggan Active / Held)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setApprovingSub(null)}
                className="px-3 py-1.5 rounded-lg text-slate-400"
              >
                Batal
              </button>
              <button
                onClick={() => handleApproveSubmission(approvingSub)}
                className="px-4 py-2 rounded-xl text-slate-950 font-extrabold text-xs"
                style={{
                  background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                }}
              >
                Setujui & Buat WO PSB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-STEP NEW SUBMISSION FORM */}
      {activeTab === 'new_form' && (
        <div className={`rounded-2xl p-4 border space-y-4 ${cardSurfaceClass}`}>
          <div
            className={`flex items-center justify-between pb-3 border-b text-xs ${
              isDark ? 'border-blue-900/60' : 'border-slate-100'
            }`}
          >
            <span className="font-extrabold">
              Langkah {formStep} dari 4:{' '}
              {formStep === 1
                ? 'Data Calon Pelanggan (NIK AES-256)'
                : formStep === 2
                ? 'Alamat & Titik Koordinat GPS'
                : formStep === 3
                ? 'Paket Internet & Promo'
                : 'Foto Bukti ≤400KB & Consent UU PDP'}
            </span>
            <span
              className="font-mono font-bold text-[11px] tabular-nums"
              style={{ color: accentConfig.secondaryHex }}
            >
              {formStep * 25}% Selesai
            </span>
          </div>

          {/* STEP 1: CUSTOMER DATA */}
          {formStep === 1 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Nama Lengkap Sesuai KTP *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Contoh: Bapak Hendra Gunawan"
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">
                  Nomor Induk Kependudukan (NIK - Dienkripsi AES-256 & nik_hash) *
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  placeholder="16 digit NIK..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${inputClass}`}
                />
                {formData.nik.length >= 10 && (
                  <p className="mt-1 text-[11px] font-mono text-cyan-400">
                    Pratinjau Tampilan Masked: {maskNik(formData.nik)}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold block mb-1">Nomor WhatsApp Aktif (phone_normalized) *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${inputClass}`}
                />
                {duplicateWarning.isDuplicatePhone && (
                  <p className="mt-1 text-rose-400 font-medium flex items-center gap-1 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Peringatan: Nomor telepon ini sudah pernah diajukan!
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold block mb-1">Alamat Email (Opsional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@pelanggan.com"
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                />
              </div>
            </div>
          )}

          {/* STEP 2: ADDRESS & GPS */}
          {formStep === 2 && (
            <div className="space-y-3.5 text-xs">
              {/* Hierarki Wilayah Malang (Kota / Kabupaten & Kecamatan) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Kota / Kabupaten */}
                <div>
                  <label className="font-bold block mb-1">
                    Kota / Kabupaten *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs cursor-pointer ${inputClass}`}
                  >
                    <option value="Kota Malang">Kota Malang</option>
                    <option value="Kabupaten Malang">Kabupaten Malang</option>
                  </select>
                </div>

                {/* 2. Kecamatan (harus pilih kota dulu baru muncul) */}
                <div>
                  <label className="font-bold block mb-1">
                    Kecamatan *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    disabled={!city}
                    className={`w-full px-3 py-2 rounded-xl border text-xs cursor-pointer disabled:opacity-50 ${inputClass}`}
                  >
                    <option value="">-- Pilih Kecamatan --</option>
                    {availableDistricts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Desa / Kelurahan */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold block">
                    Desa / Kelurahan *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomVillage(!isCustomVillage)}
                    className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                  >
                    {isCustomVillage ? 'Pilih dari Daftar' : '+ Ketik Nama Desa Manual'}
                  </button>
                </div>

                {isCustomVillage ? (
                  <input
                    type="text"
                    value={customVillageName}
                    onChange={(e) => setCustomVillageName(e.target.value)}
                    placeholder="Ketik nama Desa / Kelurahan..."
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                  />
                ) : (
                  <select
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    disabled={!district}
                    className={`w-full px-3 py-2 rounded-xl border text-xs cursor-pointer disabled:opacity-50 ${inputClass}`}
                  >
                    <option value="">
                      {district
                        ? '-- Pilih Desa / Kelurahan --'
                        : '-- Pilih Kecamatan Terlebih Dahulu --'}
                    </option>
                    {availableVillages.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. Alamat Lengkap (Jalan, RT/RW, No. Rumah, Patokan) */}
              <div>
                <label className="font-bold block mb-1">
                  Alamat Lengkap (Jalan, RT/RW, No. Rumah, Patokan Lokasi) *
                </label>
                <textarea
                  rows={2}
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Contoh: Jl. Mawar No. 12, RT 02/RW 03, Depan Masjid Baiturrahman..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                />
              </div>

              {/* Pratinjau Alamat Lengkap */}
              {formData.address && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                    isDark
                      ? 'bg-[#071022] border-blue-900/50 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-400">Pratinjau Alamat Lengkap:</span>
                    <p className="font-medium text-slate-200">{formData.address}</p>
                  </div>
                </div>
              )}

              {/* 5. Titik Koordinat Presisi dengan Leaflet JS */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold block">
                    Titik Presisi Lokasi Rumah (Leaflet JS):
                  </label>
                  <span
                    className="text-[11px] font-mono tabular-nums font-bold"
                    style={{ color: accentConfig.secondaryHex }}
                  >
                    {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </span>
                </div>

                <PsbLocationPickerMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChangeLocation={(lat, lng) =>
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                  isDark={isDark}
                  accentPrimary={accentConfig.primaryHex}
                  accentSecondary={accentConfig.secondaryHex}
                />

                {duplicateWarning.isDuplicateGps && (
                  <p className="text-amber-400 font-medium flex items-center gap-1 text-[11px] pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Peringatan: Titik GPS ini berdekatan dengan {duplicateWarning.existingRecord}!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PACKAGE & PROMO */}
          {formStep === 3 && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold block">Pilihan Paket Internet Fiber:</label>
                <div className={`flex rounded-xl p-0.5 border text-[11px] font-bold ${inputClass}`}>
                  <button
                    type="button"
                    onClick={() => setPackageMode('catalog')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      packageMode === 'catalog'
                        ? isDark
                          ? 'bg-[#12264F] text-white shadow-xs'
                          : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    Katalog Admin ({catalogPackages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPackageMode('manual')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                      packageMode === 'manual'
                        ? isDark
                          ? 'bg-[#12264F] text-white shadow-xs'
                          : 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-400'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    Input Manual
                  </button>
                </div>
              </div>

              {packageMode === 'catalog' ? (
                /* Pilihan Paket dari Katalog Admin */
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catalogPackages.map((pkg) => {
                      const isSelected = formData.package_id === pkg.id;
                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setFormData({ ...formData, package_id: pkg.id })}
                          style={
                            isSelected
                              ? {
                                  borderColor: accentConfig.primaryHex,
                                  boxShadow: `0 0 14px ${accentConfig.glowRgba}`,
                                }
                              : undefined
                          }
                          className={`p-3 rounded-xl border cursor-pointer transition ${inputClass} ${
                            isSelected ? 'border-2' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs truncate">{pkg.name}</span>
                            <span
                              className="font-mono text-[11px] font-bold shrink-0 ml-1"
                              style={{ color: accentConfig.secondaryHex }}
                            >
                              {pkg.speed}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-slate-400 text-[11px] font-mono tabular-nums">
                              Rp {Number(pkg.price).toLocaleString('id-ID')}/bln
                            </p>
                            {pkg.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-900/50 text-slate-300">
                                {pkg.category}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Form Input Manual Paket */
                <div
                  className={`p-3.5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#071022] border-blue-900/70' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Input Paket Kustom / Negosiasi Lapangan</span>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Nama Paket Kustom *</label>
                    <input
                      type="text"
                      value={customPackage.name}
                      onChange={(e) =>
                        setCustomPackage((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Contoh: Paket Komunitas Warga 30M"
                      className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold block mb-1">Kecepatan Internet (Mbps) *</label>
                      <input
                        type="number"
                        min={1}
                        value={customPackage.speed_mbps}
                        onChange={(e) =>
                          setCustomPackage((prev) => ({
                            ...prev,
                            speed_mbps: parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="50"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${inputClass}`}
                      />
                    </div>

                    <div>
                      <label className="font-bold block mb-1">Harga Bulanan (Rp) *</label>
                      <input
                        type="number"
                        min={0}
                        step={5000}
                        value={customPackage.price}
                        onChange={(e) =>
                          setCustomPackage((prev) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="175000"
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${inputClass}`}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic">
                    Paket manual ini akan dicatat langsung pada tiket PSB dan diverifikasi oleh Admin/CS saat alokasi ODP.
                  </p>
                </div>
              )}

              <div>
                <label className="font-bold block mb-1">Kode Promo / Voucher</label>
                <input
                  type="text"
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: FIBERHEMAT2026"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono uppercase ${inputClass}`}
                />
              </div>

              <div>
                <label className="font-bold block mb-1">Catatan Tambahan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Permintaan pasang hari Sabtu..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${inputClass}`}
                />
              </div>
            </div>
          )}

          {/* STEP 4: DOCUMENTS & UU PDP CONSENT (PRD v1.2 Section 8 & NFR-04) */}
          {formStep === 4 && (
            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-xl border ${inputClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">1. Foto KTP Pelanggan (Kompresi Klien ≤400 KB):</span>
                  {formData.ktp_photo ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terlampir (≤400 KB)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Wajib</span>
                  )}
                </div>
                {formData.ktp_photo && (
                  <img
                    src={formData.ktp_photo}
                    alt="KTP"
                    className="w-full h-32 object-cover rounded-lg border border-blue-900/50 mb-2"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleOpenDocCamera('ktp')}
                  className="w-full py-2 rounded-lg text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                  }}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {formData.ktp_photo ? 'Ambil Ulang Foto KTP' : 'Ambil Foto KTP dengan Kamera'}
                </button>
              </div>

              <div className={`p-3 rounded-xl border ${inputClass}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">2. Foto Tampak Depan Rumah (Ber-GPS ≤400 KB):</span>
                  {formData.house_photo ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terlampir (≤400 KB)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Wajib</span>
                  )}
                </div>
                {formData.house_photo && (
                  <img
                    src={formData.house_photo}
                    alt="Rumah"
                    className="w-full h-32 object-cover rounded-lg border border-blue-900/50 mb-2"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleOpenDocCamera('house')}
                  className="w-full py-2 rounded-lg text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                  }}
                >
                  <Camera className="w-3.5 h-3.5" />
                  {formData.house_photo ? 'Ambil Ulang Foto Rumah' : 'Ambil Foto Rumah dengan Kamera'}
                </button>
              </div>

              {/* Persetujuan Pelanggan (UU PDP Consent) sesuai PRD v1.2 Bagian 8 */}
              <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer select-none ${inputClass}`}>
                <input
                  type="checkbox"
                  checked={formData.consent_pdp_accepted}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      consent_pdp_accepted: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 mt-0.5 rounded accent-cyan-400 cursor-pointer shrink-0"
                />
                <span className="text-[11px] leading-relaxed">
                  <strong>Persetujuan Pelanggan (UU PDP — PRD v1.2 Bagian 8):</strong> Calon pelanggan menyatakan setuju atas pengumpulan dan pemrosesan data NIK (dienkripsi AES-256), titik koordinat GPS lokasi pemasangan, dan foto rumah untuk keperluan layanan FTTH Fibermedia.
                </span>
              </label>
            </div>
          )}

          {/* Form Step Buttons */}
          <div
            className={`pt-3 border-t flex items-center justify-between gap-3 ${
              isDark ? 'border-blue-900/60' : 'border-slate-100'
            }`}
          >
            {formStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className={`flex items-center gap-1 px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${inputClass}`}
              >
                <ChevronLeft className="w-4 h-4" />
                Kembali
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer ${inputClass}`}
              >
                Batal
              </button>
            )}

            {formStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1 px-5 py-2 rounded-xl text-slate-950 text-xs font-extrabold shadow-sm transition cursor-pointer"
                style={{
                  background: `linear-gradient(135deg, ${accentConfig.primaryHex}, ${accentConfig.secondaryHex})`,
                }}
              >
                Lanjutkan
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-extrabold hover:bg-emerald-400 shadow-md transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Kirim Pengajuan PSB
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        title={`DOKUMEN SALES: ${cameraTarget === 'ktp' ? 'KTP (≤400KB)' : 'FOTO RUMAH (≤400KB)'}`}
        photoKind={cameraTarget === 'ktp' ? 'DOKUMEN KTP' : 'FOTO RUMAH PELANGGAN'}
        facingModeDefault="environment"
        onPhotoCaptured={handlePhotoCaptured}
      />
    </div>
  );
};
