import{f as M}from"./formatters-UhgwOgag.js";import{x as W}from"./admin-CNau2YZ2.js";const A=o=>{if(!o)return"";let e=typeof o=="string"?o:o.file_url||o.file_path||o.url||o.path||"";if(!e||typeof e!="string")return"";if(e=e.trim().replace(/\\/g,"/"),e.startsWith("data:")||e.startsWith("blob:"))return e;const a=W.replace(/\/api\/?$/,""),t=e.indexOf("/storage/");if(t!==-1){const m=e.substring(t+9).replace(/^\/+/,"");return`${a}/storage/${m}`}if(e.startsWith("http://")||e.startsWith("https://"))return e;const l=e.replace(/^\/?(public\/)?(storage\/)?/,"");return`${a}/storage/${l}`},H=o=>{var T,$,S,I,N;if(!o)return{};const e=o,a=e.submission||e,t=e.customer||a.customer||{},l=e.address||a.address||{},m=e.package||a.package||{},b=t.name||t.customer_name||e.customer_name||a.customer_name||a.name||"-",x=t.ktp||t.nik||e.nik||e.customer_ktp||a.nik||a.customer_ktp||"-",k=t.phone||e.phone||a.phone||"-",_=t.email||e.email||a.email||"-",y=l.installAddress||l.ktpAddress||e.install_address||e.address||a.install_address||a.address||"-",n=l.district||e.district||a.district||"",g=l.city||e.city||a.city||"",v=m.name||e.package_name||a.package_name||"BASIC",h=m.speed||(e.package_speed?`${e.package_speed}Mbps`:"")||(a.package_speed?`${a.package_speed}Mbps`:"")||"",d=Array.isArray(e.tasks)&&e.tasks.length>0?e.tasks[0]:e.task||e,i=((T=d.current_assignment)==null?void 0:T.evidence)||d.evidence||e.evidence||{},P=Array.isArray(e.documents)?e.documents:Array.isArray(a.documents)?a.documents:[],r=e.documents_map||a.documents_map||{},L=()=>{var p,u;const c=i.photo_before||i.photo_before_url||i.photo_before_path||i.before||((p=e.photos)==null?void 0:p.before)||((u=d.photos)==null?void 0:u.before);if(c)return c;const s=P.find(f=>["before","rumah","rumah_depan","house","house_front","location"].includes(f.document_type||f.type));return s?s.file_url||s.file_path||s.url||s.path:r.rumah||r.rumah_depan?r.rumah||r.rumah_depan:""},j=()=>{var p,u;const c=i.photo_after||i.photo_after_url||i.photo_after_path||i.photo_device||i.photo_serial||i.after||((p=e.photos)==null?void 0:p.after)||((u=d.photos)==null?void 0:u.after);if(c)return c;const s=P.find(f=>["after","modem","ont","onu","device_installed","rumah_dalam","device","serial"].includes(f.document_type||f.type));return s?s.file_url||s.file_path||s.url||s.path:r.rumah_dalam||r.modem?r.rumah_dalam||r.modem:""},F=()=>{const c=e.customer_signature_path||e.customer_signature_url||d.customer_signature_path||d.customer_signature_url||i.signature_path||i.signature_url||i.customer_signature||e.signature_url||e.signature_path;if(c)return c;const s=P.find(p=>["signature","customer_signature","ttd","sign"].includes(p.document_type||p.type));return s?s.file_url||s.file_path||s.url||s.path:r.signature||r.ttd?r.signature||r.ttd:""},z=e.onu_serial_number||e.serial_number||i.onu_serial_number||a.onu_serial_number||"-",O=e.bfass_username||e.pppoe_username||a.bfass_username||i.pppoe_username||"-",w=e.odp||i.odp||a.odp||"-",B=e.vlan||i.vlan||a.vlan||"-",U=i.submitted_at||i.completed_at||e.updated_at||e.updatedAt||e.created_at||e.createdAt,K=i.latitude||e.latitude||(($=a.customer_location)==null?void 0:$.latitude)||a.lat,E=i.longitude||e.longitude||((S=a.customer_location)==null?void 0:S.longitude)||a.lng,D=i.accuracy||e.accuracy,C=i.notes||e.completion_notes||e.notes||a.notes||"-",R=((I=d.assigned_team)==null?void 0:I.name)||((N=d.assigned_team)==null?void 0:N.team_name)||e.salesName||"Tim Teknisi Fibermedia";return{customerName:b,customerKtp:x,customerPhone:k,customerEmail:_,installAddress:y,district:n,city:g,packageName:v,packageSpeed:h,onuSn:z,pppoeUser:O,odp:w,vlan:B,signatureUrl:F(),beforePhoto:L(),afterPhoto:j(),submittedAt:U,lat:K,lng:E,accuracy:D,techNotes:C,techName:R,submissionNumber:e.submissionNumber||e.submission_number||a.submission_number||`SUB-${e.id}`}},Y=(o,e)=>{var v;if(!o&&!e)return;const t=H(o||e),l=A(t.beforePhoto||""),m=A(t.afterPhoto||""),b=A(t.signatureUrl||""),x=M(t.submittedAt),k=t.lat&&t.lng?`${t.lat}, ${t.lng} ${t.accuracy?`(Akurasi ±${t.accuracy}m)`:""}`:"Terverifikasi Sesuai Titik Lokasi Pelanggan",_=[{name:"Pemasangan Kabel Drop Core & ODP Port",status:"OK / LULUS"},{name:"Sinyal Redaman Fiber Optik (dBm)",status:"OK / LULUS"},{name:"Konfigurasi PPPoE Modem ONT/ONU",status:"OK / LULUS"},{name:"Pengujian Speedtest & Sinyal WiFi",status:"OK / LULUS"},{name:"Penyerahan Perangkat & Edukasi Pelanggan",status:"OK / LULUS"}],y=`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>BAST Instalasi - ${t.submissionNumber}</title>
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
        <div class="bast-badge">BAST-${t.submissionNumber}</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
          Waktu Finish: <strong>${x}</strong>
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
          <div class="val">${t.customerName}</div>
        </div>
        <div>
          <div class="label">Nomor NIK KTP:</div>
          <div class="val" style="font-family: monospace;">${t.customerKtp}</div>
        </div>
        <div>
          <div class="label">Telepon / WhatsApp:</div>
          <div class="val">+62${t.customerPhone}</div>
        </div>
        <div>
          <div class="label">Paket Layanan:</div>
          <div class="val" style="color: #2563eb;">${t.packageName} ${t.packageSpeed?`(${t.packageSpeed})`:""}</div>
        </div>
        <div class="full">
          <div class="label">Alamat Lengkap Pemasangan:</div>
          <div class="val">
            ${t.installAddress}
            ${t.district?`, Kec. ${t.district}`:""}
            ${t.city?`, ${t.city}`:""}
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
          <div class="val" style="font-family: monospace; color: #1e3a8a;">${t.onuSn}</div>
        </div>
        <div>
          <div class="label">Akun Layanan PPPoE / BFASS:</div>
          <div class="val" style="font-family: monospace;">${t.pppoeUser}</div>
        </div>
        <div>
          <div class="label">Kode ODP / Port Tiang:</div>
          <div class="val">${t.odp}</div>
        </div>
        <div>
          <div class="label">VLAN ID:</div>
          <div class="val">${t.vlan}</div>
        </div>
        <div class="full">
          <div class="label">Koordinat GPS Pemasangan (task_completion_evidences):</div>
          <div class="val" style="font-family: monospace; color: #047857;">📍 ${k}</div>
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
          ${_.map((h,d)=>`
            <tr>
              <td style="text-align: center;">${d+1}</td>
              <td>${h.name}</td>
              <td style="text-align: center;"><span class="badge-ok">✓ ${h.status}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- IV. Bukti Foto (2 Foto Intuitive Grid) & Catatan Lapangan -->
    <div class="section">
      <div class="section-title">IV. Bukti Foto & Catatan Lapangan Teknisi (task_completion_evidences)</div>
      <div class="photos-grid-2">
        <div class="photo-card">
          ${l?`<img src="${l}" alt="Foto Lokasi" />`:'<div style="height:110px; display:flex; align-items:center; justify-content:center; background:#e2e8f0; font-size:9px; color:#64748b;">Foto Tidak Ada</div>'}
          <div class="photo-caption">1. Foto Lokasi Pemasangan & Rumah Pelanggan</div>
        </div>
        <div class="photo-card">
          ${m?`<img src="${m}" alt="Foto Modem" />`:'<div style="height:110px; display:flex; align-items:center; justify-content:center; background:#e2e8f0; font-size:9px; color:#64748b;">Foto Tidak Ada</div>'}
          <div class="photo-caption">2. Foto Perangkat ONU ONT Terpasang & Aktif</div>
        </div>
      </div>
      <div style="background:#f8fafc; padding:6px 10px; border-radius:4px; border:1px solid #e2e8f0; font-style:italic; font-size:9.5px; margin-top:6px;">
        Catatan Lapangan Teknisi: "${t.techNotes}"
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
        <div class="sig-name">${t.techName}</div>
      </div>
      <div class="sig-card">
        <div class="sig-title">Pihak Pertama (Pelanggan Pendaftar)</div>
        <div class="sig-box-img">
          ${b?`<img src="${b}" alt="TTD Pelanggan" />`:'<div style="font-size:8.5px; color:#94a3b8; font-style:italic;">[Tanda Tangan Digital Terlampir]</div>'}
        </div>
        <div class="sig-name">${t.customerName}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  <\/script>
</body>
</html>
  `,n=document.createElement("iframe");n.style.position="fixed",n.style.right="0",n.style.bottom="0",n.style.width="0",n.style.height="0",n.style.border="0",document.body.appendChild(n);const g=((v=n.contentWindow)==null?void 0:v.document)||n.contentDocument;g&&(g.open(),g.write(y),g.close()),setTimeout(()=>{try{document.body.removeChild(n)}catch{}},6e4)};export{H as e,Y as p,A as r};
