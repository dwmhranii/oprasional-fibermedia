<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_runs_successfully(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseHas('teams', [
            'name' => 'Team A',
            'order_index' => 1,
            'is_active' => 1,
        ]);

        $this->assertDatabaseHas('odcs', [
            'code' => 'ODC-BLW-01',
        ]);

        $this->assertDatabaseHas('cable_tracks', [
            'client_uuid' => 'CABLE-BLW-FEEDER-01',
            'status' => 'approved',
        ]);

        $this->assertDatabaseCount('customers', 20);
        $this->assertDatabaseCount('team_members', 8);
    }
}
