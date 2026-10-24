<?php

namespace App\Http\Requests\Network;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OdpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $odpId = $this->route('odp') instanceof \App\Models\Odp
            ? $this->route('odp')->id
            : $this->route('odp');

        return [
            'odc_id' => ['nullable', 'integer', 'exists:odcs,id'],
            'code' => ['required', 'string', 'max:50', Rule::unique('odps', 'code')->ignore($odpId)],
            'name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'proposed_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'proposed_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'port_capacity' => ['nullable', 'integer', 'min:4', 'max:64'],
            'wilayah' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'status' => ['nullable', 'string', Rule::in(['active', 'maintenance', 'full', 'inactive'])],
            'operational_status' => ['nullable', 'string', Rule::in(['normal', 'disrupted', 'cut'])],
        ];
    }
}
