import{j as e}from"./vendor-query-BKo2lb02.js";import{D as A,g as C,B as I,F as L,c as T,t as D}from"./admin-CveELXhX.js";import{f as P}from"./formatters-UhgwOgag.js";import{c as $,e as S,X as B,W as E,a as U}from"./leaflet-Cu3oySJR.js";import{a as _}from"./PrintableBastModal-ByYB3b49.js";import{a as F}from"./vendor-react-CRp4-p1P.js";import{C as R,a as O}from"./card-XNC-roma.js";import{U as z}from"./user-check-9r0k-Ky3.js";import{S as M}from"./sparkles-By1gS8lP.js";import{C as V}from"./copy--7lGyLP8.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K=[["path",{d:"M9 17H7A5 5 0 0 1 7 7h2",key:"8i5ue5"}],["path",{d:"M15 7h2a5 5 0 1 1 0 10h-2",key:"1b9ql8"}],["line",{x1:"8",x2:"16",y1:"12",y2:"12",key:"1jonct"}]],W=$("link-2",K),G=a=>{var x,g,c,p,r,d,o,l,h,f,v,y,u,N,j,k,w,n;if(!a)return;const b=m=>({pending:"MENUNGGU VALIDASI",pending_validation:"MENUNGGU VALIDASI",approved:"DISETUJUI",rejected:"DITOLAK",need_info:"BUTUH INFO TAMBAHAN",provisioning:"DALAM PROSES PROVISI",completed:"SELESAI / AKTIF"})[m==null?void 0:m.toLowerCase()]||(m==null?void 0:m.toUpperCase())||"PENDING",t=`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Work Order & Detail Pengajuan - ${a.submissionNumber||`SUB-${a.id}`}</title>
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
        <div class="sub-badge">${a.submissionNumber||`SUB-${a.id}`}</div>
        <div class="sub-date">Tanggal: <strong>${P(a.createdAt)}</strong></div>
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
          <div class="val">${((x=a.customer)==null?void 0:x.name)||"-"}</div>
        </div>
        <div>
          <div class="label">Nomor NIK KTP:</div>
          <div class="val" style="font-family: monospace;">${((g=a.customer)==null?void 0:g.ktp)||"-"}</div>
        </div>
        <div>
          <div class="label">Nomor Telepon / WhatsApp:</div>
          <div class="val">+62${((c=a.customer)==null?void 0:c.phone)||"-"} ${(p=a.customer)!=null&&p.whatsapp?"(WA)":""}</div>
        </div>
        <div>
          <div class="label">Alamat Email:</div>
          <div class="val">${((r=a.customer)==null?void 0:r.email)||"-"}</div>
        </div>
        <div class="full">
          <div class="label">Alamat Lengkap Pemasangan:</div>
          <div class="val">
            ${((d=a.address)==null?void 0:d.installAddress)||((o=a.address)==null?void 0:o.ktpAddress)||"-"}
            ${(l=a.address)!=null&&l.district?`, Kec. ${a.address.district}`:""}
            ${(h=a.address)!=null&&h.city?`, ${a.address.city}`:""}
            ${(f=a.address)!=null&&f.province?`, ${a.address.province}`:""}
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
          <span style="font-weight: 800; color: #1d4ed8;">${(v=a.package)==null?void 0:v.name} (${(y=a.package)==null?void 0:y.speed})</span>
        </div>
        <div class="bill-row">
          <span>Biaya Berlangganan Bulanan:</span>
          <span style="font-weight: 600;">Rp ${Number(((u=a.package)==null?void 0:u.price)||0).toLocaleString("id-ID")}</span>
        </div>
        <div class="bill-row">
          <span>Biaya Instalasi Pemasangan:</span>
          <span style="font-weight: 600;">Rp ${Number(((N=a.package)==null?void 0:N.installationFee)||5e4).toLocaleString("id-ID")}</span>
        </div>
        ${a.promoCode?`
        <div class="bill-row" style="color: #15803d; font-weight: 600;">
          <span>Diskon Promo (${a.promoCode}):</span>
          <span>-Rp ${Number(a.discount||0).toLocaleString("id-ID")}</span>
        </div>
        `:""}
        <div class="bill-row total">
          <span>Total Biaya Pertama:</span>
          <span>Rp ${Number(a.totalPrice||(((j=a.package)==null?void 0:j.price)||0)+(((k=a.package)==null?void 0:k.installationFee)||5e4)).toLocaleString("id-ID")}</span>
        </div>
      </div>
    </div>

    <!-- III. System Status -->
    <div class="section">
      <div class="section-title">III. Status Sistem & Catatan Verifikasi (System Verification)</div>
      <div class="grid-2">
        <div>
          <div class="label">Status Pengajuan:</div>
          <div class="val" style="color: #1d4ed8;">${b(a.status)}</div>
        </div>
        <div>
          <div class="label">Petugas Sales (Inputor):</div>
          <div class="val">${a.salesName||"Staf Sales"}</div>
        </div>
        ${a.notes?`
        <div class="full">
          <div class="label">Catatan Verifikasi Admin:</div>
          <div class="notes-box">"${a.notes}"</div>
        </div>
        `:""}
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div>
        <div class="sig-label">Petugas Sales / Admin System,</div>
        <div class="sig-space"></div>
        <div class="sig-line">${a.salesName||"Tanda Tangan & Nama Terang"}</div>
      </div>
      <div>
        <div class="sig-label">Pelanggan Pendaftar,</div>
        <div class="sig-space"></div>
        <div class="sig-line">${((w=a.customer)==null?void 0:w.name)||"Tanda Tangan Pelanggan"}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  <\/script>
</body>
</html>
  `,i=document.createElement("iframe");i.style.position="fixed",i.style.right="0",i.style.bottom="0",i.style.width="0",i.style.height="0",i.style.border="0",document.body.appendChild(i);const s=((n=i.contentWindow)==null?void 0:n.document)||i.contentDocument;s&&(s.open(),s.write(t),s.close()),setTimeout(()=>{try{document.body.removeChild(i)}catch{}},6e4)},se=({isOpen:a,onClose:b,submission:t})=>{var x,g,c,p,r,d,o,l,h,f,v,y,u,N,j,k,w;if(!t)return null;const i=()=>{G(t)},s=n=>({pending:"MENUNGGU VALIDASI",pending_validation:"MENUNGGU VALIDASI",approved:"DISETUJUI",rejected:"DITOLAK",need_info:"BUTUH INFO TAMBAHAN",provisioning:"DALAM PROSES PROVISI",completed:"SELESAI / AKTIF"})[n==null?void 0:n.toLowerCase()]||(n==null?void 0:n.toUpperCase())||"PENDING";return e.jsx(A,{open:a,onOpenChange:n=>!n&&b(),children:e.jsxs(C,{className:"max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl rounded-2xl print:shadow-none print:max-w-none print:w-full print:h-auto print:rounded-none",children:[e.jsxs("div",{className:"bg-gray-900 text-white p-4 flex items-center justify-between print:hidden shrink-0",children:[e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx(S,{className:"w-5 h-5 text-emerald-400"}),e.jsx("span",{className:"font-bold text-sm",children:"Pratinjau Work Order & Detail Pengajuan"})]}),e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsxs(I,{onClick:i,className:"bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 font-semibold shadow-sm flex items-center gap-1.5",children:[e.jsx(_,{className:"w-4 h-4"}),"Cetak Dokumen / Simpan PDF"]}),e.jsx(I,{variant:"ghost",size:"icon",onClick:b,className:"h-8 w-8 text-gray-400 hover:text-white",children:e.jsx(B,{className:"w-4 h-4"})})]})]}),e.jsxs("div",{className:"p-6 bg-white overflow-y-auto print:overflow-visible text-gray-800 space-y-4 id-printable-area",children:[e.jsxs("div",{className:"flex items-center justify-between border-b-2 border-blue-600 pb-3",children:[e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsx("img",{src:"/logo-fibermedia.png",alt:"Fibermedia Play Logo",className:"h-12 object-contain"}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-lg font-black text-gray-900 tracking-tight leading-none",children:"FIBERMEDIA PLAY"}),e.jsx("p",{className:"text-[11px] font-semibold text-blue-600",children:"PT Fibermedia Play Indonesia — Provisioning System"}),e.jsx("p",{className:"text-[10px] text-gray-400",children:"Layanan Internet High-Speed Fiber Optik"})]})]}),e.jsxs("div",{className:"text-right",children:[e.jsx("span",{className:"inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono",children:t.submissionNumber||`SUB-${t.id}`}),e.jsxs("p",{className:"text-[10px] text-gray-500 mt-0.5",children:["Tanggal: ",e.jsx("span",{className:"font-semibold text-gray-800",children:P(t.createdAt)})]})]})]}),e.jsxs("div",{className:"text-center py-1.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-lg border border-blue-100",children:[e.jsx("h2",{className:"text-xs font-bold uppercase text-blue-900 tracking-wide",children:"WORK ORDER & DETAIL PENGAJUAN"}),e.jsx("p",{className:"text-[10px] text-gray-500",children:"Formulir Pendaftaran & Verifikasi Pemasangan Baru WiFi Internet"})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("h3",{className:"text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5",children:"I. Informasi Pelanggan (Customer Information)"}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Nama Lengkap:"}),e.jsx("p",{className:"font-bold text-gray-900",children:((x=t.customer)==null?void 0:x.name)||"-"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Nomor NIK KTP:"}),e.jsx("p",{className:"font-mono font-bold text-gray-900",children:((g=t.customer)==null?void 0:g.ktp)||"-"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Nomor Telepon / WhatsApp:"}),e.jsxs("p",{className:"font-bold text-gray-900",children:["+62",((c=t.customer)==null?void 0:c.phone)||"-",((p=t.customer)==null?void 0:p.whatsapp)&&e.jsx("span",{className:"ml-1 text-green-600 font-normal",children:"(WA)"})]})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Alamat Email:"}),e.jsx("p",{className:"font-semibold text-gray-900",children:((r=t.customer)==null?void 0:r.email)||"-"})]}),e.jsxs("div",{className:"col-span-2",children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Alamat Lengkap Pemasangan:"}),e.jsxs("p",{className:"font-semibold text-gray-900",children:[((d=t.address)==null?void 0:d.installAddress)||((o=t.address)==null?void 0:o.ktpAddress)||"-",((l=t.address)==null?void 0:l.district)&&`, Kec. ${t.address.district}`,((h=t.address)==null?void 0:h.city)&&`, ${t.address.city}`,((f=t.address)==null?void 0:f.province)&&`, ${t.address.province}`]})]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("h3",{className:"text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5",children:"II. Informasi Paket Layanan & Pembayaran (Package & Billing)"}),e.jsxs("div",{className:"bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs space-y-1.5",children:[e.jsxs("div",{className:"flex justify-between items-center pb-1.5 border-b border-gray-200",children:[e.jsx("span",{className:"font-semibold text-gray-700",children:"Paket Internet Yang Dipilih:"}),e.jsxs("span",{className:"font-bold text-blue-700 text-xs",children:[(v=t.package)==null?void 0:v.name," (",(y=t.package)==null?void 0:y.speed,")"]})]}),e.jsxs("div",{className:"flex justify-between items-center text-gray-600",children:[e.jsx("span",{children:"Biaya Berlangganan Bulanan:"}),e.jsxs("span",{className:"font-semibold",children:["Rp ",Number(((u=t.package)==null?void 0:u.price)||0).toLocaleString("id-ID")]})]}),e.jsxs("div",{className:"flex justify-between items-center text-gray-600",children:[e.jsx("span",{children:"Biaya Instalasi Pemasangan:"}),e.jsxs("span",{className:"font-semibold",children:["Rp ",Number(((N=t.package)==null?void 0:N.installationFee)||5e4).toLocaleString("id-ID")]})]}),t.promoCode&&e.jsxs("div",{className:"flex justify-between items-center text-green-700 font-semibold",children:[e.jsxs("span",{children:["Diskon Promo (",t.promoCode,"):"]}),e.jsxs("span",{children:["-Rp ",Number(t.discount||0).toLocaleString("id-ID")]})]}),e.jsxs("div",{className:"flex justify-between items-center pt-1.5 border-t border-gray-200 font-bold text-xs text-gray-900",children:[e.jsx("span",{children:"Total Biaya Pertama:"}),e.jsxs("span",{className:"text-blue-700 font-extrabold text-sm",children:["Rp ",Number(t.totalPrice||(((j=t.package)==null?void 0:j.price)||0)+(((k=t.package)==null?void 0:k.installationFee)||5e4)).toLocaleString("id-ID")]})]})]})]}),e.jsxs("div",{className:"space-y-1.5",children:[e.jsx("h3",{className:"text-[11px] font-bold uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-0.5",children:"III. Status Sistem & Catatan Verifikasi (System Verification)"}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-xl border border-gray-200 text-xs",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Status Pengajuan:"}),e.jsx("p",{className:"font-bold text-blue-700 mt-0.5",children:s(t.status)})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Petugas Sales (Inputor):"}),e.jsx("p",{className:"font-bold text-gray-900 mt-0.5",children:t.salesName||"Staf Sales"})]}),t.notes&&e.jsxs("div",{className:"col-span-2",children:[e.jsx("p",{className:"text-gray-500 text-[10px]",children:"Catatan Verifikasi Admin:"}),e.jsxs("p",{className:"italic text-gray-800 bg-white p-1.5 rounded border border-gray-200 mt-0.5 text-[11px]",children:['"',t.notes,'"']})]})]})]}),e.jsxs("div",{className:"pt-4 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid",children:[e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 mb-8 text-[11px]",children:"Petugas Sales / Admin System,"}),e.jsx("div",{className:"border-t border-gray-400 w-44 mx-auto pt-1 font-bold text-gray-900",children:t.salesName||"Tanda Tangan & Nama Terang"})]}),e.jsxs("div",{children:[e.jsx("p",{className:"text-gray-500 mb-8 text-[11px]",children:"Pelanggan Pendaftar,"}),e.jsx("div",{className:"border-t border-gray-400 w-44 mx-auto pt-1 font-bold text-gray-900",children:((w=t.customer)==null?void 0:w.name)||"Tanda Tangan Pelanggan"})]})]})]})]})})},ie=({submission:a,className:b=""})=>{var c,p;const[t,i]=F.useState(null),s=a.serviceChain||a.service_chain||{submission_number:a.submissionNumber||a.submission_number,provisioning_number:(c=a.provisioning)==null?void 0:c.provisioning_number,task_number:((p=a.task)==null?void 0:p.task_number)||a.taskId,customer_code:a.customerCode||a.customer_code||a.nomor_pelanggan,status:a.status,stage:a.status==="completed"?"Layanan Aktif (Selesai)":"Dalam Proses"},x=(r,d,o)=>{r&&(navigator.clipboard.writeText(r),i(o),D.success(`${d} disalin: ${r}`),setTimeout(()=>i(null),2e3))},g=[{key:"submission",title:"1. No. Pengajuan (Sales)",value:s.submission_number,placeholder:"Belum terbit",icon:L,color:"#3b82f6",bgLight:"#eff6ff",isCompleted:!!s.submission_number,isActive:!0},{key:"provisioning",title:"2. No. Validasi (Admin)",value:s.provisioning_number,placeholder:"Menunggu Validasi",icon:S,color:"#8b5cf6",bgLight:"#f5f3ff",isCompleted:!!s.provisioning_number,isActive:!!s.provisioning_number},{key:"task",title:"3. No. Work Order (Teknisi)",value:s.task_number,placeholder:"Menunggu Penugasan",icon:E,color:"#f59e0b",bgLight:"#fffbeb",isCompleted:!!s.task_number,isActive:!!s.task_number},{key:"customer",title:"4. ID Pelanggan (Billing)",value:s.customer_code,placeholder:"Menunggu Aktivasi",icon:z,color:"#10b981",bgLight:"#ecfdf5",isCompleted:!!s.customer_code,isActive:!!s.customer_code,isFinal:!0}];return e.jsxs(R,{className:`border shadow-sm overflow-hidden bg-gradient-to-r from-slate-50 via-white to-slate-50 ${b}`,children:[e.jsxs("div",{className:"bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(W,{className:"w-4 h-4 text-emerald-400"}),e.jsx("span",{className:"font-semibold text-sm tracking-wide",children:"Rantai Pelacakan Layanan (Traceability Chain)"})]}),e.jsx("div",{className:"flex items-center gap-2",children:e.jsxs(T,{className:"bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-normal flex items-center gap-1",children:[e.jsx(M,{className:"w-3 h-3 text-emerald-400"}),s.stage||"Siklus Layanan Terhubung"]})})]}),e.jsx(O,{className:"p-4 sm:p-5",children:e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative",children:g.map((r,d)=>{const o=r.icon,l=!!r.value;return e.jsxs("div",{className:`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${l?"bg-white border-slate-200 shadow-sm hover:border-slate-300":"bg-slate-50/70 border-dashed border-slate-200 opacity-75"}`,children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsxs("span",{className:"text-xs font-semibold text-slate-500 flex items-center gap-1.5",children:[e.jsx("div",{className:"w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-xs",style:{backgroundColor:l?r.color:"#94a3b8"},children:d+1}),r.title.split(". ")[1]||r.title]}),e.jsx(o,{className:"w-4 h-4",style:{color:l?r.color:"#94a3b8"}})]}),e.jsx("div",{className:"mt-1",children:l?e.jsxs("div",{className:"flex items-center justify-between gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100",children:[e.jsx("span",{className:"font-mono text-xs font-bold text-slate-800 truncate",title:r.value,children:r.value}),e.jsx("button",{type:"button",onClick:()=>x(r.value,r.title,r.key),className:"text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200/60 rounded transition-colors",title:"Salin nomor",children:t===r.key?e.jsx(U,{className:"w-3.5 h-3.5 text-emerald-600"}):e.jsx(V,{className:"w-3.5 h-3.5"})})]}):e.jsx("div",{className:"p-2 rounded-lg bg-slate-100/60 text-slate-400 text-xs italic font-medium",children:r.placeholder})})]}),e.jsxs("div",{className:"mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]",children:[e.jsx("span",{className:"text-slate-400",children:"Status"}),l?e.jsxs("span",{className:"font-medium text-emerald-600 flex items-center gap-1",children:[e.jsx("span",{className:"w-1.5 h-1.5 rounded-full bg-emerald-500"}),"Terbit"]}):e.jsx("span",{className:"text-slate-400",children:"Menunggu"})]})]},r.key)})})})]})};export{se as P,ie as S};
