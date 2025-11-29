"use client";

import React, { useState } from 'react';
import { supabase } from '@/services/supabase';
import { AcademicCapIcon } from '@/components/icons';
import Spinner from '@/components/ui/Spinner';

interface ResetPasswordPageProps {
    onShowLogin: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onShowLogin }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setLoading(true);

        const redirectTo = `${window.location.origin}/`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        
        if (error) {
            setError(error.message);
        } else {
            setMessage('If an account exists for this email, a password reset link has been sent.');
        }

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
                    <h2 className="text-2xl font-semibold text-center text-gray-700 mb-2">Reset your password</h2>
                    <p className="text-center text-sm text-gray-500 mb-6">
                        Enter your email and we'll send you instructions to reset your password.
                    </p>

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                            <p>{error}</p>
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4" role="alert">
                            <p>{message}</p>
                        </div>
                    )}
                    
                    {!message && (
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
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
                                >
                                    {loading && <Spinner />}
                                    {loading ? 'Sending...' : 'Send reset link'}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    <div className="mt-6 text-center text-sm">
                        <button
                            type="button"
                            onClick={onShowLogin}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            Back to login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
