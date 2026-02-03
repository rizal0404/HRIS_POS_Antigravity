import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestService } from '../services/requestService';

export function useMyRequests() {
    return useQuery({
        queryKey: ['requests', 'my'],
        queryFn: requestService.getMyRequests,
    });
}

export function useRequest(id) {
    return useQuery({
        queryKey: ['request', id],
        queryFn: () => requestService.getRequestById(id),
        enabled: !!id,
    });
}

export function useCreateLeaveRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestService.createLeaveRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests', 'my'] });
        },
    });
}

export function useCreateOvertimeRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestService.createOvertimeRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests', 'my'] });
        },
    });
}

export function useCreateSickRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestService.createSickRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests', 'my'] });
        },
    });
}

export function useCreateCorrectionRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestService.createCorrectionRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests', 'my'] });
        },
    });
}

export function useCreateShiftSwapRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestService.createShiftSwapRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests', 'my'] });
        },
    });
}

export function useCancelRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestService.cancelRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['requests', 'my'] });
        },
    });
}
