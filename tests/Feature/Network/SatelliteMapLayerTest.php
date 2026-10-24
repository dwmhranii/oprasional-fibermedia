<?php

namespace Tests\Feature\Network;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SatelliteMapLayerTest extends TestCase
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

        $this->technician = User::factory()->create(['name' => 'Teknisi Lapangan']);
        $this->technician->assignRole('Teknisi');
    }

    public function test_it_returns_available_map_layers_including_licensed_satellite_layer(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/network/map-layers');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data');

        // Check street layer
        $response->assertJsonPath('data.0.id', 'street_osm')
            ->assertJsonPath('data.0.is_satellite', false);

        // Check licensed satellite layer
        $response->assertJsonPath('data.1.id', 'satellite_esri')
            ->assertJsonPath('data.1.is_satellite', true)
            ->assertJsonPath('data.1.is_licensed', true)
            ->assertJsonPath('data.1.requires_terms_acceptance', true);
    }

    public function test_it_provides_provider_attribution_and_terms_of_use_for_licensed_satellite_layer(): void
    {
        $response = $this->actingAs($this->technician, 'sanctum')
            ->getJson('/api/network/map-layers');

        $response->assertOk();

        $satelliteLayer = collect($response->json('data'))->firstWhere('id', 'satellite_esri');

        $this->assertNotNull($satelliteLayer, 'Satellite layer must exist');
        $this->assertStringContainsString('Esri', $satelliteLayer['attribution']);
        $this->assertTrue($satelliteLayer['requires_terms_acceptance']);
        $this->assertNotEmpty($satelliteLayer['terms_of_use']['disclaimer']);
        $this->assertNotEmpty($satelliteLayer['terms_of_use']['summary']);
    }
}
