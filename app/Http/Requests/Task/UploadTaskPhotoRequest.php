<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

class UploadTaskPhotoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'photo_type' => 'required|string|max:50', // e.g., 'before', 'after', 'attendance', 'modem', 'cabling'
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048', // Max 2MB
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'photo.required' => 'File foto PSB wajib diunggah.',
            'photo.image' => 'File yang diunggah harus berupa gambar.',
            'photo.max' => 'Ukuran foto pengerjaan PSB maksimal 2 MB.',
        ];
    }
}
