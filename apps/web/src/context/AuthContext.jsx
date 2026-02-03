import React, { createContext, useContext } from 'react';
import { useSession, signIn, signUp, signOut } from '../lib/auth-client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const { data: session, isPending, error } = useSession();

    const value = {
        user: session?.user || null,
        session: session?.session || null,
        loading: isPending,
        error,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!session?.user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
