import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn } from '../lib/auth-client';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const from = location.state?.from?.pathname || '/';

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await signIn.email({
                email,
                password,
                callbackURL: from,
                fetchOptions: {
                    onResponse: () => {
                        setLoading(false);
                    },
                    onRequest: () => {
                        setLoading(true);
                    },
                    onError: (ctx) => {
                        setError(ctx.error.message);
                        setLoading(false);
                    },
                    onSuccess: () => {
                        navigate(from);
                    }
                }
            });
        } catch (err) {
            setError(err.message || 'Failed to sign in');
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        await signIn.social({
            provider: 'google',
            callbackURL: from,
        });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white antialiased min-h-screen flex flex-col">

            {/* Desktop Split Layout Container */}
            <div className="flex min-h-screen w-full flex-row">

                {/* Left Section: Visual/Brand (Desktop Only) */}
                <div className="hidden lg:flex w-1/2 relative bg-primary/5 flex-col justify-between overflow-hidden">
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Modern corporate office interior"
                            className="h-full w-full object-cover opacity-90"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOP_cAVK7L9dvA6moveBD59-oxKC4fNkQXRHexYMUPkKP3LuywVVzcbN5GP-P9eseMPLP1LUrtmu6bcP8mMEdrjJklgMefPIjHm7pTA2lf04HWDlESHUUX4TePpdfuuaJEX6v96ZMPbLiPqsOm858BBVPEe1sJFB0CvMGQFcLC7A4vA5HKtwKKxFK3Bretqt6gEcJuAsGW6KL-sA06gFkaqCZIxeonlQc4zfWilEsSiOzCHRj2FueGccn-BJiuGypzO38Dbg-IcTM"
                        />
                        <div className="absolute inset-0 bg-primary/80 mix-blend-multiply"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                    <div className="relative z-10 p-12 h-full flex flex-col justify-between">
                        <div>
                            {/* Potential Logo Area */}
                        </div>
                        <div className="max-w-lg">
                            <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Manage your workforce with confidence and clarity.</h2>
                            <p className="text-blue-100 text-lg leading-relaxed">Access real-time insights, manage team performance, and streamline HR processes all in one secure place.</p>
                        </div>
                    </div>
                </div>

                {/* Right Section: Form (Desktop) / Main Container (Mobile) */}
                <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 lg:px-20 xl:px-24 bg-background-light dark:bg-background-dark w-full max-w-md mx-auto lg:max-w-none">

                    {/* Header / Logo Area */}
                    <div className="flex flex-col items-center lg:items-start justify-center lg:justify-start pt-8 pb-6 lg:pt-0 lg:mb-8">
                        {/* Mobile Logo */}
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 overflow-hidden lg:hidden">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-2xl">hr_resting</span>
                            </div>
                        </div>

                        {/* Desktop Logo & Title */}
                        <div className="hidden lg:flex items-center gap-3 text-gray-900 dark:text-white mb-6">
                            <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/30">
                                <span className="material-symbols-outlined text-[24px]">dataset</span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">HRIS Manager Portal</h2>
                        </div>

                        <div className="text-center lg:text-left">
                            <h1 className="text-gray-900 dark:text-white tracking-tight text-[32px] lg:text-3xl font-bold lg:font-black leading-tight mb-2">
                                Welcome Back
                            </h1>
                            <p className="text-slate-500 dark:text-gray-400 text-base font-normal leading-normal max-w-[280px] lg:max-w-none mx-auto lg:mx-0">
                                <span className="lg:hidden">Sign in to your employee account to manage your schedule and reports</span>
                                <span className="hidden lg:inline">Please enter your details to access your dashboard.</span>
                            </p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form Section */}
                    <form className="flex flex-col gap-5 w-full space-y-0 lg:space-y-6" onSubmit={handleLogin}>
                        {/* Email Field */}
                        <div className="flex flex-col w-full">
                            <label className="text-gray-900 dark:text-gray-200 text-sm font-medium leading-normal pb-2 block">
                                <span className="lg:hidden">Work Email or Employee ID</span>
                                <span className="hidden lg:inline">Work Email</span>
                            </label>
                            <div className="relative">
                                {/* Mobile Input Style */}
                                <input
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="lg:hidden form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-gray-500 p-[15px] pr-12 text-base font-normal leading-normal transition-all"
                                    placeholder="name@company.com"
                                    type="email"
                                    required
                                />
                                <div className="lg:hidden absolute right-4 top-0 bottom-0 flex items-center justify-center pointer-events-none text-slate-500 dark:text-gray-500">
                                    <span className="material-symbols-outlined">mail</span>
                                </div>

                                {/* Desktop Input Style */}
                                <div className="hidden lg:block relative rounded-lg shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
                                    </div>
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-lg border-0 py-3 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-gray-800 dark:ring-gray-700 dark:text-white dark:placeholder:text-gray-500 sm:text-sm sm:leading-6"
                                        placeholder="name@company.com"
                                        type="email"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col w-full">
                            <label className="text-gray-900 dark:text-gray-200 text-sm font-medium leading-normal pb-2 block">Password</label>
                            <div className="relative">
                                {/* Mobile Input Style */}
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="lg:hidden form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-primary h-14 placeholder:text-slate-400 dark:placeholder:text-gray-500 p-[15px] pr-12 text-base font-normal leading-normal transition-all"
                                    placeholder="••••••••"
                                    type="password"
                                    required
                                />
                                <button className="lg:hidden absolute right-4 top-0 bottom-0 flex items-center justify-center text-slate-500 dark:text-gray-500 hover:text-primary transition-colors" type="button">
                                    <span className="material-symbols-outlined">visibility_off</span>
                                </button>

                                {/* Desktop Input Style */}
                                <div className="hidden lg:block relative rounded-lg shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                                    </div>
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-lg border-0 py-3 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-gray-800 dark:ring-gray-700 dark:text-white dark:placeholder:text-gray-500 sm:text-sm sm:leading-6"
                                        placeholder="••••••••"
                                        type="password"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer group">
                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-primary transition-colors text-[20px]">visibility</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extras: Forgot Password / Remember Me */}
                        <div className="flex items-center justify-end lg:justify-between w-full -mt-2 lg:mt-0">
                            <div className="hidden lg:flex items-center">
                                <input className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-900" id="remember-me" name="remember-me" type="checkbox" />
                                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300" htmlFor="remember-me">Remember for 30 days</label>
                            </div>
                            <a className="text-sm font-medium text-primary hover:text-blue-600 transition-colors" href="#">
                                Forgot Password?
                            </a>
                        </div>

                        {/* Login Button */}
                        <button
                            disabled={loading}
                            type="submit"
                            className="flex items-center justify-center rounded-xl lg:rounded-lg h-12 lg:h-auto lg:py-3 px-5 bg-primary text-white text-base lg:text-sm font-bold lg:font-semibold leading-normal tracking-[0.015em] w-full mt-2 lg:mt-0 shadow-sm hover:bg-blue-600 transition-colors active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="truncate">
                                {loading ? 'Signing in...' : (
                                    <>
                                        <span className="lg:hidden">Log In</span>
                                        <span className="hidden lg:inline">Sign in</span>
                                    </>
                                )}
                            </span>
                        </button>
                    </form>

                    {/* Mobile Only: Biometric & Footer */}
                    <div className="lg:hidden w-full">
                        {/* Biometric Login Divider */}
                        <div className="relative py-4 flex items-center">
                            <div className="flex-grow border-t border-slate-200 dark:border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-500 dark:text-gray-500">OR LOGIN WITH</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-gray-700"></div>
                        </div>
                        {/* Biometric/Social Button (Simulated for now, maybe hook to Google) */}
                        <div className="flex justify-center pb-6">
                            <button
                                onClick={handleGoogleLogin}
                                type="button"
                                className="flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                            </button>
                        </div>
                        {/* Footer / Version Info */}
                        <div className="mt-auto pb-8 text-center w-full">
                            <p className="text-xs text-slate-500 dark:text-gray-500">
                                HRIS Mobile v2.4.0
                            </p>
                            <div className="mt-2 flex justify-center gap-4">
                                <a className="text-xs text-slate-500 dark:text-gray-500 hover:text-primary" href="#">Help Center</a>
                                <span className="text-xs text-slate-200 dark:text-gray-700">•</span>
                                <a className="text-xs text-slate-500 dark:text-gray-500 hover:text-primary" href="#">Privacy Policy</a>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Footer */}
                    <div className="hidden lg:block mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        <p>Don't have an account? <a className="font-medium text-primary hover:text-blue-600 transition-colors" href="#">Contact HR Admin</a></p>
                    </div>

                    {/* Desktop Footer Links */}
                    <div className="hidden lg:flex mt-12 border-t border-gray-200 dark:border-gray-800 pt-6 justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                        <a className="hover:text-gray-600 dark:hover:text-gray-300" href="#">Privacy Policy</a>
                        <a className="hover:text-gray-600 dark:hover:text-gray-300" href="#">Terms of Service</a>
                        <a className="hover:text-gray-600 dark:hover:text-gray-300" href="#">Help Center</a>
                    </div>

                </div>
            </div>
        </div>
    );
}
