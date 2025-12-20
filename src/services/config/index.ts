import { supabase } from '../supabase';
import {
    Shift,
    Department,
    Bureau,
    Section,
    LeaveType,
    Holiday,
    OvertimeConfiguration,
    NotificationPreferences,
} from '../../types';
import { handleSupabaseError } from '../helpers';

// ==== CONFIG SERVICE ====

export const configService = {
    // NOTIFICATION PREFERENCES
    async getNotificationPreferences(): Promise<NotificationPreferences> {
        const { data, error } = await supabase.rpc('get_notification_preferences');
        if (error) {
            console.error('Error fetching notification preferences:', error);
            throw new Error(error.message || 'Gagal memuat pengaturan notifikasi.');
        }
        return data || { new_request: true, request_approved: true, request_rejected: true };
    },

    async updateNotificationPreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
        const { data, error } = await supabase.rpc('update_notification_preferences', {
            p_new_request: prefs.new_request,
            p_request_approved: prefs.request_approved,
            p_request_rejected: prefs.request_rejected,
        });
        if (error) {
            console.error('Error updating notification preferences:', error);
            throw new Error(error.message || 'Gagal menyimpan pengaturan notifikasi.');
        }
        return data || prefs;
    },

    async updateTelegramChatId(chatId: string | null): Promise<NotificationPreferences> {
        const { data, error } = await supabase.rpc('update_telegram_chat_id', {
            p_telegram_chat_id: chatId,
        });
        if (error) {
            console.error('Error updating Telegram chat ID:', error);
            throw new Error(error.message || 'Gagal menyimpan chat ID Telegram.');
        }
        return data || { new_request: true, request_approved: true, request_rejected: true, telegram_chat_id: chatId };
    },

    // SHIFTS
    async getShifts(): Promise<Shift[]> {
        const { data, error } = await supabase.from('shifts').select('*').order('name');
        return handleSupabaseError({ data, error }, 'getShifts');
    },

    async saveShift(shiftData: Partial<Shift>): Promise<Shift> {
        const { data, error } = await supabase.from('shifts').upsert(shiftData).select().single();
        return handleSupabaseError({ data, error }, 'saveShift');
    },

    async deleteShift(shiftCode: string): Promise<void> {
        const { error } = await supabase.rpc('delete_shift_and_reassign', { p_shift_code: shiftCode });
        if (error) handleSupabaseError({ data: null, error }, 'deleteShift');
    },

    // ORGANIZATION STRUCTURE
    async getOrganizationStructure(): Promise<Department[]> {
        const { data, error } = await supabase
            .from('departments')
            .select(`*, bureaus(*, sections(*))`)
            .order('name');
        return handleSupabaseError({ data, error }, 'getOrganizationStructure');
    },

    async saveDepartment(dept: Partial<Department>): Promise<Department> {
        const { data, error } = await supabase.from('departments').upsert(dept).select().single();
        return handleSupabaseError({ data, error }, 'saveDepartment');
    },

    async deleteDepartment(id: number): Promise<void> {
        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) handleSupabaseError({ data: null, error }, 'deleteDepartment');
    },

    async saveBureau(bureau: Partial<Bureau>): Promise<Bureau> {
        const { data, error } = await supabase.from('bureaus').upsert(bureau).select().single();
        return handleSupabaseError({ data, error }, 'saveBureau');
    },

    async deleteBureau(id: number): Promise<void> {
        const { error } = await supabase.from('bureaus').delete().eq('id', id);
        if (error) handleSupabaseError({ data: null, error }, 'deleteBureau');
    },

    async saveSection(section: Partial<Section>): Promise<Section> {
        const { data, error } = await supabase.from('sections').upsert(section).select().single();
        return handleSupabaseError({ data, error }, 'saveSection');
    },

    async deleteSection(id: number): Promise<void> {
        const { error } = await supabase.from('sections').delete().eq('id', id);
        if (error) handleSupabaseError({ data: null, error }, 'deleteSection');
    },

    // LEAVE TYPES
    async getLeaveTypes(): Promise<LeaveType[]> {
        const { data, error } = await supabase.from('leave_types').select('*');
        return handleSupabaseError({ data, error }, 'getLeaveTypes');
    },

    async saveLeaveType(leaveType: Partial<LeaveType>): Promise<LeaveType> {
        const { data, error } = await supabase.from('leave_types').upsert(leaveType).select().single();
        return handleSupabaseError({ data, error }, 'saveLeaveType');
    },

    async deleteLeaveType(id: number): Promise<void> {
        const { error } = await supabase.from('leave_types').delete().eq('id', id);
        if (error) handleSupabaseError({ data: null, error }, 'deleteLeaveType');
    },

    // HOLIDAYS
    async getHolidays(): Promise<Holiday[]> {
        const { data, error } = await supabase.from('holidays').select('*').order('date');
        return handleSupabaseError({ data, error }, 'getHolidays');
    },

    async saveHoliday(holiday: Partial<Holiday>): Promise<Holiday> {
        const { data, error } = await supabase.from('holidays').upsert(holiday).select().single();
        return handleSupabaseError({ data, error }, 'saveHoliday');
    },

    async deleteHoliday(id: number): Promise<void> {
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (error) handleSupabaseError({ data: null, error }, 'deleteHoliday');
    },

    // OVERTIME CONFIGURATION
    async getOvertimeConfiguration(): Promise<OvertimeConfiguration | null> {
        const { data: flatData, error } = await supabase.from('overtime_configuration').select('*').eq('id', 1).single();

        if (error && error.code !== 'PGRST116') {
            handleSupabaseError({ data: null, error }, 'getOvertimeConfiguration');
            return null;
        }

        if (!flatData) {
            return null;
        }

        // Transform flat data from DB to nested structure for the app
        const nestedData: OvertimeConfiguration = {
            id: flatData.id,
            hourly_wage_divider: flatData.hourly_wage_divider,
            max_hours_per_day: flatData.max_hours_per_day,
            max_hours_per_month_non_shift: flatData.max_hours_per_month_non_shift,
            max_hours_per_month_shift: flatData.max_hours_per_month_shift,
            normal_day: {
                first_hour_multiplier: flatData.normal_day_first_hour_multiplier,
                subsequent_hours_multiplier: flatData.normal_day_subsequent_hours_multiplier,
            },
            non_shift: {
                first_eight_hours_multiplier: flatData.non_shift_first_eight_hours_multiplier,
                ninth_hour_multiplier: flatData.non_shift_ninth_hour_multiplier,
                tenth_to_twelfth_hour_multiplier: flatData.non_shift_tenth_to_twelfth_hour_multiplier,
            },
            shift: {
                first_seven_hours_multiplier: flatData.shift_first_seven_hours_multiplier,
                eighth_hour_multiplier: flatData.shift_eighth_hour_multiplier,
                ninth_to_eleventh_hour_multiplier: flatData.shift_ninth_to_eleventh_hour_multiplier,
            },
        };

        return nestedData;
    },

    async saveOvertimeConfiguration(config: Partial<OvertimeConfiguration>): Promise<OvertimeConfiguration> {
        // Flatten the nested structure for Supabase
        const flatConfig: { [key: string]: any } = { id: 1 };

        if (config.hourly_wage_divider !== undefined) flatConfig.hourly_wage_divider = config.hourly_wage_divider;
        if (config.max_hours_per_day !== undefined) flatConfig.max_hours_per_day = config.max_hours_per_day;
        if (config.max_hours_per_month_non_shift !== undefined) flatConfig.max_hours_per_month_non_shift = config.max_hours_per_month_non_shift;
        if (config.max_hours_per_month_shift !== undefined) flatConfig.max_hours_per_month_shift = config.max_hours_per_month_shift;

        if (config.normal_day) {
            flatConfig.normal_day_first_hour_multiplier = config.normal_day.first_hour_multiplier;
            flatConfig.normal_day_subsequent_hours_multiplier = config.normal_day.subsequent_hours_multiplier;
        }
        if (config.non_shift) {
            flatConfig.non_shift_first_eight_hours_multiplier = config.non_shift.first_eight_hours_multiplier;
            flatConfig.non_shift_ninth_hour_multiplier = config.non_shift.ninth_hour_multiplier;
            flatConfig.non_shift_tenth_to_twelfth_hour_multiplier = config.non_shift.tenth_to_twelfth_hour_multiplier;
        }
        if (config.shift) {
            flatConfig.shift_first_seven_hours_multiplier = config.shift.first_seven_hours_multiplier;
            flatConfig.shift_eighth_hour_multiplier = config.shift.eighth_hour_multiplier;
            flatConfig.shift_ninth_to_eleventh_hour_multiplier = config.shift.ninth_to_eleventh_hour_multiplier;
        }

        const { data: savedFlatData, error } = await supabase
            .from('overtime_configuration')
            .upsert(flatConfig)
            .select()
            .single();

        handleSupabaseError({ data: savedFlatData, error }, 'saveOvertimeConfiguration');

        // Transform back to nested structure to match the return type
        return {
            id: savedFlatData.id,
            hourly_wage_divider: savedFlatData.hourly_wage_divider,
            max_hours_per_day: savedFlatData.max_hours_per_day,
            max_hours_per_month_non_shift: savedFlatData.max_hours_per_month_non_shift,
            max_hours_per_month_shift: savedFlatData.max_hours_per_month_shift,
            normal_day: {
                first_hour_multiplier: savedFlatData.normal_day_first_hour_multiplier,
                subsequent_hours_multiplier: savedFlatData.normal_day_subsequent_hours_multiplier,
            },
            non_shift: {
                first_eight_hours_multiplier: savedFlatData.non_shift_first_eight_hours_multiplier,
                ninth_hour_multiplier: savedFlatData.non_shift_ninth_hour_multiplier,
                tenth_to_twelfth_hour_multiplier: savedFlatData.non_shift_tenth_to_twelfth_hour_multiplier,
            },
            shift: {
                first_seven_hours_multiplier: savedFlatData.shift_first_seven_hours_multiplier,
                eighth_hour_multiplier: savedFlatData.shift_eighth_hour_multiplier,
                ninth_to_eleventh_hour_multiplier: savedFlatData.shift_ninth_to_eleventh_hour_multiplier,
            },
        };
    },
};

// Export individual functions for granular imports
export const {
    getNotificationPreferences,
    updateNotificationPreferences,
    updateTelegramChatId,
    getShifts,
    saveShift,
    deleteShift,
    getOrganizationStructure,
    saveDepartment,
    deleteDepartment,
    saveBureau,
    deleteBureau,
    saveSection,
    deleteSection,
    getLeaveTypes,
    saveLeaveType,
    deleteLeaveType,
    getHolidays,
    saveHoliday,
    deleteHoliday,
    getOvertimeConfiguration,
    saveOvertimeConfiguration,
} = configService;
