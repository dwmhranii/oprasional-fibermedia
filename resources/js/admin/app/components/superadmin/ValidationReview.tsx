import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { DocumentReviewCard } from './DocumentReviewCard';
import { CustomerMap } from '../maps/CustomerMap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  ArrowLeft,
  User,
  MapPin,
  Wifi,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  XCircle,
  Loader2,
  Lock,
  AlertCircle,
  RefreshCw,
  Printer,
  FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { reportService } from '../../lib/reportService';
import { submissionToFrontend } from '../../lib/mappers';
import { PrintableSpkModal } from '../common/PrintableSpkModal';
import { PrintableBastModal } from '../common/PrintableBastModal';
import { SubmissionTimelineCard } from '../common/SubmissionTimelineCard';
import { ServiceChainCard } from '../common/ServiceChainCard';

import { formatDate } from '../../lib/formatters';
export const ValidationReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSpkModal, setShowSpkModal] = useState(false);
  const [showBastModal, setShowBastModal] = useState(false);

  // Dialog actions state
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'need_info' | null>(null);
  const [successTeam, setSuccessTeam] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendErrors, setBackendErrors] = useState<Record<string, string[]>>({});

  // Auto-focus first invalid field
  useEffect(() => {
    const errorKeys = Object.keys(backendErrors);
    if (errorKeys.length > 0) {
      const firstError = errorKeys[0];
      // Map error keys to element IDs if they differ
      const idMapping: Record<string, string> = {
        rejection_reason: 'reason',
        validation_notes: 'notes'
      };
      
      const fieldId = idMapping[firstError] || firstError;
      const element = document.getElementById(fieldId);
      if (element) {
        element.focus();
      }
    }
  }, [backendErrors]);

  // Query live admin submission detail
  const { data: submission, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminSubmissions', 'detail', id],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/admin/submissions/${id}`);
      return submissionToFrontend(response);
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      pending: { label: 'Menunggu Validasi', color: '#f59e0b' },
      draft: { label: 'Draft', color: '#6b7280' },
      submitted: { label: 'Terkirim', color: '#3b82f6' },
      pending_validation: { label: 'Menunggu Validasi', color: '#f59e0b' },
      in_review: { label: 'Sedang Ditinjau', color: '#3b82f6' },
      approved: { label: 'Disetujui', color: '#10b981' },
      rejected: { label: 'Ditolak', color: '#ef4444' },
      need_info: { label: 'Butuh Info Tambahan', color: '#f59e0b' },
      provisioning: { label: 'Provisioning', color: '#f59e0b' },
      provisioned: { label: 'Terprovisi', color: '#667eea' },
      completed: { label: 'Selesai', color: '#10b981' },
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280' };

    return (
      <Badge style={{ backgroundColor: `${config.color}20`, color: config.color }}>
        {config.label}
      </Badge>
    );
  };

  const handleActionClick = (type: 'approved' | 'rejected' | 'need_info') => {
    setActionType(type);
    setNotes('');
    setReason('');
    setBackendErrors({});
  };

  const handleConfirmAction = async () => {
    if (!id || !actionType) return;

    // Client-side validations inside confirmation modal
    if (actionType === 'rejected' && !reason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    if (actionType === 'need_info' && !notes.trim()) {
      toast.error('Catatan kebutuhan info tambahan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    setBackendErrors({});

    // Build Laravel request body
    const body: any = { status: actionType };
    if (actionType === 'approved') {
      body.validation_notes = notes.trim() || 'Validasi pengajuan disetujui.';
    } else if (actionType === 'rejected') {
      body.rejection_reason = reason.trim();
      body.validation_notes = notes.trim() || null;
    } else if (actionType === 'need_info') {
      body.validation_notes = notes.trim();
    }

    try {
        const response = await apiClient.put<any>(`/admin/submissions/${id}/validate`, body);
        
        setActionType(null);
        
        // Invalidate caches to refresh data lists
        queryClient.invalidateQueries({ queryKey: ['adminSubmissions'] });
        queryClient.invalidateQueries({ queryKey: ['salesSubmissions'] });
        queryClient.invalidateQueries({ queryKey: ['submission', id] });
        if (actionType === 'approved') {
          queryClient.invalidateQueries({ queryKey: ['adminProvisionings'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          
          if (response.data && response.data.assigned_team) {
            setSuccessTeam(response.data.assigned_team);
          } else {
            toast.success('Pengajuan berhasil disetujui. Otomatis dialihkan ke Manajemen Provisioning.');
            navigate('/admin/provisionings?tab=provisioning');
          }
        } else {
          toast.success(`Pengajuan berhasil diperbarui ke status: ${actionType.toUpperCase()}`);
          refetch();
        }
      } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal memproses validasi pengajuan');
        if (err.errors) {
          setBackendErrors(err.errors);
        }
      } else {
        toast.error('Terjadi kesalahan koneksi saat memproses data.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" style={{ color: '#667eea' }} />
        <p className="text-gray-500 text-sm">Memuat detail validasi...</p>
      </div>
    );
  }

  if (isError || !submission) {
    if (error instanceof ApiError && error.status === 403) {
      return <Navigate to="/403" replace />;
    }
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/submissions')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Antrian
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Detail</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Nomor pengajuan tidak ditemukan atau Anda tidak memiliki izin validasi.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if active actions are allowed (only pending or need_info status can be validated)
  const isValidationAllowed = submission.status === 'pending' || submission.status === 'pending_validation' || submission.status === 'need_info';

  const handleExportPdf = async () => {
    if (!id) return;
    try {
      setIsExportingPdf(true);
      toast.info('Menyiapkan Dokumen PDF...', { description: 'Mengunduh Work Order & detail pengajuan...' });
      await reportService.exportSubmissionPdf(id);
      toast.success('Unduh PDF Berhasil', { description: `File SPK_Detail_Pengajuan_${id}.pdf telah disimpan.` });
    } catch (err: any) {
      toast.error('Unduh PDF Gagal', { description: err?.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/submissions')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Validasi Pengajuan
              </h1>
              {getStatusBadge(submission.status)}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              No. Pengajuan: <span className="font-mono font-semibold text-gray-700 dark:text-slate-300">{submission.submissionNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500 text-right">
            <p>Diajukan pada: <span className="font-medium text-gray-700">{formatDate(submission.createdAt)}</span></p>
            <p>Pembaruan terakhir: <span className="font-medium text-gray-700">{formatDate(submission.updatedAt)}</span></p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setShowSpkModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 shadow-sm flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              Cetak Work Order (.pdf)
            </Button>

            {/* BAST Button - ONLY appears if technician validated customer signature */}
            {(() => {
              const hasCustomerSignature = !!(
                submission.customer_signature_url ||
                submission.evidence?.signature_url ||
                submission.evidence?.signature_path ||
                submission.current_assignment?.evidence?.signature_url ||
                submission.current_assignment?.evidence?.signature_path ||
                submission.signature_url
              );
              const isBastAvailable = hasCustomerSignature || submission.status === 'completed' || submission.status === 'provisioned';

              if (!isBastAvailable) return null;

              return (
                <Button
                  onClick={() => setShowBastModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  Cetak BAST (Serah Terima)
                </Button>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Service Traceability Chain Card */}
      <ServiceChainCard submission={submission} />

      {/* Duplicate Warnings Alert */}
      {submission.duplicateWarnings && submission.duplicateWarnings.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50/90 text-amber-900 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <AlertTitle className="text-sm font-bold text-amber-800">
            Perhatian: Potensi Duplikasi Terdeteksi pada Pengajuan Ini
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-700 mt-1 space-y-1">
            <p>Sistem mendeteksi kemiripan data (NIK, nomor telepon, atau jarak lokasi pemasangan). Periksa kembali sebelum menyetujui:</p>
            <ul className="list-disc pl-5 space-y-0.5 mt-1 font-medium">
              {submission.duplicateWarnings.map((warning: string, idx: number) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Submission Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-gray-400" />
                Data Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nama Lengkap</p>
                  <p className="font-medium text-gray-800">{submission.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nomor KTP (NIK)</p>
                  <p className="font-mono font-medium text-gray-800">{submission.customer.ktp}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nomor Telepon</p>
                  <p className="font-medium text-gray-800">{submission.customer.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Alamat Email</p>
                  <p className="font-medium text-gray-800">{submission.customer.email || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                Alamat Pemasangan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Alamat Lengkap</p>
                <p className="font-medium text-gray-800">{submission.address.installAddress}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Kelurahan</p>
                  <p className="font-medium text-gray-800">{submission.address.subDistrict || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kecamatan</p>
                  <p className="font-medium text-gray-800">{submission.address.district || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kota / Kabupaten</p>
                  <p className="font-medium text-gray-800">{submission.address.city || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Provinsi</p>
                  <p className="font-medium text-gray-800">{submission.address.province || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kode Pos</p>
                  <p className="font-medium text-gray-800">{submission.address.postalCode || '-'}</p>
                </div>
              </div>

              {/* Map Integration */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Lokasi Pemasangan</h4>
                <CustomerMap 
                  lat={submission.address.coordinates?.lat} 
                  lng={submission.address.coordinates?.lng}
                  customerName={submission.customer.name}
                  address={submission.address.installAddress}
                />
              </div>

              {submission.address.completionLocation?.available && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Lokasi Penyelesaian / Completion Location</h4>
                  <div className="space-y-4">
                    <p className="text-gray-800 text-sm">
                      Waktu Pengambilan: {submission.address.completionLocation.captured_at ? formatDate(submission.address.completionLocation.captured_at) : '-'}
                      <br />
                      Akurasi GPS: {submission.address.completionLocation.accuracy ? `${submission.address.completionLocation.accuracy} meter` : '-'}
                    </p>
                    <CustomerMap 
                      lat={submission.address.completionLocation.latitude} 
                      lng={submission.address.completionLocation.longitude}
                      customerName="Teknisi"
                      address="Lokasi Penyelesaian Tugas"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Package details */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wifi className="w-5 h-5 text-gray-400" />
                Paket Layanan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{submission.package.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Kecepatan: {submission.package.speed}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Biaya Paket Bulanan</p>
                  <p className="text-2xl font-bold" style={{ color: '#667eea' }}>
                    Rp {submission.package.price.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              <div className="border-t mt-4 pt-4 flex justify-between text-sm text-gray-600">
                <span>Biaya Penarikan Kabel & Instalasi</span>
                <span className="font-semibold text-gray-800">Rp {submission.package.installationFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-t mt-2 pt-2 text-base font-bold text-gray-800">
                <span>Total Pembayaran Awal</span>
                <span style={{ color: '#667eea' }}>Rp {submission.totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Documents display */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Dokumen Pendukung
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DocumentReviewCard 
                  document={submission.documents.ktp} 
                  title="Foto KTP" 
                  description="Identitas resmi calon pelanggan" 
                  submissionId={submission.id}
                  disabled={isSubmitting}
                />

                <DocumentReviewCard 
                  document={submission.documents.kk} 
                  title="Kartu Keluarga (KK)" 
                  description="Dokumen Kartu Keluarga" 
                  submissionId={submission.id}
                  disabled={isSubmitting}
                />

                <DocumentReviewCard 
                  document={submission.documents.rumah || submission.documents.housePhotos?.front} 
                  title="Foto Rumah" 
                  description="Foto rumah lokasi pemasangan" 
                  submissionId={submission.id}
                  disabled={isSubmitting}
                />

                <DocumentReviewCard 
                  document={submission.documents.lainnya} 
                  title="Dokumen Lainnya" 
                  description="Dokumen pendukung lainnya (opsional)" 
                  submissionId={submission.id}
                  disabled={isSubmitting}
                />

                {/* Legacy fields */}
                {submission.documents.housePhotos?.side && (
                  <DocumentReviewCard 
                    document={submission.documents.housePhotos.side} 
                    title="Foto Rumah Samping (Legacy)" 
                    description="Foto area samping rumah (opsional)" 
                    submissionId={submission.id}
                    disabled={isSubmitting}
                  />
                )}

                {submission.documents.housePhotos?.inside && (
                  <DocumentReviewCard 
                    document={submission.documents.housePhotos.inside} 
                    title="Foto Dalam Rumah (Legacy)" 
                    description="Foto ruangan peletakan modem (opsional)" 
                    submissionId={submission.id}
                    disabled={isSubmitting}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions & Logs */}
        <div className="space-y-6">
          {/* Validation Actions Panel */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                Tindakan Validasi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isValidationAllowed ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Silakan tinjau seluruh berkas dan alamat pengajuan di sebelah kiri sebelum memberikan keputusan validasi.
                  </p>
                  
                  <Button
                    onClick={() => handleActionClick('approved')}
                    className="w-full text-white"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Setujui Pengajuan
                  </Button>

                  <Button
                    onClick={() => handleActionClick('need_info')}
                    className="w-full text-white"
                    style={{ backgroundColor: '#f59e0b' }}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Minta Info Tambahan
                  </Button>

                  <Button
                    onClick={() => handleActionClick('rejected')}
                    className="w-full text-white"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Tolak Pengajuan
                  </Button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded text-center space-y-2 text-gray-500">
                  <Lock className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="font-semibold text-sm">Validasi Terkunci</p>
                  <p className="text-xs">
                    Pengajuan ini sudah berstatus {submission.status.toUpperCase()} dan tidak membutuhkan tindakan validasi.
                  </p>
                </div>
              )}

              {/* Status Specific Validation Info Display */}
              {submission.status === 'need_info' && submission.notes && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-900 mt-4">
                  <p className="font-bold">Catatan Kebutuhan Informasi:</p>
                  <p className="mt-1 text-blue-700">{submission.notes}</p>
                </div>
              )}

              {submission.status === 'rejected' && submission.notes && (
                <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-red-900 mt-4">
                  <p className="font-bold">Alasan Penolakan:</p>
                  <p className="mt-1 text-red-700">{submission.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow logs Timeline */}
          <SubmissionTimelineCard timeline={submission.timeline} />
        </div>
      </div>

      {/* Confirmation Actions Dialog Modal */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' && 'Setujui Pengajuan Layanan'}
              {actionType === 'need_info' && 'Minta Informasi Tambahan'}
              {actionType === 'rejected' && 'Tolak Pengajuan Layanan'}
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin memproses pengajuan ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {actionType === 'rejected' && (
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-red-700">Alasan Penolakan (Wajib)</Label>
                <Input
                  id="reason"
                  placeholder="Contoh: Dokumen KTP buram / tidak terbaca..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isSubmitting}
                />
                {backendErrors.rejection_reason && (
                  <p className="text-xs text-red-500">{backendErrors.rejection_reason[0]}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">
                {actionType === 'need_info' ? 'Keterangan Tambahan (Wajib)' : 'Catatan Validasi (Opsional)'}
              </Label>
              <Textarea
                id="notes"
                placeholder={actionType === 'need_info' ? 'Contoh: Mohon unggah ulang foto rumah tampak depan...' : 'Tambahkan catatan peninjauan jika ada...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
              {backendErrors.validation_notes && (
                <p className="text-xs text-red-500">{backendErrors.validation_notes[0]}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionType(null)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmAction}
              className="text-white"
              style={{
                backgroundColor:
                  actionType === 'approved' ? '#10b981' :
                  actionType === 'need_info' ? '#f59e0b' : '#ef4444'
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Konfirmasi'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!successTeam}>
        <DialogContent 
          className="max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2">
              <CheckCircle className="w-6 h-6" />
              Round Robin Assignment
            </DialogTitle>
            <DialogDescription>
              Pengajuan berhasil disetujui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-700 font-medium">Task otomatis diberikan kepada:</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <h4 className="font-bold text-emerald-800 text-lg flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                {successTeam?.team_name || successTeam?.name || 'Tim Teknisi'}
              </h4>
              {(successTeam?.members && successTeam.members.length > 0) && (
                <div className="mt-4 pt-3 border-t border-emerald-200/60">
                  <p className="text-sm font-semibold text-emerald-700 mb-2">Anggota Tim</p>
                  <ul className="text-sm text-emerald-600 space-y-1">
                    {successTeam.members.map((m: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                        {m.name || m.username || m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setSuccessTeam(null);
                navigate('/admin/provisionings?tab=provisioning');
              }} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full font-semibold"
            >
              Lanjutkan ke Tahap Provisioning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Work Order Modal with Official Logo */}
      <PrintableSpkModal
        isOpen={showSpkModal}
        onClose={() => setShowSpkModal(false)}
        submission={submission}
      />

      {/* Printable BAST Modal (Technician Results & Customer Signature) */}
      <PrintableBastModal
        isOpen={showBastModal}
        onClose={() => setShowBastModal(false)}
        submission={submission}
      />
    </div>
  );
};
