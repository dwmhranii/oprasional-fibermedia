<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DispatchSetting extends Model
{
    protected $fillable = [
        'ticket_type',
        'key',
        'value',
        'min_members_present',
        'accept_timeout_menit',
        'max_oper',
    ];

    protected $casts = [
        'value' => 'array',
        'min_members_present' => 'integer',
        'accept_timeout_menit' => 'integer',
        'max_oper' => 'integer',
    ];

    /**
     * Get active dispatch configuration values.
     */
    public static function getEffective(): array
    {
        $row = static::whereNull('ticket_type')->whereNull('key')->first();

        // Also check if individual keys exist in key-value format
        $minMembers = static::where('key', 'min_members_present')->value('value');
        $timeout = static::where('key', 'accept_timeout_menit')->orWhere('key', 'response_timeout_minutes')->value('value');
        $maxOper = static::where('key', 'max_oper')->orWhere('key', 'max_handover_count')->value('value');

        return [
            'min_members_present' => $minMembers ? (int) (is_array($minMembers) ? ($minMembers['val'] ?? 1) : $minMembers) : ($row?->min_members_present ?? 1),
            'accept_timeout_menit' => $timeout ? (int) (is_array($timeout) ? ($timeout['val'] ?? 15) : $timeout) : ($row?->accept_timeout_menit ?? 15),
            'max_oper' => $maxOper ? (int) (is_array($maxOper) ? ($maxOper['val'] ?? 3) : $maxOper) : ($row?->max_oper ?? 3),
        ];
    }
}
