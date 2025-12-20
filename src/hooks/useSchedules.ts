import { useState, useEffect, useCallback } from 'react';
import { JadwalKerjaTim } from '../types';
import { schedulesService } from '../services/schedules';

// ==== SCHEDULES HOOK ====

interface UseSchedulesReturn {
    schedules: JadwalKerjaTim[];
    loading: boolean;
    error: Error | null;
    updateSchedule: (profileId: string, date: string, shiftCode: string) => Promise<any>;
    bulkUpdate: (schedules: { profile_id: string; date: string; shift_code: string }[]) => Promise<any>;
    refetch: () => Promise<void>;
}

export function useSchedules(
    profileIds: string[],
    startDate?: string,
    endDate?: string
): UseSchedulesReturn {
    const [schedules, setSchedules] = useState<JadwalKerjaTim[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSchedules = useCallback(async () => {
        if (profileIds.length === 0) {
            setSchedules([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await schedulesService.getTeamSchedules(profileIds, startDate, endDate);
            setSchedules(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, [profileIds, startDate, endDate]);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    const updateSchedule = useCallback(async (profileId: string, date: string, shiftCode: string) => {
        setError(null);
        try {
            const result = await schedulesService.updateWorkSchedule(profileId, date, shiftCode);
            await fetchSchedules(); // Refetch to get updated data
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchSchedules]);

    const bulkUpdate = useCallback(async (scheduleUpdates: { profile_id: string; date: string; shift_code: string }[]) => {
        setError(null);
        try {
            const result = await schedulesService.bulkUpdateWorkSchedules(scheduleUpdates);
            await fetchSchedules(); // Refetch to get updated data
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    }, [fetchSchedules]);

    return { schedules, loading, error, updateSchedule, bulkUpdate, refetch: fetchSchedules };
}
