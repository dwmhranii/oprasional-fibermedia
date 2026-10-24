<?php

namespace App\Http\Requests\Complaint;

use Illuminate\Foundation\Http\FormRequest;

class ComplaintResolveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'resolution_category' => 'required|in:cable_broken,ont_faulty,ont_reset,splitter_odp_issue,config_issue,customer_side,billing_resolved,other',
            'description' => 'required|string|min:10|max:2000',
            'opm_redaman' => 'nullable|string|max:20',
            'photos' => 'required|array|min:1|max:5',
            'photos.*' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:2048',
        ];
    }

    public function messages(): array
    {
        return [
            'photos.required' => 'Minimal 1 foto bukti fisik pengerjaan wajib diunggah.',
            'photos.min' => 'Minimal 1 foto bukti fisik pengerjaan wajib diunggah.',
            'photos.max' => 'Maksimal 5 foto bukti pengerjaan.',
            'photos.*.max' => 'Ukuran masing-masing foto pengerjaan maksimal 2 MB.',
        ];
    }
}
