import api from '../apiClient';
import {
    Request,
    Attendance,
    RequestStatus,
    RequestType,
} from '../../types';

// ==== REPORTS SERVICE ====

export const reportsService = {
    async getAttendanceForSubordinates(profileIds: string[], startDate: string, endDate: string): Promise<Attendance[]> {
        if (profileIds.length === 0) return [];
        return api.post<Attendance[]>('/api/reports/attendance', {
            profile_ids: profileIds,
            start_date: startDate,
            end_date: endDate,
        });
    },

    async getOvertimeRequestsForSubordinates(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        return api.post<Request[]>('/api/reports/overtime-requests', {
            profile_ids: profileIds,
            start_date: startDate,
            end_date: endDate,
        });
    },

    async getLeaveRequestsForSubordinates(profileIds: string[], year: number): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        return api.post<Request[]>('/api/reports/leave-requests', {
            profile_ids: profileIds,
            year,
        });
    },

    async getCorrectionRequestsForSubordinates(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        return api.post<Request[]>('/api/reports/correction-requests', {
            profile_ids: profileIds,
            start_date: startDate,
            end_date: endDate,
        });
    },

    async getOtherApprovedRequestsForPeriod(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        return api.post<Request[]>('/api/reports/approved-requests', {
            profile_ids: profileIds,
            start_date: startDate,
            end_date: endDate,
        });
    },

    async getApprovedSubstitutionRequests(profileIds: string[], startDate: string, endDate: string): Promise<Request[]> {
        if (profileIds.length === 0) return [];
        return api.post<Request[]>('/api/reports/substitution-requests', {
            profile_ids: profileIds,
            start_date: startDate,
            end_date: endDate,
        });
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
