<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrasDeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $formatDate = fn ($date) => $date ? Carbon::parse($date)->setTimezone('Asia/Jakarta')->toIso8601String() : null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'ip_address' => $this->ip_address,
            'api_port' => (int) ($this->api_port ?? 8728),
            'username' => $this->username,
            // Password dan secret tersembunyi
            'has_password' => filled($this->password),
            'location' => $this->location,
            'notes' => $this->notes,
            'is_active' => (bool) $this->is_active,
            'status' => $this->status ?? ($this->is_active ? 'online' : 'disabled'),
            'last_sync_at' => $formatDate($this->last_synced_at ?? $this->last_sync_at),
            'last_error' => $this->last_sync_error ?? $this->last_error,
            'total_active_sessions' => (int) ($this->active_sessions_count ?? $this->total_active_sessions ?? 0),
            'active_sessions_count' => (int) ($this->active_sessions_count ?? $this->total_active_sessions ?? 0),
            'cpu_load' => $this->cpu_load !== null ? (int) $this->cpu_load : null,
            'free_memory' => $this->free_memory !== null ? (int) $this->free_memory : null,
            'uptime' => $this->uptime,
            'customers_count' => $this->customers_count ?? ($this->relationLoaded('customers') ? $this->customers->count() : 0),
            'created_at' => $formatDate($this->created_at),
            'updated_at' => $formatDate($this->updated_at),
        ];
    }
}
