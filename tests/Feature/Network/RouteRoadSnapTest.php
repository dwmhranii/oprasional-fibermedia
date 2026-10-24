<?php

namespace Tests\Feature\Network;

use App\Models\User;
use App\Services\Network\RoadRoutingService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RouteRoadSnapTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $technician;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->admin = User::factory()->create(['name' => 'Admin GIS']);
        $this->admin->assignRole('Admin');

        $this->technician = User::factory()->create(['name' => 'Teknisi Jalur']);
        $this->technician->assignRole('Teknisi');
    }

    protected function tearDown(): void
    {
        RoadRoutingService::restore();
        parent::tearDown();
    }

    public function test_it_snaps_route_along_road_when_button_trigger_pressed(): void
    {
        $origin = [112.6300, -7.9800];
        $destination = [112.6350, -7.9820];

        // Mock road snapping result
        $mockRoadWaypoints = [
            [112.6300, -7.9800],
            [112.6320, -7.9805],
            [112.6335, -7.9812],
            [112.6350, -7.9820],
        ];

        RoadRoutingService::fake($mockRoadWaypoints);

        $response = $this->actingAs($this->technician, 'sanctum')
            ->postJson('/api/network/route-snap', [
                'origin' => $origin,
                'destination' => $destination,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('snapped_to_road', true)
            ->assertJsonCount(4, 'coordinates')
            ->assertJsonPath('coordinates.1', [112.6320, -7.9805]);
    }

    public function test_it_falls_back_to_straight_line_when_routing_service_unavailable(): void
    {
        $origin = [112.6300, -7.9800];
        $destination = [112.6350, -7.9820];

        // Simulate network/OSRM failure
        RoadRoutingService::fake(new Exception('Connection to routing engine timed out'));

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/network/route-snap', [
                'origin' => $origin,
                'destination' => $destination,
            ]);

        // Fallback returns 200 with straight line coordinates and snapped_to_road = false
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('snapped_to_road', false)
            ->assertJsonCount(2, 'coordinates')
            ->assertJsonPath('coordinates.0', $origin)
            ->assertJsonPath('coordinates.1', $destination);
    }

    public function test_it_validates_coordinate_inputs(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/network/route-snap', [
                'origin' => [200.0, -7.9800], // invalid longitude > 180
                'destination' => [112.6350, -100.0], // invalid latitude < -90
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['origin.0', 'destination.1']);
    }
}
