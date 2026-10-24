<?php

namespace App\Http\Requests\Submission;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => 'required|string|max:150',
            'nik' => 'required|string|digits:16',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:150',
            'address' => 'required|string',
            'district' => 'required|string|max:100',
            'city' => 'required|string|max:100',
            'province' => 'required|string|max:100',
            'village' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:10',
            'lat' => 'nullable|numeric|between:-90,90|required_with:lng',
            'lng' => 'nullable|numeric|between:-180,180|required_with:lat',
            'package_name' => 'required|string|max:100',
            'package_speed' => 'required|integer|min:1',
            'package_price' => 'required|numeric|min:0',
            'installation_fee' => 'required|numeric|min:0',
            'documents' => 'nullable|array',
            'documents.*' => 'nullable',
            'ktp' => 'nullable',
            'rumah' => 'nullable',
            'kk' => 'nullable',
            'lainnya' => 'nullable',
            'ktp_base64' => 'nullable|string',
            'kk_base64' => 'nullable|string',
            'rumah_base64' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return [
            'lat.required_with' => 'Latitude and longitude must be provided together.',
            'lng.required_with' => 'Latitude and longitude must be provided together.',
        ];
    }
}
