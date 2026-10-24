<?php

use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Migrasi data tim lama dari teks users.team ke relasi relational teams & team_members.
     * Dapat diulang (idempotent) dan TIDAK menghapus kolom lama users.team.
     */
    public function up(): void
    {
        // 1. Ambil seluruh nama tim unik dari users yang memiliki nilai team
        $distinctTeams = DB::table('users')
            ->whereNotNull('team')
            ->where('team', '!=', '')
            ->distinct()
            ->pluck('team');

        $orderIndex = DB::table('teams')->max('order_index') ?? 0;

        foreach ($distinctTeams as $teamName) {
            $trimmedName = trim($teamName);
            if (empty($trimmedName)) {
                continue;
            }

            // Temukan atau buat Team
            $team = Team::firstOrCreate(
                ['name' => $trimmedName],
                [
                    'is_active' => true,
                    'order_index' => ++$orderIndex,
                    'description' => 'Migrasi dari data teks users.team',
                ]
            );

            // 2. Hubungkan semua user dengan tim tersebut ke team_members
            $userIds = DB::table('users')
                ->where('team', $teamName)
                ->pluck('id');

            foreach ($userIds as $userId) {
                // firstOrCreate memastikan migrasi dapat diulang (idempotent)
                TeamMember::firstOrCreate(
                    [
                        'team_id' => $team->id,
                        'user_id' => $userId,
                    ],
                    [
                        'joined_at' => now(),
                        'left_at' => null,
                    ]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data rollback tidak menghapus users.team karena kolom asli tetap utuh
    }
};
