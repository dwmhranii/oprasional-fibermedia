/**
 * Profile Service
 * Handles user profile, password change, and notification settings API calls
 */

import { apiClient, ApiError } from './api';
import type { User } from '../types';

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  submissionUpdates: boolean;
  taskReminders: boolean;
  weeklyReport: boolean;
}

export interface UpdateProfileData {
  name: string;
  phone?: string;
  username?: string;
  avatar?: string | null;
}

export const profileService = {
  /**
   * Update profile info (name, phone, username, avatar)
   */
  updateProfile: async (data: UpdateProfileData): Promise<User> => {
    return await apiClient.put<User>('/user/profile', {
      name: data.name,
      phone: data.phone,
    });
  },

  /**
   * Change password
   */
  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> => {
    await apiClient.put('/user/password', data);
  },

  /**
   * Get notification settings
   */
  getNotificationSettings: async (): Promise<NotificationSettings> => {
    return await apiClient.get<NotificationSettings>('/user/notification-settings');
  },

  /**
   * Update notification settings
   */
  updateNotificationSettings: async (
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> => {
    return await apiClient.put<NotificationSettings>('/user/notification-settings', settings);
  },
};
