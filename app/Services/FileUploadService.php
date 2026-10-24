<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileUploadService
{
    /**
     * Upload and optimize file to storage.
     * Automatically converts images to compressed WebP format if GD extension is enabled.
     *
     * @param  int  $quality  Compression quality (default 80%)
     * @return string|false The path to the stored file, or false on failure.
     */
    public function uploadFile(UploadedFile $file, string $directory = 'uploads', int $quality = 80)
    {
        $mimeType = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());
        $isImage = str_starts_with($mimeType, 'image/') && ! in_array($extension, ['svg', 'pdf']);

        // Optimize image and convert to WebP format if GD extension is available
        if ($isImage && extension_loaded('gd') && function_exists('imagewebp')) {
            try {
                $imageContent = file_get_contents($file->getRealPath());
                $gdImage = @imagecreatefromstring($imageContent);

                if ($gdImage !== false) {
                    // Handle image orientation if EXIF data is available
                    if (function_exists('exif_read_data')) {
                        $exif = @exif_read_data($file->getRealPath());
                        if (! empty($exif['Orientation'])) {
                            switch ($exif['Orientation']) {
                                case 3:
                                    $gdImage = imagerotate($gdImage, 180, 0);
                                    break;
                                case 6:
                                    $gdImage = imagerotate($gdImage, -90, 0);
                                    break;
                                case 8:
                                    $gdImage = imagerotate($gdImage, 90, 0);
                                    break;
                            }
                        }
                    }

                    // Capping resolution (max 1920px width/height for storage efficiency)
                    $width = imagesx($gdImage);
                    $height = imagesy($gdImage);
                    $maxDimension = 1920;

                    if ($width > $maxDimension || $height > $maxDimension) {
                        if ($width > $height) {
                            $newWidth = $maxDimension;
                            $newHeight = (int) ($height * ($maxDimension / $width));
                        } else {
                            $newHeight = $maxDimension;
                            $newWidth = (int) ($width * ($maxDimension / $height));
                        }

                        $resized = imagecreatetruecolor($newWidth, $newHeight);
                        imagealphablending($resized, false);
                        imagesavealpha($resized, true);
                        imagecopyresampled($resized, $gdImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                        imagedestroy($gdImage);
                        $gdImage = $resized;
                    }

                    ob_start();
                    imagewebp($gdImage, null, $quality);
                    $compressedData = ob_get_clean();
                    imagedestroy($gdImage);

                    if (! empty($compressedData)) {
                        $filename = Str::random(40).'.webp';
                        $path = trim($directory, '/').'/'.$filename;
                        Storage::put($path, $compressedData);

                        return $path;
                    }
                }
            } catch (\Throwable $e) {
                // If any error occurs during processing, fall back gracefully to default putFile
            }
        }

        // Standard fallback for non-images (PDFs) or when GD is disabled
        return Storage::putFile($directory, $file);
    }

    /**
     * Delete a file from storage.
     */
    public function deleteFile(string $path): bool
    {
        if (Storage::exists($path)) {
            return Storage::delete($path);
        }

        return false;
    }

    /**
     * Get the URL for a stored file.
     */
    public function getFileUrl(string $path): string
    {
        return Storage::url($path);
    }
}
