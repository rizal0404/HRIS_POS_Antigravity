import api from '../lib/api';

export const officeService = {
    getAllOffices: async () => {
        const response = await api.get('/api/offices');
        return response.data;
    },

    getActiveOffices: async () => {
        const response = await api.get('/api/offices/active');
        return response.data;
    },

    createOffice: async (data) => {
        const response = await api.post('/api/offices', data);
        return response.data;
    },

    updateOffice: async ({ id, ...data }) => {
        const response = await api.put(`/api/offices/${id}`, data);
        return response.data;
    },

    deleteOffice: async (id) => {
        const response = await api.delete(`/api/offices/${id}`);
        return response.data;
    }
};
