import api from '../apiClient';
import { JadwalKerjaTim } from '../../types';

// ==== SCHEDULES SERVICE ====

export const schedulesService = {
    async getTeamSchedules(profileIds: string[], startDate?: string, endDate?: string): Promise<JadwalKerjaTim[]> {
        if (profileIds.length === 0) return [];

        const params: Record<string, any> = {
            profile_ids: profileIds,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const data = await api.post<any[]>('/api/schedules/team', params);

        return (data || []).map((s: any) => ({
            profile_id: s.profile_id,
            date: s.date,
            shift: s.shift_code,
            start_time: s.shifts?.start_time || s.start_time,
            end_time: s.shifts?.end_time || s.end_time,
        }));
    },

    async updateWorkSchedule(profileId: string, date: string, shiftCode: string): Promise<any> {
        return api.put('/api/schedules', { profile_id: profileId, date, shift_code: shiftCode });
    },

    async bulkUpdateWorkSchedules(schedules: { profile_id: string; date: string; shift_code: string }[]): Promise<any> {
        return api.post('/api/schedules/bulk', { schedules });
    },
};

// Export individual functions for granular imports
export const {
    getTeamSchedules,
    updateWorkSchedule,
    bulkUpdateWorkSchedules,
} = schedulesService;
