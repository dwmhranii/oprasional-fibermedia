import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { PageHeader } from '@shared/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  Server,
  Layers,
  Network,
  Cable,
  Users,
  AlertOctagon,
  X,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface KmzSummary {
  olts: { created: number; updated: number; skipped: number; disrupted?: number };
  odcs: { created: number; updated: number; skipped: number; disrupted?: number };
  odps: { created: number; updated: number; skipped: number; disrupted?: number };
  cables: { created: number; updated: number; skipped: number; cut?: number };
  clients: { online: number; offline: number; matched: number; skipped: number; out_of_bounds: number };
  total_created: number;
  total_updated: number;
  total_skipped: number;
  total_rejected: number;
}

interface ImportResult {
  success: boolean;
  dry_run: boolean;
  summary: KmzSummary;
  invalid_coordinates_count: number;
  invalid_coordinates: Array<{
    name: string;
    latitude: number;
    longitude: number;
    reason: string;
  }>;
  report_csv_filename?: string;
}

export const KmzImportExportManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Pilih berkas KMZ terlebih dahulu.');
      }

      setErrorMsg(null);
      setImportResult(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      if (isDryRun) {
        formData.append('dry_run', '1');
      }

      return apiClient.upload<any>('/network/import/kmz', formData, (progress) => {
        setUploadProgress(progress);
      });
    },
    onSuccess: (data) => {
      const res = data?.data || data;
      setImportResult(res);
      toast.success(
        isDryRun
          ? 'Simulasi impor KMZ selesai (tidak ada data diubah)'
          : 'Impor KMZ jaringan berhasil disinkronkan ke database'
      );
      queryClient.invalidateQueries({ queryKey: ['networkMap'] });
      queryClient.invalidateQueries({ queryKey: ['networkOlts'] });
      queryClient.invalidateQueries({ queryKey: ['odcs'] });
      queryClient.invalidateQueries({ queryKey: ['odps'] });
      queryClient.invalidateQueries({ queryKey: ['networkCables'] });
    },
    onError: (err: any) => {
      const msg = err?.message || 'Gagal memproses berkas KMZ. Periksa format berkas Anda.';
      setErrorMsg(msg);
      toast.error(msg);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['kmz', 'kml', 'zip'].includes(ext || '')) {
        toast.error('Format berkas tidak didukung. Harap unggah berkas .kmz atau .kml');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setImportResult(null);
    }
  };

  const handleExportKmz = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('fm-admin:auth_token');
      const response = await fetch('/api/network/export/kmz', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh berkas KMZ dari server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fibermedia_Network_Export_${new Date().toISOString().slice(0, 10)}.kmz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Berkas KMZ jaringan berhasil diunduh');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengekspor data KMZ');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCsv = (filename: string) => {
    const token = localStorage.getItem('fm-admin:auth_token');
    window.open(`/api/network/reports/download?filename=${encodeURIComponent(filename)}&token=${token || ''}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impor & Ekspor KMZ Jaringan"
        subtitle="Sinkronisasi simpul pasif/aktif FTTH (OLT, ODC, ODP, Kabel) dan verifikasi spasial pelanggan dari berkas Google Earth (.kmz)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Form Upload KMZ */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <span>Impor Berkas KMZ / KML</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Membaca folder Server/OLT, ODC, ODP, Jalur Kabel, dan titik Pelanggan dengan deteksi batas wilayah
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-5">
              {/* Dropzone File */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  selectedFile
                    ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                    : 'border-border hover:border-primary/40 bg-card hover:bg-muted/30'
                }`}
              >
                <input
                  type="file"
                  id="kmz-file-input"
                  accept=".kmz,.kml,.zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="kmz-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground hover:underline">
                      Pilih berkas KMZ / KML
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      atau seret berkas ke area ini (.kmz, .kml hingga 50 MB)
                    </span>
                  </div>
                </label>

                {selectedFile && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border shadow-sm text-xs font-medium text-foreground">
                    <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{selectedFile.name}</span>
                    <span className="text-muted-foreground font-mono">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setImportResult(null);
                      }}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Opsi & Aksi */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-border">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
                  />
                  <div>
                    <span className="font-semibold text-foreground block">
                      Simulasi Impor (Dry Run)
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Hanya verifikasi struktur data tanpa mengubah isi database
                    </span>
                  </div>
                </label>

                <Button
                  onClick={() => importMutation.mutate()}
                  disabled={!selectedFile || importMutation.isPending}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{isDryRun ? 'Jalankan Simulasi' : 'Mulai Impor KMZ'}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div>
                    <div className="font-semibold">Galat Pemrosesan KMZ</div>
                    <div className="mt-0.5 text-rose-700 dark:text-rose-400">{errorMsg}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hasil Impor KMZ */}
          {importResult && (
            <Card className="animate-in fade-in duration-200">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <CardTitle className="text-base font-semibold text-foreground">
                        Hasil Pemrosesan {importResult.dry_run ? '(Simulasi)' : '(Tersimpan)'}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Ringkasan sinkronisasi entitas jaringan dari berkas KMZ
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={importResult.dry_run ? 'outline' : 'success'}>
                    {importResult.dry_run ? 'DRY-RUN' : 'SELESAI'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Metrik Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Server className="w-3.5 h-3.5 text-primary" />
                      <span>Server / OLT</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {importResult.summary.olts.created + importResult.summary.olts.updated}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      +{importResult.summary.olts.created} baru, {importResult.summary.olts.updated} update
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>ODC</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {importResult.summary.odcs.created + importResult.summary.odcs.updated}
                    </div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      {importResult.summary.odcs.disrupted ?? 0} Berstatus Gangguan
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Network className="w-3.5 h-3.5 text-primary" />
                      <span>ODP</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {importResult.summary.odps.created + importResult.summary.odps.updated}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      +{importResult.summary.odps.created} baru, {importResult.summary.odps.updated} update
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                      <Cable className="w-3.5 h-3.5 text-primary" />
                      <span>Kabel Jaringan</span>
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {importResult.summary.cables.created + importResult.summary.cables.updated}
                    </div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                      {importResult.summary.cables.cut ?? 0} Berstatus Putus
                    </div>
                  </div>
                </div>

                {/* Pelanggan & Titik Di Luar Area */}
                <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Pencocokan Koordinat Pelanggan</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {importResult.summary.clients.matched} cocok diperbarui,{' '}
                      {importResult.summary.clients.skipped} dilewati (belum terdaftar di database),{' '}
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {importResult.invalid_coordinates_count} di luar batas wajar
                      </span>
                    </div>
                  </div>

                  {importResult.report_csv_filename && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadCsv(importResult.report_csv_filename!)}
                      className="flex items-center gap-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Laporan CSV</span>
                    </Button>
                  )}
                </div>

                {/* Rincian Koordinat Tidak Wajar */}
                {importResult.invalid_coordinates.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-amber-500/10 border-b border-border text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertOctagon className="w-4 h-4" />
                      <span>
                        Daftar {importResult.invalid_coordinates.length} Titik Di Luar Batas Area Wajar (Lon 112–114, Lat -9 s.d. -7)
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-border text-xs">
                      {importResult.invalid_coordinates.map((item, idx) => (
                        <div key={idx} className="px-3.5 py-2 flex items-center justify-between hover:bg-muted/30">
                          <span className="font-medium text-foreground">{item.name}</span>
                          <span className="font-mono text-muted-foreground">
                            Lon: {item.longitude}, Lat: {item.latitude}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Kolom Kanan: Ekspor KMZ & Panduan */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                <span>Ekspor KMZ Jaringan</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Unduh seluruh hierarki simpul dan jalur kabel aktif ke format KMZ standar
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Berkas KMZ hasil ekspor memuat seluruh data simpul OLT, ODC, ODP (beserta kapasitas dan keterisian port),
                serta jalur kabel dengan panjang otomatis yang siap dibuka di Google Earth Pro, QGIS, atau aplikasi GIS lapangan.
              </p>

              <Button
                onClick={handleExportKmz}
                disabled={isExporting}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Mempersiapkan Berkas...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh KMZ Jaringan</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span>Format Standar Folder KMZ</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-xs text-muted-foreground space-y-2">
              <div className="font-mono text-[11px] bg-muted/50 p-3 rounded-lg border border-border space-y-1">
                <div>📁 Server / OLT</div>
                <div className="pl-3">📁 ODC</div>
                <div className="pl-6">📁 ODP</div>
                <div className="pl-3">📁 Kabel / Jalur</div>
                <div className="pl-6">├── Kabel Server/ODC ke ODC</div>
                <div className="pl-6">├── Kabel ODC ke ODP</div>
                <div className="pl-6">└── Kabel ODP ke Client</div>
                <div className="pl-3">📁 Client Online</div>
                <div className="pl-3">📁 Client Offline</div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Koordinat dalam berkas KML menggunakan urutan standar <code className="text-foreground">lon,lat,alt</code>.
                Sistem akan memvalidasi koordinat agar berada dalam batas area layanan.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KmzImportExportManagement;
