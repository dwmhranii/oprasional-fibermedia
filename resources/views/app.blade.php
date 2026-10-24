<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fibermedia - Sistem Manajemen Admin</title>
    <link rel="icon" type="image/png" href="/logo-fibermedia.png" />
</head>
<body class="bg-slate-50 text-slate-900 antialiased">
    <div id="root"></div>
    @php
        $distIndex = base_path('dist/index.html');
        $publicIndex = public_path('index.html');
    @endphp
    @if(file_exists($distIndex))
        {!! file_get_contents($distIndex) !!}
    @elseif(file_exists($publicIndex))
        {!! file_get_contents($publicIndex) !!}
    @else
        <script type="module" src="http://localhost:5173/@vite/client"></script>
        <script type="module" src="http://localhost:5173/resources/js/admin/main.tsx"></script>
    @endif
</body>
</html>
