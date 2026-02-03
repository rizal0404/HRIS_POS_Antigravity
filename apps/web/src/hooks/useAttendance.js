import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';

export function useTodayAttendance() {
    return useQuery({
        queryKey: ['attendance', 'today'],
        queryFn: attendanceService.getTodayAttendance,
    });
}

export function useAttendanceHistory(startDate, endDate) {
    return useQuery({
        queryKey: ['attendance', 'history', { startDate, endDate }],
        queryFn: () => attendanceService.getHistory({ startDate, endDate }),
        enabled: !!startDate && !!endDate,
    });
}

export function useTeamAttendance() {
    return useQuery({
        queryKey: ['attendance', 'team'],
        queryFn: attendanceService.getTeamAttendance,
    });
}

export function useClockIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: attendanceService.clockIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
        },
    });
}

export function useClockOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: attendanceService.clockOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] });
        },
    });
}
