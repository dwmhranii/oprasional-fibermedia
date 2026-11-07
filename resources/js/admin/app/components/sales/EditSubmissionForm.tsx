import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// UI Primitives
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Form } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { CameraModal, checkCameraAvailability } from '../common/CameraModal';

// Icons
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Save,
  AlertCircle,
  RefreshCw,
  Upload,
  X,
  Eye,
  FileText,
  CheckCircle,
  Image,
  User,
  MapPin,
  Wifi,
  FolderOpen,
  Camera,
} from 'lucide-react';

// Steps (rendered inline, no pagination)
import { CustomerDataStep } from './steps/CustomerDataStep';
import { AddressStep } from './steps/AddressStep';
import { PackageStep } from './steps/PackageStep';

// Lib
import { apiClient, ApiError } from '../../lib/api';
import { submissionToBackendPayload } from '../../lib/mappers';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';

// Region + Package data (for name→id resolution)
import {
  getProvinces,
  getCities,
  getDistricts,
  getSubDistricts,
} from '../../data/regions';
import { packages as packageList } from '../../data/packages';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const editSchema = z.object({
  // Customer
  ktp: z.string().optional(),
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  phone: z.string().min(9, 'Nomor telepon minimal 9 digit').max(13, 'Nomor telepon maksimal 13 digit').regex(/^8\d+$/, 'Nomor telepon harus dimulai dengan 8'),
  whatsapp: z.boolean().default(true),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  // Address
  ktpAddress: z.string().min(10, 'Alamat KTP minimal 10 karakter'),
  installAddress: z.string().optional(),
  sameAsKtp: z.boolean().default(false),
  province: z.string().min(1, 'Pilih provinsi'),
  city: z.string().min(1, 'Pilih kota/kabupaten'),
  district: z.string().min(1, 'Pilih kecamatan'),
  subDistrict: z.string().min(1, 'Pilih kelurahan'),
  postalCode: z.string().length(5, 'Kode pos harus 5 digit'),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  // Package
  selectedPackage: z.string().optional().or(z.literal('')),
  promoCode: z.string().optional(),
  discountAmount: z.number().optional().default(0),
});

type EditFormData = z.infer<typeof editSchema>;

// ─── Document types ───────────────────────────────────────────────────────────

type DocType = 'ktp' | 'kk' | 'rumah' | 'lainnya';

interface DocSlot {
  type: DocType;
  label: string;
  required: boolean;
}

const DOC_SLOTS: DocSlot[] = [
  { type: 'ktp',     label: 'Foto KTP',              required: true  },
  { type: 'kk',      label: 'Kartu Keluarga (KK)',    required: true  },
  { type: 'rumah',   label: 'Foto Rumah',             required: true  },
  { type: 'lainnya', label: 'Dokumen Lainnya',        required: false },
];

type NewFilesState = Record<DocType, File | null>;

// ─── Inline FileUpload widget ─────────────────────────────────────────────────

interface DocSlotUploadProps {
  slot: DocSlot;
  existingUrl: string | null;
  existingStatus?: string;
  newFile: File | null;
  onNewFile: (file: File | null) => void;
  onPreview: (url: string, title: string) => void;
}

const DocSlotUpload: React.FC<DocSlotUploadProps> = ({
  slot,
  existingUrl,
  existingStatus,
  newFile,
  onNewFile,
  onPreview,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `doc-replace-${slot.type}`;

  useEffect(() => {
    if (newFile) {
      const reader = new FileReader();
      reader.onloadend = () => setLocalPreview(reader.result as string);
      reader.readAsDataURL(newFile);
    } else {
      setLocalPreview(null);
    }
  }, [newFile]);

  const validateAndSet = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      toast.error('File harus berformat JPG, PNG, atau PDF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }
    onNewFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSet(f);
    // reset input so the same file can be re-selected
    e.target.value = '';
  };

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const handleCameraClick = async () => {
    const result = await checkCameraAvailability();
    if (result.permissionGranted) {
      setIsCameraModalOpen(true);
    } else if (result.error === 'PERMISSION_DENIED') {
      toast.error("Akses kamera ditolak. Silakan izinkan akses kamera pada browser.");
    } else {
      toast.info("Kamera tidak ditemukan. Membuka pemilih file...");
      inputRef.current?.click();
    }
  };

  const statusColors: Record<string, string> = {
    approved: 'text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-200',
    rejected:  'text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200',
    pending:   'text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200',
  };

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="text-sm font-medium text-gray-700">
          {slot.label}
          {slot.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {existingStatus && (
          <span className={`text-[10px] sm:text-xs font-medium capitalize ${statusColors[existingStatus] ?? 'text-gray-500'}`}>
            {existingStatus === 'approved' ? 'Disetujui' : existingStatus === 'rejected' ? 'Revisi Diperlukan' : 'Menunggu Validasi'}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* NEW file selected state */}
      {newFile ? (
        <div className="border-2 border-green-400 rounded-lg p-3 bg-green-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm text-green-800 font-medium truncate">{newFile.name}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-500 hover:text-red-500 flex-shrink-0"
              onClick={() => onNewFile(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {localPreview && newFile.type.startsWith('image/') && (
            <img
              src={localPreview}
              alt="Preview"
              className="max-h-28 rounded-md mx-auto object-contain border"
            />
          )}
        </div>
      ) : existingUrl ? (
        /* Existing document state */
        <div className="border rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">Dokumen tersimpan</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 sm:flex-none text-[#667eea]"
              onClick={() => onPreview(existingUrl, slot.label)}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Lihat
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 flex-1 sm:flex-none text-amber-600"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Ganti
            </Button>
          </div>
        </div>
      ) : (
        /* No existing document — show action buttons */
        <div className="border border-gray-200 bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="w-full flex flex-col items-center justify-center py-4 h-auto border-dashed border-gray-300 hover:border-primary hover:bg-primary/5" onClick={handleCameraClick}>
              <Camera className="w-5 h-5 mb-1 text-gray-500" />
              <span className="text-[11px] font-medium text-gray-700">Ambil Foto</span>
            </Button>
            <Button type="button" variant="outline" className="w-full flex flex-col items-center justify-center py-4 h-auto border-dashed border-gray-300 hover:border-primary hover:bg-primary/5" onClick={() => inputRef.current?.click()}>
              <Image className="w-5 h-5 mb-1 text-gray-500" />
              <span className="text-[11px] font-medium text-gray-700">Pilih File</span>
            </Button>
          </div>
          <p className="text-[10px] text-center text-gray-500 mt-2">JPG, PNG, PDF · Maks 5MB</p>
        </div>
      )}
      <CameraModal 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onCapture={(file) => {
          onNewFile(file);
        }} 
      />
    </div>
  );
};

// ─── Status badge helper ──────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  const cfg: Record<string, { label: string; color: string }> = {
    need_info:  { label: 'Butuh Info Tambahan', color: '#f59e0b' },
    pending:    { label: 'Menunggu Validasi',    color: '#f59e0b' },
    in_review:  { label: 'Sedang Ditinjau',      color: '#3b82f6' },
    approved:   { label: 'Disetujui',            color: '#10b981' },
    rejected:   { label: 'Ditolak',              color: '#ef4444' },
  };
  const c = cfg[status] ?? { label: status, color: '#6b7280' };
  return (
    <Badge style={{ backgroundColor: `${c.color}20`, color: c.color }}>
      {c.label}
    </Badge>
  );
};

// Mask NIK: keep first 6 and last 4, middle digits as asterisk
const maskNik = (nik: string): string => {
  if (!nik) return '';
  const clean = nik.replace(/\D/g, '');
  if (clean.length < 16) return nik;
  return `${clean.substring(0, 6)}******${clean.substring(12)}`;
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const EditSubmissionForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFiles, setNewFiles] = useState<NewFilesState>({
    ktp: null, kk: null, rumah: null, lainnya: null,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // ── Fetch submission ──────────────────────────────────────────────────────

  const { data: apiData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['salesSubmissions', 'edit', id],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/submissions/${id}`);
      // Handle both plain response and envelope {success, data}
      return response?.data ?? response;
    },
    enabled: !!id,
    retry: 1,
  });

  // Compute package editability based on backend response keys
  const isPackageEditable = !!(
    apiData?.allow_package_change ??
    apiData?.package_editable ??
    apiData?.is_package_editable ??
    apiData?.can_change_package ??
    false
  );

  // ── Form setup ────────────────────────────────────────────────────────────

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema) as any,
    defaultValues: {
      ktp: '', name: '', phone: '', whatsapp: true, email: '',
      ktpAddress: '', installAddress: '', sameAsKtp: false,
      province: '', city: '', district: '', subDistrict: '', postalCode: '',
      coordinates: { lat: 0, lng: 0 },
      selectedPackage: '', promoCode: '',
    },
    mode: 'onChange',
  });

  // ── Pre-fill from API (two-phase to survive AddressStep cascade-resets) ────
  //
  // Problem: AddressStep has useEffect hooks that watch `province` and reset
  // city/district/subDistrict to '' whenever province changes. If we call
  // form.reset() with all four set at once, React batches the state update but
  // the useEffect in AddressStep still fires and wipes city/district/subDistrict.
  //
  // Solution:
  //   Phase 1 – reset all non-cascade fields (text inputs, coordinates, package).
  //             Set province to '' so AddressStep's province-watcher fires but
  //             clears nothing meaningful.
  //   Phase 2 – after a single animation frame (enough for all useEffects to
  //             settle), setValue province → the watcher fires and clears city
  //             (expected). Then immediately after another tick, set city →
  //             district-watcher fires and clears district. Then set district →
  //             subDistrict-watcher fires. Then set subDistrict + postalCode.
  //
  // Name→ID resolution:
  //   The API returns human-readable names (e.g. "Jawa Timur", "Kepanjen").
  //   The Select components use the internal id strings (e.g. "jawa-timur").
  //   We resolve by case-insensitive name match before setting values.

  useEffect(() => {
    if (!apiData) return;

    // ── Resolve region IDs from API name strings ──────────────────────────
    const provinces = getProvinces();
    const apiProvName = (apiData.province || '').toLowerCase().trim();
    const apiCityName = (apiData.city     || '').toLowerCase().trim();
    const apiDistName = (apiData.district || '').toLowerCase().trim();
    const apiSubName  = (
      apiData.village ||
      apiData.location?.village ||
      apiData.sub_district ||
      apiData.subdistrict ||
      apiData.kelurahan ||
      ''
    ).toLowerCase().trim();

    const matchedProvince = provinces.find(
      p => p.id.toLowerCase() === apiProvName || p.name.toLowerCase() === apiProvName
    );
    const provinceId = matchedProvince?.id || apiData.province || '';

    const cities = provinceId ? getCities(provinceId) : [];
    const matchedCity = cities.find(
      c => c.id.toLowerCase() === apiCityName || c.name.toLowerCase() === apiCityName
    );
    const cityId = matchedCity?.id || apiData.city || '';

    const districts = cityId ? getDistricts(provinceId, cityId) : [];
    const matchedDistrict = districts.find(
      d => d.id.toLowerCase() === apiDistName || d.name.toLowerCase() === apiDistName
    );
    const districtId = matchedDistrict?.id || apiData.district || '';

    const subDistricts = districtId ? getSubDistricts(provinceId, cityId, districtId) : [];
    const matchedSubDistrict = subDistricts.find(
      s => s.id.toLowerCase() === apiSubName || s.name.toLowerCase() === apiSubName
    );
    const subDistrictId = matchedSubDistrict?.id ||
      apiData.village ||
      apiData.location?.village ||
      apiData.sub_district ||
      apiData.subdistrict ||
      apiData.kelurahan ||
      '';
    const postalCode    = matchedSubDistrict?.postalCode || apiData.postal_code || apiData.postalcode || apiData.kode_pos || '';

    // ── Resolve package ID from name or numeric id ────────────────────────
    const apiPkgName = (apiData.package_name || '').trim();
    const apiPkgId   = apiData.package_id ? String(apiData.package_id) : '';
    const matchedPkg = packageList.find(
      p => p.id === apiPkgId ||
           p.name.toUpperCase() === apiPkgName.toUpperCase() ||
           (apiPkgName && p.name.toUpperCase().includes(apiPkgName.toUpperCase())) ||
           (apiPkgName && apiPkgName.toUpperCase().includes(p.name.toUpperCase()))
    );
    const selectedPackage = matchedPkg?.id || apiPkgName || apiPkgId || 'locked_package';

    // ── Coordinates ───────────────────────────────────────────────────────
    const coordinates =
      apiData.customer_location?.latitude != null
        ? { lat: Number(apiData.customer_location.latitude), lng: Number(apiData.customer_location.longitude) }
        : apiData.lat != null
        ? { lat: Number(apiData.lat), lng: Number(apiData.lng) }
        : { lat: 0, lng: 0 };

    const originalNik = apiData.nik || '';
    const maskedNik = maskNik(originalNik);

    // ── Phase 1: Reset all non-cascade fields. Leave province empty so
    //            AddressStep's province-watcher fires harmlessly. ─────────
    form.reset({
      ktp:            maskedNik,
      name:           apiData.customer_name || '',
      phone:          apiData.phone         || '',
      whatsapp:       apiData.whatsapp === undefined ? true : Boolean(apiData.whatsapp),
      email:          apiData.email         || '',
      ktpAddress:     apiData.address       || '',
      installAddress: apiData.install_address || '',
      sameAsKtp:      !apiData.install_address || apiData.install_address === apiData.address,
      // Region fields start empty — filled in Phase 2
      province: '', city: '', district: '', subDistrict: '', postalCode: '',
      coordinates,
      selectedPackage,
      promoCode: apiData.promo_code || '',
    });

    // ── Phase 2: Set region cascade sequentially after useEffects settle ──
    // Each setTimeout(fn, 50) yields to the event loop, letting React flush
    // AddressStep's useEffect watchers before we override the cleared values.
    setTimeout(() => {
      // Setting province triggers AddressStep's province-watcher which resets
      // city/district/subDistrict — that's fine, we set them right after.
      form.setValue('province', provinceId, { shouldDirty: false });

      setTimeout(() => {
        form.setValue('city', cityId, { shouldDirty: false });

        setTimeout(() => {
          form.setValue('district', districtId, { shouldDirty: false });

          setTimeout(() => {
            form.setValue('subDistrict', subDistrictId, { shouldDirty: false });
            if (postalCode) {
              form.setValue('postalCode', postalCode, { shouldDirty: false });
            }
          }, 50);
        }, 50);
      }, 50);
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData]);

  // ── Unsaved-changes guard (tab close) ─────────────────────────────────────

  const hasNewFiles = Object.values(newFiles).some(Boolean);
  const isDirty = form.formState.isDirty || hasNewFiles;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Back navigation with dirty guard ─────────────────────────────────────

  const handleBack = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm('Ada perubahan yang belum disimpan. Yakin ingin keluar?');
      if (!ok) return;
    }
    navigate(`/submissions/${id}`);
  }, [isDirty, navigate, id]);

  // ── Document helpers ──────────────────────────────────────────────────────

  const getExistingDoc = (type: DocType): { url: string; status?: string } | null => {
    if (!Array.isArray(apiData?.documents)) return null;
    const doc = apiData.documents.find((d: any) => d.document_type === type);
    return doc ? { url: doc.url, status: doc.status } : null;
  };

  const setNewFile = (type: DocType, file: File | null) => {
    setNewFiles(prev => ({ ...prev, [type]: file }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    // Validate install address separately (same logic as NewSubmissionForm)
    const sameAsKtp = form.getValues('sameAsKtp');
    if (!sameAsKtp) {
      const installAddress = form.getValues('installAddress');
      if (!installAddress || installAddress.length < 10) {
        form.setError('installAddress', { message: 'Alamat instalasi minimal 10 karakter' });
        toast.error('Mohon lengkapi semua field yang wajib diisi');
        return;
      }
    }

    const isValid = await form.trigger();
    if (!isValid) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      // Scroll to first error
      const firstError = document.querySelector('[aria-invalid="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      const values = form.getValues();
      const payload = submissionToBackendPayload(values);

      // Do NOT send immutable fields in the PUT payload
      delete payload.nik;
      delete payload.submission_number;
      delete payload.user_id;
      delete payload.validator_id;
      delete payload.created_at;

      // If package editing is disabled for this submission, preserve original package
      if (!isPackageEditable) {
        delete payload.package_name;
        delete payload.package_speed;
        delete payload.package_price;
        delete payload.installation_fee;
      }

      // 1. PUT form data
      await apiClient.put<any>(`/submissions/${id}`, payload);

      // 2. Upload only new/replaced files
      const uploads = DOC_SLOTS
        .map(slot => ({ slot, file: newFiles[slot.type] }))
        .filter(({ file }) => file instanceof File);

      for (const { slot, file } of uploads) {
        const fd = new FormData();
        fd.append('document_type', slot.type);
        fd.append('file', file!);
        toast.info(`Mengunggah ${slot.label}...`);
        await apiClient.upload<any>(`/submissions/${id}/upload-document`, fd);
      }

      // 3. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['salesSubmissions', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['salesSubmissions', 'edit',   id] });
      queryClient.invalidateQueries({ queryKey: ['salesSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['submission', id] });

      toast.success('Pengajuan berhasil diperbarui!');
      navigate(`/submissions/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const firstError = err.getFirstError();
        toast.error(firstError || 'Gagal menyimpan perubahan');

        // Map backend field errors to form
        if (err.errors) {
          let isFirst = true;
          Object.entries(err.errors).forEach(([key, messages]) => {
            let formKey = key;
            if (key === 'customer_name') formKey = 'name';
            if (key === 'nik')           formKey = 'ktp';
            if (key === 'address')       formKey = 'ktpAddress';
            if (key === 'package_name')  formKey = 'selectedPackage';

            form.setError(formKey as any, {
              type: 'server',
              message: (messages as string[])[0],
            }, { shouldFocus: isFirst });
            isFirst = false;
          });
        }
      } else {
        toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#667eea' }} />
        <p className="text-gray-500 text-sm">Memuat data pengajuan...</p>
      </div>
    );
  }

  if (isError || !apiData) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate('/submissions')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Pengajuan tidak ditemukan atau Anda tidak memiliki izin.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Derive validation notes — backend may use `validation_notes` or `notes`
  const validationNotes: string = apiData.validation_notes || apiData.notes || '';
  const submissionNumber: string = apiData.submission_number || `SUB-${apiData.id}`;
  const status: string = apiData.status || 'need_info';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-12 space-y-4 md:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: '#1f2937' }}>
                Edit Pengajuan
              </h1>
              {getStatusBadge(status)}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">
              {submissionNumber}
            </p>
          </div>
        </div>
        {isDirty && (
          <Badge
            className="self-start sm:self-auto"
            style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}
          >
            Ada perubahan belum disimpan
          </Badge>
        )}
      </div>

      {/* ── Validation Notes Alert ── */}
      {validationNotes && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="text-amber-800 font-semibold">
            Perlu Revisi — Catatan dari Admin
          </AlertTitle>
          <AlertDescription className="text-amber-700 mt-1 whitespace-pre-wrap">
            {validationNotes}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Form ── */}
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

          {/* ── 1. Customer Data ── */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <User className="w-4 h-4 text-indigo-400" />
                Data Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CustomerDataStep form={form} disableKtp={true} />
            </CardContent>
          </Card>

          {/* ── 2. Address ── */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-indigo-400" />
                Alamat Instalasi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <AddressStep form={form} />
            </CardContent>
          </Card>

          {/* ── 3. Package ── */}
          <Card>
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <Wifi className="w-4 h-4 text-indigo-400" />
                Paket Layanan
              </CardTitle>
              {!isPackageEditable && (
                <Badge variant="outline" className="text-xs text-gray-500 bg-gray-50 border-gray-200">
                  🔒 Dikunci
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {!isPackageEditable && (
                <Alert className="bg-gray-50 border-gray-200 text-gray-600 py-3">
                  <AlertDescription className="text-xs">
                    Paket layanan tidak dapat diubah karena sudah dikunci oleh validator.
                  </AlertDescription>
                </Alert>
              )}
              <PackageStep form={form} disabled={!isPackageEditable} />
            </CardContent>
          </Card>

          {/* ── 4. Documents ── */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-gray-700">
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                Dokumen Pendukung
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-sm text-gray-500">
                Dokumen yang sudah diunggah sebelumnya akan tetap tersimpan.
                Pilih <span className="font-medium text-amber-600">Ganti</span> hanya jika ingin mengganti dokumen tertentu.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {DOC_SLOTS.map(slot => {
                  const existing = getExistingDoc(slot.type);
                  return (
                    <DocSlotUpload
                      key={slot.type}
                      slot={slot}
                      existingUrl={existing?.url ?? null}
                      existingStatus={existing?.status}
                      newFile={newFiles[slot.type]}
                      onNewFile={(f) => setNewFile(slot.type, f)}
                      onPreview={(url, title) => {
                        setPreviewUrl(url);
                        setPreviewTitle(title);
                      }}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </form>
      </Form>

      {/* ── Sticky Submit Bar ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-4 md:relative md:bg-transparent md:border-none md:p-0 md:mt-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none"
      >
        <p className="text-sm text-gray-500 hidden sm:block">
          Periksa kembali semua data sebelum menyimpan.
        </p>
        <div className="flex items-center gap-3 ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[140px] text-white"
            style={{ backgroundColor: isSubmitting ? '#a5b4fc' : '#667eea' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Image Preview Modal ── */}
      <ImagePreviewModal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        imageUrl={previewUrl || ''}
        title={previewTitle}
      />
    </div>
  );
};
