<?php

namespace App\Http\Requests\Complaint;

use Illuminate\Foundation\Http\FormRequest;

class ComplaintAssignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // team atau technician_id bersifat opsional (hanya diisi oleh Superadmin bila memilih manual)
            'team' => 'nullable|string|max:50',
            'technician_id' => 'nullable|integer|exists:users,id',
            'notes' => 'nullable|string|max:500',
        ];
    }
}
