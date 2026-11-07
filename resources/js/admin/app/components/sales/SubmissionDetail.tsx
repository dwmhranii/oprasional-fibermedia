import React, { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
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
  Upload,
  Calendar,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Printer,
  FileCheck,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, ApiError } from '../../lib/api';
import { reportService } from '../../lib/reportService';
import { submissionToFrontend } from '../../lib/mappers';
import { CustomerMap } from '../maps/CustomerMap';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';
import { PrintableSpkModal } from '../common/PrintableSpkModal';
import { PrintableBastModal } from '../common/PrintableBastModal';
import { SubmissionTimelineCard } from '../common/SubmissionTimelineCard';
import { ServiceChainCard } from '../common/ServiceChainCard';
import { useAuth } from '../../context/AuthContext';

import { formatDate } from '../../lib/formatters';
export const SubmissionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdminOrSuperadmin = user?.role === 'admin' || user?.role === 'superadmin';
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSpkModal, setShowSpkModal] = useState(false);
  const [showBastModal, setShowBastModal] = useState(false);

  // Document upload state
  const [selectedDocType, setSelectedDocType] = useState('ktp');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const openPreview = (url: string, title: string) => {
    setPreviewUrl(url);
    setPreviewTitle(title);
  };

  const { data: submission, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['salesSubmissions', 'detail', id],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/submissions/${id}`);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal adalah 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile) {
      toast.error('Silakan pilih file terlebih dahulu');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('document_type', selectedDocType);
    formData.append('file', selectedFile);

    try {
      await apiClient.upload<any>(
        `/submissions/${id}/upload-document`,
        formData,
        (progress) => setUploadProgress(progress)
      );

      toast.success('Dokumen berhasil diunggah!');
      setSelectedFile(null);
      setUploadProgress(null);
      
      // Invalidate details queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['salesSubmissions', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['salesSubmissions', 'list'] });
      refetch();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.getFirstError() || 'Gagal mengunggah dokumen');
      } else {
        toast.error('Terjadi kesalahan koneksi saat mengunggah dokumen');
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" style={{ color: '#667eea' }} />
        <p className="text-gray-500 text-sm">Memuat detail pengajuan...</p>
      </div>
    );
  }

  if (isError || !submission) {
    if (error instanceof ApiError && error.status === 403) {
      return <Navigate to="/403" replace />;
    }
    
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/submissions')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Daftar
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kesalahan Memuat Data</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Nomor pengajuan tidak ditemukan atau Anda tidak memiliki izin.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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

  const canDelete =
    user?.permissions?.includes('submissions.delete') ||
    user?.role === 'superadmin' ||
    user?.roles?.includes('Superadmin') ||
    user?.roles?.includes('superadmin');

  const handleDeleteSubmission = async () => {
    if (!id) return;
    const isConfirmed = window.confirm(`Yakin ingin menghapus pengajuan #${submission?.submissionNumber || id}?`);
    if (!isConfirmed) return;

    try {
      await apiClient.delete(`/submissions/${id}`);
      toast.success('Pengajuan berhasil dihapus!');
      queryClient.invalidateQueries({ queryKey: ['salesSubmissions'] });
      navigate('/submissions');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Akses Ditolak: Hanya Superadmin yang diizinkan menghapus pengajuan.');
      } else {
        toast.error('Terjadi kesalahan saat menghapus pengajuan.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/submissions')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: '#1f2937' }}>
                Detail Pengajuan
              </h1>
              {getStatusBadge(submission.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              No. Pengajuan: <span className="font-mono font-semibold text-gray-700">{submission.submissionNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 text-right">
            <p>Dibuat pada: <span className="font-medium text-gray-700">{formatDate(submission.createdAt)}</span></p>
            <p>Terakhir diperbarui: <span className="font-medium text-gray-700">{formatDate(submission.updatedAt)}</span></p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Delete Button */}
            {canDelete && (
              <Button
                onClick={handleDeleteSubmission}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold text-xs h-9 shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Submission
              </Button>
            )}

            {/* Work Order Button */}
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
            Catatan: Potensi Duplikasi Terdeteksi pada Pengajuan Ini
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-700 mt-1 space-y-1">
            <p>Sistem mendeteksi kemiripan data dengan pelanggan aktif atau pengajuan lain:</p>
            <ul className="list-disc pl-5 space-y-0.5 mt-1 font-medium">
              {submission.duplicateWarnings.map((warning: string, idx: number) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Need Info: Prominent Validation Notes Section ── */}
      {submission.status === 'need_info' && (() => {
        const rawNotes = submission.notes || '';

        // Parse notes into bullet items:
        // Split on newline, "•", "-", or numbered list patterns
        const lines = rawNotes
          .split(/\n|(?<=\s)•|(?<=\s)-(?=\s)/)
          .map((l: string) => l.replace(/^[•\-\d.]+\s*/, '').trim())
          .filter((l: string) => l.length > 0);

        return (
          <div
            className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 space-y-4"
            style={{ boxShadow: '0 2px 12px rgba(245,158,11,0.12)' }}
          >
            {/* Section header */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-amber-800">
                  ⚠️ Informasi Perbaikan Diperlukan
                </h2>
                <p className="text-sm text-amber-700 mt-0.5">
                  Validator meminta perbaikan sebelum pengajuan dapat diproses lebih lanjut.
                </p>
              </div>
            </div>

            {/* Notes content */}
            <div className="ml-12 space-y-2">
              {lines.length > 0 ? (
                <ul className="space-y-1.5">
                  {lines.map((line: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                      <span
                        className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-500"
                        aria-hidden="true"
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-amber-700 italic">
                  Tidak ada catatan spesifik yang diberikan oleh validator.
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="ml-12 pt-1">
              <Button
                onClick={() => navigate(`/submissions/${id}/edit`)}
                className="bg-amber-500 hover:bg-amber-600 text-white font-medium h-9 px-5"
              >
                Perbaiki &amp; Edit Pengajuan
              </Button>
            </div>
          </div>
        );
      })()}

      {submission.status === 'rejected' && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800">Pengajuan Ditolak</AlertTitle>
          <AlertDescription className="text-red-700 mt-1">
            <strong>Alasan Penolakan:</strong> {submission.notes || 'Tidak ada alasan spesifik yang diberikan.'}
          </AlertDescription>
          <div className="mt-3">
            <Button
              onClick={() => navigate(`/submissions/${id}/edit`)}
              className="bg-red-600 hover:bg-red-700 text-white font-medium h-9 px-5"
            >
              Perbaiki &amp; Edit Pengajuan
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns - Details */}
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
                  <p className="text-sm text-gray-500">Nomor Telepon / WA</p>
                  <p className="font-medium text-gray-800">
                    {submission.customer.phone} {submission.customer.whatsapp && <Badge className="ml-1 bg-green-100 text-green-800 border-green-200">WA Aktif</Badge>}
                  </p>
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
                Alamat Instalasi
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
                  <p className="text-sm text-gray-500">Harga Bulanan</p>
                  <p className="text-2xl font-bold" style={{ color: '#667eea' }}>
                    Rp {submission.package.price.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
              <div className="border-t mt-4 pt-4 flex justify-between text-sm text-gray-600">
                <span>Biaya Instalasi Fisik</span>
                <span className="font-semibold text-gray-800">Rp {submission.package.installationFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-t mt-2 pt-2 text-base font-bold text-gray-800">
                <span>Total Pembayaran Awal</span>
                <span style={{ color: '#667eea' }}>Rp {submission.totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Columns - Documents & Timeline */}
        <div className="space-y-6">
          {/* Document Upload panel */}
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-gray-400" />
                Unggah Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* File lists */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Berkas Tersimpan</h4>
                
                <div className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                  <span className="font-medium">Foto KTP</span>
                  {submission.documents.ktp ? (
                    <button type="button" onClick={() => openPreview((submission.documents.ktp as any)?.url as string, 'Foto KTP')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Belum Diunggah</span>
                  )}
                </div>

                {submission.documents.selfie && (
                  <div className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                    <span className="font-medium">Foto Selfie</span>
                    <button type="button" onClick={() => openPreview((submission.documents.selfie as any)?.url as string, 'Foto Selfie')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  </div>
                )}

                <div className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                  <span className="font-medium">Foto Rumah</span>
                  {submission.documents.rumah ? (
                    <button type="button" onClick={() => openPreview((submission.documents.rumah as any)?.url as string, 'Foto Rumah')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  ) : submission.documents.housePhotos?.front ? (
                    <button type="button" onClick={() => openPreview((submission.documents.housePhotos.front as any)?.url as string, 'Foto Rumah Depan')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Belum Diunggah</span>
                  )}
                </div>

                {/* Legacy Inside Photo */}
                {submission.documents.housePhotos?.inside && (
                  <div className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                    <span className="font-medium">Foto Rumah (Dalam) - Legacy</span>
                    <button type="button" onClick={() => openPreview((submission.documents.housePhotos.inside as any)?.url as string, 'Foto Rumah Dalam')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  </div>
                )}

                {/* KK Photo */}
                <div className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                  <span className="font-medium">Kartu Keluarga (KK)</span>
                  {submission.documents.kk ? (
                    <button type="button" onClick={() => openPreview((submission.documents.kk as any)?.url as string, 'Kartu Keluarga (KK)')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">Belum Diunggah</span>
                  )}
                </div>

                {/* Lainnya Photo */}
                <div className="flex items-center justify-between p-2 border rounded text-sm bg-gray-50">
                  <span className="font-medium">Lainnya</span>
                  {submission.documents.lainnya ? (
                    <button type="button" onClick={() => openPreview((submission.documents.lainnya as any)?.url as string, 'Dokumen Lainnya')} className="text-xs text-primary font-medium hover:underline" style={{ color: '#667eea' }}>Lihat File</button>
                  ) : (
                    <span className="text-xs text-gray-400">Opsional</span>
                  )}
                </div>
              </div>

              {/* Upload Form */}
              {(submission.status === 'pending' || submission.status === 'need_info' || submission.status === 'draft') && (
                <form onSubmit={handleUpload} className="space-y-4 border-t pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unggah File Baru</h4>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Tipe Dokumen</label>
                    <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ktp">KTP</SelectItem>
                        <SelectItem value="selfie">Foto Selfie</SelectItem>
                        <SelectItem value="kk">Kartu Keluarga (KK)</SelectItem>
                        <SelectItem value="rumah">Foto Rumah</SelectItem>
                        <SelectItem value="lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 block">Pilih Berkas</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="text-xs border w-full p-2 rounded bg-white cursor-pointer"
                      disabled={isUploading}
                    />
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Mengunggah...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full text-white text-xs h-9"
                    style={{ backgroundColor: '#667eea' }}
                    disabled={!selectedFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Mulai Unggah
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Timeline workflow log */}
          <SubmissionTimelineCard timeline={submission.timeline} />
        </div>
      </div>
      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        imageUrl={previewUrl || ''}
        title={previewTitle}
      />

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
