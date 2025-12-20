// Offline Queue Service
// Queues attendance actions when offline and syncs when connection is restored

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from './supabase';

const QUEUE_KEY = 'attendance_offline_queue';
const SYNC_STATUS_KEY = 'offline_sync_status';

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
        attendance_id?: string; // For clock_out, reference to existing attendance
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

class OfflineQueueService {
    private isOnline: boolean = true;
    private isSyncing: boolean = false;
    private listeners: ((status: SyncStatus) => void)[] = [];

    constructor() {
        this.initNetworkListener();
    }

    // Initialize network state listener
    private initNetworkListener() {
        NetInfo.addEventListener((state: NetInfoState) => {
            const wasOffline = !this.isOnline;
            this.isOnline = state.isConnected ?? false;

            // If connection restored, try to sync
            if (wasOffline && this.isOnline) {
                console.log('[OfflineQueue] Connection restored, triggering sync...');
                this.syncQueue();
            }
        });

        // Get initial state
        NetInfo.fetch().then((state) => {
            this.isOnline = state.isConnected ?? false;
        });
    }

    // Check if currently online
    async checkOnline(): Promise<boolean> {
        const state = await NetInfo.fetch();
        this.isOnline = state.isConnected ?? false;
        return this.isOnline;
    }

    // Add action to queue
    async enqueue(action: Omit<QueuedAction, 'id' | 'retryCount' | 'createdAt'>): Promise<string> {
        const queue = await this.getQueue();

        const newAction: QueuedAction = {
            ...action,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            retryCount: 0,
            createdAt: new Date().toISOString(),
        };

        queue.push(newAction);
        await this.saveQueue(queue);
        await this.updateStatus();

        console.log(`[OfflineQueue] Action queued: ${newAction.type} (${newAction.id})`);

        // Try immediate sync if online
        if (this.isOnline) {
            this.syncQueue();
        }

        return newAction.id;
    }

    // Get all queued actions
    async getQueue(): Promise<QueuedAction[]> {
        try {
            const data = await AsyncStorage.getItem(QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('[OfflineQueue] Error reading queue:', e);
            return [];
        }
    }

    // Save queue to storage
    private async saveQueue(queue: QueuedAction[]): Promise<void> {
        try {
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error('[OfflineQueue] Error saving queue:', e);
        }
    }

    // Remove action from queue
    private async removeFromQueue(id: string): Promise<void> {
        const queue = await this.getQueue();
        const filtered = queue.filter(a => a.id !== id);
        await this.saveQueue(filtered);
        await this.updateStatus();
    }

    // Increment retry count
    private async incrementRetry(id: string): Promise<void> {
        const queue = await this.getQueue();
        const action = queue.find(a => a.id === id);
        if (action) {
            action.retryCount++;
            await this.saveQueue(queue);
        }
    }

    // Sync all queued actions
    async syncQueue(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) {
            console.log('[OfflineQueue] Sync already in progress');
            return { success: 0, failed: 0 };
        }

        const isOnline = await this.checkOnline();
        if (!isOnline) {
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
                await this.incrementRetry(action.id);

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
            const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('profile_id', payload.profile_id)
                .eq('work_date', payload.work_date)
                .limit(1)
                .single();

            if (existing) {
                console.log(`[OfflineQueue] Already clocked in for ${payload.work_date}, skipping`);
                return;
            }

            const { error } = await supabase
                .from('attendance')
                .insert({
                    profile_id: payload.profile_id,
                    clock_in: payload.clock_in,
                    clock_in_coords: payload.clock_in_coords,
                    clock_in_address: payload.clock_in_address,
                    work_date: payload.work_date,
                    lokasi_kerja: payload.lokasi_kerja,
                    tempat_kerja: payload.tempat_kerja,
                    status: 'in_progress',
                    source: 'mobile_app_offline',
                    catatan: payload.catatan,
                });

            if (error) throw error;
        } else if (type === 'clock_out') {
            if (!payload.attendance_id) {
                throw new Error('No attendance_id for clock_out');
            }

            const { error } = await supabase
                .from('attendance')
                .update({
                    clock_out: payload.clock_out,
                    clock_out_coords: payload.clock_out_coords,
                    clock_out_address: payload.clock_out_address,
                    status: payload.status || 'hadir',
                })
                .eq('id', payload.attendance_id);

            if (error) throw error;
        }
    }

    // Get sync status
    async getStatus(): Promise<SyncStatus> {
        try {
            const data = await AsyncStorage.getItem(SYNC_STATUS_KEY);
            const queue = await this.getQueue();
            const failedCount = queue.filter(a => a.retryCount > 0).length;

            const parsed = data ? JSON.parse(data) : {};
            return {
                lastSyncAt: parsed.lastSyncAt || null,
                pendingCount: queue.length,
                failedCount,
                isSyncing: this.isSyncing,
            };
        } catch {
            return {
                lastSyncAt: null,
                pendingCount: 0,
                failedCount: 0,
                isSyncing: false,
            };
        }
    }

    // Update sync status
    private async updateStatus(partial?: Partial<SyncStatus>): Promise<void> {
        const current = await this.getStatus();
        const updated = { ...current, ...partial };
        await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
        this.notifyListeners(updated);
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
        await AsyncStorage.removeItem(QUEUE_KEY);
        await this.updateStatus();
    }

    // Check if online
    get online(): boolean {
        return this.isOnline;
    }
}

// Singleton instance
export const offlineQueue = new OfflineQueueService();
