<?php

namespace App\Http\Requests\Task;

use App\Enums\TaskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(TaskStatus::class)],
            'completion_notes' => 'required_if:status,completed,failed|string|nullable',
            'result' => 'required_if:status,completed|in:success,failed',
            'customer_rating' => 'nullable|integer|min:1|max:5',
            'latitude' => 'required_if:status,completed|numeric|between:-90,90|nullable',
            'longitude' => 'required_if:status,completed|numeric|between:-180,180|nullable',
            'accuracy' => 'nullable|numeric|min:0',
            'captured_at' => 'nullable|date',
        ];
    }
}
