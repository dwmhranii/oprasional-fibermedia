<?php

namespace App\Services;

use App\Models\DailyAttendance;
use App\Models\Team;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TeamReadinessService
{
    /**
     * Dapatkan ambang batas minimal anggota yang harus hadir agar tim dianggap siap.
     * Mengambil dari tabel dispatch_settings (default: 1).
     */
    public function getMinMembersPresent(): int
    {
        $setting = DB::table('dispatch_settings')
            ->where('key', 'min_members_present')
            ->value('value');

        return $setting !== null ? (int) $setting : 1;
    }

    /**
     * Helper: Ambil seluruh anggota tim yang HADIR hari ini (DailyAttendance hadir, check_in_at NOT NULL, check_out_at NULL).
     *
     * @return Collection<User>
     */
    public function getPresentMembersToday(int|Team $team, ?string $date = null): Collection
    {
        $teamModel = $team instanceof Team ? $team : Team::findOrFail($team);
        $workDate = $date ?: Carbon::today()->toDateString();

        $memberUserIds = $teamModel->activeMembers()->pluck('user_id')->toArray();

        if (empty($memberUserIds)) {
            return collect();
        }

        $presentUserIds = DailyAttendance::whereIn('user_id', $memberUserIds)
            ->whereDate('work_date', $workDate)
            ->where('status', 'hadir')
            ->whereNotNull('check_in_at')
            ->whereNull('check_out_at')
            ->pluck('user_id')
            ->toArray();

        return User::whereIn('id', $presentUserIds)->get();
    }

    /**
     * Periksa apakah tim tertentu siap beroperasi pada tanggal yang ditentukan.
     * Tim siap jika jumlah anggota aktif yang hadir >= min_members_present (default 1).
     */
    public function isTeamReady(int|Team $team, ?string $date = null): bool
    {
        $teamModel = $team instanceof Team ? $team : Team::find($team);
        if (! $teamModel || ! $teamModel->is_active) {
            return false;
        }

        $minMembers = $this->getMinMembersPresent();
        $presentCount = $this->getPresentMembersToday($teamModel, $date)->count();

        return $presentCount >= $minMembers;
    }

    /**
     * Dapatkan seluruh Team aktif yang siap pada tanggal yang ditentukan.
     *
     * @return array<Team>
     */
    public function getReadyTeams(?string $date = null): array
    {
        $activeTeams = Team::where('is_active', true)
            ->orderBy('order_index')
            ->get();

        $readyTeams = [];
        foreach ($activeTeams as $team) {
            if ($this->isTeamReady($team, $date)) {
                $readyTeams[] = $team;
            }
        }

        return $readyTeams;
    }

    /**
     * Dapatkan ID dari seluruh Team aktif yang siap.
     *
     * @return array<int>
     */
    public function getReadyTeamIds(?string $date = null): array
    {
        return array_map(fn ($team) => $team->id, $this->getReadyTeams($date));
    }
}
