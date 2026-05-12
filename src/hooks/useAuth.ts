import { useState, useEffect, useCallback } from 'react';
import api from '../services/apiClient';

// ==== AUTH HOOK (Better Auth) ====

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    image?: string;
    emailVerified: boolean;
}

export interface AuthSession {
    user: AuthUser;
    token?: string;
}

interface UseAuthReturn {
    session: AuthSession | null;
    loading: boolean;
    error: Error | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch current session from Better Auth
    const fetchSession = useCallback(async () => {
        try {
            const data = await api.get<{ session: any; user: any }>('/api/auth/get-session');
            if (data?.user) {
                setSession({
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.name,
                        image: data.user.image,
                        emailVerified: data.user.emailVerified,
                    },
                });
            } else {
                setSession(null);
            }
        } catch {
            setSession(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const signIn = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.post('/api/auth/sign-in/email', { email, password });
            if (data?.user) {
                setSession({
                    user: {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.name,
                        image: data.user.image,
                        emailVerified: data.user.emailVerified,
                    },
                });
            }
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await api.post('/api/auth/sign-out');
            setSession(null);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
        setLoading(true);
        setError(null);
        try {
            await api.post('/api/auth/sign-up/email', {
                email,
                password,
                name: metadata?.full_name || email,
            });
            // After sign-up, auto sign-in
            await signIn(email, password);
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [signIn]);

    return { session, loading, error, signIn, signOut, signUp };
}
