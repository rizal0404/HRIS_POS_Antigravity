import { useState, useEffect, useCallback } from 'react';

// BeforeInstallPromptEvent type
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UsePWAResult {
    /** Whether the app is running in standalone/installed mode */
    isInstalled: boolean;
    /** Whether the device is online */
    isOnline: boolean;
    /** Whether an install prompt is available */
    canInstall: boolean;
    /** Trigger the install prompt */
    promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
    /** Whether there's an update available */
    updateAvailable: boolean;
    /** Apply the available update */
    applyUpdate: () => void;
}

/**
 * Custom hook for PWA functionality
 * Provides install prompt, online status, and update management
 */
export function usePWA(): UsePWAResult {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    // Check if app is installed (running in standalone mode)
    const isInstalled = typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true);

    // Listen for beforeinstallprompt event
    useEffect(() => {
        const handler = (event: Event) => {
            event.preventDefault();
            setInstallPrompt(event as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Listen for online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Listen for service worker updates
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setUpdateAvailable(true);
                                setWaitingWorker(newWorker);
                            }
                        });
                    }
                });
            });
        }
    }, []);

    // Prompt install function
    const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
        if (!installPrompt) return null;

        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        setInstallPrompt(null);
        return outcome;
    }, [installPrompt]);

    // Apply update function
    const applyUpdate = useCallback(() => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            setUpdateAvailable(false);
            window.location.reload();
        }
    }, [waitingWorker]);

    return {
        isInstalled,
        isOnline,
        canInstall: !!installPrompt,
        promptInstall,
        updateAvailable,
        applyUpdate,
    };
}

export default usePWA;
