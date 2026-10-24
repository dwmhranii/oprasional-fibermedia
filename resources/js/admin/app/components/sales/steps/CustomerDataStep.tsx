import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '../../ui/input';
import { Checkbox } from '../../ui/checkbox';
import { CheckCircle } from 'lucide-react';
import {
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '../../ui/form';

interface CustomerDataStepProps {
    form: UseFormReturn<any>;
    disableKtp?: boolean;
}

export const CustomerDataStep: React.FC<CustomerDataStepProps> = ({ form, disableKtp = false }) => {
    const ktpValue = form.watch('ktp');

    return (
        <div className="space-y-3 md:space-y-6">
            <div>
                <h2 className="text-xl md:text-2xl mb-1 md:mb-2" style={{ color: '#1f2937' }}>
                    Data Pelanggan
                </h2>
                <p className="text-sm md:text-base" style={{ color: '#6b7280' }}>
                    Masukkan informasi lengkap pelanggan
                </p>
            </div>

            <div className="space-y-3 md:space-y-4">
                {/* KTP Field */}
                <FormField
                    control={form.control}
                    name="ktp"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                No KTP (NIK) <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="3201012345678901"
                                    maxLength={16}
                                    disabled={disableKtp}
                                    {...field}
                                />
                            </FormControl>
                            {ktpValue?.length === 16 && !form.formState.errors.ktp && !disableKtp && (
                                <p className="text-sm flex items-center" style={{ color: '#10b981' }}>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    KTP valid
                                </p>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Name Field */}
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Nama Lengkap <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                                <Input placeholder="Masukkan nama sesuai KTP" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Phone Field */}
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                No Telepon <span className="text-red-500">*</span>
                            </FormLabel>
                            <div className="flex space-x-2">
                                <div className="w-20">
                                    <Input value="+62" disabled />
                                </div>
                                <FormControl>
                                    <Input
                                        placeholder="8123456789"
                                        className="flex-1"
                                        {...field}
                                    />
                                </FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* WhatsApp Checkbox */}
                <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <FormLabel className="text-sm cursor-pointer font-normal">
                                Nomor WhatsApp
                            </FormLabel>
                        </FormItem>
                    )}
                />

                {/* Email Field */}
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email (Opsional)</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
};
