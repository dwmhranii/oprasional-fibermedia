<?php

namespace App\Services;

use App\Models\Holiday;
use Carbon\Carbon;

class SlaOperatingHoursService
{
    public const TIMEZONE = 'Asia/Jakarta';
    public const OPERATING_START_HOUR = 8;
    public const OPERATING_START_MINUTE = 0;
    public const OPERATING_END_HOUR = 20;
    public const OPERATING_END_MINUTE = 0;
    public const MINUTES_PER_OPERATING_DAY = 720; // 12 jam (08.00 - 20.00)

    /**
     * Memeriksa apakah suatu tanggal merupakan hari kerja operasional SLA.
     * Senin-Sabtu, di luar hari libur nasional.
     */
    public function isOperatingDay(Carbon|string $date): bool
    {
        $carbon = $date instanceof Carbon ? $date->copy() : Carbon::parse($date);
        $carbon->setTimezone(self::TIMEZONE);

        // Minggu bukan hari operasional
        if ($carbon->isSunday()) {
            return false;
        }

        // Cek hari libur nasional di tabel holidays
        return ! Holiday::isHoliday($carbon);
    }

    /**
     * Memeriksa apakah waktu saat ini berada di dalam jendela operasional SLA (08.00 - 20.00 WIB).
     */
    public function isWithinOperatingWindow(Carbon|string $dateTime): bool
    {
        $carbon = $dateTime instanceof Carbon ? $dateTime->copy() : Carbon::parse($dateTime);
        $carbon->setTimezone(self::TIMEZONE);

        if (! $this->isOperatingDay($carbon)) {
            return false;
        }

        $start = $carbon->copy()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
        $end = $carbon->copy()->setTime(self::OPERATING_END_HOUR, self::OPERATING_END_MINUTE, 0);

        return $carbon->greaterThanOrEqualTo($start) && $carbon->lessThanOrEqualTo($end);
    }

    /**
     * Normalisasi waktu awal perhitungan SLA ke waktu operasional berikutnya jika berada di luar jendela.
     * Contoh: Tiket masuk 21.00 WIB akan dinormalisasi ke 08.00 WIB hari operasional berikutnya.
     */
    public function normalizeToNextOperatingStart(Carbon|string $dateTime): Carbon
    {
        $carbon = $dateTime instanceof Carbon ? $dateTime->copy() : Carbon::parse($dateTime);
        $carbon->setTimezone(self::TIMEZONE);

        // Jika hari ini hari operasional dan sebelum 08.00
        if ($this->isOperatingDay($carbon)) {
            $startToday = $carbon->copy()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
            $endToday = $carbon->copy()->setTime(self::OPERATING_END_HOUR, self::OPERATING_END_MINUTE, 0);

            if ($carbon->lessThan($startToday)) {
                return $startToday;
            }

            if ($carbon->lessThanOrEqualTo($endToday)) {
                return $carbon;
            }
        }

        // Jika sudah lewat 20.00 atau bukan hari operasional, cari hari operasional berikutnya jam 08.00
        $next = $carbon->copy()->addDay()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
        while (! $this->isOperatingDay($next)) {
            $next->addDay();
        }

        return $next;
    }

    /**
     * Tambahkan sejumlah menit operasional (hanya berjalan di Senin-Sabtu 08.00-20.00 WIB di luar libur nasional).
     * Sesuai contoh PRD v1.2:
     * - Tiket ditugaskan Sabtu 18.00 (24 jam = 1.440 menit operasional)
     * - Sabtu: 2 jam terpakai (18.00 - 20.00) -> sisa 22 jam
     * - Minggu: dilompati (0 jam)
     * - Senin: 12 jam terpakai (08.00 - 20.00) -> sisa 10 jam
     * - Target jatuh Selasa 18.00 (10 jam terpakai dari 08.00)
     */
    public function addOperatingMinutes(Carbon|string $startAt, int $operatingMinutes): Carbon
    {
        if ($operatingMinutes <= 0) {
            return $startAt instanceof Carbon ? $startAt->copy() : Carbon::parse($startAt);
        }

        $current = $this->normalizeToNextOperatingStart($startAt);
        $remainingMinutes = $operatingMinutes;

        while ($remainingMinutes > 0) {
            $endOfWindow = $current->copy()->setTime(self::OPERATING_END_HOUR, self::OPERATING_END_MINUTE, 0);
            $minutesAvailableToday = $current->diffInMinutes($endOfWindow, false);

            if ($minutesAvailableToday >= $remainingMinutes) {
                $current->addMinutes($remainingMinutes);
                $remainingMinutes = 0;
            } else {
                $remainingMinutes -= max(0, $minutesAvailableToday);

                // Maju ke hari operasional berikutnya pukul 08.00
                $current->addDay()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
                while (! $this->isOperatingDay($current)) {
                    $current->addDay();
                }
            }
        }

        return $current;
    }

    /**
     * Hitung durasi operasional (dalam menit) yang telah berlalu antara dua timestamp.
     * Mengabaikan malam hari (20.00 - 08.00), hari Minggu, dan hari libur nasional.
     */
    public function getOperatingMinutesBetween(Carbon|string $startAt, Carbon|string $endAt): int
    {
        $start = $startAt instanceof Carbon ? $startAt->copy() : Carbon::parse($startAt);
        $end = $endAt instanceof Carbon ? $endAt->copy() : Carbon::parse($endAt);

        $start->setTimezone(self::TIMEZONE);
        $end->setTimezone(self::TIMEZONE);

        if ($end->lessThanOrEqualTo($start)) {
            return 0;
        }

        $current = $this->normalizeToNextOperatingStart($start);
        if ($current->greaterThanOrEqualTo($end)) {
            return 0;
        }

        $totalMinutes = 0;

        while ($current->lessThan($end)) {
            if (! $this->isOperatingDay($current)) {
                $current->addDay()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
                continue;
            }

            $windowStart = $current->copy()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
            $windowEnd = $current->copy()->setTime(self::OPERATING_END_HOUR, self::OPERATING_END_MINUTE, 0);

            // Waktu awal blok di hari ini
            $effectiveStart = $current->greaterThan($windowStart) ? $current : $windowStart;

            if ($effectiveStart->greaterThanOrEqualTo($windowEnd)) {
                $current->addDay()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
                continue;
            }

            // Jika akhir berada di hari yang sama
            if ($end->isSameDay($current) && $end->lessThan($windowEnd)) {
                $totalMinutes += max(0, $effectiveStart->diffInMinutes($end));
                break;
            }

            // Tambahkan sampai akhir jendela hari ini
            $totalMinutes += max(0, $effectiveStart->diffInMinutes($windowEnd));

            // Maju ke hari berikutnya jam 08.00
            $current->addDay()->setTime(self::OPERATING_START_HOUR, self::OPERATING_START_MINUTE, 0);
        }

        return $totalMinutes;
    }

    /**
     * Hitung status progress SLA dan deteksi peringatan (75%) serta pelanggaran (100%).
     *
     * @param Carbon $assignedAt Waktu mulai penugasan tiket
     * @param int $targetMinutes Target durasi SLA dalam menit operasional
     * @param Carbon|null $pausedAt Waktu saat SLA sedang dijeda (jika sedang pause)
     * @param int $totalPausedMinutes Total akumulasi durasi jeda dalam menit operasional
     * @param Carbon|null $completedAt Waktu tiket selesai (jika sudah selesai)
     * @return array
     */
    public function getSlaProgress(
        Carbon|string $assignedAt,
        int $targetMinutes,
        Carbon|string|null $pausedAt = null,
        int $totalPausedMinutes = 0,
        Carbon|string|null $completedAt = null
    ): array {
        $start = $assignedAt instanceof Carbon ? $assignedAt : Carbon::parse($assignedAt);
        $endPoint = $completedAt
            ? ($completedAt instanceof Carbon ? $completedAt : Carbon::parse($completedAt))
            : ($pausedAt ? ($pausedAt instanceof Carbon ? $pausedAt : Carbon::parse($pausedAt)) : now());

        $grossOperatingMinutes = $this->getOperatingMinutesBetween($start, $endPoint);
        $netOperatingMinutes = max(0, $grossOperatingMinutes - $totalPausedMinutes);

        $remainingMinutes = max(0, $targetMinutes - $netOperatingMinutes);
        $percentage = $targetMinutes > 0 ? round(($netOperatingMinutes / $targetMinutes) * 100, 1) : 100;

        $isPaused = (bool) $pausedAt;
        $isBreached = $netOperatingMinutes >= $targetMinutes;
        $isWarning = ! $isBreached && ($percentage >= 75.0);

        $status = 'safe';
        if ($isPaused) {
            $status = 'paused';
        } elseif ($isBreached) {
            $status = 'breached';
        } elseif ($isWarning) {
            $status = 'warning';
        }

        return [
            'target_minutes' => $targetMinutes,
            'elapsed_minutes' => $netOperatingMinutes,
            'remaining_minutes' => $remainingMinutes,
            'percentage' => min(100.0, $percentage),
            'status' => $status, // 'safe' | 'warning' | 'breached' | 'paused'
            'is_warning' => $isWarning,
            'is_breached' => $isBreached,
            'is_paused' => $isPaused,
        ];
    }
}

