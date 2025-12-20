import { useState, useCallback } from 'react';
import { Attendance, UserProfile, JadwalKerjaTim } from '../types';
import { attendanceService } from '../services/attendance';

// ==== ATTENDANCE HOOK ====

interface UseAttendanceReturn {
    activeAttendance: Attendance | null;
    loading: boolean;
    error: Error | null;
    fetchActiveAttendance: (profileId: string) => Promise<Attendance | null>;
    clockIn: (user: UserProfile, payload: any) => Promise<Attendance>;
    clockOut: (user: UserProfile, payload: any) => Promise<Attendance>;
}

export function useAttendance(): UseAttendanceReturn {
    const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const fetchActiveAttendance = useCallback(async (profileId: string) => {
        setLoading(true);
        setError(null);
        try {
            const attendance = await attendanceService.getActiveAttendance(profileId);
            setActiveAttendance(attendance);
            return attendance;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clockIn = useCallback(async (user: UserProfile, payload: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await attendanceService.submitClockEvent(user, 'in', payload);
            setActiveAttendance(result);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const clockOut = useCallback(async (user: UserProfile, payload: any) => {
        setLoading(true);
        setError(null);
        try {
            const result = await attendanceService.submitClockEvent(user, 'out', {
                ...payload,
                activeAttendance
            });
            setActiveAttendance(null);
            return result;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [activeAttendance]);

    return {
        activeAttendance,
        loading,
        error,
        fetchActiveAttendance,
        clockIn,
        clockOut
    };
}

// ==== ATTENDANCE HISTORY HOOK ====

interface UseAttendanceHistoryReturn {
    attendance: Attendance[];
    loading: boolean;
    error: Error | null;
    refetch: (profileId: string) => Promise<void>;
}

export function useAttendanceHistory(profileId?: string): UseAttendanceHistoryReturn {
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const { attendance: data } = await attendanceService.getHistory(id);
            setAttendance(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    }, []);

    return { attendance, loading, error, refetch };
}
