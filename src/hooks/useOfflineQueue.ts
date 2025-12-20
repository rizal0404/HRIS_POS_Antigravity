// Hook for using offline queue in React components

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue, SyncStatus } from '../lib/offlineQueue';

interface UseOfflineQueueReturn {
    isOnline: boolean;
    status: SyncStatus;
    pendingCount: number;
    isSyncing: boolean;
    syncNow: () => Promise<{ success: number; failed: number }>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [status, setStatus] = useState<SyncStatus>({
        lastSyncAt: null,
        pendingCount: 0,
        failedCount: 0,
        isSyncing: false,
    });

    useEffect(() => {
        // Listen for online/offline changes
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for queue status changes
        const unsubscribe = offlineQueue.addListener(setStatus);

        // Get initial status
        offlineQueue.getStatus().then(setStatus);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsubscribe();
        };
    }, []);

    const syncNow = useCallback(async () => {
        return offlineQueue.syncQueue();
    }, []);

    return {
        isOnline,
        status,
        pendingCount: status.pendingCount,
        isSyncing: status.isSyncing,
        syncNow,
    };
}
