import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Form } from '../ui/form';
import { ArrowLeft, ArrowRight, Check, Send, Loader2, AlertTriangle, User, MapPin, FileText, Wifi, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

// Import step components
import {
  CustomerDataStep,
  AddressStep,
  DocumentsStep,
  PackageStep,
  ReviewStep,
} from './steps';

// Import validation schemas
import {
  customerDataSchema,
  addressSchema,
  documentsSchema,
  packageSchema,
  reviewSchema,
} from '../../lib/validation';
import { apiClient, ApiError } from '../../lib/api';
import { submissionToBackendPayload } from '../../lib/mappers';

interface NewSubmissionFormProps {
  onNavigate: (path: string) => void;
}

// Combined schema for the entire form
const formSchema = z.object({
  // Step 1: Customer Data
  ktp: z.string().length(16, 'NIK harus 16 digit').regex(/^\d{16}$/, 'NIK hanya boleh berisi angka'),
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100, 'Nama maksimal 100 karakter'),
  phone: z.string().min(9, 'Nomor telepon minimal 9 digit').max(13, 'Nomor telepon maksimal 13 digit').regex(/^8\d+$/, 'Nomor telepon harus dimulai dengan 8'),
  whatsapp: z.boolean().default(true),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  // Step 2: Address
  ktpAddress: z.string().min(10, 'Alamat KTP minimal 10 karakter'),
  installAddress: z.string().optional(),
  sameAsKtp: z.boolean().default(false),
  province: z.string().min(1, 'Pilih provinsi'),
  city: z.string().min(1, 'Pilih kota/kabupaten'),
  district: z.string().min(1, 'Pilih kecamatan'),
  subDistrict: z.string().min(1, 'Pilih kelurahan'),
  postalCode: z.string().length(5, 'Kode pos harus 5 digit'),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  // Step 3: Documents (File validation handled separately)
  ktpPhoto: z.any().optional(),
  kkPhoto: z.any().optional(),
  housePhoto: z.any().optional(),
  otherPhoto: z.any().optional().nullable(),
  // Step 4: Package
  selectedPackage: z.string().min(1, 'Pilih paket layanan'),
  promoCode: z.string().optional(),
  discountAmount: z.number().optional().default(0),
  // Step 5: Review
  termsAccepted: z.boolean().refine((val) => val === true, 'Anda harus menyetujui syarat dan ketentuan'),
  dataConfirmed: z.boolean().refine((val) => val === true, 'Anda harus mengonfirmasi data sudah benar'),
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { number: 1, title: 'Data Pelanggan', icon: User, fields: ['ktp', 'name', 'phone'] },
  { number: 2, title: 'Alamat', icon: MapPin, fields: ['ktpAddress', 'province', 'city', 'district', 'subDistrict', 'postalCode'] },
  { number: 3, title: 'Upload Dokumen', icon: FileText, fields: ['ktpPhoto', 'kkPhoto', 'housePhoto'] },
  { number: 4, title: 'Pilih Paket', icon: Wifi, fields: ['selectedPackage'] },
  { number: 5, title: 'Review & Submit', icon: CheckCircle2, fields: ['termsAccepted', 'dataConfirmed'] },
];

export const NewSubmissionForm: React.FC<NewSubmissionFormProps> = ({ onNavigate }) => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 5;

  const { data: existingSubmission, isLoading: isLoadingSubmission } = useQuery({
    queryKey: ['submission', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get<any>(`/sales/submissions/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      ktp: '',
      name: '',
      phone: '',
      whatsapp: true,
      email: '',
      ktpAddress: '',
      installAddress: '',
      sameAsKtp: false,
      province: '',
      city: '',
      district: '',
      subDistrict: '',
      postalCode: '',
      coordinates: { lat: 0, lng: 0 },
      ktpPhoto: null,
      kkPhoto: null,
      housePhoto: null,
      otherPhoto: null,
      selectedPackage: '',
      promoCode: '',
      discountAmount: 0,
      termsAccepted: false,
      dataConfirmed: false,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (existingSubmission) {
      form.reset({
        ktp: existingSubmission.customer.ktp || '',
        name: existingSubmission.customer.name || '',
        phone: existingSubmission.customer.phone || '',
        whatsapp: existingSubmission.customer.whatsapp || true,
        email: existingSubmission.customer.email || '',
        ktpAddress: existingSubmission.address.ktp_address || '',
        installAddress: existingSubmission.address.install_address || '',
        sameAsKtp: existingSubmission.address.same_as_ktp || false,
        province: existingSubmission.address.province || '',
        city: existingSubmission.address.city || '',
        district: existingSubmission.address.district || '',
        subDistrict: existingSubmission.address.sub_district || existingSubmission.address.subdistrict || existingSubmission.address.kelurahan || '',
        postalCode: existingSubmission.address.postal_code || existingSubmission.address.postalcode || existingSubmission.address.kode_pos || '',
        coordinates: existingSubmission.address.latitude && existingSubmission.address.longitude 
          ? { lat: Number(existingSubmission.address.latitude), lng: Number(existingSubmission.address.longitude) }
          : { lat: 0, lng: 0 },
        selectedPackage: existingSubmission.package_id ? existingSubmission.package_id.toString() : '',
        promoCode: existingSubmission.promo_code || '',
        termsAccepted: true,
        dataConfirmed: true,
      });
    }
  }, [existingSubmission, form]);

  const progress = (currentStep / totalSteps) * 100;

  // Validate current step fields before proceeding
  const validateCurrentStep = async (): Promise<boolean> => {
    const currentStepConfig = steps[currentStep - 1];
    const fieldsToValidate = currentStepConfig.fields as (keyof FormData)[];

    // Special handling for step 2 - check installAddress if sameAsKtp is false
    if (currentStep === 2) {
      const sameAsKtp = form.getValues('sameAsKtp');
      if (!sameAsKtp) {
        const installAddress = form.getValues('installAddress');
        if (!installAddress || installAddress.length < 10) {
          form.setError('installAddress', { message: 'Alamat instalasi minimal 10 karakter' });
          return false;
        }
      }
    }

    // Special handling for step 3 - validate file uploads
      if (currentStep === 3) {
        const ktpPhoto = form.getValues('ktpPhoto');
        const kkPhoto = form.getValues('kkPhoto');
        const housePhoto = form.getValues('housePhoto');
        let hasError = false;

        if (!id) {
          if (!ktpPhoto) {
            form.setError('ktpPhoto', { message: 'Foto KTP wajib diupload' });
            hasError = true;
          }
          if (!kkPhoto) {
            form.setError('kkPhoto', { message: 'Foto Kartu Keluarga wajib diupload' });
            hasError = true;
          }
          if (!housePhoto) {
            form.setError('housePhoto', { message: 'Foto Rumah wajib diupload' });
            hasError = true;
          }
        }

        if (hasError) return false;
      }

    // Trigger validation for step fields
    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();

    if (!isValid) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    const isValid = await validateCurrentStep();

    if (!isValid) {
      toast.error('Mohon centang semua persetujuan');
      return;
    }

    setIsSubmitting(true);
    const values = form.getValues();
    const payload = submissionToBackendPayload(values);

    try {
      let submissionId = id;

      if (id) {
        // Update existing submission
        await apiClient.put<any>(`/sales/submissions/${id}`, payload);

        // Upload any newly selected files for existing submission
        const filesToUpload = [
          ...(values.ktpPhoto instanceof File ? [{ type: 'ktp', file: values.ktpPhoto, label: 'Foto KTP' }] : []),
          ...(values.kkPhoto instanceof File ? [{ type: 'kk', file: values.kkPhoto, label: 'Kartu Keluarga' }] : []),
          ...(values.housePhoto instanceof File ? [{ type: 'rumah', file: values.housePhoto, label: 'Foto Rumah' }] : []),
          ...(values.otherPhoto instanceof File ? [{ type: 'lainnya', file: values.otherPhoto, label: 'Dokumen Lainnya' }] : []),
        ];

        if (filesToUpload.length > 0) {
          for (const item of filesToUpload) {
            const fileFormData = new FormData();
            fileFormData.append('document_type', item.type);
            fileFormData.append('file', item.file);

            toast.info(`Mengunggah ${item.label}...`);
            await apiClient.upload<any>(
              `/sales/submissions/${submissionId}/upload-document`,
              fileFormData
            );
          }
        }
      } else {
        // Create new submission using 1 Atomic multipart/form-data POST Request
        const formData = new FormData();

        // 1. Append textual submission fields
        Object.entries(payload).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            if (typeof val === 'object') {
              formData.append(key, JSON.stringify(val));
            } else {
              formData.append(key, String(val));
            }
          }
        });

        // Backend attribute aliases
        formData.append('customer_name', values.name || '');
        formData.append('nik', values.ktp || '');
        formData.append('phone', values.phone || '');
        formData.append('email', values.email || '');
        formData.append('address', values.ktpAddress || '');
        formData.append('install_address', values.sameAsKtp ? values.ktpAddress : (values.installAddress || values.ktpAddress));
        formData.append('same_as_ktp', values.sameAsKtp ? '1' : '0');
        formData.append('province', values.province || '');
        formData.append('city', values.city || '');
        formData.append('district', values.district || '');
        formData.append('sub_district', values.subDistrict || '');
        formData.append('village', values.subDistrict || '');
        formData.append('postal_code', values.postalCode || '');
        formData.append('package_id', values.selectedPackage || '');
        formData.append('package_name', payload.package_name || '');
        formData.append('package_speed', String(payload.package_speed || ''));
        formData.append('package_price', String(payload.package_price || ''));
        formData.append('installation_fee', String(payload.installation_fee || ''));
        if (values.promoCode) formData.append('promo_code', values.promoCode);
        if (values.coordinates?.lat) formData.append('latitude', String(values.coordinates.lat));
        if (values.coordinates?.lng) formData.append('longitude', String(values.coordinates.lng));

        // 2. Attach document files directly into FormData (Atomic upload anti data ganda)
        if (values.ktpPhoto instanceof File) {
          formData.append('ktp', values.ktpPhoto);
          formData.append('ktp_photo', values.ktpPhoto);
        }
        if (values.housePhoto instanceof File) {
          formData.append('rumah', values.housePhoto);
          formData.append('house_photo', values.housePhoto);
          formData.append('house', values.housePhoto);
        }
        if (values.kkPhoto instanceof File) {
          formData.append('kk', values.kkPhoto);
          formData.append('kk_photo', values.kkPhoto);
        }
        if (values.otherPhoto instanceof File) {
          formData.append('lainnya', values.otherPhoto);
          formData.append('other_photo', values.otherPhoto);
        }

        // 3. Single Atomic HTTP Request to POST /api/sales/submissions
        const subResponse = await apiClient.upload<any>('/sales/submissions', formData);
        submissionId = subResponse.id || subResponse.data?.id || subResponse.submission?.id;
      }

      if (!submissionId) {
        throw new Error('Gagal mendapatkan ID pengajuan dari server.');
      }

      toast.success(id ? 'Pengajuan berhasil diperbarui!' : 'Pengajuan dan dokumen berhasil dibuat secara atomik!');
      
      if (id) {
        queryClient.invalidateQueries({ queryKey: ['submission', id] });
        queryClient.invalidateQueries({ queryKey: ['salesSubmissions'] });
      }

      // Redirect to the detail page of the created submission
      onNavigate(`/submissions/${submissionId}`);
    } catch (error) {
      if (error instanceof ApiError) {
        const firstError = error.getFirstError();
        toast.error(firstError || 'Gagal menyimpan pengajuan');
        
        // Map backend errors to form fields
        if (error.errors) {
          let isFirst = true;
          Object.entries(error.errors).forEach(([key, messages]) => {
            let formKey = key;
            if (key === 'customer_name') formKey = 'name';
            if (key === 'nik') formKey = 'ktp';
            if (key === 'address') formKey = 'ktpAddress';
            if (key === 'package_name') formKey = 'selectedPackage';
            
            form.setError(formKey as any, {
              type: 'server',
              message: messages[0]
            }, { shouldFocus: isFirst });
            isFirst = false;
          });
        }
      } else {
        toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat membuat pengajuan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <CustomerDataStep form={form} />;
      case 2:
        return <AddressStep form={form} />;
      case 3:
        return <DocumentsStep form={form} />;
      case 4:
        return <PackageStep form={form} />;
      case 5:
        return <ReviewStep form={form} onEditStep={handleEditStep} />;
      default:
        return null;
    }
  };

  if (id && isLoadingSubmission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" style={{ color: '#667eea' }} />
        <p className="text-gray-500 text-sm">Memuat data pengajuan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-28 md:pb-12 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1f2937' }}>
            {id ? 'Edit Pengajuan Layanan' : 'Pengajuan Baru'}
          </h1>
          <p style={{ color: '#6b7280' }}>
            Langkah {currentStep} dari {totalSteps}
          </p>
        </div>
        </div>

        {id && existingSubmission?.status === 'need_info' && existingSubmission?.notes && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-amber-800">Perlu Revisi (Info Tambahan)</AlertTitle>
            <AlertDescription className="text-amber-700 mt-1">
              <strong>Catatan Admin:</strong> {existingSubmission.notes}
            </AlertDescription>
          </Alert>
        )}
  
      {/* Step Indicator */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = step.number < currentStep;
            const isCurrent = step.number === currentStep;

            return (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1.5 hidden sm:block ${
                      isCurrent ? 'font-bold text-indigo-600' : isCompleted ? 'font-medium text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 sm:h-1 mx-1.5 sm:mx-3 rounded-full transition-all ${
                      step.number < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Mobile current step indicator */}
        <div className="flex items-center justify-between text-xs sm:hidden pt-1 border-t border-gray-50">
          <span className="font-semibold text-indigo-600">
            Langkah {currentStep} dari {totalSteps}
          </span>
          <span className="font-bold text-gray-800">
            {steps[currentStep - 1]?.title}
          </span>
        </div>
      </div>

      {/* Form Content */}
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <Card>
            <CardContent className="p-6">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 flex justify-between md:relative md:bg-transparent md:border-none md:p-0 md:mt-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:shadow-none">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                style={{ backgroundColor: '#667eea' }}
              >
                Lanjut
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ backgroundColor: '#10b981' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Kirim
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};
