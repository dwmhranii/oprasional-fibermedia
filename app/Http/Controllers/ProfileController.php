<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Default notification settings structure
     */
    private array $defaultNotificationSettings = [
        'emailNotifications' => true,
        'pushNotifications' => true,
        'smsNotifications' => false,
        'submissionUpdates' => true,
        'taskReminders' => true,
        'weeklyReport' => false,
    ];

    /**
     * Update user profile information.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'phone' => 'nullable|string|max:20',
        ]);

        $user->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'] ?? null,
        ]);

        return $this->successResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'roles' => $user->getRoleNames(),
            'notification_settings' => $user->notification_settings ?? $this->defaultNotificationSettings,
        ], 'Profile updated successfully');
    }

    /**
     * Change user password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return $this->errorResponse('Password saat ini tidak cocok.', 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->new_password),
        ])->save();

        return $this->successResponse(null, 'Password updated successfully');
    }

    /**
     * Get user notification settings.
     */
    public function getNotificationSettings(Request $request): JsonResponse
    {
        $user = $request->user();
        $settings = $user->notification_settings ?? $this->defaultNotificationSettings;

        return $this->successResponse($settings, 'Notification settings retrieved');
    }

    /**
     * Update user notification settings.
     */
    public function updateNotificationSettings(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'emailNotifications' => 'boolean',
            'pushNotifications' => 'boolean',
            'smsNotifications' => 'boolean',
            'submissionUpdates' => 'boolean',
            'taskReminders' => 'boolean',
            'weeklyReport' => 'boolean',
        ]);

        $currentSettings = $user->notification_settings ?? $this->defaultNotificationSettings;
        $newSettings = array_merge($currentSettings, $validated);

        $user->notification_settings = $newSettings;
        $user->save();

        return $this->successResponse($user->notification_settings, 'Notification settings updated successfully');
    }
}
