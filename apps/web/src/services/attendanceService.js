import api from '../lib/api';

export const attendanceService = {
    clockIn: async (data) => {
        const response = await api.post('/api/attendance/clock-in', data);
        return response.data;
    },

    clockOut: async (data) => {
        const response = await api.post('/api/attendance/clock-out', data);
        return response.data;
    },

    getTodayAttendance: async () => {
        const response = await api.get('/api/attendance/today');
        return response.data;
    },

    getHistory: async ({ startDate, endDate }) => {
        const response = await api.get('/api/attendance/history', {
            params: { startDate, endDate },
        });
        return response.data;
    },

    getTeamAttendance: async () => {
        const response = await api.get('/api/attendance/team');
        return response.data;
    }
};
