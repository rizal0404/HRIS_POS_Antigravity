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

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const LoginPage: React.FC<LoginPageProps> = ({ onShowResetPassword, onShowRegister, infoMessage, onClearInfo }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installFeedback, setInstallFeedback] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string>(defaultLogo);

    useEffect(() => {
        const handler = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

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

    const handleInstall = async () => {
        if (installPrompt) {
            await installPrompt.prompt();
            const { outcome } = await installPrompt.userChoice;
            setInstallFeedback(outcome === 'accepted' ? 'Instalasi dimulai.' : 'Instalasi dibatalkan.');
            setInstallPrompt(null);
        } else {
            setInstallFeedback('Gunakan menu browser lalu pilih "Add to Home screen" / "Install app".');
        }
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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="hidden lg:block relative bg-slate-800">
                        <div
                            className="absolute inset-0 opacity-80"
                            style={{
                                backgroundImage:
                                    'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.95)), linear-gradient(160deg, rgba(37,99,235,0.35), rgba(37,99,235,0))',
                            }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.3), transparent 35%), radial-gradient(circle at 80% 50%, rgba(14,165,233,0.25), transparent 40%)',
                            }}
                        />
                        <div className="relative h-full flex items-center justify-center px-10 py-16">
                            <div className="text-white space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/20 overflow-hidden">
                                        <img src={logoUrl} alt="HRIS logo" className="h-14 w-14 object-contain" />
                                    </span>
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.3em] text-blue-100">HRIS</p>
                                        <p className="text-2xl font-semibold text-white">POS Workspace</p>
                                    </div>
                                </div>
                                <p className="text-sm text-blue-100 max-w-md">
                                    Portal karyawan Alih Daya KOPKAR ST dengan akses cepat untuk presensi, pengajuan, dan persetujuan.
                                    Optimalkan produktivitas dengan tampilan bersih dan fokus.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14 bg-white relative">
                        <div className="absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-slate-900/15 via-transparent to-transparent pointer-events-none" />
                        <div className="lg:hidden mb-8 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center py-6">
                            <img src={logoUrl} alt="HRIS logo" className="h-20 w-20 object-contain" />
                        </div>

                        <div className="flex flex-col items-center gap-2 text-center mb-8">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg overflow-hidden">
                                    <img src={logoUrl} alt="HRIS logo" className="h-12 w-12 object-contain" />
                                </span>
                                <div className="text-left">
                                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">QC ST</p>
                                    <p className="text-3xl font-bold text-slate-900 leading-tight">
                                        HRIS <span className="text-blue-700">POS</span>
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-500">Sistem Informasi POS Unit Quality Control ST</p>
                        </div>

                        <div className="space-y-4 mb-6">
                            {infoMessage && (
                                <div className="bg-blue-50 border border-blue-200 text-slate-700 rounded-xl px-4 py-3 flex justify-between items-start">
                                    <div className="pr-4 text-sm">{infoMessage}</div>
                                    {onClearInfo && (
                                        <button
                                            onClick={onClearInfo}
                                            className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                                        >
                                            Tutup
                                        </button>
                                    )}
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                                    {error}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                                    Email atau Username
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="m.rizal"
                                    className="w-full rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                                    Kata sandi
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                                />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="inline-flex items-center gap-3 text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    Tetap masuk
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-base font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200/60 transition disabled:bg-slate-500"
                            >
                                {loading && <Spinner />}
                                {loading ? 'Memproses...' : 'Masuk'}
                            </button>

                            <div className="text-sm text-slate-700">
                                <button
                                    type="button"
                                    onClick={onShowResetPassword}
                                    className="font-semibold text-blue-700 hover:text-blue-800"
                                >
                                    Lupa kata sandi?
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleInstall}
                                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-base font-semibold text-white bg-slate-500 hover:bg-slate-600 shadow-inner transition"
                            >
                                Pasang HRIS-POS
                            </button>

                            {installFeedback && <p className="text-xs text-slate-500">{installFeedback}</p>}

                            <div className="text-center text-xs text-slate-500 pt-2">
                                <button
                                    type="button"
                                    onClick={onShowRegister}
                                    className="font-semibold text-blue-700 hover:text-blue-800"
                                >
                                    Daftar akun baru
                                </button>
                            </div>
                        </form>

                        <p className="mt-10 text-center text-sm text-slate-500">Copyright © RZL 2025</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
