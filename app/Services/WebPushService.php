<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    protected ?WebPush $webPush = null;

    public function __construct()
    {
        $publicKey = env('VAPID_PUBLIC_KEY');
        $privateKey = env('VAPID_PRIVATE_KEY');
        $subject = env('VAPID_SUBJECT', 'mailto:admin@fibermedia.net');

        if ($publicKey && $privateKey) {
            try {
                $auth = [
                    'VAPID' => [
                        'subject' => $subject,
                        'publicKey' => $publicKey,
                        'privateKey' => $privateKey,
                    ],
                ];
                $this->webPush = new WebPush($auth);
                $this->webPush->setReuseVAPIDHeaders(true);
            } catch (\Throwable $e) {
                Log::error('WebPushService initialization failed: '.$e->getMessage());
            }
        }
    }

    public function sendToUser(User $user, string $title, string $body, array $extraData = []): int
    {
        $settings = $user->notification_settings;
        if (is_array($settings) && isset($settings['pushNotifications']) && $settings['pushNotifications'] === false) {
            return 0;
        }

        if (! $this->webPush) {
            Log::warning('WebPushService: VAPID keys not configured, cannot send push notification.');

            return 0;
        }

        $subscriptions = $user->pushSubscriptions()->get();
        if ($subscriptions->isEmpty()) {
            return 0;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'icon' => '/logo-fibermedia.png',
            'badge' => '/logo-fibermedia.png',
            'data' => array_merge([
                'url' => '/',
                'timestamp' => now()->timestamp,
            ], $extraData),
        ]);

        $queued = 0;
        foreach ($subscriptions as $sub) {
            try {
                $subscription = Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->public_key,
                    'authToken' => $sub->auth_token,
                    'contentEncoding' => $sub->content_encoding ?: 'aesgcm',
                ]);

                $this->webPush->queueNotification($subscription, $payload);
                $queued++;
            } catch (\Throwable $e) {
                Log::warning('Failed creating WebPush Subscription object: '.$e->getMessage());
            }
        }

        if ($queued === 0) {
            return 0;
        }

        $sentCount = 0;
        try {
            foreach ($this->webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                if ($report->isSuccess()) {
                    $sentCount++;
                } else {
                    Log::warning("WebPush failed for endpoint [{$endpoint}]: {$report->getReason()}");
                    $response = $report->getResponse();
                    if ($response && in_array($response->getStatusCode(), [404, 410])) {
                        PushSubscription::where('endpoint', $endpoint)->delete();
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error('WebPush flush error: '.$e->getMessage());
        }

        return $sentCount;
    }
}
