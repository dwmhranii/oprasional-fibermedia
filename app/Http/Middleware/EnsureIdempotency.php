<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotency
{
    /**
     * Handle an incoming request with Idempotency-Key support.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('Idempotency-Key');

        if (! $idempotencyKey || ! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return $next($request);
        }

        $userId = $request->user()?->id ?? 'guest';
        $cacheKey = "idempotency:{$userId}:{$idempotencyKey}";

        // If response is already cached for this idempotency key, return it immediately
        if ($cached = Cache::get($cacheKey)) {
            $response = response($cached['content'], $cached['status']);
            foreach ($cached['headers'] as $header => $values) {
                if (! in_array(strtolower($header), ['transfer-encoding', 'content-length', 'connection'])) {
                    $response->headers->set($header, $values);
                }
            }
            $response->headers->set('X-Idempotent-Replay', 'true');

            return $response;
        }

        // Lock briefly to prevent simultaneous duplicate submissions
        $lockKey = "idempotency_lock:{$userId}:{$idempotencyKey}";
        $lock = Cache::lock($lockKey, 10);

        if (! $lock->get()) {
            return response()->json([
                'success' => false,
                'message' => 'Permintaan yang sama sedang diproses. Silakan tunggu.',
            ], 409);
        }

        try {
            $response = $next($request);

            // Cache successful responses and client errors for 24 hours (do not cache 5xx server crashes)
            if ($response->getStatusCode() < 500) {
                Cache::put($cacheKey, [
                    'status' => $response->getStatusCode(),
                    'headers' => $response->headers->all(),
                    'content' => $response->getContent(),
                ], now()->addHours(24));
            }

            return $response;
        } finally {
            $lock->release();
        }
    }
}
