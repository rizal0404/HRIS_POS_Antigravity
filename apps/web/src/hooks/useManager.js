import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerService } from '../services/managerService';

export function useDashboardStats() {
    return useQuery({
        queryKey: ['manager', 'dashboard'],
        queryFn: managerService.getDashboardStats,
    });
}

export function usePendingApprovals() {
    return useQuery({
        queryKey: ['manager', 'approvals'],
        queryFn: managerService.getPendingApprovals,
    });
}

export function useApproveRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: managerService.approveRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manager', 'approvals'] });
            queryClient.invalidateQueries({ queryKey: ['manager', 'dashboard'] });
        },
    });
}

export function useRejectRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: managerService.rejectRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manager', 'approvals'] });
            queryClient.invalidateQueries({ queryKey: ['manager', 'dashboard'] });
        },
    });
}

export function useSuggestedSubstitutes(requestId) {
    return useQuery({
        queryKey: ['manager', 'substitutes', requestId],
        queryFn: () => managerService.getSuggestedSubstitutes(requestId),
        enabled: !!requestId,
    });
}
