import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService } from '../services/reportService';

export function useMySummary(month, year) {
    return useQuery({
        queryKey: ['report', 'my-summary', { month, year }],
        queryFn: () => reportService.getMySummary({ month, year }),
        enabled: !!month && !!year,
    });
}

export function useMyQuotas() {
    return useQuery({
        queryKey: ['report', 'my-quotas'],
        queryFn: reportService.getMyQuotas,
    });
}

export function useTeamSummary(month, year) {
    return useQuery({
        queryKey: ['report', 'team-summary', { month, year }],
        queryFn: () => reportService.getTeamSummary({ month, year }),
        enabled: !!month && !!year,
    });
}

export function useExportReport() {
    return useMutation({
        mutationFn: reportService.exportReport,
        onSuccess: (data, variables) => {
            // Create a download link for the exported file
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${variables.month}-${variables.year}.${variables.format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
    });
}
