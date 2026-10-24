import React, { useState, useEffect, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Skeleton } from '../../ui/skeleton';
import {
  CheckCircle,
  RefreshCw,
  Loader2,
  Sparkles,
  Search,
  SlidersHorizontal,
  Tv,
  Wifi,
  Building2,
  Edit3,
  AlertTriangle,
  Tag,
  CheckCircle2,
  X,
  Percent,
} from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '../../ui/form';
import {
  packageService,
  extractPackages,
  extractSyncedAt,
  defaultNormalizedPackages,
} from '../../../lib/packageService';
import { promoService, PromoCode } from '../../../lib/promoService';
import { Package } from '../../../types/packages';
import { toast } from 'sonner';

export const fallbackPackages: Package[] = [
  {
    code: 'mini-deluxe-30',
    name: 'Mini Deluxe 30 Mbps',
    speed_mbps: 30,
    price: 125000,
    category: 'residential',
    description: 'Internet Unlimited 30 Mbps untuk streaming & browsing keluarga',
    is_popular: false,
  },
  {
    code: 'big-diamond-50',
    name: 'Big Diamond 50 Mbps',
    speed_mbps: 50,
    price: 155000,
    category: 'residential',
    description: 'Kecepatan 50 Mbps kencang untuk streaming HD tanpa buffering',
    is_popular: true,
  },
  {
    code: 'pro-fiber-100',
    name: 'Pro Fiber 100 Mbps',
    speed_mbps: 100,
    price: 450000,
    category: 'residential',
    description: 'Performa tinggi 100 Mbps untuk WFH, gaming, & multi-user',
    is_popular: false,
  },
];

interface PackageStepProps {
  form: UseFormReturn<any>;
  disabled?: boolean;
}

export const PackageStep: React.FC<PackageStepProps> = ({ form, disabled = false }) => {
  const [packagesList, setPackagesList] = useState<Package[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFallback, setIsFallback] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Promo Code State
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    discountText: string;
    name?: string;
  } | null>(null);
  const [activePromosList, setActivePromosList] = useState<PromoCode[]>([]);

  useEffect(() => {
    promoService.getPromos('active').then((res) => {
      setActivePromosList(res.data || []);
    });
  }, []);

  const fetchPackagesData = async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');
    try {
      const res = await packageService.getPackages();
      let extracted = extractPackages(res);
      let timestamp = extractSyncedAt(res);

      if (extracted.length > 0) {
        setPackagesList(extracted);
        setSyncedAt(timestamp);
        setIsFallback(false);
      } else {
        setPackagesList(defaultNormalizedPackages);
        setIsFallback(false);
      }
    } catch (err: any) {
      console.error('Failed to fetch packages:', err);
      setIsError(true);
      setErrorMessage(err?.message || 'Gagal memuat katalog paket dari server.');
      setPackagesList(defaultNormalizedPackages);
      setIsFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagesData();
  }, []);

  const selectedPackageCode = form.watch('selectedPackage');

  // Filter packages based on category & search query
  const filteredPackages = useMemo(() => {
    return packagesList.filter((pkg) => {
      const categoryStr = (pkg.category || '').toLowerCase();
      const matchesCategory =
        selectedCategory === 'all' ||
        (selectedCategory === 'residential' && (categoryStr.includes('residential') || categoryStr.includes('internet'))) ||
        (selectedCategory === 'combo' && categoryStr.includes('combo')) ||
        (selectedCategory === 'enterprise' && (categoryStr.includes('enterprise') || categoryStr.includes('business')));

      const matchesSearch =
        pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${pkg.speed_mbps}mbps`.includes(searchQuery.toLowerCase().replace(/\s+/g, '')) ||
        (pkg.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [packagesList, selectedCategory, searchQuery]);

  const selectedPkg = packagesList.find(
    (p) => p.code === selectedPackageCode || p.name === selectedPackageCode
  );

  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || form.getValues('promoCode') || '').trim();
    if (!code) {
      toast.error('Masukkan kode promo terlebih dahulu');
      return;
    }

    setIsValidatingPromo(true);
    setPromoError(null);

    const pkgPrice = selectedPkg ? selectedPkg.price : 0;
    const res = await promoService.validatePromo(code, pkgPrice, 50000);

    setIsValidatingPromo(false);

    if (res.is_valid && res.discount_amount !== undefined) {
      const promoInfo = {
        code: code.toUpperCase(),
        discountAmount: res.discount_amount,
        discountText: res.discount_text || `Potongan Rp ${res.discount_amount.toLocaleString('id-ID')}`,
        name: res.promo?.name,
      };
      setAppliedPromo(promoInfo);
      form.setValue('promoCode', code.toUpperCase());
      form.setValue('discountAmount', res.discount_amount);
      toast.success(res.message);
    } else {
      setAppliedPromo(null);
      setPromoError(res.message);
      form.setValue('discountAmount', 0);
      toast.error(res.message);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
    form.setValue('promoCode', '');
    form.setValue('discountAmount', 0);
    toast.info('Kode promo dilepas');
  };

  const formatSyncedDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center">
            Pilih Paket Layanan
            <Sparkles className="w-5 h-5 text-amber-500 ml-2" />
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Tersedia pilihan paket internet resmi hasil sinkronisasi database.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {syncedAt && !isFallback && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              <RefreshCw className="w-3 h-3 mr-1 text-blue-500" />
              Sync: {formatSyncedDate(syncedAt)}
            </Badge>
          )}
          {isFallback && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 font-medium">
              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
              Data offline (Mode Fallback)
            </Badge>
          )}
        </div>
      </div>

      {/* Fallback Warning Notice */}
      {isFallback && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start justify-between text-xs text-amber-900">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Menampilkan paket standar darurat</p>
              <p className="text-amber-700 mt-0.5">
                Katalog paket terkini gagal dimuat dari server. Menampilkan paket dasar statis agar pengajuan tetap dapat diproses.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchPackagesData}
            className="text-xs border-amber-300 bg-white hover:bg-amber-100 text-amber-900 shrink-0 ml-3 h-8"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Filter Toolbar & Search */}
      <div className="bg-gray-50 p-3 md:p-4 rounded-xl border border-gray-200 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              Semua Paket ({packagesList.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('residential')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center transition-all ${
                selectedCategory === 'residential'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 mr-1" />
              Internet Rumah
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('combo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center transition-all ${
                selectedCategory === 'combo'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5 mr-1" />
              Combo TV
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('enterprise')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center transition-all ${
                selectedCategory === 'enterprise'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 mr-1" />
              Bisnis / Enterprise
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari paket atau kecepatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-white border-gray-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Custom Mode Toggle Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const newMode = !isCustomMode;
            setIsCustomMode(newMode);
            if (newMode) {
              form.setValue('selectedPackage', 'custom');
            }
          }}
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
          {isCustomMode ? '← Kembali ke Katalog Resmi' : 'Input Paket Custom / Negosiasi Khusus'}
        </Button>
      </div>

      {/* Custom Package Form Section */}
      {isCustomMode ? (
        <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 text-amber-900">
            <Edit3 className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-base">Input Paket Kustom / Negosiasi Khusus</h3>
          </div>
          <p className="text-xs text-amber-800">
            Gunakan opsi ini jika pelanggan menyetujui paket kustom, penawaran corporate, atau promo khusus yang tidak terdaftar di katalog resmi.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <FormLabel className="text-xs font-semibold text-gray-700">Nama Paket Custom</FormLabel>
              <Input
                placeholder="Contoh: Corporate Dedicated 50M"
                className="bg-white text-xs"
                onChange={(e) => {
                  form.setValue('selectedPackageName', e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <FormLabel className="text-xs font-semibold text-gray-700">Kecepatan (Mbps)</FormLabel>
              <Input
                placeholder="Contoh: 50Mbps"
                className="bg-white text-xs"
                onChange={(e) => {
                  form.setValue('packageSpeed', e.target.value);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <FormLabel className="text-xs font-semibold text-gray-700">Harga Bulanan (Rp)</FormLabel>
              <Input
                type="number"
                placeholder="Contoh: 350000"
                className="bg-white text-xs"
                onChange={(e) => {
                  form.setValue('packagePrice', Number(e.target.value));
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Standard Dynamic Package Cards Selection */
        <FormField
          control={form.control}
          name="selectedPackage"
          render={({ field }) => (
            <FormItem>
              {isLoading ? (
                /* Skeleton Loading State */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-5 space-y-3 bg-white">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-10 w-full" />
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                        <Skeleton className="h-6 w-28" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError && filteredPackages.length === 0 ? (
                /* Error State with Retry Button */
                <div className="p-8 text-center bg-red-50/60 rounded-xl border border-red-200 space-y-3">
                  <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
                  <p className="text-base font-bold text-red-900">Gagal Memuat Paket</p>
                  <p className="text-xs text-red-700 max-w-md mx-auto">
                    {errorMessage || 'Terjadi kesalahan saat mengambil katalog paket internet dari server.'}
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={fetchPackagesData}
                      className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Coba Lagi
                    </Button>
                  </div>
                </div>
              ) : filteredPackages.length === 0 ? (
                /* Empty Search/Filter Result */
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
                  <SlidersHorizontal className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Tidak ada paket yang sesuai</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Coba ubah kata kunci pencarian atau kategori filter Anda.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="mt-3 text-xs"
                  >
                    Reset Filter
                  </Button>
                </div>
              ) : (
                /* Package Cards List */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {filteredPackages.map((pkg) => {
                    const isSelected = field.value === pkg.code || field.value === pkg.name;
                    return (
                      <div
                        key={pkg.code}
                        onClick={() => {
                          if (!disabled) {
                            field.onChange(pkg.code);
                            form.setValue('selectedPackageName', pkg.name);
                            form.setValue('packageSpeed', `${pkg.speed_mbps}Mbps`);
                            form.setValue('packagePrice', pkg.price);
                          }
                        }}
                        className={`relative border-2 rounded-xl p-4 md:p-5 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-md scale-[1.02]'
                            : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-sm'
                        } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {pkg.is_popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="text-white bg-amber-500 hover:bg-amber-600 shadow-sm border-0 font-bold text-[10px]">
                              🏆 BEST SELLER
                            </Badge>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-3.5 right-3.5">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          </div>
                        )}
                        <div className="text-center space-y-2.5 pt-1">
                          <div className="flex items-center justify-center space-x-1.5">
                            <h3 className="text-base font-bold text-gray-900">{pkg.name}</h3>
                          </div>
                          <div className="text-2xl font-black text-blue-600">
                            {pkg.speed_mbps} Mbps
                          </div>
                          <p className="text-xs text-gray-500 min-h-[36px] line-clamp-2 leading-relaxed">
                            {pkg.description || `Layanan koneksi internet fiber optik ${pkg.speed_mbps} Mbps`}
                          </p>
                          <div className="pt-2 border-t border-gray-100">
                            <div className="text-xl font-extrabold text-gray-900">
                              Rp {pkg.price.toLocaleString('id-ID')}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">per bulan</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Promo Code Input */}
      <FormField
        control={form.control}
        name="promoCode"
        render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel className="text-xs font-semibold text-gray-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Punya Kode Promo / Diskon?
              </span>
              {appliedPromo && (
                <span className="text-[11px] font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Promo Terpasang
                </span>
              )}
            </FormLabel>
            
            <div className="flex space-x-2 max-w-md">
              <FormControl>
                <Input
                  placeholder="Masukkan kode promo (misal: HEMAT50K)"
                  className="flex-1 text-xs h-9 uppercase font-semibold tracking-wider"
                  disabled={disabled || !!appliedPromo}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e.target.value.toUpperCase());
                    if (promoError) setPromoError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyPromo();
                    }
                  }}
                />
              </FormControl>
              {appliedPromo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePromo}
                  disabled={disabled}
                  className="text-xs h-9 text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Hapus
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleApplyPromo()}
                  disabled={disabled || isValidatingPromo}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-semibold px-4"
                >
                  {isValidatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : 'Gunakan'}
                </Button>
              )}
            </div>

            {/* Active Promos Quick Recommendation Chips */}
            {!appliedPromo && activePromosList.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-gray-500 font-medium">Rekomendasi promo:</span>
                {activePromosList.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      form.setValue('promoCode', p.code);
                      handleApplyPromo(p.code);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-semibold transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    {p.code} ({p.type === 'fixed' ? `Rp ${p.value / 1000}k` : p.type === 'percentage' ? `${p.value}%` : 'Gratis Instalasi'})
                  </button>
                ))}
              </div>
            )}

            {/* Applied Promo Banner */}
            {appliedPromo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs flex items-center justify-between mt-2 max-w-md animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-green-900">
                      Kode '{appliedPromo.code}' Berhasil Terpasang!
                    </p>
                    <p className="text-[11px] text-green-700 mt-0.5">
                      {appliedPromo.discountText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Promo Error Banner */}
            {promoError && (
              <p className="text-xs text-red-600 font-medium pt-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                {promoError}
              </p>
            )}

            <FormMessage />
          </FormItem>
        )}
      />

      {/* Price Summary Card */}
      {selectedPkg && !isCustomMode && (
        <div className="border border-blue-100 bg-blue-50/50 p-4 md:p-5 rounded-xl space-y-2.5 shadow-sm">
          <h4 className="font-bold text-gray-900 text-sm flex items-center">
            <Sparkles className="w-4 h-4 text-blue-600 mr-2" />
            Rincian Tagihan Pertama Pelanggan
          </h4>
          <div className="flex justify-between text-xs md:text-sm">
            <span className="text-gray-600">
              Paket {selectedPkg.name} ({selectedPkg.speed_mbps} Mbps)
            </span>
            <span className="font-semibold text-gray-900">
              Rp {selectedPkg.price.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex justify-between text-xs md:text-sm">
            <span className="text-gray-600">Biaya Instalasi & Setting Modem</span>
            <span className={appliedPromo?.discountText.includes('Gratis Biaya Instalasi') ? 'line-through text-gray-400 font-semibold' : 'font-semibold text-gray-900'}>
              Rp 50.000
            </span>
          </div>

          {appliedPromo && (
            <div className="flex justify-between text-xs md:text-sm text-green-700 font-semibold bg-green-100/60 p-2 rounded-lg border border-green-200/60">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-green-600" />
                Diskon Kode Promo ({appliedPromo.code})
              </span>
              <span>
                -Rp {appliedPromo.discountAmount.toLocaleString('id-ID')}
              </span>
            </div>
          )}

          <div className="border-t border-blue-200/80 pt-2.5 flex justify-between items-center">
            <span className="font-bold text-gray-900 text-sm md:text-base">
              Total Pembayaran Pertama
            </span>
            <span className="text-xl md:text-2xl font-black text-blue-700">
              Rp {Math.max(0, selectedPkg.price + 50000 - (appliedPromo?.discountAmount || 0)).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export { fallbackPackages as packages };
