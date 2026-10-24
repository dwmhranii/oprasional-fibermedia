<?php

namespace App\Utils;

use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Support\Str;

class IdentifierGenerator
{
    /**
     * Generate a unique, structured identifier.
     * Capable of fitting within a 25-character database limit.
     * E.g., SUB-20260604101112-X8Y9 (23 characters)
     */
    public static function generate(string $prefix): string
    {
        return sprintf(
            '%s-%s-%s',
            strtoupper($prefix),
            now()->format('YmdHis'),
            strtoupper(Str::random(4))
        );
    }

    /**
     * Generate a standardized Fibermedia Play Customer Code format: FMP-YYYYMM-XXXX
     * E.g. FMP-202608-0001
     */
    public static function generateCustomerCode(?int $sequenceNumber = null, ?\DateTimeInterface $date = null): string
    {
        $d = $date ? Carbon::parse($date) : now();
        $yearMonth = $d->format('Ym');

        if ($sequenceNumber !== null) {
            return sprintf('FMP-%s-%04d', $yearMonth, $sequenceNumber);
        }

        $count = Customer::count() + 1;
        $code = sprintf('FMP-%s-%04d', $yearMonth, $count);

        // Ensure uniqueness
        while (Customer::where('customer_code', $code)->exists()) {
            $count++;
            $code = sprintf('FMP-%s-%04d', $yearMonth, $count);
        }

        return $code;
    }
}
