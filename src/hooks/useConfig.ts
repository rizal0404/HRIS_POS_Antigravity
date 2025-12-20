import { useState, useEffect, useCallback } from 'react';
import {
    Shift,
    Department,
    LeaveType,
    Holiday,
    OvertimeConfiguration,
    NotificationPreferences
} from '../types';
import { configService } from '../services/config';

// ==== SHIFTS HOOK ====

interface UseShiftsReturn {
    shifts: Shift[];
    loading: boolean;
    error: Error | null;
    saveShift: (data: Partial<Shift>) => Promise<Shift>;
    deleteShift: (code: string) => Promise<void>;
    refetch: () => Promise<void>;
}

export function useShifts(): UseShiftsReturn {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchShifts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await configService.getShifts();
            setShifts(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchShifts();
    }, [fetchShifts]);

    const saveShift = useCallback(async (data: Partial<Shift>) => {
        try {
            const saved = await configService.saveShift(data);
            await fetchShifts();
            return saved;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchShifts]);

    const deleteShift = useCallback(async (code: string) => {
        try {
            await configService.deleteShift(code);
            await fetchShifts();
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchShifts]);

    return { shifts, loading, error, saveShift, deleteShift, refetch: fetchShifts };
}

// ==== ORGANIZATION STRUCTURE HOOK ====

interface UseOrganizationReturn {
    departments: Department[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useOrganization(): UseOrganizationReturn {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchOrganization = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await configService.getOrganizationStructure();
            setDepartments(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    return { departments, loading, error, refetch: fetchOrganization };
}

// ==== LEAVE TYPES HOOK ====

interface UseLeaveTypesReturn {
    leaveTypes: LeaveType[];
    loading: boolean;
    error: Error | null;
    saveLeaveType: (data: Partial<LeaveType>) => Promise<LeaveType>;
    deleteLeaveType: (id: number) => Promise<void>;
    refetch: () => Promise<void>;
}

export function useLeaveTypes(): UseLeaveTypesReturn {
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchLeaveTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await configService.getLeaveTypes();
            setLeaveTypes(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaveTypes();
    }, [fetchLeaveTypes]);

    const saveLeaveType = useCallback(async (data: Partial<LeaveType>) => {
        try {
            const saved = await configService.saveLeaveType(data);
            await fetchLeaveTypes();
            return saved;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchLeaveTypes]);

    const deleteLeaveType = useCallback(async (id: number) => {
        try {
            await configService.deleteLeaveType(id);
            await fetchLeaveTypes();
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchLeaveTypes]);

    return { leaveTypes, loading, error, saveLeaveType, deleteLeaveType, refetch: fetchLeaveTypes };
}

// ==== HOLIDAYS HOOK ====

interface UseHolidaysReturn {
    holidays: Holiday[];
    loading: boolean;
    error: Error | null;
    saveHoliday: (data: Partial<Holiday>) => Promise<Holiday>;
    deleteHoliday: (id: number) => Promise<void>;
    refetch: () => Promise<void>;
}

export function useHolidays(): UseHolidaysReturn {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await configService.getHolidays();
            setHolidays(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const saveHoliday = useCallback(async (data: Partial<Holiday>) => {
        try {
            const saved = await configService.saveHoliday(data);
            await fetchHolidays();
            return saved;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchHolidays]);

    const deleteHoliday = useCallback(async (id: number) => {
        try {
            await configService.deleteHoliday(id);
            await fetchHolidays();
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchHolidays]);

    return { holidays, loading, error, saveHoliday, deleteHoliday, refetch: fetchHolidays };
}

// ==== NOTIFICATION PREFERENCES HOOK ====

interface UseNotificationPreferencesReturn {
    preferences: NotificationPreferences | null;
    loading: boolean;
    error: Error | null;
    updatePreferences: (prefs: NotificationPreferences) => Promise<NotificationPreferences>;
    updateTelegramChatId: (chatId: string | null) => Promise<NotificationPreferences>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchPreferences = async () => {
            setLoading(true);
            try {
                const data = await configService.getNotificationPreferences();
                setPreferences(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };
        fetchPreferences();
    }, []);

    const updatePreferences = useCallback(async (prefs: NotificationPreferences) => {
        try {
            const updated = await configService.updateNotificationPreferences(prefs);
            setPreferences(updated);
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    const updateTelegramChatId = useCallback(async (chatId: string | null) => {
        try {
            const updated = await configService.updateTelegramChatId(chatId);
            setPreferences(updated);
            return updated;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, []);

    return { preferences, loading, error, updatePreferences, updateTelegramChatId };
}
