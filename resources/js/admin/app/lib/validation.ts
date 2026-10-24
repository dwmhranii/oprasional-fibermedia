import { z } from 'zod';

// NIK (Nomor Induk Kependudukan) validation
// Format: 16 digits, structured as: PPKKCC DDMMYY NNNN
// PP = Province code, KK = City/Regency code, CC = District code
// DDMMYY = Birth date (female: DD + 40), NNNN = Serial number
export const nikSchema = z
  .string()
  .length(16, 'NIK harus 16 digit')
  .regex(/^\d{16}$/, 'NIK hanya boleh berisi angka');

// Phone number validation (Indonesia format)
export const phoneSchema = z
  .string()
  .min(9, 'Nomor telepon minimal 9 digit')
  .max(13, 'Nomor telepon maksimal 13 digit')
  .regex(/^8\d+$/, 'Nomor telepon harus dimulai dengan 8 (tanpa 0)');

// Email validation (optional)
export const emailSchema = z
  .string()
  .email('Format email tidak valid')
  .optional()
  .or(z.literal(''));

// File validation
export const fileSchema = z
  .instanceof(File)
  .refine((file) => file.size <= 5 * 1024 * 1024, 'File maksimal 5MB')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type),
    'File harus berformat JPG atau PNG'
  );

export const optionalFileSchema = fileSchema.optional().nullable();

// Step 1: Customer Data Schema
export const customerDataSchema = z.object({
  ktp: nikSchema,
  name: z
    .string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  phone: phoneSchema,
  whatsapp: z.boolean().default(true),
  email: emailSchema,
});

// Step 2: Address Schema
export const addressSchema = z.object({
  ktpAddress: z
    .string()
    .min(10, 'Alamat KTP minimal 10 karakter'),
  installAddress: z.string().optional(),
  sameAsKtp: z.boolean().default(false),
  province: z.string().min(1, 'Pilih provinsi'),
  city: z.string().min(1, 'Pilih kota/kabupaten'),
  district: z.string().min(1, 'Pilih kecamatan'),
  subDistrict: z.string().min(1, 'Pilih kelurahan'),
  postalCode: z
    .string()
    .length(5, 'Kode pos harus 5 digit')
    .regex(/^\d{5}$/, 'Kode pos hanya boleh berisi angka'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
}).refine(
  (data) => data.sameAsKtp || (data.installAddress && data.installAddress.length >= 10),
  {
    message: 'Alamat instalasi minimal 10 karakter',
    path: ['installAddress'],
  }
);

// Step 3: Documents Schema
export const documentsSchema = z.object({
  ktpPhoto: fileSchema,
  kkPhoto: fileSchema,
  housePhoto: fileSchema,
  otherPhoto: optionalFileSchema,
});

// Step 4: Package Schema
export const packageSchema = z.object({
  selectedPackage: z.string().min(1, 'Pilih paket layanan'),
  promoCode: z.string().optional(),
});

// Step 5: Review Schema
export const reviewSchema = z.object({
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, 'Anda harus menyetujui syarat dan ketentuan'),
  dataConfirmed: z
    .boolean()
    .refine((val) => val === true, 'Anda harus mengonfirmasi data sudah benar'),
});

// Full form schema (all steps combined)
export const fullSubmissionSchema = customerDataSchema
  .merge(addressSchema)
  .merge(documentsSchema)
  .merge(packageSchema)
  .merge(reviewSchema);

// Types inferred from schemas
export type CustomerData = z.infer<typeof customerDataSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type DocumentsData = z.infer<typeof documentsSchema>;
export type PackageData = z.infer<typeof packageSchema>;
export type ReviewData = z.infer<typeof reviewSchema>;
export type FullSubmission = z.infer<typeof fullSubmissionSchema>;

// Validation helper functions
export const validateStep = async (step: number, data: any) => {
  switch (step) {
    case 1:
      return customerDataSchema.safeParseAsync(data);
    case 2:
      return addressSchema.safeParseAsync(data);
    case 3:
      return documentsSchema.safeParseAsync(data);
    case 4:
      return packageSchema.safeParseAsync(data);
    case 5:
      return reviewSchema.safeParseAsync(data);
    default:
      return { success: false, error: { issues: [{ message: 'Invalid step' }] } };
  }
};
