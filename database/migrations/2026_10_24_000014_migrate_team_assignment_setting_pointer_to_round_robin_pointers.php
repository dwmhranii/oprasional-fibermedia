<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Migrasi pointer dari team_assignment_settings.current_team ke round_robin_pointers.
     * Urutan tim tidak lagi alfabetis tetapi berdasarkan kolom order_index.
     */
    public function up(): void
    {
        // 1. Pastikan tabel round_robin_pointers memiliki baris default untuk psb dan complaint
        if (Schema::hasTable('round_robin_pointers')) {
            $psbPointer = DB::table('round_robin_pointers')->where('queue_type', 'psb')->first();
            if (! $psbPointer) {
                DB::table('round_robin_pointers')->insert([
                    'queue_type' => 'psb',
                    'last_team_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $complaintPointer = DB::table('round_robin_pointers')->where('queue_type', 'complaint')->first();
            if (! $complaintPointer) {
                DB::table('round_robin_pointers')->insert([
                    'queue_type' => 'complaint',
                    'last_team_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // 2. Jika tabel legacy team_assignment_settings ada dan memiliki current_team
            if (Schema::hasTable('team_assignment_settings')) {
                $setting = DB::table('team_assignment_settings')->first();
                if ($setting && ! empty($setting->current_team)) {
                    // Cari id tim di tabel teams berdasarkan nama team
                    $team = DB::table('teams')->where('name', $setting->current_team)->first();
                    if ($team) {
                        DB::table('round_robin_pointers')
                            ->where('queue_type', 'psb')
                            ->update([
                                'last_team_id' => $team->id,
                                'updated_at' => now(),
                            ]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        // No-op to preserve pointer data
    }
};
