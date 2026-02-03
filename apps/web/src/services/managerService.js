import api from '../lib/api';

export const managerService = {
    getDashboardStats: async () => {
        const response = await api.get('/api/manager/dashboard');
        return response.data;
    },

    getPendingApprovals: async () => {
        const response = await api.get('/api/manager/pending-approvals');
        return response.data;
    },

    approveRequest: async ({ requestId, ...data }) => {
        const response = await api.post(`/api/manager/approve/${requestId}`, data);
        return response.data;
    },

    rejectRequest: async ({ requestId, ...data }) => {
        const response = await api.post(`/api/manager/reject/${requestId}`, data);
        return response.data;
    },

    getSuggestedSubstitutes: async (requestId) => {
        const response = await api.get(`/api/manager/substitutes/${requestId}`);
        return response.data;
    }
};
