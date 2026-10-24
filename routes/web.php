<?php

use App\Http\Controllers\Api\NetworkSyncController;
use App\Http\Controllers\ApiDocsController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

// Interactive Online Web Documentation Endpoints (diakses via /api dan /docs)
Route::get('/api', [ApiDocsController::class, 'index']);
Route::get('/docs', [ApiDocsController::class, 'index']);
Route::get('/docs/freeze', [ApiDocsController::class, 'freeze']);
Route::get('/api/docs/raw', [ApiDocsController::class, 'rawJson']);

// PWA Lapangan via Subdomain (misal field.fibermedia.id atau field.localhost)
if (isset($_SERVER['HTTP_HOST']) && (str_starts_with($_SERVER['HTTP_HOST'], 'field.') || str_starts_with($_SERVER['HTTP_HOST'], 'pwa.'))) {
    Route::get('/{any?}', function () {
        $fieldFile = base_path('dist/field.html');
        if (! file_exists($fieldFile)) {
            $fieldFile = public_path('field.html');
        }
        if (file_exists($fieldFile)) {
            return response(file_get_contents($fieldFile), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
        }

        return response('Field PWA belum dibuild. Silakan jalankan npm run build.', 404);
    })->where('any', '.*');
}

// PWA Lapangan via Path /field (Teknisi & Sales)
Route::get('/field{any?}', function () {
    $fieldFile = base_path('dist/field.html');
    if (! file_exists($fieldFile)) {
        $fieldFile = public_path('field.html');
    }
    if (file_exists($fieldFile)) {
        return response(file_get_contents($fieldFile), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    return response('Field PWA belum dibuild. Silakan jalankan npm run build.', 404);
})->where('any', '.*');

// Helper migrate via browser
Route::get('/run-artisan-migrate', function (Request $request) {
    if ($request->query('secret') !== 'fibermedia-secret-2026') {
        return response('Unauthorized. Secret token required.', 403);
    }

    try {
        Artisan::call('migrate', ['--force' => true]);
        $migrateOutput = Artisan::output();

        Artisan::call('optimize:clear');
        $cacheOutput = Artisan::output();

        return '<pre style="background:#0d1117;color:#58a6ff;padding:24px;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.5;">'
            ."=== HASIL ARTISAN MIGRATE ===\n"
            .htmlspecialchars($migrateOutput)
            ."\n=== HASIL OPTIMIZE:CLEAR ===\n"
            .htmlspecialchars($cacheOutput)
            ."\n\n<strong style=\"color:#3fb950;\">✓ SEMUA MIGRASI BERHASIL DIJALANKAN!</strong></pre>";
    } catch (Throwable $e) {
        return '<pre style="background:#0d1117;color:#f85149;padding:24px;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.5;">'
            ."=== GAGAL MENJALANKAN MIGRASI ===\n"
            .htmlspecialchars($e->getMessage())."\n\n"
            .htmlspecialchars($e->getTraceAsString())
            .'</pre>';
    }
});

// Offline Vector Map Tiles (Item 1 & 2)
Route::get('/tiles/manifest', [NetworkSyncController::class, 'tilesManifest']);
Route::get('/tiles/area.pmtiles', [NetworkSyncController::class, 'servePmtiles']);

// Frontend Web Application (Admin & Manajemen langsung tampil di /)
Route::get('/{any?}', function () {
    $indexFile = base_path('dist/index.html');
    if (! file_exists($indexFile)) {
        $indexFile = public_path('index.html');
    }
    if (file_exists($indexFile)) {
        return response(file_get_contents($indexFile), 200, ['Content-Type' => 'text/html; charset=UTF-8']);
    }

    return response('Frontend aplikasi belum dibuild. Silakan jalankan npm run build.', 404);
})->where('any', '^(?!api|docs|field|tiles|sanctum|run-artisan-migrate).*');
