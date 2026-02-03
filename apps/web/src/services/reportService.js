import api from '../lib/api';

export const reportService = {
    getMySummary: async ({ month, year }) => {
        const response = await api.get('/api/reports/my-summary', {
            params: { month, year },
        });
        return response.data;
    },

    getMyQuotas: async () => {
        const response = await api.get('/api/reports/my-quotas');
        return response.data;
    },

    getTeamSummary: async ({ month, year }) => {
        const response = await api.get('/api/reports/team-summary', {
            params: { month, year },
        });
        return response.data;
    },

    exportReport: async ({ format = 'csv', month, year }) => {
        const response = await api.get('/api/reports/export', {
            params: { format, month, year },
            responseType: 'blob', // Important for file download
        });
        return response.data;
    }
};
