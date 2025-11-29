"use client";

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { supabase } from '@/services/supabase';
import { AcademicCapIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';

interface LoginPageProps {
    onShowResetPassword: () => void;
    onShowRegister: () => void;
    infoMessage?: string | null;
    onClearInfo?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onShowResetPassword, onShowRegister, infoMessage, onClearInfo }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            setError(error.message);
        }
        // onLogin is no longer needed; the onAuthStateChange listener in App.tsx will handle the login event.
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col px-4">
            <div className="max-w-md w-full">
                <div className="flex justify-center items-center mb-6">
                    <AcademicCapIcon className="h-10 w-10 text-slate-700" />
                    <h1 className="text-3xl font-bold text-center text-slate-800 ml-2">HRIS App</h1>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    {infoMessage && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4 flex justify-between items-start">
                            <div className="pr-4">{infoMessage}</div>
                            {onClearInfo && (
                                <button onClick={onClearInfo} className="text-sm text-yellow-700 hover:text-yellow-900 font-semibold">
                                    Tutup
                                </button>
                            )}
                        </div>
                    )}
                    <h2 className="text-2xl font-semibold text-center text-gray-700 mb-6">Login to your account</h2>
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                            <p>{error}</p>
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onShowRegister}
                                className="text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                                Daftar akun baru
                            </button>
                            <button
                                type="button"
                                onClick={onShowResetPassword}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500"
                            >
                                Forgot your password?
                            </button>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                            >
                                {loading && <Spinner />}
                                {loading ? 'Logging in...' : 'Log in'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
