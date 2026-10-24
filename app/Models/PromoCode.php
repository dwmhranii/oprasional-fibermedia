<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromoCode extends Model
{
    use HasFactory;

    protected $table = 'promo_codes';

    protected $fillable = [
        'code',
        'name',
        'description',
        'type',
        'value',
        'min_package_price',
        'max_uses',
        'used_count',
        'valid_from',
        'valid_until',
        'status',
        'created_by',
    ];

    protected $casts = [
        'value' => 'float',
        'min_package_price' => 'float',
        'max_uses' => 'integer',
        'used_count' => 'integer',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if promo code is active and valid
     */
    public function isValidFor($packagePrice = 0): array
    {
        if ($this->status !== 'active') {
            return ['valid' => false, 'message' => 'Kode promo sudah tidak aktif'];
        }

        $now = Carbon::now();

        if ($this->valid_from && $now->lt($this->valid_from)) {
            return ['valid' => false, 'message' => 'Kode promo belum dapat digunakan'];
        }

        if ($this->valid_until && $now->gt($this->valid_until)) {
            return ['valid' => false, 'message' => 'Kode promo telah kadaluarsa'];
        }

        if (! is_null($this->max_uses) && $this->used_count >= $this->max_uses) {
            return ['valid' => false, 'message' => 'Kuota penggunaan kode promo sudah habis'];
        }

        if ($this->min_package_price > 0 && $packagePrice < $this->min_package_price) {
            return [
                'valid' => false,
                'message' => 'Minimal harga paket untuk kode promo ini adalah Rp '.number_format($this->min_package_price, 0, ',', '.'),
            ];
        }

        return ['valid' => true, 'message' => 'Kode promo berhasil digunakan'];
    }

    /**
     * Calculate discount amount
     */
    public function calculateDiscount($packagePrice = 0, $installFee = 50000): float
    {
        if ($this->type === 'fixed') {
            return min((float) $this->value, (float) $packagePrice);
        }

        if ($this->type === 'percentage') {
            $discount = ((float) $packagePrice * (float) $this->value) / 100;

            return round($discount, 2);
        }

        if ($this->type === 'free_installation') {
            return (float) $installFee;
        }

        return 0;
    }
}
