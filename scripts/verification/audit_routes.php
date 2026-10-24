<?php

$routes = json_decode(file_get_contents('routes_audit.json'), true);
$apiRoutes = array_filter($routes, fn ($r) => str_starts_with($r['uri'], 'api/'));

$missingMiddleware = [];
$missingPolicyOrRole = [];

foreach ($apiRoutes as $r) {
    // skip auth endpoints for policy check
    $isAuth = in_array($r['uri'], ['api/login', 'api/logout', 'api/forgot-password', 'api/reset-password']);

    $middlewares = $r['middleware'] ?? [];
    $middlewareStr = implode(',', $middlewares);

    if (! $isAuth && ! str_contains($middlewareStr, 'auth:sanctum') && ! str_contains($middlewareStr, 'Authenticate')) {
        $missingMiddleware[] = "[{$r['method']}] {$r['uri']} -> {$r['action']}";
    }

    // Check for role/permission middleware
    if (! $isAuth && ! str_contains($middlewareStr, 'RoleMiddleware') && ! str_contains($middlewareStr, 'permission')) {
        $missingPolicyOrRole[] = "[{$r['method']}] {$r['uri']} -> {$r['action']} (Middlewares: $middlewareStr)";
    }
}

echo "Missing Auth Middleware:\n";
print_r($missingMiddleware);
echo "\nMissing Role/Policy Middleware (Route Level):\n";
print_r($missingPolicyOrRole);
