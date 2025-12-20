"use client";

import React, { useState, useEffect } from 'react';
import { usePWA } from '../hooks/usePWA';
import { XIcon, DownloadIcon } from './icons';

const DISMISS_KEY = 'pwa-install-banner-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface InstallPWABannerProps {
    /** Custom class names for the banner */
    className?: string;
}

/**
 * PWA Install Banner Component
 * Shows a dismissible banner prompting users to install the PWA
 * Only shows when:
 * - App is not already installed
 * - Install prompt is available
 * - User hasn't dismissed within the last 7 days
 */
const InstallPWABanner: React.FC<InstallPWABannerProps> = ({ className = '' }) => {
    const { isInstalled, canInstall, promptInstall } = usePWA();
    const [isDismissed, setIsDismissed] = useState(true);
    const [isInstalling, setIsInstalling] = useState(false);

    // Check if banner was recently dismissed
    useEffect(() => {
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const dismissedTime = parseInt(dismissedAt, 10);
            if (Date.now() - dismissedTime < DISMISS_DURATION) {
                setIsDismissed(true);
                return;
            }
        }
        setIsDismissed(false);
    }, []);

    // Don't show if installed, can't install, or dismissed
    if (isInstalled || !canInstall || isDismissed) {
        return null;
    }

    const handleDismiss = () => {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
        setIsDismissed(true);
    };

    const handleInstall = async () => {
        setIsInstalling(true);
        const outcome = await promptInstall();
        setIsInstalling(false);

        if (outcome === 'accepted') {
            handleDismiss();
        }
    };

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg ${className}`}
            role="banner"
            aria-label="Install aplikasi"
        >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
                        <DownloadIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm sm:text-base truncate">
                            Pasang HRIS POS
                        </p>
                        <p className="text-xs sm:text-sm text-blue-100 truncate">
                            Akses cepat dari home screen
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg text-sm hover:bg-blue-50 transition disabled:opacity-50"
                    >
                        {isInstalling ? 'Memproses...' : 'Pasang'}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                        aria-label="Tutup banner"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPWABanner;
