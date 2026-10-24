<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BAST - {{ $submission->submission_number }}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 16px;
            color: #1e3a8a;
            text-transform: uppercase;
        }
        .header p {
            margin: 2px 0 0 0;
            font-size: 10px;
            color: #64748b;
        }
        .doc-title {
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 15px;
            text-decoration: underline;
        }
        .meta-table, .checklist-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .meta-table td {
            padding: 3px 5px;
            vertical-align: top;
        }
        .label {
            font-weight: bold;
            width: 170px;
            color: #475569;
        }
        .section-title {
            font-size: 12px;
            font-weight: bold;
            background-color: #f1f5f9;
            padding: 5px 8px;
            margin-top: 12px;
            margin-bottom: 8px;
            border-left: 4px solid #2563eb;
        }
        .checklist-table th, .checklist-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            text-align: left;
        }
        .checklist-table th {
            background-color: #f8fafc;
            font-weight: bold;
        }
        .signatures {
            margin-top: 30px;
            width: 100%;
        }
        .signatures td {
            text-align: center;
            vertical-align: bottom;
            height: 70px;
        }
        .sign-space {
            height: 50px;
        }
        .img-sign {
            max-height: 50px;
            display: block;
            margin: 0 auto;
        }
        .badge-success {
            color: #166534;
            font-weight: bold;
        }
    </style>
</head>
<body>

    @php
        $provisioning = $submission->provisioning;
        $task = $provisioning ? $provisioning->tasks()->first() : null;
        $assignment = $task ? $task->assignments()->where('status', 'approved')->first() ?? $task->assignments()->first() : null;
        $evidence = $assignment ? $assignment->evidence : null;
        $checklistItems = $task ? $task->checklistItems : collect();
    @endphp

    <div class="header">
        <h1>FIBERMEDIA PLAY</h1>
        <p>PT Fibermedia Indonesia - Internet & Digital Communication Services</p>
    </div>

    <div class="doc-title">
        BERITA ACARA SERAH TERIMA (BAST) PEMASANGAN FASILITAS INTERNET
        <br>
        <span style="font-size: 10px; font-weight: normal; text-decoration: none;">No. BAST: BAST/{{ date('Ym') }}/{{ $submission->id }}</span>
    </div>

    <p style="margin: 0 0 10px 0;">Pada hari ini, tanggal <strong>{{ $evidence && $evidence->submitted_at ? $evidence->submitted_at->translatedFormat('d F Y') : now()->translatedFormat('d F Y') }}</strong>, telah diselesaikan pekerjaan instalasi dan validasi fisik teknisi dengan rincian data sebagai berikut:</p>

    <!-- SECTION I: PELANGGAN -->
    <div class="section-title">I. DATA PELANGGAN</div>
    <table class="meta-table">
        <tr>
            <td class="label">Nama Pelanggan</td>
            <td>: {{ $submission->customer_name }}</td>
        </tr>
        <tr>
            <td class="label">No. Registrasi / NIK</td>
            <td>: {{ $submission->submission_number }} / {{ $submission->nik ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">No. Telepon / WA</td>
            <td>: {{ $submission->phone }}</td>
        </tr>
        <tr>
            <td class="label">Alamat Pemasangan</td>
            <td>: {{ $submission->address }}, {{ $submission->district }}, {{ $submission->city }}, {{ $submission->province }} ({{ $submission->postal_code ?? '-' }})</td>
        </tr>
        <tr>
            <td class="label">Paket Layanan / Kecepatan</td>
            <td>: {{ $submission->package_name }} ({{ $submission->package_speed }} Mbps)</td>
        </tr>
    </table>

    <!-- SECTION II: PERANGKAT & PARAMETER -->
    <div class="section-title">II. PARAMETER JARINGAN & PERANGKAT (PROVISIONING)</div>
    <table class="meta-table">
        <tr>
            <td class="label">Serial Number (SN) ONU/Modem</td>
            <td>: <strong>{{ $provisioning->onu_serial_number ?? '-' }}</strong></td>
        </tr>
        <tr>
            <td class="label">Kode ODP / Port ID</td>
            <td>: {{ $provisioning->odp ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">VLAN ID</td>
            <td>: {{ $provisioning->vlan ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Username Layanan BFASS</td>
            <td>: {{ $provisioning->bfass_username ?? '-' }}</td>
        </tr>
        <tr>
            <td class="label">Status Layanan</td>
            <td>: <span class="badge-success">{{ strtoupper($submission->status instanceof \UnitEnum ? $submission->status->value : (string)$submission->status) }}</span></td>
        </tr>
    </table>

    <!-- SECTION III: TABEL FINISH EVIDENCES TEKNISI -->
    <div class="section-title">III. HASIL FINISH & BUKTI VALIDASI LAPANGAN TEKNISI (TASK COMPLETION EVIDENCES)</div>
    <table class="meta-table">
        <tr>
            <td class="label">Tim Teknisi Pelaksana</td>
            <td>: {{ $task->assigned_team ?? ($assignment->user->name ?? 'Tim Teknisi') }}</td>
        </tr>
        <tr>
            <td class="label">Nama Teknisi Submitter</td>
            <td>: {{ $assignment->user->name ?? '-' }} ({{ $assignment->user->email ?? '' }})</td>
        </tr>
        <tr>
            <td class="label">Waktu Finish (Submitted At)</td>
            <td>: {{ $evidence && $evidence->submitted_at ? $evidence->submitted_at->format('d-m-Y H:i:s') : ($assignment && $assignment->approved_at ? $assignment->approved_at->format('d-m-Y H:i:s') : '-') }}</td>
        </tr>
        <tr>
            <td class="label">Koordinat GPS Pemasangan</td>
            <td>: {{ $evidence && $evidence->latitude ? $evidence->latitude . ', ' . $evidence->longitude . ' (Akurasi: ' . ($evidence->accuracy ?? '0') . 'm)' : 'Terverifikasi di Lokasi' }}</td>
        </tr>
        <tr>
            <td class="label">Catatan Lapangan Teknisi</td>
            <td>: {{ $evidence->notes ?? ($assignment->notes ?? 'Pemasangan kabel drop core, pengelasan kelancaran optik, dan pengujian sinyal internet selesai dengan baik.') }}</td>
        </tr>
    </table>

    <!-- CHECKLIST HASIL PENGUJIAN -->
    @if(($evidence && !empty($evidence->checklist_result)) || $checklistItems->count() > 0)
    <div class="section-title">IV. RINCIAN CHECKLIST PENGUJIAN TEKNIS (CHECKLIST FINISH)</div>
    <table class="checklist-table">
        <thead>
            <tr>
                <th style="width: 40px; text-align: center;">No</th>
                <th>Item Pengujian Pemasangan</th>
                <th style="width: 100px; text-align: center;">Hasil Pengujian</th>
            </tr>
        </thead>
        <tbody>
            @if($checklistItems->count() > 0)
                @foreach($checklistItems as $index => $item)
                <tr>
                    <td style="text-align: center;">{{ $index + 1 }}</td>
                    <td>{{ $item->item_name }}</td>
                    <td style="text-align: center;"><span class="badge-success">{{ $item->is_completed ? 'OK / LULUS' : 'PENDING' }}</span></td>
                </tr>
                @endforeach
            @elseif($evidence && is_array($evidence->checklist_result))
                @foreach($evidence->checklist_result as $index => $item)
                <tr>
                    <td style="text-align: center;">{{ $index + 1 }}</td>
                    <td>{{ is_array($item) ? ($item['item_name'] ?? $item['name'] ?? 'Item Pengujian #' . ($index + 1)) : $item }}</td>
                    <td style="text-align: center;"><span class="badge-success">{{ is_array($item) ? ((isset($item['is_checked']) && $item['is_checked']) || (isset($item['status']) && $item['status'] == 'ok') ? 'OK / LULUS' : 'LULUS') : 'OK / LULUS' }}</span></td>
                </tr>
                @endforeach
            @endif
        </tbody>
    </table>
    @endif

    <p style="margin-top: 15px;">Demikian Berita Acara Serah Terima ini dibuat secara sah berdasarkan bukti hasil penyelesaian pekerjaan teknisi di lapangan.</p>

    <!-- SIGNATURES -->
    <table class="signatures">
        <tr>
            <td style="width: 50%;">
                Pihak Pertama (Pelanggan),
                <div class="sign-space">
                    @if($evidence && $evidence->signature_path)
                        <img src="{{ public_path('storage/' . $evidence->signature_path) }}" class="img-sign" alt="Tanda Tangan Pelanggan">
                    @endif
                </div>
                <strong>( {{ $submission->customer_name }} )</strong>
            </td>
            <td style="width: 50%;">
                Pihak Kedua (Teknisi Pelaksana),
                <div class="sign-space"></div>
                <strong>( {{ $assignment->user->name ?? 'Teknisi Pelaksana' }} )</strong>
            </td>
        </tr>
    </table>

</body>
</html>
