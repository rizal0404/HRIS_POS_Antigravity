import api from '../lib/api';

export const requestService = {
    createLeaveRequest: async (data) => {
        const response = await api.post('/api/requests/leave', data);
        return response.data;
    },

    createOvertimeRequest: async (data) => {
        const response = await api.post('/api/requests/overtime', data);
        return response.data;
    },

    createSickRequest: async (data) => {
        const response = await api.post('/api/requests/sick', data);
        return response.data;
    },

    createCorrectionRequest: async (data) => {
        const response = await api.post('/api/requests/correction', data);
        return response.data;
    },

    createShiftSwapRequest: async (data) => {
        const response = await api.post('/api/requests/shift-swap', data);
        return response.data;
    },

    getMyRequests: async () => {
        const response = await api.get('/api/requests/my-requests');
        return response.data;
    },

    getRequestById: async (id) => {
        const response = await api.get(`/api/requests/${id}`);
        return response.data;
    },

    cancelRequest: async (id) => {
        const response = await api.delete(`/api/requests/${id}`);
        return response.data;
    }
};
