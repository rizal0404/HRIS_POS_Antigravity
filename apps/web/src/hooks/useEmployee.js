import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService } from '../services/employeeService';

export function useMyProfile() {
    return useQuery({
        queryKey: ['employee', 'me'],
        queryFn: employeeService.getMyProfile,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: employeeService.updateMyProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee', 'me'] });
        },
    });
}

export function useAllEmployees() {
    return useQuery({
        queryKey: ['employees', 'all'],
        queryFn: employeeService.getAllEmployees,
    });
}

export function useEmployee(id) {
    return useQuery({
        queryKey: ['employee', id],
        queryFn: () => employeeService.getEmployeeById(id),
        enabled: !!id,
    });
}
