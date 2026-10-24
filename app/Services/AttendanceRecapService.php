<?php

namespace App\Services;

use App\Models\DailyAttendance;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class AttendanceRecapService
{
    /**
     * Dapatkan rekap bulanan absensi per orang dan per tim.
     * Query ini dipakai bersama oleh Rekap Absensi admin dan modul KPI kehadiran.
     *
     * @return array{
     *     month: string,
     *     total_days: int,
     *     people: array,
     *     teams: array,
     *     raw_records: Collection
     * }
     */
    public function getMonthlyRecap(string $yearMonth, ?int $teamId = null, ?int $userId = null): array
    {
        $startOfMonth = Carbon::parse($yearMonth.'-01')->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        // Batasi sampai hari ini jika bulan berjalan
        $periodEnd = $endOfMonth->isFuture() ? Carbon::today() : $endOfMonth;
        $totalDays = $startOfMonth->diffInDays($periodEnd) + 1;

        // Query pengguna yang aktif
        $userQuery = User::with(['teams' => function ($q) {
            $q->whereNull('team_members.left_at');
        }]);

        if ($userId) {
            $userQuery->where('id', $userId);
        }

        if ($teamId) {
            $userQuery->whereHas('teams', function ($q) use ($teamId) {
                $q->where('teams.id', $teamId)->whereNull('team_members.left_at');
            });
        }

        $users = $userQuery->orderBy('name')->get();

        // Ambil data absensi harian pada rentang bulan tersebut
        $attendanceQuery = DailyAttendance::whereBetween('work_date', [
            $startOfMonth->toDateString(),
            $endOfMonth->toDateString(),
        ]);

        if ($userId) {
            $attendanceQuery->where('user_id', $userId);
        }

        $attendances = $attendanceQuery->get();
        $groupedByUser = $attendances->groupBy('user_id');

        $peopleStats = [];
        foreach ($users as $user) {
            $userAttendances = $groupedByUser->get($user->id, collect());

            $hadirCount = $userAttendances->where('status', 'hadir')->count();
            $izinCount = $userAttendances->where('status', 'izin')->count();
            $sakitCount = $userAttendances->where('status', 'sakit')->count();
            $alpaCount = $userAttendances->where('status', 'alpa')->count();

            // Sisa hari hingga hari ini yang tidak ada catatan absensi dianggap alpa jika di masa lalu
            $recordedDates = $userAttendances->pluck('work_date')->map(fn ($d) => Carbon::parse($d)->toDateString())->all();
            $unrecordedPastDays = 0;

            $period = CarbonPeriod::create($startOfMonth, $periodEnd);
            foreach ($period as $day) {
                if ($day->isSunday()) {
                    continue; // Minggu libur
                }
                if (! in_array($day->toDateString(), $recordedDates)) {
                    $unrecordedPastDays++;
                }
            }

            $effectiveAlpa = $alpaCount + $unrecordedPastDays;
            $workDays = max(1, $hadirCount + $izinCount + $sakitCount + $effectiveAlpa);
            $attendanceRate = round(($hadirCount / $workDays) * 100, 1);

            $primaryTeam = $user->teams->first();

            $peopleStats[] = [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'team_id' => $primaryTeam?->id,
                'team_name' => $primaryTeam?->name ?? 'Tanpa Tim',
                'hadir' => $hadirCount,
                'izin' => $izinCount,
                'sakit' => $sakitCount,
                'alpa' => $effectiveAlpa,
                'work_days' => $workDays,
                'attendance_rate' => $attendanceRate,
            ];
        }

        // Rekap per tim
        $teamQuery = Team::where('is_active', true)->with(['activeUsers']);
        if ($teamId) {
            $teamQuery->where('id', $teamId);
        }
        $teams = $teamQuery->orderBy('order_index')->get();

        $teamStats = [];
        foreach ($teams as $team) {
            $memberIds = $team->activeUsers->pluck('id')->all();
            $teamMembersStats = array_filter($peopleStats, fn ($p) => in_array($p['user_id'], $memberIds));

            $totalHadir = array_sum(array_column($teamMembersStats, 'hadir'));
            $totalWorkDays = array_sum(array_column($teamMembersStats, 'work_days'));
            $avgRate = $totalWorkDays > 0 ? round(($totalHadir / $totalWorkDays) * 100, 1) : 0;

            $teamStats[] = [
                'team_id' => $team->id,
                'team_name' => $team->name,
                'total_members' => count($memberIds),
                'total_hadir' => $totalHadir,
                'total_work_days' => $totalWorkDays,
                'attendance_rate' => $avgRate,
                'members' => array_values($teamMembersStats),
            ];
        }

        return [
            'month' => $yearMonth,
            'total_days' => $totalDays,
            'people' => $peopleStats,
            'teams' => $teamStats,
            'raw_records' => $attendances,
        ];
    }
}
