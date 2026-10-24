import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
    FormField,
    FormItem,
} from '../../ui/form';
import { MediaUpload } from '../../common/MediaUpload';

interface DocumentsStepProps {
    form: UseFormReturn<any>;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({ form }) => {
    return (
        <div className="space-y-3 md:space-y-6">
            <div>
                <h2 className="text-xl md:text-2xl mb-1 md:mb-2" style={{ color: '#1f2937' }}>
                    Upload Dokumen
                </h2>
                <p className="text-sm md:text-base" style={{ color: '#6b7280' }}>
                    Upload foto KTP, Kartu Keluarga, dan foto rumah pelanggan
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KTP Photo */}
                <FormField
                    control={form.control}
                    name="ktpPhoto"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <MediaUpload
                                label="Foto KTP"
                                file={field.value}
                                onFileChange={field.onChange}
                                required={true}
                                error={fieldState.error?.message}
                            />
                        </FormItem>
                    )}
                />

                {/* KK Photo */}
                <FormField
                    control={form.control}
                    name="kkPhoto"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <MediaUpload
                                label="Kartu Keluarga / KK"
                                file={field.value}
                                onFileChange={field.onChange}
                                required={true}
                                error={fieldState.error?.message}
                            />
                        </FormItem>
                    )}
                />

                {/* House Photo */}
                <FormField
                    control={form.control}
                    name="housePhoto"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <MediaUpload
                                label="Foto Rumah"
                                file={field.value}
                                onFileChange={field.onChange}
                                required={true}
                                error={fieldState.error?.message}
                            />
                        </FormItem>
                    )}
                />

                {/* Other Photo */}
                <FormField
                    control={form.control}
                    name="otherPhoto"
                    render={({ field, fieldState }) => (
                        <FormItem>
                            <MediaUpload
                                label="Dokumen Lainnya (Opsional)"
                                file={field.value}
                                onFileChange={field.onChange}
                                required={false}
                                error={fieldState.error?.message}
                            />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
};
