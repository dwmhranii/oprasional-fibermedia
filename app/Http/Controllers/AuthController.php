<?php

namespace App\Http\Controllers;

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

        $user = User::where(function ($query) use ($loginInput, $cleanNameInput, $cleanDotInput, $alphanumericInput, $phoneAlternatives) {
            $query->where('email', $loginInput)
                ->orWhere('name', $loginInput)
                ->orWhere('email', 'like', $loginInput.'@%')
                ->orWhere('email', 'like', $loginInput.'%')
                ->orWhere('email', 'like', $cleanDotInput.'%')
                ->orWhere('email', 'like', '%'.$cleanDotInput.'%')
                ->orWhere('name', 'like', $loginInput.'%')
                ->orWhereRaw("LOWER(REPLACE(name, ' ', '')) = ?", [$cleanNameInput])
                ->orWhereRaw("LOWER(REPLACE(name, ' ', '')) LIKE ?", [$cleanNameInput.'%']);

            if (! empty($alphanumericInput)) {
                $query->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), '-', ''), '_', '')) LIKE ?", [$alphanumericInput.'%'])
                    ->orWhereRaw("LOWER(REPLACE(REPLACE(REPLACE(email, '.', ''), '-', ''), '_', '')) LIKE ?", [$alphanumericInput.'%']);
            }

            if (! empty($phoneAlternatives)) {
                $query->orWhereIn('phone', $phoneAlternatives)
                    ->orWhere('phone', $loginInput);
            }
        })->first();

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
            return $this->errorResponse('Your account is inactive. Please contact administrator.', 401);
        }

        $clientType = $request->header('X-Client-Type') ?? $request->input('client_type');
        $isFieldClient = $clientType === 'pwa' || $user->hasAnyRole(['Teknisi', 'Sales']);
        $expiresAt = $isFieldClient ? now()->addHours(12) : now()->addHours(4);

        $token = $user->createToken('auth_token', ['*'], $expiresAt)->plainTextToken;

        return $this->successResponse([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'team' => $user->team,
                'roles' => $user->getRoleNames(),
            ],
        ], 'Login berhasil');
    }

    /**
     * Handle user logout by revoking the current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Successfully logged out');
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
