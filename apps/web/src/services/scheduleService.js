import api from '../lib/api';

export const scheduleService = {
    getMySchedule: async (weekOffset = 0) => {
        const response = await api.get('/api/schedules/my-schedule', {
            params: { weekOffset },
        });
        return response.data;
    },

    getMyMonthlySchedule: async ({ month, year }) => {
        const response = await api.get('/api/schedules/my-schedule/monthly', {
            params: { month, year },
        });
        return response.data;
    },

    getShiftTemplates: async () => {
        const response = await api.get('/api/schedules/templates');
        return response.data;
    },

    createShiftTemplate: async (data) => {
        const response = await api.post('/api/schedules/templates', data);
        return response.data;
    },

    getTeamSchedule: async ({ startDate, endDate }) => {
        const response = await api.get('/api/schedules/team', {
            params: { startDate, endDate },
        });
        return response.data;
    },

    assignShift: async (data) => {
        const response = await api.post('/api/schedules/assign', data);
        return response.data;
    },

    updateShiftAssignment: async ({ id, ...data }) => {
        const response = await api.put(`/api/schedules/assign/${id}`, data);
        return response.data;
    },

    deleteShiftAssignment: async (id) => {
        const response = await api.delete(`/api/schedules/assign/${id}`);
        return response.data;
    }
};
