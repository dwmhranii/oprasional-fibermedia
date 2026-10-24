import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authService } from '../lib/authService';
import { hasToken, removeToken, getLoginTimestamp, removeLoginTimestamp } from '../lib/api';
import { userToFrontend } from '../lib/mappers';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Storage key for user data
const USER_KEY = 'auth_user';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Get stored user from localStorage
 */
const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
  }
  return null;
};

/**
 * Store user in localStorage
 */
const storeUser = (user: User): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Remove user from localStorage
 */
const removeStoredUser = (): void => {
  localStorage.removeItem(USER_KEY);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously initialize user from localStorage on first render (0ms wait, no spinner hang)
  const [user, setUser] = useState<User | null>(() => {
    try {
      if (hasToken()) {
        const storedUser = getStoredUser();
        if (storedUser) {
          const loginAt = getLoginTimestamp();
          const SESSION_DURATION_MS = 4 * 60 * 60 * 1000;
          if (loginAt !== null && Date.now() - loginAt >= SESSION_DURATION_MS) {
            removeStoredUser();
            removeToken();
            removeLoginTimestamp();
            return null;
          }
          return storedUser;
        } else {
          removeToken();
        }
      }
    } catch (e) {
      console.error('Failed to restore session from localStorage:', e);
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Unified logout side-effects.
   * showToast = true  → session expired / 401 path
   * showToast = false → voluntary logout
   */
  const performLogout = useCallback(
    (showToast: boolean = false) => {
      setUser(null);
      removeStoredUser();
      removeToken();
      removeLoginTimestamp();
      queryClient.clear();
      setIsLoading(false);
      if (showToast) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.', {
          duration: 5000,
        });
      }
    },
    [queryClient]
  );

  // Poll every 60 seconds to catch 4-hour expiry while the tab is open
  useEffect(() => {
    const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

    const expiryInterval = setInterval(() => {
      const loginAt = getLoginTimestamp();
      if (loginAt !== null && Date.now() - loginAt >= SESSION_DURATION_MS) {
        performLogout(true);
      }
    }, 60_000);

    // Listen for global unauthorized events (401 responses)
    const handleUnauthorized = () => {
      performLogout(true);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    return () => {
      clearInterval(expiryInterval);
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [performLogout]);

  const login = async (
    username: string,
    password: string,
    remember: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await authService.login(username, password, remember);

    if (result.success && result.user) {
      const normalizedUser = userToFrontend(result.user);
      setUser(normalizedUser);
      storeUser(normalizedUser); // Store user in localStorage
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Login gagal. Silakan coba lagi.',
    };
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      performLogout(false);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updatedFields };
      storeUser(nextUser);
      return nextUser;
    });
  };

  // Show loading state only if explicitly waiting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
