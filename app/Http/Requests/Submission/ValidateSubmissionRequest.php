<?php

namespace App\Http\Requests\Submission;

use Illuminate\Foundation\Http\FormRequest;

class ValidateSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('action') && ! $this->has('status')) {
            $this->merge([
                'status' => $this->action,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:approved,rejected,need_info,pending_validation',
            'validation_notes' => 'nullable|string',
            'rejection_reason' => 'required_if:status,rejected|string|nullable',

            // Simplified Workflow optional fields
            'technician_id' => 'nullable|exists:users,id',
            'manual_provisioning' => 'nullable|array',
            'manual_provisioning.username' => 'nullable|string',
            'manual_provisioning.password' => 'nullable|string',
            'manual_provisioning.pppoe_username' => 'nullable|string',
            'manual_provisioning.pppoe_password' => 'nullable|string',
            'manual_provisioning.vlan' => 'nullable|string',
            'manual_provisioning.odp' => 'nullable|string',
            'manual_provisioning.onu_serial_number' => 'nullable|string',
            'manual_provisioning.notes' => 'nullable|string',
        ];
    }
}
