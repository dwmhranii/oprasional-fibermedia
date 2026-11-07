<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficeLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'latitude',
        'longitude',
        'radius_meters',
        'valid_wifi_ips',
        'wifi_incident_active',
        'wifi_incident_at',
        'wifi_incident_note',
        'is_active',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'radius_meters' => 'integer',
        'valid_wifi_ips' => 'array',
        'wifi_incident_active' => 'boolean',
        'wifi_incident_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Memeriksa apakah IP klien terdaftar sebagai Wi-Fi kantor yang sah.
     * Jika penanda gangguan Wi-Fi aktif, pemeriksaan Wi-Fi diizinkan lewat.
     */
    public function isValidWifiIp(?string $clientIp): bool
    {
        if ($this->wifi_incident_active) {
            return true;
        }

        if (empty($clientIp)) {
            return false;
        }

        $allowedIps = $this->valid_wifi_ips ?? [];
        if (empty($allowedIps)) {
            return false;
        }

        return in_array($clientIp, $allowedIps, true);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(DailyAttendance::class, 'office_id');
    }
}
