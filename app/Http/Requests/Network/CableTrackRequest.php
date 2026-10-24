<?php

namespace App\Http\Requests\Network;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CableTrackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'coordinates' => ['nullable', 'array'],
            'total_length_meters' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', Rule::in(['active', 'proposed', 'maintenance', 'inactive'])],
            'operational_status' => ['nullable', 'string', Rule::in(['normal', 'disrupted', 'cut'])],
            'connected_odc_id' => ['nullable', 'integer', 'exists:odcs,id'],
            'connected_odp_id' => ['nullable', 'integer', 'exists:odps,id'],
            'downstream_odp_ids' => ['nullable', 'array'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
