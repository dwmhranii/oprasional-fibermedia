<!DOCTYPE html>
<html>
<head>
    <title>Submission Detail - {{ $submission->submission_number }}</title>
    <style>
        body { font-family: sans-serif; font-size: 14px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .row { margin-bottom: 10px; }
        .label { font-weight: bold; width: 150px; display: inline-block; }
        .section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
    </style>
</head>
<body>

    <div class="header">
        <h2>Fibermedia Provisioning System</h2>
        <h3>Submission Detail: {{ $submission->submission_number }}</h3>
    </div>

    <div class="section">
        <h4>Customer Information</h4>
        <div class="row"><span class="label">Name:</span> {{ $submission->customer_name }}</div>
        <div class="row"><span class="label">Phone:</span> {{ $submission->phone }}</div>
        <div class="row"><span class="label">Email:</span> {{ $submission->email ?? '-' }}</div>
        <div class="row"><span class="label">Address:</span> {{ $submission->address }}, {{ $submission->district }}, {{ $submission->city }}, {{ $submission->province }}</div>
    </div>

    <div class="section">
        <h4>Package Information</h4>
        <div class="row"><span class="label">Package:</span> {{ $submission->package_name }}</div>
        <div class="row"><span class="label">Speed:</span> {{ $submission->package_speed }} Mbps</div>
        <div class="row"><span class="label">Price:</span> Rp {{ number_format($submission->package_price, 0, ',', '.') }}</div>
        <div class="row"><span class="label">Installation Fee:</span> Rp {{ number_format($submission->installation_fee, 0, ',', '.') }}</div>
        <div class="row"><span class="label">Total:</span> Rp {{ number_format($submission->total_price, 0, ',', '.') }}</div>
    </div>

    <div class="section">
        <h4>System Information</h4>
        <div class="row"><span class="label">Status:</span> {{ strtoupper($submission->status instanceof \UnitEnum ? $submission->status->value : (string)$submission->status) }}</div>
        <div class="row"><span class="label">Sales:</span> {{ $submission->user->name ?? 'N/A' }}</div>
        <div class="row"><span class="label">Submitted At:</span> {{ $submission->created_at ? $submission->created_at->format('Y-m-d H:i:s') : '-' }}</div>
        <div class="row"><span class="label">Validated By:</span> {{ $submission->validator->name ?? '-' }}</div>
    </div>

</body>
</html>
