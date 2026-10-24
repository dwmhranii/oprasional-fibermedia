<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BfassHealthCheckService
{
    protected string $baseUrl;

    protected string $healthEndpoint;

    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.bfass.url', 'https://bfass.example.com');
        $this->healthEndpoint = config('services.bfass.health_endpoint', '/api/v1/health');
        $this->timeout = config('services.bfass.health_timeout', 5);
    }

    /**
     * Check BFASS API health by calling a lightweight authenticated/ping endpoint
     */
    public function check(): array
    {
        $startTime = microtime(true);
        $result = [
            'reachable' => false,
            'auth_valid' => false,
            'latency_ms' => 0,
            'error' => null,
        ];

        try {
            $url = rtrim($this->baseUrl, '/').'/'.ltrim($this->healthEndpoint, '/');

            $request = Http::timeout($this->timeout);

            // If there's an API key or token configured, attach it.
            if ($token = config('services.bfass.token')) {
                $request->withToken($token);
            } elseif ($user = config('services.bfass.username')) {
                $request->withBasicAuth($user, config('services.bfass.password', ''));
            }

            $response = $request->get($url);

            $result['latency_ms'] = (int) ((microtime(true) - $startTime) * 1000);

            if ($response->successful()) {
                $result['reachable'] = true;
                $result['auth_valid'] = true;
            } elseif ($response->status() === 401 || $response->status() === 403) {
                $result['reachable'] = true;
                $result['auth_valid'] = false;
                $result['error'] = 'Authentication failed: '.$response->status();
            } else {
                $result['reachable'] = true;
                $result['error'] = 'Unexpected status code: '.$response->status();
            }

        } catch (ConnectionException $e) {
            $result['error'] = 'Connection timed out or unreachable';
        } catch (\Exception $e) {
            $result['error'] = 'Error: '.$e->getMessage();
        }

        if (! $result['reachable'] || $result['error']) {
            Log::warning('BFASS Health Check failed', $result);
        }

        return $result;
    }
}
