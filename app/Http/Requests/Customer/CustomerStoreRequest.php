<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'nik' => ['nullable', 'string', 'regex:/^\d{16}$/'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['required', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'service_type' => ['required', 'string', Rule::in(['pppoe', 'ipoe', 'static'])],
            'bras_id' => ['nullable', 'integer', 'exists:bras_devices,id'],
            'collector' => ['nullable', 'string', 'max:100'],
            'username' => ['nullable', 'string', 'max:100', 'unique:customers,username'],
            'password' => ['nullable', 'string', 'max:255'],
            'package_id' => ['nullable', 'integer', 'exists:packages,id'],
            'monthly_price' => ['nullable', 'numeric', 'min:0'],
            'local_address' => ['nullable', 'string', 'max:50'],
            'remote_address' => ['nullable', 'string', 'max:50'],
            'parent_queue' => ['nullable', 'string', 'max:100'],
            'rate_limit' => ['nullable', 'string', 'max:50'],
            'subscribed_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'status' => ['required', 'string', Rule::in(['active', 'suspended', 'inactive', 'terminated'])],
            'onu_index' => ['nullable', 'string', 'max:50'],
            'odp_id' => ['nullable', 'integer', 'exists:odps,id'],
            'odp_port' => [
                'nullable',
                'integer',
                'min:1',
                Rule::unique('customers', 'odp_port')->where(function ($query) {
                    return $query->where('odp_id', $this->input('odp_id'))
                        ->whereNotNull('odp_id');
                }),
            ],
            'debt' => ['nullable', 'numeric', 'min:0'],
            'wilayah' => ['nullable', 'string', 'max:100'],
            'installed_by_team_id' => ['nullable', 'integer', 'exists:teams,id'],
            'sales_id' => ['nullable', 'integer', 'exists:users,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'nik.regex' => 'NIK harus tepat 16 digit angka.',
            'username.unique' => 'Username PPPoE/layanan sudah digunakan.',
            'odp_port.unique' => 'Nomor port ODP ini sudah terpakai pada ODP yang dipilih.',
        ];
    }
}
