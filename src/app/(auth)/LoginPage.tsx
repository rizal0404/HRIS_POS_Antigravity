"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import Spinner from '@/components/ui/Spinner';
import { defaultLogo, getBrandLogoUrl } from '@/lib/branding';

interface LoginPageProps {
    onShowResetPassword: () => void;
    onShowRegister: () => void;
    infoMessage?: string | null;
    onClearInfo?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onShowResetPassword, infoMessage, onClearInfo }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string>(defaultLogo);

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
        setLoading(false);
    };

    useEffect(() => {
        try {
            const logo = getBrandLogoUrl();
            setLogoUrl(logo);
        } catch (err) {
            // fallback silently
        }
    }, []);

    return (
        <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden font-sans max-w-md mx-auto bg-gradient-to-b from-blue-50 via-slate-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 transition-colors duration-200">
            {/* Header / Logo Area */}
            <div className="flex flex-col items-center justify-center pt-16 pb-6 px-4">
                <div className="w-20 h-20 rounded-2xl bg-[#308ce8]/10 dark:bg-blue-500/20 flex items-center justify-center mb-6 overflow-hidden">
                    <img
                        src={logoUrl}
                        alt="HRIS logo"
                        className="w-14 h-14 object-contain"
                    />
                </div>
                {/* Headline Text */}
                <h1 className="text-[#111418] dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight text-center">
                    Selamat Datang
                </h1>
                {/* Body Text */}
                <p className="text-[#637588] dark:text-slate-400 text-base font-normal leading-normal pt-2 text-center max-w-[280px]">
                    Masuk ke akun karyawan untuk mengelola jadwal dan laporan Anda
                </p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="flex flex-col px-6 gap-5 w-full">
                {/* Info Message */}
                {infoMessage && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-[#111418] dark:text-slate-100 rounded-xl px-4 py-3 flex justify-between items-start">
                        <div className="pr-4 text-sm">{infoMessage}</div>
                        {onClearInfo && (
                            <button
                                type="button"
                                onClick={onClearInfo}
                                className="text-sm font-semibold text-[#308ce8] dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                            >
                                Tutup
                            </button>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                        {error}
                    </div>
                )}

                {/* Email Field */}
                <label className="flex flex-col w-full">
                    <p className="text-[#111418] dark:text-slate-100 text-sm font-medium leading-normal pb-2">
                        Email atau ID Karyawan
                    </p>
                    <div className="relative">
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#308ce8] border border-[#dce0e5] dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-[#308ce8] h-14 placeholder:text-[#9eaebc] dark:placeholder:text-slate-500 p-[15px] pr-12 text-base font-normal leading-normal transition-all"
                            placeholder="nama@perusahaan.com"
                            required
                            autoComplete="email"
                        />
                        <div className="absolute right-4 top-0 bottom-0 flex items-center justify-center pointer-events-none text-[#637588] dark:text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                        </div>
                    </div>
                </label>

                {/* Password Field */}
                <label className="flex flex-col w-full">
                    <p className="text-[#111418] dark:text-slate-100 text-sm font-medium leading-normal pb-2">
                        Kata Sandi
                    </p>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#308ce8] border border-[#dce0e5] dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-[#308ce8] h-14 placeholder:text-[#9eaebc] dark:placeholder:text-slate-500 p-[15px] pr-12 text-base font-normal leading-normal transition-all"
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-0 bottom-0 flex items-center justify-center text-[#637588] dark:text-slate-500 hover:text-[#308ce8] dark:hover:text-blue-400 transition-colors"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            )}
                        </button>
                    </div>
                </label>

                {/* Forgot Password Link */}
                <div className="flex justify-end w-full -mt-2">
                    <button
                        type="button"
                        onClick={onShowResetPassword}
                        className="text-sm font-medium text-[#308ce8] dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                    >
                        Lupa Kata Sandi?
                    </button>
                </div>

                {/* Keep Login Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-5 w-5 rounded border-[#dce0e5] dark:border-slate-600 text-[#308ce8] focus:ring-[#308ce8] cursor-pointer bg-white dark:bg-slate-800"
                    />
                    <span className="text-sm text-[#111418] dark:text-slate-100 font-medium">Tetap masuk</span>
                </label>

                {/* Login Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-[#308ce8] text-white text-base font-bold leading-normal tracking-[0.015em] w-full mt-2 shadow-sm hover:bg-blue-600 transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading && <Spinner />}
                    <span className="truncate ml-2">{loading ? 'Memproses...' : 'Masuk'}</span>
                </button>

                {/* Biometric Login Divider */}
                <div className="relative py-4 flex items-center">
                    <div className="flex-grow border-t border-[#dce0e5] dark:border-slate-600"></div>
                    <span className="flex-shrink-0 mx-4 text-xs font-medium text-[#637588] dark:text-slate-500">ATAU MASUK DENGAN</span>
                    <div className="flex-grow border-t border-[#dce0e5] dark:border-slate-600"></div>
                </div>

                {/* Biometric Button */}
                <div className="flex justify-center pb-6">
                    <button
                        type="button"
                        className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-[#dce0e5] dark:border-slate-600 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-[#111418] dark:text-slate-100 group-hover:text-[#308ce8] dark:group-hover:text-blue-400 transition-colors">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                        </svg>
                    </button>
                </div>
            </form>

            {/* Footer / Version Info */}
            <div className="mt-auto pb-8 text-center">
                <p className="text-xs text-[#637588] dark:text-slate-500">
                    HRIS Mobile v2.4.0
                </p>
                <div className="mt-2 flex justify-center gap-4">
                    <a href="#" className="text-xs text-[#637588] dark:text-slate-500 hover:text-[#308ce8] dark:hover:text-blue-400 transition-colors">Pusat Bantuan</a>
                    <span className="text-xs text-[#dce0e5] dark:text-slate-700">•</span>
                    <a href="#" className="text-xs text-[#637588] dark:text-slate-500 hover:text-[#308ce8] dark:hover:text-blue-400 transition-colors">Kebijakan Privasi</a>
                </div>
            </div>

            <div className="h-5 w-full bg-transparent"></div>
        </div>
    );
};

export default LoginPage;
