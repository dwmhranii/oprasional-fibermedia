<?php

namespace App\Http\Requests\Provisioning;

use Illuminate\Foundation\Http\FormRequest;

class StoreProvisioningRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'submission_id' => 'required|exists:submissions,id',
            'service_type' => 'required|string',
            'nas_server' => 'required|string',
            'nas_ip' => 'required|ip',
            'ip_address' => 'nullable|ip',
            'ip_pool' => 'nullable|string',
            'bandwidth_profile' => 'required|string',
            'bandwidth_up' => 'required|integer',
            'bandwidth_down' => 'required|integer',
        ];
    }
}
