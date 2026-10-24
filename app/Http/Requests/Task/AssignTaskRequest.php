<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;

class AssignTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'teknisi_id' => 'required|exists:users,id',
            'scheduled_date' => 'required|date',
            'scheduled_start' => 'required|date_format:H:i',
            'scheduled_end' => 'required|date_format:H:i|after:scheduled_start',
        ];
    }
}
