/**
 * Auth Service
 * Handles authentication API calls (login, logout only)
 */

import { apiClient, setToken, removeToken, setLoginTimestamp, ApiError } from './api';
import type { User, LoginRequest, LoginResponse } from '../types';

/**
 * Auth API endpoints
 */
const AUTH_ENDPOINTS = {
    LOGIN: '/login',
    LOGOUT: '/logout',
};

/**
 * Login result type
 */
export interface LoginResult {
    success: boolean;
    user?: User;
    error?: string;
}

/**
 * Auth Service
 */
export const authService = {
    /**
     * Login with username/email and password
     */
    login: async (
        login: string,
        password: string,
        remember: boolean = false
    ): Promise<LoginResult> => {
        try {
            const response = await apiClient.post<LoginResponse>(
                AUTH_ENDPOINTS.LOGIN,
                // Kirim 'login' dan 'email' untuk kompatibilitas penuh multi-credential
                { login, email: login, password },
                false // Don't include auth header for login
            );

            // Store token using Laravel's access_token field
            setToken(response.access_token, response.token_type);
            // Record login time for 4-hour session expiry
            setLoginTimestamp();

            return {
                success: true,
                user: response.user,
            };
        } catch (error) {
            if (error instanceof ApiError) {
                return {
                    success: false,
                    error: error.getFirstError(),
                };
            }
            return {
                success: false,
                error: 'Terjadi kesalahan koneksi. Silakan coba lagi.',
            };
        }
    },

    /**
     * Logout current user
     */
    logout: async (): Promise<void> => {
        try {
            await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
        } catch (error) {
            // Ignore logout errors, we'll clear token anyway
            console.warn('Logout API call failed:', error);
        } finally {
            removeToken();
        }
    },

    /**
     * Send forgot password request
     */
    forgotPassword: async (email: string): Promise<void> => {
        await apiClient.post('/forgot-password', { email }, false);
    },
};
