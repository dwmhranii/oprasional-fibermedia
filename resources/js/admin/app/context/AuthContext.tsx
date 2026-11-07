import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import type { User } from '../types';
import { authService } from '../lib/authService';
import { apiClient, hasToken, removeToken, getLoginTimestamp, removeLoginTimestamp } from '../lib/api';
import { userToFrontend } from '../lib/mappers';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Storage key for user data (fm-admin: prefix untuk isolasi origin)
const USER_KEY = 'fm-admin:auth_user';
const PERMISSIONS_KEY = 'fm-admin:auth_permissions';
const IS_SUPERADMIN_KEY = 'fm-admin:auth_is_superadmin';

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isSuperadmin: boolean;
  can: (permission: string) => boolean;
  refetchMe: () => Promise<void>;
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
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem(IS_SUPERADMIN_KEY);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          const isSuper = Boolean(
            storedUser.is_superadmin === true ||
            storedUser.email === 'superadmin@example.com' ||
            storedUser.role?.toLowerCase() === 'superadmin' ||
            (Array.isArray(storedUser.roles) && storedUser.roles.some((r: any) => String(r).toLowerCase().includes('superadmin')))
          );
          if (isSuper && storedUser.role !== 'superadmin') {
            storedUser.role = 'superadmin';
            storeUser(storedUser);
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

  const [permissions, setPermissions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PERMISSIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isSuperadmin, setIsSuperadmin] = useState<boolean>(() => {
    try {
      if (hasToken()) {
        const storedUser = getStoredUser();
        if (storedUser) {
          return Boolean(
            storedUser.is_superadmin === true ||
            storedUser.email === 'superadmin@example.com' ||
            storedUser.role?.toLowerCase() === 'superadmin' ||
            (Array.isArray(storedUser.roles) && storedUser.roles.some((r: any) => String(r).toLowerCase().includes('superadmin')))
          );
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  /**
   * Unified logout side-effects.
   */
  const performLogout = useCallback(
    (showToast: boolean = false) => {
      setUser(null);
      setPermissions([]);
      setIsSuperadmin(false);
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

  /**
   * Fetch latest profile, permissions, and superadmin flag from GET /api/me
   */
  const refetchMe = useCallback(async (): Promise<void> => {
    if (!hasToken()) return;
    try {
      const data = await apiClient.get<any>('/me');
      if (data) {
        const rawUser = {
          ...(typeof data.user === 'object' ? data.user : {}),
          ...data,
          roles: data.roles || data.user?.roles || [],
          role: data.role || data.user?.role || (data.is_superadmin ? 'superadmin' : undefined),
        };
        const isSuper = Boolean(
          data.is_superadmin === true ||
          rawUser.email === 'superadmin@example.com' ||
          rawUser.role?.toLowerCase() === 'superadmin' ||
          (Array.isArray(rawUser.roles) && rawUser.roles.some((r: any) => String(r).toLowerCase().includes('superadmin')))
        );
        const normalizedUser = userToFrontend(rawUser);
        normalizedUser.role = isSuper ? 'superadmin' : (data.role || data.user?.role || rawUser.role || 'admin');
        setUser(normalizedUser);
        storeUser(normalizedUser);

        setIsSuperadmin(isSuper);
        localStorage.setItem(IS_SUPERADMIN_KEY, String(isSuper));

        const newPermissions = Array.isArray(data.permissions) ? data.permissions : [];
        setPermissions(newPermissions);
        localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(newPermissions));
      }
    } catch (error: any) {
      if (error?.status === 401) {
        performLogout(true);
      }
    }
  }, [performLogout]);

  // Check can permission helper
  const can = useCallback(
    (permission: string): boolean => {
      if (!permission) return true;
      if (isSuperadmin) return true;
      if (
        user?.role === 'superadmin' ||
        user?.roles?.includes('superadmin') ||
        user?.roles?.includes('Superadmin')
      ) {
        return true;
      }
      return permissions.includes(permission);
    },
    [isSuperadmin, permissions, user]
  );

  // Poll expiry and sync /api/me on focus, every 5 minutes, and on 403
  useEffect(() => {
    const SESSION_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

    const expiryInterval = setInterval(() => {
      const loginAt = getLoginTimestamp();
      if (loginAt !== null && Date.now() - loginAt >= SESSION_DURATION_MS) {
        performLogout(true);
      }
    }, 60_000);

    // Initial fetch if logged in
    if (hasToken()) {
      refetchMe();
    }

    // Refetch on window focus
    const handleFocus = () => {
      if (hasToken()) {
        refetchMe();
      }
    };

    // Refetch on 403 forbidden error
    const handle403 = () => {
      if (hasToken()) {
        refetchMe();
      }
    };

    // Refetch every 5 minutes
    const meInterval = setInterval(() => {
      if (hasToken()) {
        refetchMe();
      }
    }, 5 * 60 * 1000);

    // Listen for global unauthorized events (401 responses)
    const handleUnauthorized = () => {
      performLogout(true);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    window.addEventListener('unauthorized-403', handle403);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(expiryInterval);
      clearInterval(meInterval);
      window.removeEventListener('unauthorized', handleUnauthorized);
      window.removeEventListener('unauthorized-403', handle403);
      window.removeEventListener('focus', handleFocus);
    };
  }, [performLogout, refetchMe]);

  const login = async (
    username: string,
    password: string,
    remember: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await authService.login(username, password, remember);

    if (result.success && result.user) {
      const normalizedUser = userToFrontend(result.user);
      const isSuper = Boolean(
        (result.user as any).is_superadmin ||
        normalizedUser.email === 'superadmin@example.com' ||
        normalizedUser.role?.toLowerCase() === 'superadmin' ||
        (Array.isArray(normalizedUser.roles) && normalizedUser.roles.some((r: any) => String(r).toLowerCase().includes('superadmin')))
      );

      normalizedUser.role = isSuper ? 'superadmin' : (normalizedUser.role || 'admin');
      setUser(normalizedUser);
      storeUser(normalizedUser);

      const userPerms = Array.isArray((result.user as any).permissions)
        ? (result.user as any).permissions
        : [];
      setPermissions(userPerms);
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(userPerms));

      setIsSuperadmin(isSuper);
      localStorage.setItem(IS_SUPERADMIN_KEY, String(isSuper));

      await refetchMe();
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
        permissions,
        isSuperadmin,
        can,
        refetchMe,
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

/**
 * Component to protect UI elements or routes based on permissions
 */
export const RequirePermission: React.FC<{
  can: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ can: requiredCan, children, fallback = <Navigate to="/403" replace /> }) => {
  const { can, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(requiredCan)
    ? requiredCan.some((p) => can(p))
    : can(requiredCan);

  if (!allowed) {
    return (fallback as React.ReactElement) || null;
  }

  return <>{children}</>;
};
