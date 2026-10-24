import React, { useEffect, useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Textarea } from '../../ui/textarea';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { CustomerMap } from '../../maps/CustomerMap';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../ui/select';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '../../ui/form';
import {
    getProvinces,
    getCities,
    getDistricts,
    getSubDistricts,
    getPostalCode,
} from '../../../data/regions';

interface AddressStepProps {
    form: UseFormReturn<any>;
}

export const AddressStep: React.FC<AddressStepProps> = ({ form }) => {
    const province = form.watch('province');
    const city = form.watch('city');
    const district = form.watch('district');
    const subDistrict = form.watch('subDistrict');
    const sameAsKtp = form.watch('sameAsKtp');
    const ktpAddress = form.watch('ktpAddress');
    
    const [isLocating, setIsLocating] = useState(false);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Browser Anda tidak mendukung geolokasi.');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.setValue('coordinates.lat', position.coords.latitude);
                form.setValue('coordinates.lng', position.coords.longitude);
                setIsLocating(false);
                toast.success('Lokasi berhasil ditemukan.');
            },
            (error) => {
                setIsLocating(false);
                let message = 'Gagal mendapatkan lokasi.';
                if (error.code === error.PERMISSION_DENIED) message = 'Izin akses lokasi ditolak oleh browser Anda.';
                if (error.code === error.POSITION_UNAVAILABLE) message = 'Informasi lokasi tidak tersedia.';
                if (error.code === error.TIMEOUT) message = 'Waktu pencarian lokasi habis.';
                toast.error(message);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    // Auto-fill postal code when subDistrict changes
    useEffect(() => {
        if (province && city && district && subDistrict) {
            const postalCode = getPostalCode(province, city, district, subDistrict);
            if (postalCode) {
                form.setValue('postalCode', postalCode);
            }
        }
    }, [province, city, district, subDistrict, form]);

    // Sync install address when sameAsKtp changes
    useEffect(() => {
        if (sameAsKtp) {
            form.setValue('installAddress', ktpAddress);
        }
    }, [sameAsKtp, ktpAddress, form]);

    const prevProvinceRef = useRef(province);
    const prevCityRef = useRef(city);
    const prevDistrictRef = useRef(district);

    // Reset dependent fields when parent changes
    useEffect(() => {
        if (province !== prevProvinceRef.current) {
            if (prevProvinceRef.current) {
                form.setValue('city', '');
                form.setValue('district', '');
                form.setValue('subDistrict', '');
                form.setValue('postalCode', '');
            }
            prevProvinceRef.current = province;
        }
    }, [province, form]);

    useEffect(() => {
        if (city !== prevCityRef.current) {
            if (prevCityRef.current && city) {
                form.setValue('district', '');
                form.setValue('subDistrict', '');
                form.setValue('postalCode', '');
            }
            prevCityRef.current = city;
        }
    }, [city, form]);

    useEffect(() => {
        if (district !== prevDistrictRef.current) {
            if (prevDistrictRef.current && district) {
                form.setValue('subDistrict', '');
                form.setValue('postalCode', '');
            }
            prevDistrictRef.current = district;
        }
    }, [district, form]);

    const provinces = getProvinces();
    const cities = province ? getCities(province) : [];
    const districts = province && city ? getDistricts(province, city) : [];
    const subDistricts =
        province && city && district
            ? getSubDistricts(province, city, district)
            : [];

    return (
        <div className="space-y-3 md:space-y-6">
            <div>
                <h2 className="text-xl md:text-2xl mb-1 md:mb-2" style={{ color: '#1f2937' }}>
                    Alamat
                </h2>
                <p className="text-sm md:text-base" style={{ color: '#6b7280' }}>
                    Masukkan alamat lengkap pelanggan
                </p>
            </div>

            <div className="space-y-3 md:space-y-4">
                {/* KTP Address */}
                <FormField
                    control={form.control}
                    name="ktpAddress"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Alamat KTP <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <Textarea
                                    rows={3}
                                    placeholder="Masukkan alamat sesuai KTP"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Same as KTP Checkbox */}
                <FormField
                    control={form.control}
                    name="sameAsKtp"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <FormLabel className="text-sm cursor-pointer font-normal">
                                Alamat instalasi sama dengan alamat KTP
                            </FormLabel>
                        </FormItem>
                    )}
                />

                {/* Install Address (if different) */}
                {!sameAsKtp && (
                    <FormField
                        control={form.control}
                        name="installAddress"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Alamat Instalasi <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        rows={3}
                                        placeholder="Masukkan alamat instalasi"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {/* Region Dropdowns */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {/* Province */}
                    <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Provinsi <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Pilih provinsi" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {provinces.map((prov) => (
                                            <SelectItem key={prov.id} value={prov.id}>
                                                {prov.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* City */}
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Kota/Kabupaten <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={!province}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={
                                                    province ? 'Pilih kota' : 'Pilih provinsi dulu'
                                                }
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {cities.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* District */}
                    <FormField
                        control={form.control}
                        name="district"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Kecamatan <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={!city}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={
                                                    city ? 'Pilih kecamatan' : 'Pilih kota dulu'
                                                }
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {districts.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* SubDistrict */}
                    <FormField
                        control={form.control}
                        name="subDistrict"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Kelurahan <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={!district}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={
                                                    district ? 'Pilih kelurahan' : 'Pilih kecamatan dulu'
                                                }
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {subDistricts.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Postal Code */}
                <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Kode Pos <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="65163" maxLength={5} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Map Implementation */}
                <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <FormLabel>Lokasi Koordinat Pemasangan (Opsional)</FormLabel>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={handleGetLocation} 
                            disabled={isLocating}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                        >
                            {isLocating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
                            {isLocating ? 'Mencari Lokasi...' : 'Gunakan Lokasi Saya'}
                        </Button>
                    </div>
                    <CustomerMap 
                        lat={form.watch('coordinates.lat')}
                        lng={form.watch('coordinates.lng')}
                        interactive={true}
                        onLocationSelect={(lat, lng) => {
                            form.setValue('coordinates.lat', lat);
                            form.setValue('coordinates.lng', lng);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
