/**
 * API Client Configuration
 * Base HTTP client with JWT token management
 */

// API Base URL - In a Laravel monolith MVC, relative '/api' is used by default so it always matches same-origin (localhost, IP, or domain) without CORS issues
const getApiBaseUrl = (): string => {
    const rawUrl = (import.meta as any).env?.VITE_API_URL;
    if (rawUrl) {
        const cleanUrl = String(rawUrl).trim().replace(/\/+$/, '');
        return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
    }
    return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Token storage keys (fm-admin: prefix untuk isolasi origin)
const TOKEN_KEY = 'fm-admin:auth_token';
const TOKEN_TYPE_KEY = 'fm-admin:auth_token_type';

// Login timestamp key (used for 4-hour session expiry)
const LOGIN_AT_KEY = 'fm-admin:auth_login_at';

/**
 * Get stored JWT token
 */
export const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set JWT token in storage
 */
export const setToken = (token: string, tokenType: string = 'Bearer'): void => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TYPE_KEY, tokenType);
};

/**
 * Remove JWT token from storage
 */
export const removeToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_TYPE_KEY);
};

/**
 * Check if user has valid token
 */
export const hasToken = (): boolean => {
    return !!getToken();
};

/**
 * Store the login timestamp (milliseconds since epoch)
 */
export const setLoginTimestamp = (): void => {
    localStorage.setItem(LOGIN_AT_KEY, String(Date.now()));
};

/**
 * Retrieve the stored login timestamp, or null if not set
 */
export const getLoginTimestamp = (): number | null => {
    const raw = localStorage.getItem(LOGIN_AT_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
};

/**
 * Remove the stored login timestamp
 */
export const removeLoginTimestamp = (): void => {
    localStorage.removeItem(LOGIN_AT_KEY);
};

/**
 * Get authorization header value
 */
export const getAuthHeader = (): string | null => {
    const token = getToken();
    const tokenType = localStorage.getItem(TOKEN_TYPE_KEY) || 'Bearer';
    return token ? `${tokenType} ${token}` : null;
};

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
    status: number;
    errors?: Record<string, string[]>;

    constructor(message: string, status: number, errors?: Record<string, string[]>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }

    /**
     * Get first error message from errors object and translate it if needed
     */
    getFirstError(): string {
        let errorMsg = this.message;

        if (this.errors) {
            const firstKey = Object.keys(this.errors)[0];
            if (firstKey && this.errors[firstKey]?.length > 0) {
                errorMsg = this.errors[firstKey][0];
            }
        }

        // Common error translations
        const translations: Record<string, string> = {
            'The signature field is required.': 'Tanda tangan pelanggan wajib diisi.',
            'The latitude field is required.': 'Lokasi GPS belum terdeteksi.',
            'The photo field is required.': 'Foto wajib diunggah.',
            'Unauthenticated.': 'Sesi Anda telah berakhir, silakan login kembali.',
            'An error occurred': 'Terjadi kesalahan pada sistem.'
        };

        return translations[errorMsg] || errorMsg;
    }
}

/**
 * Default request headers
 */
const getDefaultHeaders = (includeAuth: boolean = true, isFormData: boolean = false): HeadersInit => {
    const headers: HeadersInit = {
        'Accept': 'application/json',
    };

    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
        const authHeader = getAuthHeader();
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
    }

    return headers;
};

/**
 * Handle API response
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    }

    if (!response.ok) {
        if (response.status === 401) {
            removeToken();
            localStorage.removeItem('fm-admin:auth_user');
            window.dispatchEvent(new CustomEvent('unauthorized'));
        } else if (response.status === 403) {
            window.dispatchEvent(new CustomEvent('unauthorized-403'));
        }
        throw new ApiError(
            data?.message || 'An error occurred',
            response.status,
            data?.errors
        );
    }

    // Unpacking envelope if it matches standard Laravel wrapper { success: true, data: { ... } }
    if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
        return data.data as T;
    }

    return data as T;
};

/**
 * API Client with common HTTP methods
 */
export const apiClient = {
    /**
     * GET request
     */
    get: async <T>(
        endpoint: string,
        optionsOrAuth: { params?: Record<string, any> } | boolean = true,
        includeAuth: boolean = true
    ): Promise<T> => {
        const auth = typeof optionsOrAuth === 'boolean' ? optionsOrAuth : includeAuth;
        let url = `${API_BASE_URL}${endpoint}`;
        if (typeof optionsOrAuth === 'object' && optionsOrAuth?.params) {
            const queryParams = new URLSearchParams();
            Object.entries(optionsOrAuth.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value));
                }
            });
            const queryString = queryParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }
        const response = await fetch(url, {
            method: 'GET',
            headers: getDefaultHeaders(auth),
        });
        return handleResponse<T>(response);
    },

    /**
     * POST request
     */
    post: async <T>(
        endpoint: string,
        data?: unknown,
        includeAuth: boolean = true
    ): Promise<T> => {
        const isFormData = data instanceof FormData;
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getDefaultHeaders(includeAuth, isFormData),
            body: isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
        });
        return handleResponse<T>(response);
    },

    /**
     * PUT request
     */
    put: async <T>(
        endpoint: string,
        data?: unknown,
        includeAuth: boolean = true
    ): Promise<T> => {
        const isFormData = data instanceof FormData;
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getDefaultHeaders(includeAuth, isFormData),
            body: isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
        });
        return handleResponse<T>(response);
    },

    /**
     * PATCH request
     */
    patch: async <T>(
        endpoint: string,
        data?: unknown,
        includeAuth: boolean = true
    ): Promise<T> => {
        const isFormData = data instanceof FormData;
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getDefaultHeaders(includeAuth, isFormData),
            body: isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
        });
        return handleResponse<T>(response);
    },

    /**
     * DELETE request
     */
    delete: async <T>(
        endpoint: string,
        dataOrIncludeAuth: any = true,
        includeAuth: boolean = true
    ): Promise<T> => {
        const auth = typeof dataOrIncludeAuth === 'boolean' ? dataOrIncludeAuth : includeAuth;
        const bodyData = typeof dataOrIncludeAuth !== 'boolean' ? dataOrIncludeAuth : undefined;
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getDefaultHeaders(auth),
            body: bodyData ? JSON.stringify(bodyData?.data || bodyData) : undefined,
        });
        return handleResponse<T>(response);
    },

    /**
     * MULTIPART FILE UPLOAD request (with progress tracking)
     */
    upload: async <T>(
        endpoint: string,
        formData: FormData,
        onProgress?: (progress: number) => void,
        includeAuth: boolean = true
    ): Promise<T> => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE_URL}${endpoint}`);
            
            if (includeAuth) {
                const authHeader = getAuthHeader();
                if (authHeader) {
                    xhr.setRequestHeader('Authorization', authHeader);
                }
            }
            xhr.setRequestHeader('Accept', 'application/json');

            if (xhr.upload && onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        onProgress(percent);
                    }
                };
            }

            xhr.onload = () => {
                let data: any = null;
                try {
                    data = JSON.parse(xhr.responseText);
                } catch {
                    // Ignore JSON parsing failure for non-JSON response bodies
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    // Unwrap envelope
                    resolve(data && data.success && data.data !== undefined ? data.data : data);
                } else {
                    reject(new ApiError(
                        data?.message || 'Upload failed',
                        xhr.status,
                        data?.errors
                    ));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error during file upload'));
            };

            xhr.send(formData);
        });
    },
};

export { apiClient as api };
export default apiClient;

