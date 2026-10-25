import { formatDate } from './formatters';

export const printSpkDocument = (submission: any) => {
  if (!submission) return;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'MENUNGGU VALIDASI',
      pending_validation: 'MENUNGGU VALIDASI',
      approved: 'DISETUJUI',
      rejected: 'DITOLAK',
      need_info: 'BUTUH INFO TAMBAHAN',
      provisioning: 'DALAM PROSES PROVISI',
      completed: 'SELESAI / AKTIF',
    };
    return labels[status?.toLowerCase()] || status?.toUpperCase() || 'PENDING';
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Work Order & Detail Pengajuan - ${submission.submissionNumber || `SUB-${submission.id}`}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .container {
      width: 100%;
      max-width: 100%;
      padding: 4px;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .logo-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      height: 48px;
      object-fit: contain;
    }
    .brand-name {
      font-size: 18px;
      font-weight: 900;
      color: #111827;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #2563eb;
      margin: 1px 0 0 0;
    }
    .brand-desc {
      font-size: 9px;
      color: #9ca3af;
      margin: 0;
    }
    .header-right {
      text-align: right;
    }
    .sub-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: monospace;
      font-weight: 700;
      font-size: 11px;
    }
    .sub-date {
      font-size: 10px;
      color: #6b7280;
      margin-top: 3px;
    }
    .title-banner {
      text-align: center;
      padding: 6px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .title-banner h2 {
      margin: 0;
      font-size: 12px;
      font-weight: 800;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-banner p {
      margin: 1px 0 0 0;
      font-size: 9.5px;
      color: #64748b;
    }
    .section {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1d4ed8;
      border-bottom: 1px solid #dbeafe;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: #f9fafb;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .full {
      grid-column: span 2;
    }
    .label {
      font-size: 9.5px;
      color: #6b7280;
      margin-bottom: 1px;
    }
    .val {
      font-size: 11px;
      font-weight: 700;
      color: #111827;
    }
    .billing-box {
      background: #f9fafb;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .bill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 10.5px;
    }
    .bill-row.border {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 3px;
    }
    .bill-row.total {
      border-top: 1px solid #e5e7eb;
      padding-top: 4px;
      margin-top: 3px;
      font-weight: 800;
      font-size: 12px;
      color: #1d4ed8;
    }
    .notes-box {
      background: #ffffff;
      padding: 6px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
      font-style: italic;
      margin-top: 2px;
    }
    .signatures {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-label {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 40px;
    }
    .sig-line {
      border-top: 1px solid #9ca3af;
      width: 170px;
      margin: 0 auto;
      padding-top: 4px;
      font-weight: 700;
      font-size: 11px;
      color: #111827;
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
          <p class="brand-sub">PT Fibermedia Play Indonesia — Provisioning System</p>
          <p class="brand-desc">Layanan Internet High-Speed Fiber Optik</p>
        </div>
      </div>
      <div class="header-right">
        <div class="sub-badge">${submission.submissionNumber || `SUB-${submission.id}`}</div>
        <div class="sub-date">Tanggal: <strong>${formatDate(submission.createdAt)}</strong></div>
      </div>
    </div>

    <!-- Title -->
    <div class="title-banner">
      <h2>WORK ORDER & DETAIL PENGAJUAN</h2>
      <p>Formulir Pendaftaran & Verifikasi Pemasangan Baru WiFi Internet</p>
    </div>

    <!-- I. Customer Info -->
    <div class="section">
      <div class="section-title">I. Informasi Pelanggan (Customer Information)</div>
      <div class="grid-2">
        <div>
          <div class="label">Nama Lengkap:</div>
          <div class="val">${submission.customer?.name || '-'}</div>
        </div>
        <div>
          <div class="label">Nomor NIK KTP:</div>
          <div class="val" style="font-family: monospace;">${submission.customer?.ktp || '-'}</div>
        </div>
        <div>
          <div class="label">Nomor Telepon / WhatsApp:</div>
          <div class="val">+62${submission.customer?.phone || '-'} ${submission.customer?.whatsapp ? '(WA)' : ''}</div>
        </div>
        <div>
          <div class="label">Alamat Email:</div>
          <div class="val">${submission.customer?.email || '-'}</div>
        </div>
        <div class="full">
          <div class="label">Alamat Lengkap Pemasangan:</div>
          <div class="val">
            ${submission.address?.installAddress || submission.address?.ktpAddress || '-'}
            ${submission.address?.district ? `, Kec. ${submission.address.district}` : ''}
            ${submission.address?.city ? `, ${submission.address.city}` : ''}
            ${submission.address?.province ? `, ${submission.address.province}` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- II. Package & Billing -->
    <div class="section">
      <div class="section-title">II. Informasi Paket Layanan & Pembayaran (Package & Billing)</div>
      <div class="billing-box">
        <div class="bill-row border">
          <span style="font-weight: 600;">Paket Internet Yang Dipilih:</span>
          <span style="font-weight: 800; color: #1d4ed8;">${submission.package?.name} (${submission.package?.speed})</span>
        </div>
        <div class="bill-row">
          <span>Biaya Berlangganan Bulanan:</span>
          <span style="font-weight: 600;">Rp ${Number(submission.package?.price || 0).toLocaleString('id-ID')}</span>
        </div>
        <div class="bill-row">
          <span>Biaya Instalasi Pemasangan:</span>
          <span style="font-weight: 600;">Rp ${Number(submission.package?.installationFee || 50000).toLocaleString('id-ID')}</span>
        </div>
        ${submission.promoCode ? `
        <div class="bill-row" style="color: #15803d; font-weight: 600;">
          <span>Diskon Promo (${submission.promoCode}):</span>
          <span>-Rp ${Number(submission.discount || 0).toLocaleString('id-ID')}</span>
        </div>
        ` : ''}
        <div class="bill-row total">
          <span>Total Biaya Pertama:</span>
          <span>Rp ${Number(submission.totalPrice || (submission.package?.price || 0) + (submission.package?.installationFee || 50000)).toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>

    <!-- III. System Status -->
    <div class="section">
      <div class="section-title">III. Status Sistem & Catatan Verifikasi (System Verification)</div>
      <div class="grid-2">
        <div>
          <div class="label">Status Pengajuan:</div>
          <div class="val" style="color: #1d4ed8;">${getStatusLabel(submission.status)}</div>
        </div>
        <div>
          <div class="label">Petugas Sales (Inputor):</div>
          <div class="val">${submission.salesName || 'Staf Sales'}</div>
        </div>
        ${submission.notes ? `
        <div class="full">
          <div class="label">Catatan Verifikasi Admin:</div>
          <div class="notes-box">"${submission.notes}"</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div>
        <div class="sig-label">Petugas Sales / Admin System,</div>
        <div class="sig-space"></div>
        <div class="sig-line">${submission.salesName || 'Tanda Tangan & Nama Terang'}</div>
      </div>
      <div>
        <div class="sig-label">Pelanggan Pendaftar,</div>
        <div class="sig-space"></div>
        <div class="sig-line">${submission.customer?.name || 'Tanda Tangan Pelanggan'}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
  `;

  // Create an iframe to print isolated document
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

  // Remove iframe after user closes print dialog
  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // Ignore if already removed
    }
  }, 60000);
};
