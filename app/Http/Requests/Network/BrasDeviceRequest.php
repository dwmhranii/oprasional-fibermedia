<?php

namespace App\Http\Requests\Network;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BrasDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $brasId = $this->route('bras') instanceof \App\Models\BrasDevice
            ? $this->route('bras')->id
            : $this->route('bras');

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('bras_devices', 'name')->ignore($brasId)],
            'ip_address' => ['required', 'string', 'max:45'],
            'api_port' => ['nullable', 'integer', 'between:1,65535'],
            'username' => ['nullable', 'string', 'max:100'],
            'password' => ['nullable', 'string'],
            'use_ssl' => ['nullable', 'boolean'],
            'timeout' => ['nullable', 'integer', 'min:1', 'max:60'],
            'location' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
