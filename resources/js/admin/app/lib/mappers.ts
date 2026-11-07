import type { Submission, User, UserRole } from '../types';
import { packages } from '../data/packages';

/**
 * Maps a Laravel User resource to the normalized Frontend User model.
 */
export const userToFrontend = (apiUser: any): User => {
  let role: UserRole = 'sales';
  
  const rawRoleStr = Array.isArray(apiUser.roles) && apiUser.roles.length > 0
    ? (typeof apiUser.roles[0] === 'string' ? apiUser.roles[0] : apiUser.roles[0].name || '')
    : (typeof apiUser.role === 'string' ? apiUser.role : '');

  const displayRole = rawRoleStr || (apiUser.is_superadmin ? 'Superadmin' : 'Staff');
  const roleLower = displayRole.toLowerCase();

  if (apiUser.is_superadmin || (typeof apiUser.email === 'string' && apiUser.email.toLowerCase() === 'superadmin@example.com') || roleLower.includes('superadmin')) {
    role = 'superadmin';
  } else if (roleLower.includes('admin') || roleLower.includes('cs') || roleLower.includes('noc') || roleLower.includes('dispatcher')) {
    role = 'admin';
  } else if (roleLower.includes('teknisi') || roleLower.includes('technician')) {
    role = 'teknisi';
  } else {
    role = 'sales';
  }

  // Extract permissions from Spatie payload
  const permissions = Array.isArray(apiUser.permissions)
    ? apiUser.permissions.map((p: any) => typeof p === 'string' ? p : p.name || '')
    : [];

  return {
    id: apiUser.id,
    username: apiUser.username || apiUser.email.split('@')[0], // fallback
    email: apiUser.email,
    nama_lengkap: apiUser.name || apiUser.nama_lengkap || '',
    name: apiUser.name || apiUser.nama_lengkap || '',
    status: apiUser.status || 'active',
    roles: Array.isArray(apiUser.roles) 
      ? apiUser.roles.map((r: any) => typeof r === 'string' ? r : r.name || '')
      : (displayRole ? [displayRole] : []),
    displayRole,
    permissions,
    role,
    avatar: apiUser.avatar,
  };
};

/**
 * Maps a flat Laravel Submission API resource to the nested Frontend Submission model.
 */
export const submissionToFrontend = (apiSub: any): Submission => {
  const matchingPkg = packages.find(
    (p) => p.name.toUpperCase() === (apiSub.package_name || '').toUpperCase()
  );

  const subDistrictVal =
    apiSub.village ||
    apiSub.location?.village ||
    apiSub.sub_district ||
    apiSub.subdistrict ||
    apiSub.kelurahan ||
    '';
  const postalCodeVal =
    apiSub.postal_code ||
    apiSub.location?.postal_code ||
    apiSub.kode_pos ||
    '';

  // Parse document uploads
  const ktpDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'ktp')
    : undefined;

  const selfieDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'selfie')
    : undefined;
    
  const kkDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'kk')
    : undefined;
    
  const rumahDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'rumah')
    : undefined;
    
  const lainnyaDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'lainnya')
    : undefined;
  
  // Legacy mapping support
  const houseFrontDoc = rumahDoc;

  const houseSideDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'rumah_samping')
    : undefined;

  const houseInsideDoc = Array.isArray(apiSub.documents)
    ? apiSub.documents.find((d: any) => d.document_type === 'rumah_dalam')
    : undefined;

  return {
    id: String(apiSub.id),
    submissionNumber: apiSub.submission_number || `SUB-${apiSub.id}`,
    status: apiSub.status || 'pending',
    customer: {
      ktp: apiSub.nik || '',
      name: apiSub.customer_name || '',
      phone: apiSub.phone || '',
      whatsapp: apiSub.whatsapp === undefined ? true : Boolean(apiSub.whatsapp),
      email: apiSub.email || '',
    },
    address: {
      ktpAddress: apiSub.address || '',
      installAddress: apiSub.install_address || apiSub.address || '',
      sameAsKtp: apiSub.install_address ? apiSub.install_address === apiSub.address : true,
      province: apiSub.province || '',
      city: apiSub.city || '',
      district: apiSub.district || '',
      subDistrict: subDistrictVal,
      postalCode: postalCodeVal,
      coordinates: apiSub.customer_location?.latitude !== undefined && apiSub.customer_location?.longitude !== undefined
        ? { lat: Number(apiSub.customer_location.latitude), lng: Number(apiSub.customer_location.longitude) }
        : apiSub.lat !== undefined && apiSub.lng !== undefined
        ? { lat: Number(apiSub.lat), lng: Number(apiSub.lng) }
        : undefined,
      customerLocation: apiSub.customer_location ? {
        available: true,
        latitude: Number(apiSub.customer_location.latitude),
        longitude: Number(apiSub.customer_location.longitude),
        accuracy: apiSub.customer_location.accuracy ? Number(apiSub.customer_location.accuracy) : undefined,
        captured_at: apiSub.customer_location.captured_at
      } : undefined,
      completionLocation: apiSub.completion_location ? {
        available: true,
        latitude: Number(apiSub.completion_location.latitude),
        longitude: Number(apiSub.completion_location.longitude),
        accuracy: apiSub.completion_location.accuracy ? Number(apiSub.completion_location.accuracy) : undefined,
        captured_at: apiSub.completion_location.captured_at
      } : undefined,
    },
    documents: {
      ktp: ktpDoc,
      selfie: selfieDoc,
      kk: kkDoc,
      rumah: rumahDoc,
      lainnya: lainnyaDoc,
      // Legacy fields mapping
      housePhotos: {
        front: houseFrontDoc,
        side: houseSideDoc,
        inside: houseInsideDoc,
      },
    },
    package: {
      id: matchingPkg?.id || '1',
      name: apiSub.package_name || 'BASIC',
      speed: matchingPkg?.speed || `${apiSub.package_speed || 10}Mbps`,
      price: Number(apiSub.package_price || 0),
      installationFee: Number(apiSub.installation_fee || 0),
      description: matchingPkg?.description || '',
    },
    promoCode: apiSub.promo_code || undefined,
    discount: Number(apiSub.discount || 0),
    totalPrice: Number(apiSub.total_price || 0),
    salesId: String(apiSub.sales_id || ''),
    salesName: apiSub.sales?.name || '',
    createdAt: apiSub.created_at || new Date().toISOString(),
    updatedAt: apiSub.updated_at || new Date().toISOString(),
    timeline: Array.isArray(apiSub.timeline) && apiSub.timeline.length > 0
      ? apiSub.timeline.map((item: any, idx: number) => ({
          id: String(item.id || idx + 1),
          type: item.type || item.event || item.title || 'system',
          event: item.event || item.type || 'activity',
          title: item.title || item.event || 'Aktivitas Pengajuan',
          description: item.description || item.notes || item.reason || item.message || '',
          notes: item.notes || item.reason || item.description || '',
          reason: item.reason || '',
          user: typeof item.user === 'string' ? item.user : (item.user?.name || item.reviewer?.name || item.actor?.name || 'Sistem'),
          actor: item.actor || item.reviewer || item.user || 'Sistem',
          reviewer: item.reviewer || item.actor || item.user,
          timestamp: item.timestamp || item.created_at || item.date || new Date().toISOString(),
          created_at: item.created_at || item.timestamp || item.date || new Date().toISOString(),
          status: item.status || item.decision || '',
          document_name: item.document_name || item.doc_type || item.document_type || '',
          metadata: item.metadata || item,
        }))
      : Array.isArray(apiSub.audit_logs)
      ? apiSub.audit_logs.map((log: any) => ({
          id: String(log.id),
          type: log.log_name || 'system',
          title: log.description || log.log_name || 'Audit Trail',
          description: log.description || '',
          user: log.causer?.name || 'Sistem',
          timestamp: log.created_at,
          created_at: log.created_at,
        }))
      : [],
    taskId: apiSub.task_id || apiSub.task?.id ? String(apiSub.task_id || apiSub.task?.id) : undefined,
    customerCode: apiSub.customer_code || apiSub.nomor_pelanggan || undefined,
    customer_code: apiSub.customer_code || apiSub.nomor_pelanggan || undefined,
    nomor_pelanggan: apiSub.nomor_pelanggan || apiSub.customer_code || undefined,
    serviceChain: apiSub.service_chain || undefined,
    service_chain: apiSub.service_chain || undefined,
    duplicateWarnings: apiSub.duplicate_warnings || [],
    duplicate_warnings: apiSub.duplicate_warnings || [],
  };
};

/**
 * Maps nested Frontend Submission form inputs to the flat Laravel Submission API request payload.
 */
export const submissionToBackendPayload = (formData: any): any => {
  const pkgVal = String(formData.selectedPackage || '').trim();
  const pkgNameInput = formData.selectedPackageName || '';
  const pkgSpeedInput = formData.packageSpeed;
  const pkgPriceInput = formData.packagePrice;

  // Search package in static package catalog by ID, code, or name
  const selectedPkg = packages.find((p) => {
    if (!pkgVal) return false;
    const lowerVal = pkgVal.toLowerCase();
    const lowerId = String(p.id).toLowerCase();
    const lowerCode = (p.code || '').toLowerCase();
    const lowerName = (p.name || '').toLowerCase();

    return (
      lowerId === lowerVal ||
      lowerCode === lowerVal ||
      lowerName === lowerVal ||
      (lowerName && lowerVal.includes(lowerName)) ||
      (lowerName && lowerName.includes(lowerVal))
    );
  });

  // Helper to parse speed number (e.g., "50Mbps" -> 50)
  const parseSpeed = (val: any): number => {
    if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
    if (!val) return 0;
    const match = String(val).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  const resolvedName =
    pkgNameInput ||
    selectedPkg?.name ||
    (pkgVal && pkgVal !== 'custom' && pkgVal !== 'locked_package' ? pkgVal : 'Paket Internet');

  const resolvedSpeed =
    parseSpeed(pkgSpeedInput) ||
    selectedPkg?.speedMbps ||
    parseSpeed(pkgVal) ||
    30;

  const resolvedPrice =
    typeof pkgPriceInput === 'number' && pkgPriceInput > 0
      ? pkgPriceInput
      : selectedPkg?.price || 155000;

  const resolvedInstallFee = selectedPkg?.installFee ?? 50000;

  return {
    customer_name: formData.name,
    nik: formData.ktp,
    phone: formData.phone,
    whatsapp: formData.whatsapp ? 1 : 0,
    email: formData.email || null,
    address: formData.ktpAddress,
    install_address: formData.sameAsKtp ? formData.ktpAddress : formData.installAddress,
    province: formData.province,
    city: formData.city,
    district: formData.district,
    village: formData.subDistrict || '',
    postal_code: formData.postalCode || '',
    customer_location: formData.coordinates ? {
      latitude: formData.coordinates.lat,
      longitude: formData.coordinates.lng,
    } : null,
    lat: formData.coordinates?.lat || null,
    lng: formData.coordinates?.lng || null,
    package_name: resolvedName,
    package_speed: resolvedSpeed,
    package_price: resolvedPrice,
    installation_fee: resolvedInstallFee,
    promo_code: formData.promoCode || null,
    discount_amount: formData.discountAmount || 0,
  };
};
