// Offline Queue Service for Web
// Queues attendance actions when offline and syncs when connection is restored
// Uses IndexedDB for persistent storage

import api from '../services/apiClient';

const DB_NAME = 'hris_offline_db';
const DB_VERSION = 1;
const QUEUE_STORE = 'attendance_queue';
const STATUS_STORE = 'sync_status';

export interface QueuedAction {
    id: string;
    type: 'clock_in' | 'clock_out';
    timestamp: string;
    payload: {
        profile_id: string;
        clock_in?: string;
        clock_out?: string;
        clock_in_coords?: { lat: number; lon: number };
        clock_out_coords?: { lat: number; lon: number };
        clock_in_address?: string;
        clock_out_address?: string;
        work_date: string;
        lokasi_kerja?: string;
        tempat_kerja?: string;
        status?: string;
        source?: string;
        catatan?: string;
        attendance_id?: string;
    };
    retryCount: number;
    createdAt: string;
}

export interface SyncStatus {
    lastSyncAt: string | null;
    pendingCount: number;
    failedCount: number;
    isSyncing: boolean;
}

class WebOfflineQueueService {
    private db: IDBDatabase | null = null;
    private isOnline: boolean = navigator.onLine;
    private isSyncing: boolean = false;
    private listeners: ((status: SyncStatus) => void)[] = [];
    private initPromise: Promise<void> | null = null;

    constructor() {
        this.initPromise = this.initDB();
        this.initNetworkListener();
    }

    // Initialize IndexedDB
    private async initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                console.warn('[OfflineQueue] IndexedDB not supported');
                resolve();
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineQueue] Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[OfflineQueue] IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create queue store
                if (!db.objectStoreNames.contains(QUEUE_STORE)) {
                    const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                    queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                    queueStore.createIndex('type', 'type', { unique: false });
                }

                // Create status store
                if (!db.objectStoreNames.contains(STATUS_STORE)) {
                    db.createObjectStore(STATUS_STORE, { keyPath: 'key' });
                }

                console.log('[OfflineQueue] IndexedDB schema created');
            };
        });
    }

    // Initialize network listener
    private initNetworkListener() {
        window.addEventListener('online', () => {
            const wasOffline = !this.isOnline;
            this.isOnline = true;
            console.log('[OfflineQueue] Online');

            if (wasOffline) {
                console.log('[OfflineQueue] Connection restored, triggering sync...');
                this.syncQueue();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('[OfflineQueue] Offline');
        });
    }

    // Ensure DB is ready
    private async ensureDB(): Promise<IDBDatabase | null> {
        if (this.initPromise) {
            await this.initPromise;
        }
        return this.db;
    }

    // Check if online
    get online(): boolean {
        return this.isOnline;
    }

    // Add action to queue
    async enqueue(action: Omit<QueuedAction, 'id' | 'retryCount' | 'createdAt'>): Promise<string> {
        const db = await this.ensureDB();
        if (!db) throw new Error('IndexedDB not available');

        const newAction: QueuedAction = {
            ...action,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            retryCount: 0,
            createdAt: new Date().toISOString(),
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            const store = tx.objectStore(QUEUE_STORE);
            const request = store.add(newAction);

            request.onsuccess = () => {
                console.log(`[OfflineQueue] Action queued: ${newAction.type} (${newAction.id})`);
                this.updateStatus();

                // Try immediate sync if online
                if (this.isOnline) {
                    this.syncQueue();
                }

                resolve(newAction.id);
            };

            request.onerror = () => {
                console.error('[OfflineQueue] Failed to queue action:', request.error);
                reject(request.error);
            };
        });
    }

    // Get all queued actions
    async getQueue(): Promise<QueuedAction[]> {
        const db = await this.ensureDB();
        if (!db) return [];

        return new Promise((resolve, reject) => {
            const tx = db.transaction(QUEUE_STORE, 'readonly');
            const store = tx.objectStore(QUEUE_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => {
                console.error('[OfflineQueue] Failed to read queue:', request.error);
                resolve([]);
            };
        });
    }

    // Remove action from queue
    private async removeFromQueue(id: string): Promise<void> {
        const db = await this.ensureDB();
        if (!db) return;

        return new Promise((resolve) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            const store = tx.objectStore(QUEUE_STORE);
            const request = store.delete(id);

            request.onsuccess = () => {
                this.updateStatus();
                resolve();
            };
            request.onerror = () => resolve();
        });
    }

    // Update retry count
    private async incrementRetry(action: QueuedAction): Promise<void> {
        const db = await this.ensureDB();
        if (!db) return;

        return new Promise((resolve) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            const store = tx.objectStore(QUEUE_STORE);
            action.retryCount++;
            store.put(action);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }

    // Sync all queued actions
    async syncQueue(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            console.log('[OfflineQueue] Sync already in progress');
            return { success: 0, failed: 0 };
        }

        if (!this.isOnline) {
            console.log('[OfflineQueue] Cannot sync: offline');
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        await this.updateStatus();

        const queue = await this.getQueue();
        let success = 0;
        let failed = 0;

        console.log(`[OfflineQueue] Syncing ${queue.length} actions...`);

        for (const action of queue) {
            try {
                await this.processAction(action);
                await this.removeFromQueue(action.id);
                success++;
                console.log(`[OfflineQueue] Synced: ${action.id}`);
            } catch (e: any) {
                console.error(`[OfflineQueue] Failed to sync ${action.id}:`, e.message);
                await this.incrementRetry(action);

                // Remove after 3 failed attempts
                if (action.retryCount >= 2) {
                    console.log(`[OfflineQueue] Removing failed action after 3 attempts: ${action.id}`);
                    await this.removeFromQueue(action.id);
                }
                failed++;
            }
        }

        this.isSyncing = false;
        await this.updateStatus({ lastSyncAt: new Date().toISOString() });

        console.log(`[OfflineQueue] Sync complete: ${success} success, ${failed} failed`);
        return { success, failed };
    }

    // Process a single action
    private async processAction(action: QueuedAction): Promise<void> {
        const { type, payload } = action;

        if (type === 'clock_in') {
            // Check if already clocked in for this date
            try {
                const existing = await api.get<any>(`/api/attendance/check-existing`, {
                    profile_id: payload.profile_id,
                    work_date: payload.work_date,
                });
                if (existing) {
                    console.log(`[OfflineQueue] Already clocked in for ${payload.work_date}, skipping`);
                    return;
                }
            } catch { /* no existing record, proceed */ }

            await api.post('/api/attendance/clock-in', {
                profile_id: payload.profile_id,
                clock_in: payload.clock_in,
                clock_in_coords: payload.clock_in_coords,
                clock_in_address: payload.clock_in_address,
                work_date: payload.work_date,
                lokasi_kerja: payload.lokasi_kerja,
                tempat_kerja: payload.tempat_kerja,
                status: 'in_progress',
                source: 'web_app_offline',
                catatan: payload.catatan,
            });
        } else if (type === 'clock_out') {
            if (!payload.attendance_id) {
                throw new Error('No attendance_id for clock_out');
            }

            await api.put(`/api/attendance/clock-out/${payload.attendance_id}`, {
                clock_out: payload.clock_out,
                clock_out_coords: payload.clock_out_coords,
                clock_out_address: payload.clock_out_address,
                status: payload.status || 'hadir',
            });
        }
    }

    // Get sync status
    async getStatus(): Promise<SyncStatus> {
        const queue = await this.getQueue();
        const failedCount = queue.filter(a => a.retryCount > 0).length;

        const db = await this.ensureDB();
        let lastSyncAt: string | null = null;

        if (db) {
            try {
                const tx = db.transaction(STATUS_STORE, 'readonly');
                const store = tx.objectStore(STATUS_STORE);
                const request = store.get('lastSync');

                await new Promise<void>((resolve) => {
                    request.onsuccess = () => {
                        lastSyncAt = request.result?.value || null;
                        resolve();
                    };
                    request.onerror = () => resolve();
                });
            } catch {
                // Ignore errors
            }
        }

        return {
            lastSyncAt,
            pendingCount: queue.length,
            failedCount,
            isSyncing: this.isSyncing,
        };
    }

    // Update sync status
    private async updateStatus(partial?: { lastSyncAt?: string }): Promise<void> {
        if (partial?.lastSyncAt) {
            const db = await this.ensureDB();
            if (db) {
                const tx = db.transaction(STATUS_STORE, 'readwrite');
                const store = tx.objectStore(STATUS_STORE);
                store.put({ key: 'lastSync', value: partial.lastSyncAt });
            }
        }

        const status = await this.getStatus();
        this.notifyListeners(status);
    }

    // Add listener for status changes
    addListener(callback: (status: SyncStatus) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    // Notify all listeners
    private notifyListeners(status: SyncStatus): void {
        this.listeners.forEach(l => l(status));
    }

    // Clear all queued actions
    async clearQueue(): Promise<void> {
        const db = await this.ensureDB();
        if (!db) return;

        return new Promise((resolve) => {
            const tx = db.transaction(QUEUE_STORE, 'readwrite');
            const store = tx.objectStore(QUEUE_STORE);
            store.clear();
            tx.oncomplete = () => {
                this.updateStatus();
                resolve();
            };
            tx.onerror = () => resolve();
        });
    }
}

// Singleton instance
export const offlineQueue = new WebOfflineQueueService();
