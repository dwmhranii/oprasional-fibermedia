<?php

namespace App\Modules\Auth\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Authenticate user and issue dynamic Sanctum token:
     * - 12 hours for PWA / Field clients (Teknisi, Sales, or X-Client-Type: pwa)
     * - 4 hours for Admin / CS desktop clients
     */
    public function authenticate(string $login, string $password, ?string $clientType = null, ?string $deviceName = null): array
    {
        $user = User::where('email', $login)
            ->orWhere('name', $login)
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'login' => ['Your account is inactive. Please contact administrator.'],
            ]);
        }

        // PWA clients get 12 hours expiry; Admin/CS get 4 hours
        $isPwaClient = $clientType === 'pwa' || $user->hasRole(['Teknisi', 'Sales']);
        $tokenLifetimeMinutes = $isPwaClient ? (12 * 60) : (4 * 60);
        $expiresAt = now()->addMinutes($tokenLifetimeMinutes);

        $tokenName = $deviceName ?: ($isPwaClient ? 'pwa-field-token' : 'admin-web-token');
        $token = $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'lifetime_hours' => $isPwaClient ? 12 : 4,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'team' => $user->currentTeam ? [
                    'id' => $user->currentTeam->id,
                    'name' => $user->currentTeam->name,
                ] : null,
            ],
        ];
    }

    /**
     * Revoke current token.
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }
}
