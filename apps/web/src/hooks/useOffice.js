import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { officeService } from '../services/officeService';

export function useAllOffices() {
    return useQuery({
        queryKey: ['offices', 'all'],
        queryFn: officeService.getAllOffices,
    });
}

export function useActiveOffices() {
    return useQuery({
        queryKey: ['offices', 'active'],
        queryFn: officeService.getActiveOffices,
    });
}

export function useCreateOffice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: officeService.createOffice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offices', 'all'] });
        },
    });
}

export function useUpdateOffice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: officeService.updateOffice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offices', 'all'] });
        },
    });
}

export function useDeleteOffice() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: officeService.deleteOffice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offices', 'all'] });
        },
    });
}
