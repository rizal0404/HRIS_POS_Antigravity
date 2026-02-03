import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark px-2 pb-safe pt-2 h-[84px] safe-area-inset-bottom">
            <Link to="/" className={`group flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive('/') ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
                <span className={`material-symbols-outlined text-2xl transition-transform group-active:scale-90 ${isActive('/') ? 'filled' : ''}`}>home</span>
                <span className="text-[10px] font-medium">Beranda</span>
            </Link>
            <Link to="/schedule" className={`group flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive('/schedule') ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
                <span className={`material-symbols-outlined text-2xl transition-transform group-active:scale-90 ${isActive('/schedule') ? 'filled' : ''}`}>calendar_month</span>
                <span className="text-[10px] font-medium">Jadwal</span>
            </Link>

            {/* Floating FAB Action in middle */}
            <div className="-mt-8">
                <Link to="/attendance" className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transform hover:scale-105 transition-transform ${isActive('/attendance') ? 'bg-primary shadow-primary/40 text-black' : 'bg-primary/80 shadow-primary/30 text-black/80'}`}>
                    <span className="material-symbols-outlined text-3xl">fingerprint</span>
                </Link>
            </div>

            <Link to="/report" className={`group flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive('/report') ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
                <span className={`material-symbols-outlined text-2xl transition-transform group-active:scale-90 ${isActive('/report') ? 'filled' : ''}`}>description</span>
                <span className="text-[10px] font-medium">Laporan</span>
            </Link>
            <Link to="/profile" className={`group flex flex-col items-center justify-center gap-1 w-16 transition-colors ${isActive('/profile') ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}>
                <span className={`material-symbols-outlined text-2xl transition-transform group-active:scale-90 ${isActive('/profile') ? 'filled' : ''}`}>person</span>
                <span className="text-[10px] font-medium">Akun</span>
            </Link>
        </nav>
    );
}

