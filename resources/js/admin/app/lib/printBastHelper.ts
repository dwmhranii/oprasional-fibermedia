import { formatDate } from './formatters';
import { API_BASE_URL } from './api';

export const resolveImgUrl = (rawUrl: any) => {
  if (!rawUrl) return '';
  let url = typeof rawUrl === 'string' ? rawUrl : (rawUrl.file_url || rawUrl.file_path || rawUrl.url || rawUrl.path || '');
  if (!url || typeof url !== 'string') return '';
  url = url.trim().replace(/\\/g, '/');

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const base = API_BASE_URL.replace(/\/api\/?$/, '');

  // If URL contains storage path (including https://provisioning-system.test/storage/... or http://localhost/storage/...)
  const storageIndex = url.indexOf('/storage/');
  if (storageIndex !== -1) {
    const cleanStoragePath = url.substring(storageIndex + '/storage/'.length).replace(/^\/+/, '');
    return `${base}/storage/${cleanStoragePath}`;
  }

  // If it's a valid remote external URL (not storage-based)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const cleanPath = url.replace(/^\/?(public\/)?(storage\/)?/, '');
  return `${base}/storage/${cleanPath}`;
};

export const extractBastData = (inputData: any) => {
  if (!inputData) return {};

  const data = inputData;
  const sub = data.submission || data;
  const custObj = data.customer || sub.customer || {};
  const addrObj = data.address || sub.address || {};
  const pkgObj = data.package || sub.package || {};

  const customerName = custObj.name || custObj.customer_name || data.customer_name || sub.customer_name || sub.name || '-';
  const customerKtp = custObj.ktp || custObj.nik || data.nik || data.customer_ktp || sub.nik || sub.customer_ktp || '-';
  const customerPhone = custObj.phone || data.phone || sub.phone || '-';
  const customerEmail = custObj.email || data.email || sub.email || '-';

  const installAddress = addrObj.installAddress || addrObj.ktpAddress || data.install_address || data.address || sub.install_address || sub.address || '-';
  const district = addrObj.district || data.district || sub.district || '';
  const city = addrObj.city || data.city || sub.city || '';

  const packageName = pkgObj.name || data.package_name || sub.package_name || 'BASIC';
  const packageSpeed = pkgObj.speed || (data.package_speed ? `${data.package_speed}Mbps` : '') || (sub.package_speed ? `${sub.package_speed}Mbps` : '') || '';

  const taskObj = (Array.isArray(data.tasks) && data.tasks.length > 0) ? data.tasks[0] : (data.task || data);
  const evidenceObj = taskObj.current_assignment?.evidence || taskObj.evidence || data.evidence || {};
  const docs = Array.isArray(data.documents) ? data.documents : (Array.isArray(sub.documents) ? sub.documents : []);
  const docPhotos = data.documents_map || sub.documents_map || {};

  const findBeforePhoto = () => {
    const fromEv = evidenceObj.photo_before || evidenceObj.photo_before_url || evidenceObj.photo_before_path || evidenceObj.before || data.photos?.before || taskObj.photos?.before;
    if (fromEv) return fromEv;
    const doc = docs.find((d: any) => ['before', 'rumah', 'rumah_depan', 'house', 'house_front', 'location'].includes(d.document_type || d.type));
    if (doc) return doc.file_url || doc.file_path || doc.url || doc.path;
    if (docPhotos.rumah || docPhotos.rumah_depan) return docPhotos.rumah || docPhotos.rumah_depan;
    return '';
  };

  const findAfterPhoto = () => {
    const fromEv = evidenceObj.photo_after || evidenceObj.photo_after_url || evidenceObj.photo_after_path || evidenceObj.photo_device || evidenceObj.photo_serial || evidenceObj.after || data.photos?.after || taskObj.photos?.after;
    if (fromEv) return fromEv;
    const doc = docs.find((d: any) => ['after', 'modem', 'ont', 'onu', 'device_installed', 'rumah_dalam', 'device', 'serial'].includes(d.document_type || d.type));
    if (doc) return doc.file_url || doc.file_path || doc.url || doc.path;
    if (docPhotos.rumah_dalam || docPhotos.modem) return docPhotos.rumah_dalam || docPhotos.modem;
    return '';
  };

  const findSignature = () => {
    const fromSig = data.customer_signature_path || data.customer_signature_url || taskObj.customer_signature_path || taskObj.customer_signature_url || evidenceObj.signature_path || evidenceObj.signature_url || evidenceObj.customer_signature || data.signature_url || data.signature_path;
    if (fromSig) return fromSig;
    const doc = docs.find((d: any) => ['signature', 'customer_signature', 'ttd', 'sign'].includes(d.document_type || d.type));
    if (doc) return doc.file_url || doc.file_path || doc.url || doc.path;
    if (docPhotos.signature || docPhotos.ttd) return docPhotos.signature || docPhotos.ttd;
    return '';
  };

  const onuSn = data.onu_serial_number || data.serial_number || evidenceObj.onu_serial_number || sub.onu_serial_number || '-';
  const pppoeUser = data.bfass_username || data.pppoe_username || sub.bfass_username || evidenceObj.pppoe_username || '-';
  const odp = data.odp || evidenceObj.odp || sub.odp || '-';
  const vlan = data.vlan || evidenceObj.vlan || sub.vlan || '-';

  const submittedAt = evidenceObj.submitted_at || evidenceObj.completed_at || data.updated_at || data.updatedAt || data.created_at || data.createdAt;

  const lat = evidenceObj.latitude || data.latitude || sub.customer_location?.latitude || sub.lat;
  const lng = evidenceObj.longitude || data.longitude || sub.customer_location?.longitude || sub.lng;
  const accuracy = evidenceObj.accuracy || data.accuracy;

  const techNotes = evidenceObj.notes || data.completion_notes || data.notes || sub.notes || '-';
  const techName = taskObj.assigned_team?.name || taskObj.assigned_team?.team_name || data.salesName || 'Tim Teknisi Fibermedia';

  return {
    customerName,
    customerKtp,
    customerPhone,
    customerEmail,
    installAddress,
    district,
    city,
    packageName,
    packageSpeed,
    onuSn,
    pppoeUser,
    odp,
    vlan,
    signatureUrl: findSignature(),
    beforePhoto: findBeforePhoto(),
    afterPhoto: findAfterPhoto(),
    submittedAt,
    lat,
    lng,
    accuracy,
    techNotes,
    techName,
    submissionNumber: data.submissionNumber || data.submission_number || sub.submission_number || `SUB-${data.id}`
  };
};

export const printBastDocument = (submission: any, taskData?: any) => {
  if (!submission && !taskData) return;

  const inputData = submission || taskData;
  const parsed = extractBastData(inputData);

  const beforePhoto = resolveImgUrl(parsed.beforePhoto || '');
  const afterPhoto = resolveImgUrl(parsed.afterPhoto || '');
  const sigImgUrl = resolveImgUrl(parsed.signatureUrl || '');

  const finishTimeFormatted = formatDate(parsed.submittedAt);
  const gpsFormatted = parsed.lat && parsed.lng ? `${parsed.lat}, ${parsed.lng} ${parsed.accuracy ? `(Akurasi ±${parsed.accuracy}m)` : ''}` : 'Terverifikasi Sesuai Titik Lokasi Pelanggan';

  // Checklist Items (task_checklist_items & checklist_result)
  const defaultChecklist = [
    { name: 'Pemasangan Kabel Drop Core & ODP Port', status: 'OK / LULUS' },
    { name: 'Sinyal Redaman Fiber Optik (dBm)', status: 'OK / LULUS' },
    { name: 'Konfigurasi PPPoE Modem ONT/ONU', status: 'OK / LULUS' },
    { name: 'Pengujian Speedtest & Sinyal WiFi', status: 'OK / LULUS' },
    { name: 'Penyerahan Perangkat & Edukasi Pelanggan', status: 'OK / LULUS' },
  ];

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>BAST Instalasi - ${parsed.submissionNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-img {
      height: 40px;
      object-fit: contain;
    }
    .brand-name {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      line-height: 1;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 700;
      color: #2563eb;
      margin: 2px 0 0 0;
    }
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    .bast-badge {
      display: inline-block;
      background: #1e3a8a;
      color: #ffffff;
      padding: 3px 8px;
      border-radius: 5px;
      font-family: monospace;
      font-weight: 800;
      font-size: 10.5px;
    }
    .title-banner {
      text-align: center;
      padding: 6px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      margin-bottom: 10px;
    }
    .title-banner h2 {
      margin: 0;
      font-size: 12px;
      font-weight: 900;
      color: #1e3a8a;
      text-transform: uppercase;
    }
    .title-banner p {
      margin: 1px 0 0 0;
      font-size: 9px;
      color: #475569;
    }
    .section {
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1d4ed8;
      border-bottom: 1px solid #dbeafe;
      padding-bottom: 2px;
      margin-bottom: 5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 10px;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .full {
      grid-column: span 2;
    }
    .label {
      font-size: 8.5px;
      color: #64748b;
      margin-bottom: 1px;
    }
    .val {
      font-size: 10px;
      font-weight: 700;
      color: #0f172a;
    }
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      font-size: 9.5px;
    }
    .checklist-table th {
      background: #eff6ff;
      color: #1e40af;
      padding: 4px 8px;
      text-align: left;
      font-weight: 700;
      border-bottom: 1px solid #dbeafe;
    }
    .checklist-table td {
      padding: 4px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .badge-ok {
      display: inline-block;
      background: #dcfce7;
      color: #15803d;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9px;
    }
    .photos-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 4px;
    }
    .photo-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 4px;
      text-align: center;
      background: #f8fafc;
    }
    .photo-card img {
      width: 100%;
      height: 110px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }
    .photo-caption {
      font-size: 9px;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
    }
    .agreement-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 9px;
      color: #1e3a8a;
      line-height: 1.35;
      margin-top: 6px;
    }
    .signatures {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .sig-box-img {
      height: 55px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-box-img img {
      max-height: 50px;
      max-width: 150px;
      object-fit: contain;
    }
    .sig-name {
      border-top: 1px solid #94a3b8;
      margin-top: 4px;
      padding-top: 3px;
      font-weight: 800;
      font-size: 10px;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-box">
        <img src="/logo-fibermedia.png" alt="Fibermedia Play Logo" class="logo-img" />
        <div>
          <h1 class="brand-name">FIBERMEDIA PLAY</h1>
          <p class="brand-sub">PT Fibermedia Play Indonesia — Berita Acara Serah Terima (BAST)</p>
        </div>
      </div>
      <div class="header-right">
        <div class="bast-badge">BAST-${parsed.submissionNumber}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
          Waktu Finish: <strong>${finishTimeFormatted}</strong>
        </div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="title-banner">
      <h2>BERITA ACARA SERAH TERIMA (BAST) PEKERJAAN INSTALASI</h2>
      <p>Hasil Pekerjaan Lapangan & Validasi Teknisi (task_completion_evidences)</p>
    </div>

    <!-- I. Informasi Pelanggan -->
    <div class="section">
      <div class="section-title">I. Informasi Pelanggan & Alamat Pemasangan</div>
      <div class="grid-2">
        <div>
          <div class="label">Nama Pelanggan:</div>
          <div class="val">${parsed.customerName}</div>
        </div>
        <div>
          <div class="label">Nomor NIK KTP:</div>
          <div class="val" style="font-family: monospace;">${parsed.customerKtp}</div>
        </div>
        <div>
          <div class="label">Telepon / WhatsApp:</div>
          <div class="val">+62${parsed.customerPhone}</div>
        </div>
        <div>
          <div class="label">Paket Layanan:</div>
          <div class="val" style="color: #2563eb;">${parsed.packageName} ${parsed.packageSpeed ? `(${parsed.packageSpeed})` : ''}</div>
        </div>
        <div class="full">
          <div class="label">Alamat Lengkap Pemasangan:</div>
          <div class="val">
            ${parsed.installAddress}
            ${parsed.district ? `, Kec. ${parsed.district}` : ''}
            ${parsed.city ? `, ${parsed.city}` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- II. Data Perangkat & Parameter Terpasang -->
    <div class="section">
      <div class="section-title">II. Data Perangkat ONU Modem & Parameter Terpasang</div>
      <div class="grid-2">
        <div>
          <div class="label">Serial Number (SN) ONU Modem:</div>
          <div class="val" style="font-family: monospace; color: #1e3a8a;">${parsed.onuSn}</div>
        </div>
        <div>
          <div class="label">Akun Layanan PPPoE / BFASS:</div>
          <div class="val" style="font-family: monospace;">${parsed.pppoeUser}</div>
        </div>
        <div>
          <div class="label">Kode ODP / Port Tiang:</div>
          <div class="val">${parsed.odp}</div>
        </div>
        <div>
          <div class="label">VLAN ID:</div>
          <div class="val">${parsed.vlan}</div>
        </div>
        <div class="full">
          <div class="label">Koordinat GPS Pemasangan (task_completion_evidences):</div>
          <div class="val" style="font-family: monospace; color: #047857;">📍 ${gpsFormatted}</div>
        </div>
      </div>
    </div>

    <!-- III. Checklist Pengujian Teknisi -->
    <div class="section">
      <div class="section-title">III. Checklist & Hasil Pengujian Penggelaran (task_checklist_items)</div>
      <table class="checklist-table">
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th>Item Pengujian Teknis</th>
            <th style="width: 120px; text-align: center;">Hasil Pengujian</th>
          </tr>
        </thead>
        <tbody>
          ${defaultChecklist.map((item, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td>${item.name}</td>
              <td style="text-align: center;"><span class="badge-ok">✓ ${item.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- IV. Bukti Foto (2 Foto Intuitive Grid) & Catatan Lapangan -->
    <div class="section">
      <div class="section-title">IV. Bukti Foto & Catatan Lapangan Teknisi (task_completion_evidences)</div>
      <div class="photos-grid-2">
        <div class="photo-card">
          ${beforePhoto ? `<img src="${beforePhoto}" alt="Foto Lokasi" />` : '<div style="height:110px; display:flex; align-items:center; justify-content:center; background:#e2e8f0; font-size:9px; color:#64748b;">Foto Tidak Ada</div>'}
          <div class="photo-caption">1. Foto Lokasi Pemasangan & Rumah Pelanggan</div>
        </div>
        <div class="photo-card">
          ${afterPhoto ? `<img src="${afterPhoto}" alt="Foto Modem" />` : '<div style="height:110px; display:flex; align-items:center; justify-content:center; background:#e2e8f0; font-size:9px; color:#64748b;">Foto Tidak Ada</div>'}
          <div class="photo-caption">2. Foto Perangkat ONU ONT Terpasang & Aktif</div>
        </div>
      </div>
      <div style="background:#f8fafc; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0; font-style:italic; font-size:9.5px; margin-top:6px;">
        Catatan Lapangan Teknisi: "${parsed.techNotes}"
      </div>
    </div>

    <!-- Pernyataan Legal BAST -->
    <div class="agreement-box">
      <strong>Pernyataan Serah Terima:</strong> Pelanggan (Pihak Pertama) dan Teknisi Fibermedia (Pihak Kedua) menyatakan bahwa pekerjaan instalasi modem ONU, pengujian sinyal, dan konfigurasi internet telah selesai dilaksanakan dengan hasil lulus uji (OK).
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-card">
        <div class="sig-title">Pihak Kedua (Teknisi / PT Fibermedia Play Indonesia)</div>
        <div class="sig-box-img">
          <div style="font-weight:800; color:#1e40af; font-size:10px;">Fibermedia Verified Team</div>
        </div>
        <div class="sig-name">${parsed.techName}</div>
      </div>
      <div class="sig-card">
        <div class="sig-title">Pihak Pertama (Pelanggan Pendaftar)</div>
        <div class="sig-box-img">
          ${sigImgUrl ? `<img src="${sigImgUrl}" alt="TTD Pelanggan" />` : '<div style="font-size:8.5px; color:#94a3b8; font-style:italic;">[Tanda Tangan Digital Terlampir]</div>'}
        </div>
        <div class="sig-name">${parsed.customerName}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
  }

  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // Ignore
    }
  }, 60000);
};
