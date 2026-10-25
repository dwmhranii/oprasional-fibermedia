<?php

namespace App\Http\Requests\Submission;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Customer data (nik is intentionally excluded — it is immutable after creation)
            'customer_name' => 'sometimes|string|max:150',
            'phone' => 'sometimes|string|max:20',
            'email' => 'sometimes|nullable|email|max:150',

            // Address
            'address' => 'sometimes|string',
            'district' => 'sometimes|string|max:100',
            'city' => 'sometimes|string|max:100',
            'province' => 'sometimes|string|max:100',
            'village' => 'sometimes|nullable|string|max:255',
            'postal_code' => 'sometimes|nullable|string|max:10',
            'lat' => 'nullable|numeric|between:-90,90|required_with:lng',
            'lng' => 'nullable|numeric|between:-180,180|required_with:lat',

            // Package
            'package_name' => 'sometimes|string|max:100',
            'package_speed' => 'sometimes|integer|min:1',
            'package_price' => 'sometimes|numeric|min:0',
            'installation_fee' => 'sometimes|numeric|min:0',
        ];
    }

    public function messages(): array
    {
        return [
            'lat.required_with' => 'Latitude dan longitude harus diisi bersamaan.',
            'lng.required_with' => 'Latitude dan longitude harus diisi bersamaan.',
            'package_price.numeric' => 'Harga paket harus berupa angka valid.',
            'installation_fee.numeric' => 'Biaya pemasangan harus berupa angka valid.',
            'package_speed.integer' => 'Kecepatan paket harus berupa angka bulat.',
        ];
    }
}
