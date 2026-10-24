<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        $members = $this->relationLoaded('activeUsers')
            ? $this->activeUsers
            : $this->activeUsers()->get();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'order_index' => (int) ($this->order_index ?? 0),
            'is_active' => (bool) $this->is_active,
            'member_count' => $members->count(),
            'members' => $members->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status ?? 'active',
                'role' => $user->roles->first()?->name ?? 'Teknisi',
                'joined_at' => $user->pivot ? $formatDate($user->pivot->joined_at) : null,
            ]),
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
