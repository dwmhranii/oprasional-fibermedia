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

        if ($this->filled('reason')) {
            $status = $this->input('status') ?? $this->input('action');
            if ($status === 'rejected' && ! $this->filled('rejection_reason')) {
                $this->merge(['rejection_reason' => $this->input('reason')]);
            }
            if ($status === 'need_info' && ! $this->filled('validation_notes')) {
                $this->merge(['validation_notes' => $this->input('reason')]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:approved,rejected,need_info,pending_validation',
            'validation_notes' => 'nullable|string|required_if:status,need_info',
            'rejection_reason' => 'nullable|string|required_if:status,rejected',

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

    public function messages(): array
    {
        return [
            'rejection_reason.required_if' => 'Alasan penolakan wajib diisi ketika menolak pengajuan.',
            'validation_notes.required_if' => 'Alasan kelengkapan berkas wajib diisi ketika meminta pengajuan dilengkapi.',
        ];
    }
}
