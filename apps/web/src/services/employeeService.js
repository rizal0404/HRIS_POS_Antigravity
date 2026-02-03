import api from '../lib/api';

export const employeeService = {
    getMyProfile: async () => {
        const response = await api.get('/api/employees/me');
        return response.data;
    },

    updateMyProfile: async (data) => {
        const response = await api.put('/api/employees/me', data);
        return response.data;
    },

    getAllEmployees: async () => {
        const response = await api.get('/api/employees');
        return response.data;
    },

    getEmployeeById: async (id) => {
        const response = await api.get(`/api/employees/${id}`);
        return response.data;
    }
};
