import { supabase } from '../supabase';
import { JadwalKerjaTim } from '../../types';
import { handleSupabaseError } from '../helpers';

// ==== SCHEDULES SERVICE ====

export const schedulesService = {
    async getTeamSchedules(profileIds: string[], startDate?: string, endDate?: string): Promise<JadwalKerjaTim[]> {
        if (profileIds.length === 0) return [];

        let query = supabase
            .from('work_schedules')
            .select('*, profiles(full_name), shifts(*)')
            .in('profile_id', profileIds);

        if (startDate) {
            query = query.gte('date', startDate);
        }
        if (endDate) {
            query = query.lte('date', endDate);
        }

        const { data, error } = await query;

        const schedules = handleSupabaseError({ data, error }, 'getTeamSchedules');

        return schedules.map((s: any) => ({
            profile_id: s.profile_id,
            date: s.date,
            shift: s.shift_code,
            start_time: s.shifts?.start_time,
            end_time: s.shifts?.end_time,
        }));
    },

    async updateWorkSchedule(profileId: string, date: string, shiftCode: string): Promise<any> {
        const { data, error } = await supabase
            .from('work_schedules')
            .upsert({ profile_id: profileId, date, shift_code: shiftCode }, { onConflict: 'profile_id, date' })
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'updateWorkSchedule');
    },

    async bulkUpdateWorkSchedules(schedules: { profile_id: string; date: string; shift_code: string }[]): Promise<any> {
        const { data, error } = await supabase
            .from('work_schedules')
            .upsert(schedules, { onConflict: 'profile_id, date' })
            .select();
        return handleSupabaseError({ data, error }, 'bulkUpdateWorkSchedules');
    },
};

// Export individual functions for granular imports
export const {
    getTeamSchedules,
    updateWorkSchedule,
    bulkUpdateWorkSchedules,
} = schedulesService;
