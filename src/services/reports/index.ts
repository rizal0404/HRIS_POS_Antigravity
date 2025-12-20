import { supabase } from '../supabase';
import {
    Request,
    Attendance,
    RequestStatus,
    RequestType,
} from '../../types';
import { handleSupabaseError } from '../helpers';

// ==== REPORTS SERVICE ====

export const reportsService = {
    async getAttendanceForSubordinates(profileIds: string[], startDate: string, endDate: string): Promise<Attendance[]> {
        if (profileIds.length === 0) return [];
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .in('profile_id', profileIds)
            // This OR clause ensures we catch records where either the clock_in or clock_out falls within the date range.
            // It's crucial for including night shifts that cross over month boundaries and for reflecting clock-out corrections accurately.
            .or(`and(clock_in.gte.${startDate},clock_in.lte.${endDate}),and(clock_out.gte.${startDate},clock_out.lte.${endDate})`)
            .order('clock_in', { ascending: true });
        return handleSupabaseError({ data, error }, 'getAttendanceForSubordinates');
    },

    async getOvertimeRequestsForSubordinates(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        const { data, error } = await supabase
            .from('requests')
            .select('*, profiles:profile_id!inner(full_name, nik), approvers:approver_id(full_name)')
            .in('profile_id', profileIds)
            .eq('request_type', RequestType.LEMBUR)
            .eq('status', RequestStatus.APPROVED)
            .gte('start_date', startDate)
            .lte('start_date', endDate)
            .order('start_date', { ascending: true });
        return handleSupabaseError({ data, error }, 'getOvertimeRequestsForSubordinates');
    },

    async getLeaveRequestsForSubordinates(profileIds: string[], year: number): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        const { data, error } = await supabase
            .from('requests')
            .select('*, profiles:profile_id!inner(full_name)')
            .in('profile_id', profileIds)
            .eq('status', RequestStatus.APPROVED)
            .gte('start_date', startDate)
            .lte('start_date', endDate);
        return handleSupabaseError({ data, error }, 'getLeaveRequestsForSubordinates');
    },

    async getCorrectionRequestsForSubordinates(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        const { data, error } = await supabase
            .from('requests')
            .select('*, approvers:approver_id(full_name)')
            .in('profile_id', profileIds)
            .eq('request_type', RequestType.KOREKSI)
            .eq('status', RequestStatus.APPROVED)
            .gte('start_date', startDate)
            .lte('start_date', endDate);
        return handleSupabaseError({ data, error }, 'getCorrectionRequestsForSubordinates');
    },

    async getOtherApprovedRequestsForPeriod(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        const { data, error } = await supabase
            .from('requests')
            .select('*, approvers:approver_id(full_name)')
            .in('profile_id', profileIds)
            .eq('status', RequestStatus.APPROVED)
            .in('request_type', [RequestType.CUTI, RequestType.IZIN, RequestType.SAKIT])
            .lte('start_date', endDate) // Request starts on or before the period ends
            .gte('end_date', startDate);  // Request ends on or after the period starts
        return handleSupabaseError({ data, error }, 'getOtherApprovedRequestsForPeriod');
    },

    async getApprovedSubstitutionRequests(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        const { data, error } = await supabase
            .from('requests')
            .select('*, approvers:approver_id(full_name)')
            .in('profile_id', profileIds)
            .eq('request_type', RequestType.SUBSTITUSI)
            .eq('status', RequestStatus.APPROVED)
            .lte('start_date', endDate)
            .gte('end_date', startDate);
        return handleSupabaseError({ data, error }, 'getApprovedSubstitutionRequests');
    },
};

// Export individual functions for granular imports
export const {
    getAttendanceForSubordinates,
    getOvertimeRequestsForSubordinates,
    getLeaveRequestsForSubordinates,
    getCorrectionRequestsForSubordinates,
    getOtherApprovedRequestsForPeriod,
    getApprovedSubstitutionRequests,
} = reportsService;
