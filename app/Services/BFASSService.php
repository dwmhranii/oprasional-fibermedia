<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BFASSService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.bfass.url', 'https://bfass.example.com');
    }

    /**
     * Create a new BFASS account for the provisioning
     */
    public function createAccount(array $data): array
    {
        try {
            $response = Http::timeout(10)->post("{$this->baseUrl}/api/v1/accounts", $data);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json(),
                ];
            }

            return [
                'success' => false,
                'message' => $response->body(),
            ];
        } catch (\Exception $e) {
            Log::error('BFASS API Error: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Failed to connect to BFASS server',
            ];
        }
    }
}
