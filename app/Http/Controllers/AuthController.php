<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Handle user login via email, username, or phone number and issue a Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'nullable|string',
            'login' => 'nullable|string',
            'username' => 'nullable|string',
            'password' => 'required|string',
        ]);

        $loginInput = trim((string) $request->input('login', $request->input('email', $request->input('username'))));

        if (empty($loginInput)) {
            return $this->errorResponse('Email, username, atau nomor telepon wajib diisi.', 422);
        }

        // Normalisasi variasi nomor telepon jika diinput dengan format angka/internasional
        $cleanPhone = preg_replace('/[^0-9]/', '', $loginInput);
        $phoneAlternatives = [];
        if (! empty($cleanPhone)) {
            $phoneAlternatives[] = $cleanPhone;
            if (str_starts_with($cleanPhone, '62')) {
                $phoneAlternatives[] = '0'.substr($cleanPhone, 2);
            } elseif (str_starts_with($cleanPhone, '0')) {
                $phoneAlternatives[] = '62'.substr($cleanPhone, 1);
            }
        }

        $cleanNameInput = strtolower(str_replace(' ', '', $loginInput));
        // Normalisasi spasi di sekitar titik yang sering dibuat keyboard HP (misal: "teknisi. a1" -> "teknisi.a1")
        $cleanDotInput = preg_replace('/\s*\.\s*/', '.', $loginInput);
        $alphanumericInput = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $loginInput));

        // Prioritas Pencarian Pengguna yang Presisi (Mencegah "admin" mencocokkan "superadmin"):
        // 1. Exact match pada email, telepon, atau nama lengkap
        $user = User::where(function ($query) use ($loginInput, $cleanDotInput, $phoneAlternatives) {
            $query->where('email', $loginInput)
                ->orWhere('email', $cleanDotInput)
                ->orWhere('name', $loginInput);
            if (! empty($phoneAlternatives)) {
                $query->orWhereIn('phone', $phoneAlternatives)->orWhere('phone', $loginInput);
            }
        })->first();

        // 2. Exact match sebelum tanda @ (misal: "admin" -> "admin@example.com", "superadmin" -> "superadmin@example.com")
        if (! $user) {
            $user = User::where(function ($query) use ($loginInput, $cleanDotInput, $cleanNameInput) {
                $query->where('email', 'like', $loginInput.'@%')
                    ->orWhere('email', 'like', $cleanDotInput.'@%')
                    ->orWhereRaw("LOWER(REPLACE(name, ' ', '')) = ?", [$cleanNameInput]);
            })->first();
        }

        // 3. Prefix match awal kata email atau nama (misal: "teknisi.a" -> "teknisi.a1@...")
        if (! $user) {
            $user = User::where(function ($query) use ($loginInput, $cleanDotInput, $cleanNameInput, $alphanumericInput) {
                $query->where('email', 'like', $loginInput.'%')
                    ->orWhere('email', 'like', $cleanDotInput.'%')
                    ->orWhere('name', 'like', $loginInput.'%')
                    ->orWhereRaw("LOWER(REPLACE(name, ' ', '')) LIKE ?", [$cleanNameInput.'%']);

                if (! empty($alphanumericInput)) {
                    $query->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '-', ''), '_', '')) LIKE ?", [$alphanumericInput.'%'])
                        ->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(email, '.', ''), '-', ''), '_', '')) LIKE ?", [$alphanumericInput.'%']);
                }
            })->first();
        }

        // Tangani kebiasaan keyboard HP: auto-kapitalisasi huruf pertama ('Password'), trailing space ('password '), dsb.
        $rawPassword = (string) $request->password;
        $trimmedPassword = trim($rawPassword);

        $passwordMatches = false;
        if ($user) {
            $candidates = array_unique([
                $rawPassword,
                $trimmedPassword,
                lcfirst($rawPassword),
                lcfirst($trimmedPassword),
                strtolower($trimmedPassword),
            ]);

            foreach ($candidates as $candidate) {
                if (Hash::check($candidate, $user->password)) {
                    $passwordMatches = true;
                    break;
                }
            }
        }

        if (! $user || ! $passwordMatches) {
            return $this->errorResponse('Kredensial login (email/username/nomor telepon atau kata sandi) tidak sesuai.', 401);
        }

        if ($user->status !== 'active') {
            return $this->errorResponse('Akun Anda tidak aktif. Silakan hubungi administrator.', 401);
        }

        $clientType = $request->header('X-Client-Type') ?? $request->input('client_type');
        $deviceUuid = $request->input('device_uuid') ?? $request->header('X-Device-UUID');
        $isFieldClient = $clientType === 'pwa' || filled($deviceUuid) || $user->hasAnyRole(['Teknisi', 'Sales', 'Collector']);

        // Perangkat PWA / Lapangan terikat ke tabel devices (PRD Final v1.2)
        if ($isFieldClient && filled($deviceUuid)) {
            $device = Device::firstOrNew(['device_uuid' => $deviceUuid]);

            if ($device->exists) {
                if ($device->revoked_at !== null) {
                    return $this->errorResponse('Perangkat ini telah dicabut aksesnya oleh administrator.', 403);
                }
                if (! $device->isApproved() && config('app.env') === 'production') {
                    return $this->errorResponse('Perangkat ini belum disetujui administrator.', 403);
                }
                $device->user_id = $user->id;
                $device->last_seen_at = now();
                $device->save();
            } else {
                // Maksimal 2 perangkat terdaftar per akun
                $activeDeviceCount = Device::where('user_id', $user->id)
                    ->whereNull('revoked_at')
                    ->count();

                if ($activeDeviceCount >= 2) {
                    if (config('app.env') !== 'production') {
                        // Di lingkungan non-produksi, cabut perangkat terlama agar pengujian browser/incognito tidak terblokir
                        Device::where('user_id', $user->id)
                            ->whereNull('revoked_at')
                            ->orderBy('last_seen_at', 'asc')
                            ->first()
                            ?->update(['revoked_at' => now()]);
                    } else {
                        return $this->errorResponse('Batas maksimal 2 perangkat per akun telah tercapai. Hubungi administrator untuk mencabut perangkat lama.', 422);
                    }
                }

                $autoApprove = (config('app.env') !== 'production' || $user->hasRole('Superadmin'));
                $device = Device::create([
                    'user_id' => $user->id,
                    'device_uuid' => $deviceUuid,
                    'label' => $request->input('device_label', 'Perangkat Lapangan'),
                    'model' => $request->input('device_model'),
                    'platform' => $request->input('device_platform', 'Mobile'),
                    'approved_at' => $autoApprove ? now() : null,
                    'approved_by_id' => $autoApprove ? $user->id : null,
                    'last_seen_at' => now(),
                ]);

                if (! $device->isApproved()) {
                    return $this->errorResponse('Perangkat berhasil didaftarkan dan sedang menunggu persetujuan administrator.', 403);
                }
            }
        }

        // 1 sesi aktif: login mengakhiri sesi sebelumnya seketika (PRD Final v1.2)
        $user->tokens()->delete();

        // Batas token: PWA 12 jam, Web Admin 4 jam
        $expiresAt = $isFieldClient ? now()->addHours(12) : now()->addHours(4);
        $tokenName = $isFieldClient ? 'pwa_token' : 'admin_token';

        $token = $user->createToken($tokenName, ['*'], $expiresAt)->plainTextToken;

        return $this->successResponse([
            'token' => $token,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'team' => $user->team,
                'roles' => $user->getRoleNames(),
                'role' => $user->getRoleNames()->first(),
                'permissions' => ($user->hasRole('Superadmin') || $user->hasRole('superadmin'))
                    ? \Spatie\Permission\Models\Permission::pluck('name')
                    : $user->getAllPermissions()->pluck('name'),
            ],
        ], 'Login berhasil');
    }

    /**
     * Dapatkan profil pengguna saat ini, hak akses (permissions), status superadmin, dan pohon menu.
     */
    public function me(Request $request, \App\Services\MenuService $menuService): JsonResponse
    {
        $user = $request->user();
        if (! $user || $user->status !== 'active') {
            return $this->errorResponse('Sesi tidak sah atau telah kedaluwarsa.', 401);
        }

        $isSuperadmin = (bool) ($user->hasRole('Superadmin') || $user->hasRole('superadmin'));

        $permissions = $isSuperadmin
            ? \Spatie\Permission\Models\Permission::pluck('name')->toArray()
            : $user->getAllPermissions()->pluck('name')->toArray();

        $userData = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'roles' => $user->getRoleNames(),
            'role' => $user->getRoleNames()->first(),
            'permissions' => $permissions,
        ];

        return $this->successResponse([
            'user' => $userData,
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'team' => $user->team ? [
                'id' => $user->team->id,
                'name' => $user->team->name,
                'is_ready' => (bool) ($user->team->is_ready ?? true),
            ] : null,
            'roles' => $user->getRoleNames(),
            'is_superadmin' => $isSuperadmin,
            'permissions' => $permissions,
            'menus' => $menuService->getMenuTree($user),
        ]);
    }

    /**
     * Handle user logout by revoking the current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Berhasil keluar.');
    }

    /**
     * Send a password reset link to the given user.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? $this->successResponse(null, __($status))
            : $this->errorResponse(__($status), 400);
    }

    /**
     * Reset the user's password.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        $status = Password::reset($request->only('email', 'password', 'password_confirmation', 'token'), function ($user, $password) {
            $user->forceFill([
                'password' => Hash::make($password),
            ])->setRememberToken(Str::random(60));

            $user->save();
            event(new PasswordReset($user));
        });

        return $status === Password::PASSWORD_RESET
            ? $this->successResponse(null, __($status))
            : $this->errorResponse(__($status), 400);
    }
}
