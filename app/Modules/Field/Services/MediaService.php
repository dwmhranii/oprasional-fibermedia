<?php

namespace App\Modules\Field\Services;

use App\Models\Media;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaService
{
    public const MAX_BYTES = 1048576; // 1 MB (1024 * 1024 bytes)

    /**
     * Simpan berkas foto/media lapangan dengan validasi ketat, hash SHA-256,
     * penyimpanan disk privat, dan deteksi anomali.
     *
     * @param  mixed  $fileOrContent  UploadedFile|string (raw binary atau base64)
     * @param  mixed  $mediable  Model terkait (Task, Complaint, etc)
     * @param  string  $kind  before, after, ont, selfie, signature, document, evidence
     * @param  array  $metadata  [latitude, longitude, accuracy, captured_at, device_id, geofence_status]
     *
     * @throws ValidationException
     */
    public function storeMedia(
        mixed $fileOrContent,
        mixed $mediable,
        string $kind,
        array $metadata = [],
        ?User $uploader = null
    ): Media {
        $rawContent = '';
        $mime = 'image/jpeg';

        if ($fileOrContent instanceof UploadedFile) {
            $rawContent = file_get_contents($fileOrContent->getRealPath());
            $mime = $fileOrContent->getClientMimeType() ?: $fileOrContent->getMimeType() ?: 'image/jpeg';
        } elseif (is_string($fileOrContent)) {
            if (preg_match('/^data:image\/(\w+);base64,/', $fileOrContent, $matches)) {
                $mime = 'image/'.$matches[1];
                $fileOrContent = substr($fileOrContent, strpos($fileOrContent, ',') + 1);
                $rawContent = base64_decode($fileOrContent);
            } elseif (base64_encode(base64_decode($fileOrContent, true) ?: '') === $fileOrContent) {
                $rawContent = base64_decode($fileOrContent);
            } else {
                $rawContent = $fileOrContent;
            }
        }

        $size = strlen($rawContent);

        // 1. Verifikasi ukuran: Tolak jika > 1 MB (1048576 byte)
        if ($size > self::MAX_BYTES) {
            $sizeKb = round($size / 1024);
            throw ValidationException::withMessages([
                'photo' => ["Ukuran berkas melebihi batas maksimal 1 MB ({$sizeKb} KB). Harap kompresi terlebih dahulu."],
            ]);
        }

        // 2. Hitung hash SHA-256
        $sha256 = hash('sha256', $rawContent);

        // 3. Simpan di disk privat
        $extension = match ($mime) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
        $folder = 'media/'.date('Y/m/d');
        $filename = Str::uuid().'.'.$extension;
        $path = $folder.'/'.$filename;

        Storage::disk('private')->put($path, $rawContent);

        // 4. Hitung waktu & selisih jam
        $receivedAt = now();
        $capturedAt = isset($metadata['captured_at']) ? Carbon::parse($metadata['captured_at']) : $receivedAt;
        $diffMinutes = abs($receivedAt->diffInMinutes($capturedAt));
        $selisihJam = round($diffMinutes / 60, 2);

        // 5. Deteksi Anomali
        $anomalyReasons = [];

        // Anomali 1: Foto duplikat berdasarkan hash SHA-256
        $isDuplicate = Media::where('sha256', $sha256)->exists();
        if ($isDuplicate) {
            $anomalyReasons[] = 'Foto duplikat terdeteksi (hash SHA-256 identik dengan berkas lain).';
        }

        // Anomali 2: Selisih jam besar antara jam HP/kamera dengan server (> 1 jam)
        if ($selisihJam > 1.0) {
            $anomalyReasons[] = "Selisih jam pengambilan foto dengan server cukup besar ({$selisihJam} jam).";
        }

        // Anomali 3: Akurasi GPS rendah (> 100 meter)
        $accuracy = isset($metadata['accuracy']) ? (float) $metadata['accuracy'] : null;
        if ($accuracy !== null && $accuracy > 100) {
            $anomalyReasons[] = "Akurasi GPS rendah ({$accuracy}m > 100m).";
        }

        // Anomali 4: Lokasi di luar radius geofence pelanggan
        $geofenceStatus = $metadata['geofence_status'] ?? null;
        if ($geofenceStatus === 'outside') {
            $anomalyReasons[] = 'Lokasi pengambilan foto berada di luar geofence pelanggan.';
        }

        $isAnomaly = ! empty($anomalyReasons);

        return Media::create([
            'mediable_type' => $mediable ? get_class($mediable) : null,
            'mediable_id' => $mediable?->id,
            'kind' => $kind,
            'disk' => 'private',
            'path' => $path,
            'sha256' => $sha256,
            'size' => $size,
            'mime' => $mime,
            'captured_at' => $capturedAt,
            'received_at' => $receivedAt,
            'selisih_jam' => $selisihJam,
            'lat' => $metadata['latitude'] ?? $metadata['lat'] ?? null,
            'lng' => $metadata['longitude'] ?? $metadata['lng'] ?? null,
            'accuracy' => $accuracy,
            'device_id' => $metadata['device_id'] ?? null,
            'uploaded_by_id' => $uploader?->id,
            'is_anomaly' => $isAnomaly,
            'anomaly_reasons' => $isAnomaly ? $anomalyReasons : null,
        ]);
    }
}
