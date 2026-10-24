<?php

namespace App\Http\Requests\Network;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OdcRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $odcId = $this->route('odc') instanceof \App\Models\Odc
            ? $this->route('odc')->id
            : $this->route('odc');

        return [
            'code' => ['required', 'string', 'max:50', Rule::unique('odcs', 'code')->ignore($odcId)],
            'name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'capacity_odp' => ['nullable', 'integer', 'min:1', 'max:144'],
            'operational_status' => ['nullable', 'string', Rule::in(['normal', 'disrupted', 'cut'])],
            'wilayah' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
