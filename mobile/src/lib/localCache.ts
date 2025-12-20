// Local Cache Service
// Caches essential data for offline access using AsyncStorage
// TTL: 24 hours for most data

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'hris_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

// Keys
const KEYS = {
    USER_PROFILE: `${CACHE_PREFIX}user_profile`,
    TODAY_SCHEDULE: `${CACHE_PREFIX}today_schedule`,
    ACTIVE_ATTENDANCE: `${CACHE_PREFIX}active_attendance`,
    MONTHLY_STATS: `${CACHE_PREFIX}monthly_stats`,
    LAST_SYNC: `${CACHE_PREFIX}last_sync`,
};

class LocalCacheService {
    // Generic cache methods
    private async setCache<T>(key: string, data: T, ttlMs: number = CACHE_TTL_MS): Promise<void> {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + ttlMs,
            };
            await AsyncStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
            console.error('[LocalCache] Error setting cache:', key, e);
        }
    }

    private async getCache<T>(key: string): Promise<T | null> {
        try {
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return null;

            const entry: CacheEntry<T> = JSON.parse(raw);

            // Check if expired
            if (Date.now() > entry.expiresAt) {
                await this.removeCache(key);
                return null;
            }

            return entry.data;
        } catch (e) {
            console.error('[LocalCache] Error getting cache:', key, e);
            return null;
        }
    }

    private async removeCache(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error('[LocalCache] Error removing cache:', key, e);
        }
    }

    // ==========================================
    // USER PROFILE
    // ==========================================
    async cacheUserProfile(profile: any): Promise<void> {
        await this.setCache(KEYS.USER_PROFILE, profile);
        console.log('[LocalCache] User profile cached');
    }

    async getCachedUserProfile(): Promise<any | null> {
        return this.getCache(KEYS.USER_PROFILE);
    }

    // ==========================================
    // TODAY'S SCHEDULE
    // ==========================================
    async cacheTodaySchedule(schedule: any): Promise<void> {
        // Shorter TTL for schedule - 6 hours
        await this.setCache(KEYS.TODAY_SCHEDULE, schedule, 6 * 60 * 60 * 1000);
        console.log('[LocalCache] Today schedule cached');
    }

    async getCachedTodaySchedule(): Promise<any | null> {
        return this.getCache(KEYS.TODAY_SCHEDULE);
    }

    // ==========================================
    // ACTIVE ATTENDANCE
    // ==========================================
    async cacheActiveAttendance(attendance: any | null): Promise<void> {
        if (attendance) {
            await this.setCache(KEYS.ACTIVE_ATTENDANCE, attendance);
        } else {
            await this.removeCache(KEYS.ACTIVE_ATTENDANCE);
        }
        console.log('[LocalCache] Active attendance cached');
    }

    async getCachedActiveAttendance(): Promise<any | null> {
        return this.getCache(KEYS.ACTIVE_ATTENDANCE);
    }

    // ==========================================
    // MONTHLY STATS
    // ==========================================
    async cacheMonthlyStats(stats: any): Promise<void> {
        // Shorter TTL for stats - 1 hour
        await this.setCache(KEYS.MONTHLY_STATS, stats, 60 * 60 * 1000);
        console.log('[LocalCache] Monthly stats cached');
    }

    async getCachedMonthlyStats(): Promise<any | null> {
        return this.getCache(KEYS.MONTHLY_STATS);
    }

    // ==========================================
    // LAST SYNC TIMESTAMP
    // ==========================================
    async updateLastSync(): Promise<void> {
        await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
    }

    async getLastSync(): Promise<string | null> {
        return AsyncStorage.getItem(KEYS.LAST_SYNC);
    }

    // ==========================================
    // CLEAR ALL (for logout)
    // ==========================================
    async clearAllCache(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
            await AsyncStorage.multiRemove(cacheKeys);
            console.log('[LocalCache] All cache cleared');
        } catch (e) {
            console.error('[LocalCache] Error clearing cache:', e);
        }
    }

    // ==========================================
    // CHECK IF HAS CACHED DATA
    // ==========================================
    async hasCachedData(): Promise<boolean> {
        const profile = await this.getCachedUserProfile();
        return profile !== null;
    }
}

// Singleton instance
export const localCache = new LocalCacheService();
