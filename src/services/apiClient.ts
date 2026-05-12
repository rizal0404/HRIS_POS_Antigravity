/**
 * API Client - Replaces Supabase client for VPS deployment
 * All requests go to the Express API backend with Better Auth session cookies.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
    data: T;
    error?: string;
}

class ApiError extends Error {
    public code?: string;
    public status?: number;

    constructor(message: string, code?: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorData: any = {};
        try {
            errorData = await response.json();
        } catch {
            errorData = { error: response.statusText };
        }
        throw new ApiError(
            errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            errorData.code,
            response.status,
        );
    }
    // Handle 204 No Content
    if (response.status === 204) {
        return undefined as unknown as T;
    }
    return response.json();
}

export const api = {
    async get<T = any>(path: string, params?: Record<string, string | number | boolean | string[]>): Promise<T> {
        const url = new URL(`${API_BASE_URL}${path}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => url.searchParams.append(key, v));
                } else if (value !== undefined && value !== null) {
                    url.searchParams.set(key, String(value));
                }
            });
        }
        const response = await fetch(url.toString(), {
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
        });
        return handleResponse<T>(response);
    },

    async post<T = any>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    async put<T = any>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    async patch<T = any>(path: string, body?: any): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    async delete<T = any>(path: string): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
        });
        return handleResponse<T>(response);
    },

    async upload<T = any>(path: string, formData: FormData): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            credentials: 'include',
            // Do NOT set Content-Type header - browser will auto-set it with boundary for multipart/form-data
            headers: { 'Accept': 'application/json' },
            body: formData,
        });
        return handleResponse<T>(response);
    },
};

export { ApiError };
export default api;
