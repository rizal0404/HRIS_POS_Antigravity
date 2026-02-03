import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/scheduleService';

export function useMySchedule(weekOffset) {
    return useQuery({
        queryKey: ['schedule', 'my', weekOffset],
        queryFn: () => scheduleService.getMySchedule(weekOffset),
    });
}

export function useMyMonthlySchedule(month, year) {
    return useQuery({
        queryKey: ['schedule', 'my-monthly', { month, year }],
        queryFn: () => scheduleService.getMyMonthlySchedule({ month, year }),
        enabled: !!month && !!year,
    });
}

export function useShiftTemplates() {
    return useQuery({
        queryKey: ['schedule', 'templates'],
        queryFn: scheduleService.getShiftTemplates,
    });
}

export function useTeamSchedule(startDate, endDate) {
    return useQuery({
        queryKey: ['schedule', 'team', { startDate, endDate }],
        queryFn: () => scheduleService.getTeamSchedule({ startDate, endDate }),
        enabled: !!startDate && !!endDate,
    });
}

export function useCreateShiftTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: scheduleService.createShiftTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', 'templates'] });
        },
    });
}

export function useAssignShift() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: scheduleService.assignShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', 'team'] });
        },
    });
}

export function useUpdateShiftAssignment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: scheduleService.updateShiftAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', 'team'] });
        },
    });
}

export function useDeleteShiftAssignment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: scheduleService.deleteShiftAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', 'team'] });
        },
    });
}
