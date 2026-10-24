import React, { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { TermsModal } from '../../common/TermsModal';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '../../ui/form';
import { packages } from './PackageStep';
import {
    getProvinceName,
    getCityName,
    getDistrictName,
    getSubDistrictName,
} from '../../../data/regions';

interface ReviewStepProps {
    form: UseFormReturn<any>;
    onEditStep: (step: number) => void;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ form, onEditStep }) => {
    const [showTermsModal, setShowTermsModal] = useState(false);
    const formData = form.getValues();
    const selectedPkg = packages.find(
        (p) => String(p.id) === String(formData.selectedPackage) || p.name === formData.selectedPackageName
    ) || {
        id: String(formData.selectedPackage || '1'),
        name: formData.selectedPackageName || formData.selectedPackage || 'Paket Layanan',
        speed: formData.packageSpeed || '30Mbps',
        price: Number(formData.packagePrice || 125000),
        installFee: 50000,
        description: '',
    };

    const getLocationDisplay = () => {
        const parts = [
            getSubDistrictName(formData.province, formData.city, formData.district, formData.subDistrict),
            getDistrictName(formData.province, formData.city, formData.district),
            getCityName(formData.province, formData.city),
            getProvinceName(formData.province),
        ].filter(Boolean);
        return parts.join(', ');
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl mb-2" style={{ color: '#1f2937' }}>
                    Periksa & Kirim
                </h2>
                <p style={{ color: '#6b7280' }}>
                    Pastikan semua data sudah benar sebelum submit
                </p>
            </div>

            {/* Review Sections */}
            <div className="space-y-4">
                {/* Customer Data */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold" style={{ color: '#1f2937' }}>
                                Data Pelanggan
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditStep(1)}
                            >
                                Edit
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <p style={{ color: '#6b7280' }}>Nama:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {formData.name || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>KTP:</p>
                                <p className="font-medium font-mono" style={{ color: '#1f2937' }}>
                                    {formData.ktp || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Telepon:</p>
                                <p className="font-medium flex items-center flex-wrap gap-1" style={{ color: '#1f2937' }}>
                                    <span>+62{formData.phone || '-'}</span>
                                    {formData.whatsapp && (
                                        <span className="inline-block text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[11px] font-semibold">(WhatsApp)</span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Email:</p>
                                <p className="font-medium break-all sm:break-words" style={{ color: '#1f2937' }}>
                                    {formData.email || '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Address */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold" style={{ color: '#1f2937' }}>
                                Alamat
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditStep(2)}
                            >
                                Edit
                            </Button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p style={{ color: '#6b7280' }}>Alamat Lengkap:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {formData.sameAsKtp
                                        ? formData.ktpAddress
                                        : formData.installAddress || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Kelurahan:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {getSubDistrictName(formData.province, formData.city, formData.district, formData.subDistrict) || formData.subDistrict || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Kecamatan:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {getDistrictName(formData.province, formData.city, formData.district) || formData.district || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Kota / Kabupaten:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {getCityName(formData.province, formData.city) || formData.city || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Provinsi:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {getProvinceName(formData.province) || formData.province || '-'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Kode Pos:</p>
                                <p className="font-medium" style={{ color: '#1f2937' }}>
                                    {formData.postalCode || '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold" style={{ color: '#1f2937' }}>
                                Dokumen
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditStep(3)}
                            >
                                Edit
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <p style={{ color: '#6b7280' }}>Foto KTP:</p>
                                <p
                                    className="font-medium"
                                    style={{ color: formData.ktpPhoto ? '#10b981' : '#ef4444' }}
                                >
                                    {formData.ktpPhoto ? '✓ Terunggah' : '✗ Belum diunggah'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Kartu Keluarga (KK):</p>
                                <p
                                    className="font-medium"
                                    style={{ color: formData.kkPhoto ? '#10b981' : '#ef4444' }}
                                >
                                    {formData.kkPhoto ? '✓ Terunggah' : '✗ Belum diunggah'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Foto Rumah:</p>
                                <p
                                    className="font-medium"
                                    style={{ color: formData.housePhoto ? '#10b981' : '#ef4444' }}
                                >
                                    {formData.housePhoto ? '✓ Terunggah' : '✗ Belum diunggah'}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7280' }}>Dokumen Lainnya:</p>
                                <p
                                    className="font-medium"
                                    style={{ color: formData.otherPhoto ? '#10b981' : '#6b7280' }}
                                >
                                    {formData.otherPhoto ? '✓ Terunggah' : '- Opsional'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Package */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold" style={{ color: '#1f2937' }}>
                                Paket Layanan
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditStep(4)}
                            >
                                Edit
                            </Button>
                        </div>
                        {selectedPkg ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span style={{ color: '#6b7280' }}>Paket:</span>
                                    <span className="font-semibold" style={{ color: '#667eea' }}>
                                        {selectedPkg.name} - {selectedPkg.speed}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: '#6b7280' }}>Bulanan:</span>
                                    <span style={{ color: '#1f2937' }}>
                                        Rp {selectedPkg.price.toLocaleString('id-ID')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: '#6b7280' }}>Instalasi:</span>
                                    <span style={{ color: '#1f2937' }}>
                                        Rp {selectedPkg.installFee.toLocaleString('id-ID')}
                                    </span>
                                </div>
                                {formData.promoCode && (
                                    <div className="flex justify-between text-green-700 font-medium bg-green-50 px-2 py-1 rounded border border-green-200 text-xs">
                                        <span>Diskon Kode Promo ({formData.promoCode}):</span>
                                        <span className="font-bold">-Rp {Number(formData.discountAmount || 0).toLocaleString('id-ID')}</span>
                                    </div>
                                )}
                                <div className="border-t pt-2 flex justify-between">
                                    <span className="font-semibold" style={{ color: '#1f2937' }}>
                                        Total Pembayaran Pertama:
                                    </span>
                                    <span className="font-bold text-lg text-blue-600">
                                        Rp {Math.max(0, selectedPkg.price + selectedPkg.installFee - Number(formData.discountAmount || 0)).toLocaleString('id-ID')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: '#ef4444' }}>Belum memilih paket</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Terms & Confirmation */}
            <div className="space-y-4 border-t pt-4">
                <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="cursor-pointer">
                                    Saya menyetujui{' '}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setShowTermsModal(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-semibold underline focus:outline-none"
                                    >
                                        Syarat dan Ketentuan
                                    </button>{' '}
                                    layanan
                                </FormLabel>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="dataConfirmed"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="cursor-pointer">
                                    Saya mengkonfirmasi bahwa semua data yang diisi sudah benar
                                </FormLabel>
                                <FormMessage />
                            </div>
                        </FormItem>
                    )}
                />
            </div>

            {/* Terms & Conditions Popup Modal */}
            <TermsModal
                isOpen={showTermsModal}
                onClose={() => setShowTermsModal(false)}
                onAccept={() => {
                    form.setValue('termsAccepted', true, { shouldValidate: true });
                }}
            />
        </div>
    );
};
