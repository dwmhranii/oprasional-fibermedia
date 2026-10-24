<?php

namespace App\Services\Mikrotik;

use App\Models\BrasDevice;
use App\Models\BrasSessionLog;
use App\Models\Customer;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class BrasSyncService
{
    /**
     * Sinkronisasi sesi PPPoE aktif dari sebuah perangkat BRAS MikroTik.
     *
     * @return array{success: bool, active_sessions: int, updated_customers: int, message: string}
     */
    public function syncDevice(BrasDevice $brasDevice): array
    {
        if (! $brasDevice->is_active) {
            return [
                'success' => false,
                'active_sessions' => 0,
                'updated_customers' => 0,
                'message' => "BRAS {$brasDevice->name} sedang dinonaktifkan.",
            ];
        }

        if (empty($brasDevice->ip_address)) {
            $brasDevice->update([
                'last_sync_status' => 'failed',
                'last_sync_error' => 'Alamat IP BRAS belum ditentukan.',
            ]);

            return [
                'success' => false,
                'active_sessions' => 0,
                'updated_customers' => 0,
                'message' => 'Alamat IP BRAS kosong.',
            ];
        }

        $client = new MikrotikApiClient(
            host: $brasDevice->ip_address,
            port: $brasDevice->api_port ?: 8728,
            timeout: $brasDevice->timeout ?: 5,
            ssl: (bool) $brasDevice->use_ssl
        );

        try {
            $client->connect(
                username: $brasDevice->username ?? 'admin',
                password: $brasDevice->password ?? ''
            );

            $activeSessions = $client->getActivePppoeSessions();
            $client->disconnect();

            $now = Carbon::now();
            $onlineUsernames = [];
            $updatedCount = 0;

            // 1. Proses setiap sesi aktif yang ditemukan
            foreach ($activeSessions as $session) {
                $username = trim($session['name'] ?? '');
                if ($username === '') {
                    continue;
                }

                $onlineUsernames[] = $username;

                // Cari customer berdasarkan username PPPoE atau customer_code
                $customer = Customer::where('username', $username)
                    ->orWhere('customer_code', $username)
                    ->first();

                $ip = $session['address'] ?? null;
                $mac = $session['caller_id'] ?? null;
                $uptime = $session['uptime'] ?? null;
                $sessionId = $session['session_id'] ?? null;

                $wasOnline = $customer?->is_online ?? false;

                if ($customer) {
                    // Update sebagai petunjuk koneksi, JANGAN menimpa status layanan (customer.status)
                    $customer->update([
                        'is_online' => true,
                        'last_online_at' => $wasOnline ? $customer->last_online_at : $now,
                        'current_ip_address' => $ip,
                        'current_mac_address' => $mac,
                        'session_uptime' => $uptime,
                        'session_id' => $sessionId,
                    ]);

                    $updatedCount++;

                    // Log perubahan jika baru saja online
                    if (! $wasOnline) {
                        BrasSessionLog::create([
                            'bras_device_id' => $brasDevice->id,
                            'customer_id' => $customer->id,
                            'username' => $username,
                            'event' => 'online',
                            'ip_address' => $ip,
                            'mac_address' => $mac,
                            'uptime' => $uptime,
                            'source' => 'bras',
                            'details' => $session,
                        ]);

                        if (function_exists('activity')) {
                            activity('bras')
                                ->performedOn($customer)
                                ->withProperties([
                                    'source' => 'bras',
                                    'event' => 'online',
                                    'ip' => $ip,
                                    'mac' => $mac,
                                    'bras_id' => $brasDevice->id,
                                ])
                                ->log("Pelanggan {$customer->name} ({$username}) terdeteksi online via BRAS {$brasDevice->name}");
                        }
                    }
                } else {
                    // Sesi aktif tercatat di BRAS tapi belum ada customer record di database
                    BrasSessionLog::create([
                        'bras_device_id' => $brasDevice->id,
                        'customer_id' => null,
                        'username' => $username,
                        'event' => 'unmapped_session',
                        'ip_address' => $ip,
                        'mac_address' => $mac,
                        'uptime' => $uptime,
                        'source' => 'bras',
                        'details' => $session,
                    ]);
                }
            }

            // 2. Tandai offline untuk pelanggan yang sebelumnya online pada BRAS ini tetapi tidak lagi muncul di sesi aktif
            $offlineCustomers = Customer::where(function ($q) use ($brasDevice) {
                $q->where('bras_id', $brasDevice->id)
                    ->orWhereNull('bras_id');
            })
                ->where('is_online', true)
                ->whereNotIn('username', $onlineUsernames)
                ->get();

            foreach ($offlineCustomers as $offCustomer) {
                // Update sebagai petunjuk offline, status layanan TETAP dipertahankan
                $offCustomer->update([
                    'is_online' => false,
                    'last_offline_at' => $now,
                    'session_uptime' => null,
                ]);

                $updatedCount++;

                BrasSessionLog::create([
                    'bras_device_id' => $brasDevice->id,
                    'customer_id' => $offCustomer->id,
                    'username' => $offCustomer->username ?? $offCustomer->customer_code,
                    'event' => 'offline',
                    'ip_address' => $offCustomer->current_ip_address,
                    'mac_address' => $offCustomer->current_mac_address,
                    'uptime' => null,
                    'source' => 'bras',
                    'details' => ['detected_at' => $now->toIso8601String()],
                ]);

                if (function_exists('activity')) {
                    activity('bras')
                        ->performedOn($offCustomer)
                        ->withProperties([
                            'source' => 'bras',
                            'event' => 'offline',
                            'bras_id' => $brasDevice->id,
                        ])
                        ->log("Pelanggan {$offCustomer->name} ({$offCustomer->username}) terdeteksi offline via BRAS {$brasDevice->name}");
                }
            }

            // 3. Update device status
            $brasDevice->update([
                'last_synced_at' => $now,
                'last_sync_status' => 'success',
                'last_sync_error' => null,
                'active_sessions_count' => count($activeSessions),
            ]);

            return [
                'success' => true,
                'active_sessions' => count($activeSessions),
                'updated_customers' => $updatedCount,
                'message' => 'Sinkronisasi sesi BRAS berhasil.',
            ];
        } catch (Exception $e) {
            Log::warning("Gagal sinkronisasi BRAS [{$brasDevice->id}] {$brasDevice->name}: {$e->getMessage()}");

            $brasDevice->update([
                'last_synced_at' => Carbon::now(),
                'last_sync_status' => 'failed',
                'last_sync_error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'active_sessions' => 0,
                'updated_customers' => 0,
                'message' => 'Gagal sinkronisasi BRAS: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Sinkronisasi semua BRAS devices yang aktif.
     *
     * @return array<int, array{bras_id: int, name: string, result: array}>
     */
    public function syncAll(): array
    {
        $devices = BrasDevice::where('is_active', true)->get();
        $results = [];

        foreach ($devices as $device) {
            $results[] = [
                'bras_id' => $device->id,
                'name' => $device->name,
                'result' => $this->syncDevice($device),
            ];
        }

        return $results;
    }
}
