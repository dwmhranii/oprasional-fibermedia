<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\WebPushService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function __construct(
        protected WebPushService $webPushService
    ) {}

    public function vapidPublicKey(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'publicKey' => env('VAPID_PUBLIC_KEY'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string',
            'keys' => 'nullable|array',
            'keys.p256dh' => 'nullable|string',
            'keys.auth' => 'nullable|string',
            'content_encoding' => 'nullable|string',
        ]);

        $user = $request->user();

        PushSubscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'endpoint' => $validated['endpoint'],
            ],
            [
                'public_key' => $validated['keys']['p256dh'] ?? null,
                'auth_token' => $validated['keys']['auth'] ?? null,
                'content_encoding' => $validated['content_encoding'] ?? 'aesgcm',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Push subscription registered successfully',
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string',
        ]);

        $request->user()->pushSubscriptions()
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Push subscription removed successfully',
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $user = $request->user();
        $sent = $this->webPushService->sendToUser(
            $user,
            'Tes Notifikasi Fibermedia',
            'Notifikasi Web Push di HP Anda berhasil aktif!',
            ['url' => '/']
        );

        return response()->json([
            'success' => true,
            'message' => $sent > 0
                ? "Notifikasi berhasil dikirim ke {$sent} perangkat!"
                : 'Belum ada perangkat terdaftar atau notifikasi dinonaktifkan.',
            'devices_sent' => $sent,
        ]);
    }
}
