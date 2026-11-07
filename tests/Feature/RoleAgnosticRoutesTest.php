<?php

namespace Tests\Feature;

use App\Models\Complaint;
use App\Models\Customer;
use App\Models\Package;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RoleAgnosticRoutesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    /**
     * Test that no backend route contains role names as path segments.
     */
    public function test_backend_routes_do_not_contain_role_names_in_path_segments(): void
    {
        $forbiddenSegments = ['admin', 'superadmin', 'teknisi', 'sales'];
        $offendingRoutes = [];

        /** @var \Illuminate\Routing\Route $route */
        foreach (Route::getRoutes() as $route) {
            $uri = $route->uri();
            
            // Skip storage or ignition internal routes if any
            if (str_starts_with($uri, '_ignition') || str_starts_with($uri, 'sanctum')) {
                continue;
            }

            $segments = explode('/', trim($uri, '/'));
            foreach ($segments as $segment) {
                // Ignore parameter placeholders like {role} or {admin}
                $cleanSegment = strtolower(trim($segment, '{}'));
                if (in_array($cleanSegment, $forbiddenSegments, true)) {
                    $offendingRoutes[] = [
                        'method' => implode('|', $route->methods()),
                        'uri' => $uri,
                        'name' => $route->getName(),
                        'offending_segment' => $segment,
                    ];
                }
            }
        }

        $this->assertEmpty(
            $offendingRoutes,
            "Backend routes contain forbidden role path segments:\n" . json_encode($offendingRoutes, JSON_PRETTY_PRINT)
        );
    }

    /**
     * Test that active routes in frontend router configs do not contain role path segments.
     */
    public function test_frontend_admin_router_active_routes_do_not_contain_role_prefixes(): void
    {
        $appTsxPath = resource_path('js/admin/app/App.tsx');
        $this->assertFileExists($appTsxPath);

        $content = File::get($appTsxPath);
        
        // Find all <Route path="..." element={...} /> lines
        preg_match_all('/<Route\s+path="([^"]+)"\s+element=\{([^}]+)\}/', $content, $matches, PREG_SET_ORDER);

        $forbiddenPrefixes = ['/admin', '/superadmin', '/teknisi', '/sales'];
        $offendingActiveRoutes = [];

        foreach ($matches as $match) {
            $path = $match[1];
            $element = $match[2];

            // If the element contains <Navigate, it's a legacy redirect route, which is allowed for backward compatibility
            if (str_contains($element, 'Navigate')) {
                continue;
            }

            foreach ($forbiddenPrefixes as $prefix) {
                if (str_starts_with($path, $prefix)) {
                    $offendingActiveRoutes[] = $path;
                }
            }
        }

        $this->assertEmpty(
            $offendingActiveRoutes,
            "Frontend App.tsx contains active role-prefixed routes:\n" . implode("\n", $offendingActiveRoutes)
        );
    }

    /**
     * Test that GET /api/me returns user, team, is_superadmin, permissions, and menus.
     */
    public function test_api_me_returns_complete_access_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Budi Staff',
            'email' => 'budi@fibermedia.test',
        ]);
        $user->givePermissionTo('dashboard.view', 'customers.view');

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'user' => ['id', 'name', 'email'],
                    'team',
                    'is_superadmin',
                    'permissions',
                    'menus',
                ],
            ]);

        $data = $response->json('data');
        $this->assertFalse($data['is_superadmin']);
        $this->assertContains('dashboard.view', $data['permissions']);
        $this->assertContains('customers.view', $data['permissions']);
    }

    /**
     * Test that superadmin user gets is_superadmin = true and all permissions.
     */
    public function test_api_me_identifies_superadmin(): void
    {
        $superadmin = User::factory()->create([
            'name' => 'Root Admin',
            'email' => 'root@fibermedia.test',
        ]);
        $superadmin->assignRole('Superadmin');

        Sanctum::actingAs($superadmin);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200);
        $this->assertTrue($response->json('data.is_superadmin'));
    }

    /**
     * Test that user without required permission receives 403 Forbidden.
     */
    public function test_user_without_permission_receives_403(): void
    {
        $user = User::factory()->create();
        // Give no permission to users or dispatch
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/users');
        $response->assertStatus(403);
    }

    /**
     * Test that user with required permission receives 200 OK.
     */
    public function test_user_with_permission_receives_200(): void
    {
        $user = User::factory()->create();
        $user->givePermissionTo('users.view');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/users');
        $response->assertStatus(200);
    }

    /**
     * Test that permission changes in database apply immediately without re-login.
     */
    public function test_permission_change_takes_effect_immediately(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // 1. Initial attempt: Forbidden (403)
        $firstResponse = $this->getJson('/api/users');
        $firstResponse->assertStatus(403);

        // 2. Grant permission directly in database
        $user->givePermissionTo('users.view');
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 3. Immediate next request with the exact same authenticated session: OK (200)
        $secondResponse = $this->getJson('/api/users');
        $secondResponse->assertStatus(200);
    }

    /**
     * Test that legacy frontend routes redirect to their new counterparts.
     */
    public function test_legacy_frontend_routes_are_mapped_to_redirects(): void
    {
        $appTsx = File::get(resource_path('js/admin/app/App.tsx'));

        $expectedRedirects = [
            '/superadmin/users' => '/users',
            '/admin/customers' => '/customers',
            '/admin/complaints' => '/complaints',
            '/admin/submissions' => '/submissions',
            '/admin/network/map' => '/network/map',
            '/teknisi/tasks' => '/work-orders',
            '/sales/submissions' => '/submissions',
        ];

        foreach ($expectedRedirects as $old => $new) {
            $pattern = sprintf('path="%s"', preg_quote($old, '/'));
            $this->assertMatchesRegularExpression(
                '/' . $pattern . '/',
                $appTsx,
                "Expected legacy path {$old} to be registered in App.tsx redirects"
            );
        }
    }

    /**
     * Test that GET /api/complaints returns all complaints for complaints.view,
     * but only own complaints for complaints.view_own.
     */
    public function test_complaints_endpoint_scopes_data_by_permission(): void
    {
        $package = Package::create([
            'name' => 'Paket Super 30M',
            'code' => 'SP-30M',
            'speed' => 30,
            'price' => 200000,
            'is_active' => true,
        ]);

        $customer = Customer::create([
            'customer_code' => 'CUST-001',
            'name' => 'Budi Santoso',
            'email' => 'budi@santoso.test',
            'phone' => '08123456789',
            'address' => 'Jl. Merdeka No 1',
            'nik' => '3201123456780001',
            'package_id' => $package->id,
            'status' => 'active',
            'latitude' => -7.123,
            'longitude' => 112.123,
        ]);

        $userA = User::factory()->create(['name' => 'Petugas A']);
        $userB = User::factory()->create(['name' => 'Petugas B']);

        // Complaint by User A
        $complaintA = Complaint::create([
            'ticket_number' => 'TCK-001',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_address' => $customer->address,
            'area' => 'Wilayah Barat',
            'subject' => 'Tiket A',
            'description' => 'Deskripsi tiket A',
            'category' => 'slow_speed',
            'priority' => 'medium',
            'status' => 'open',
            'created_by' => $userA->name,
            'created_by_id' => $userA->id,
        ]);

        // Complaint by User B
        $complaintB = Complaint::create([
            'ticket_number' => 'TCK-002',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'customer_phone' => $customer->phone,
            'customer_address' => $customer->address,
            'area' => 'Wilayah Timur',
            'subject' => 'Tiket B',
            'description' => 'Deskripsi tiket B',
            'category' => 'no_signal',
            'priority' => 'high',
            'status' => 'open',
            'created_by' => $userB->name,
            'created_by_id' => $userB->id,
        ]);

        // 1. User with only 'complaints.view_own' sees ONLY their own complaint
        $userA->givePermissionTo('complaints.view_own');
        Sanctum::actingAs($userA);

        $resA = $this->getJson('/api/complaints');
        $resA->assertStatus(200);
        $ticketNumbersA = collect($resA->json('data'))->pluck('ticket_number')->all();
        $this->assertContains('TCK-001', $ticketNumbersA);
        $this->assertNotContains('TCK-002', $ticketNumbersA);

        // 2. User with 'complaints.view' sees ALL complaints
        $supervisor = User::factory()->create(['name' => 'Supervisor Operasional']);
        $supervisor->givePermissionTo('complaints.view');
        Sanctum::actingAs($supervisor);

        $resSuper = $this->getJson('/api/complaints');
        $resSuper->assertStatus(200);
        $ticketNumbersSuper = collect($resSuper->json('data'))->pluck('ticket_number')->all();
        $this->assertContains('TCK-001', $ticketNumbersSuper);
        $this->assertContains('TCK-002', $ticketNumbersSuper);
    }

    /**
     * Test that pwa.access controls access to field endpoints and Superadmin bypasses it.
     */
    public function test_pwa_access_permission_controls_field_operations(): void
    {
        // 1. User with attendance.self but WITHOUT pwa.access receives 403 Forbidden
        $userWithoutPwa = User::factory()->create(['name' => 'Staf Kantor']);
        $userWithoutPwa->givePermissionTo('attendance.self');
        Sanctum::actingAs($userWithoutPwa);

        $resDenied = $this->getJson('/api/attendance/today');
        $resDenied->assertStatus(403);

        // 2. User granted pwa.access receives 200 OK
        $userWithoutPwa->givePermissionTo('pwa.access');
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $resAllowed = $this->getJson('/api/attendance/today');
        $resAllowed->assertStatus(200);

        // 3. Superadmin passes unconditionally via Gate::before
        $superadmin = User::factory()->create(['name' => 'Super Administrator']);
        $superadmin->assignRole('Superadmin');
        Sanctum::actingAs($superadmin);

        $resSuper = $this->getJson('/api/attendance/today');
        $resSuper->assertStatus(200);
    }

    /**
     * Test that localStorage keys and Dexie database follow strict prefix isolation.
     */
    public function test_storage_prefixes_and_database_isolation(): void
    {
        // Verify Dexie DB name is fm_pwa
        $offlineQueuePath = resource_path('js/shared/offlineQueue.ts');
        $this->assertFileExists($offlineQueuePath);
        $offlineQueueContent = File::get($offlineQueuePath);
        $this->assertStringContainsString("super('fm_pwa')", $offlineQueueContent);

        // Verify Admin codebase does NOT write or read fm-pwa: or fm_pwa
        $adminDir = resource_path('js/admin');
        $adminFiles = File::allFiles($adminDir);
        foreach ($adminFiles as $file) {
            $content = File::get($file->getRealPath());
            $this->assertStringNotContainsString(
                'fm-pwa:',
                $content,
                "File {$file->getRelativePathname()} in admin contains forbidden PWA storage prefix 'fm-pwa:'"
            );
            $this->assertStringNotContainsString(
                "'fm_pwa'",
                $content,
                "File {$file->getRelativePathname()} in admin contains forbidden PWA database name 'fm_pwa'"
            );
        }

        // Verify Field codebase does NOT write or read fm-admin:
        $fieldDir = resource_path('js/field');
        $fieldFiles = File::allFiles($fieldDir);
        foreach ($fieldFiles as $file) {
            $content = File::get($file->getRealPath());
            $this->assertStringNotContainsString(
                'fm-admin:',
                $content,
                "File {$file->getRelativePathname()} in field contains forbidden Admin storage prefix 'fm-admin:'"
            );
        }
    }

    /**
     * Test that all single-door legacy routes redirect to new clean paths.
     */
    public function test_single_door_legacy_routes_redirect_properly(): void
    {
        $appTsx = File::get(resource_path('js/admin/app/App.tsx'));

        $expectedRedirects = [
            '/submissions' => '/customers/submissions',
            '/network/nodes' => '/network/odp',
            '/network/kmz' => '/network/odp?action=import-kmz',
            '/attendance' => '/attendance/today',
            '/office-locations' => '/attendance/offices',
            '/devices' => '/access/devices',
            '/users' => '/access/users',
            '/settings/access' => '/access/roles',
            '/activity-log' => '/settings/activity-log',
        ];

        foreach ($expectedRedirects as $old => $new) {
            $pattern = sprintf('path="%s"', preg_quote($old, '/'));
            $this->assertMatchesRegularExpression(
                '/' . $pattern . '/',
                $appTsx,
                "Expected single-door legacy path {$old} to be registered in App.tsx redirects"
            );
        }
    }
}
