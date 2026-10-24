<?php

namespace App\Http\Requests\Complaint;

use Illuminate\Foundation\Http\FormRequest;

class ComplaintCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|regex:/^[0-9]+$/|min:9|max:14',
            'customer_code' => 'nullable|string|max:50',
            'customer_address' => 'required|string',
            'customer_lat' => 'nullable|numeric|between:-90,90',
            'customer_lng' => 'nullable|numeric|between:-180,180',
            'area' => 'required|string|max:100',
            'category' => 'required|in:no_signal,slow_speed,intermittent,equipment,billing,relocation,other',
            'subject' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:low,medium,high,critical',
            'whatsapp_message' => 'nullable|string',
            'attachments' => 'required|array|min:1|max:5',
            'attachments.*' => 'file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'customer_phone.required' => 'Nomor WhatsApp wajib diisi.',
            'customer_phone.regex' => 'Nomor WhatsApp hanya boleh berupa angka.',
            'customer_phone.min' => 'Nomor WhatsApp minimal 9 digit.',
            'customer_phone.max' => 'Nomor WhatsApp maksimal 14 digit.',
            'attachments.required' => 'Lampiran tangkapan layar (screenshot)/foto bukti wajib diunggah minimal 1 file.',
            'attachments.min' => 'Lampiran tangkapan layar (screenshot)/foto bukti wajib diunggah minimal 1 file.',
            'attachments.max' => 'Lampiran maksimal 5 file.',
        ];
    }
}
