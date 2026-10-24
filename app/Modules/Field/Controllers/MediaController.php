<?php

namespace App\Modules\Field\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    /**
     * Serve private media file via temporary signed URL (Aturan 9).
     */
    public function download(Request $request, Media $media)
    {
        if (! Storage::disk($media->disk)->exists($media->path)) {
            abort(404, 'Berkas media tidak ditemukan di server.');
        }

        $stream = Storage::disk($media->disk)->readStream($media->path);
        $mime = Storage::disk($media->disk)->mimeType($media->path) ?: 'image/jpeg';
        $size = Storage::disk($media->disk)->size($media->path);

        return response()->stream(function () use ($stream) {
            fpassthru($stream);
        }, 200, [
            'Content-Type' => $mime,
            'Content-Length' => $size,
            'Cache-Control' => 'private, max-age=7200',
        ]);
    }
}
