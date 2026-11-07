<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Services\TotpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class TwoFactorController extends Controller
{
    protected TotpService $totpService;

    public function __construct(TotpService $totpService)
    {
        $this->totpService = $totpService;
    }

    /**
     * Dapatkan status 2FA akun pengguna saat ini.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'enabled' => $user->two_factor_confirmed_at !== null,
                'confirmed_at' => $user->two_factor_confirmed_at?->toIso8601String(),
                'has_recovery_codes' => ! empty($user->two_factor_recovery_codes),
            ],
        ]);
    }

    /**
     * Inisiasi penyiapan 2FA: hasilkan secret dan tautan otpauth.
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        $secret = $this->totpService->generateSecret();
        $user->forceFill([
            'two_factor_secret' => $secret,
        ])->save();

        $appName = config('app.name', 'Fibermedia');
        $otpAuthUrl = $this->totpService->getOtpAuthUrl($appName, $user->email, $secret);

        return response()->json([
            'success' => true,
            'message' => 'Kunci rahasia 2FA berhasil dibuat. Pindai kode QR atau masukkan kunci ke aplikasi Authenticator.',
            'data' => [
                'secret' => $secret,
                'otpauth_url' => $otpAuthUrl,
            ],
        ]);
    }

    /**
     * Konfirmasi dan aktifkan 2FA dengan memverifikasi kode 6-digit pertama.
     */
    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = $request->user();

        if (empty($user->two_factor_secret)) {
            return response()->json([
                'success' => false,
                'message' => 'Penyiapan 2FA belum dimulai. Silakan inisiasi penyiapan terlebih dahulu.',
            ], 422);
        }

        $isValid = $this->totpService->verify($user->two_factor_secret, $validated['code']);
        if (! $isValid) {
            return response()->json([
                'success' => false,
                'message' => 'Kode autentikasi 6-digit tidak valid atau telah kedaluwarsa. Periksa jam perangkat Anda.',
            ], 422);
        }

        $recoveryCodes = $this->totpService->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
        ])->save();

        activity('security')
            ->causedBy($user)
            ->performedOn($user)
            ->log("Autentikasi dua faktor (2FA TOTP) berhasil diaktifkan oleh {$user->name}");

        return response()->json([
            'success' => true,
            'message' => 'Autentikasi Dua Faktor (2FA) berhasil diaktifkan.',
            'data' => [
                'enabled' => true,
                'confirmed_at' => $user->two_factor_confirmed_at->toIso8601String(),
                'recovery_codes' => $recoveryCodes,
            ],
        ]);
    }

    /**
     * Nonaktifkan 2FA dengan verifikasi kata sandi pengguna.
     */
    public function disable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Kata sandi saat ini tidak sesuai.',
            ], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        activity('security')
            ->causedBy($user)
            ->performedOn($user)
            ->log("Autentikasi dua faktor (2FA TOTP) dinonaktifkan oleh {$user->name}");

        return response()->json([
            'success' => true,
            'message' => 'Autentikasi Dua Faktor (2FA) berhasil dinonaktifkan.',
        ]);
    }
}

