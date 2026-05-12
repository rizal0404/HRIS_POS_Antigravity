import api from '../apiClient';
import {
    Request,
    RequestStatus,
    RequestType,
    JadwalKerjaTim,
} from '../../types';

// ==== REQUESTS SERVICE ====

export const requestsService = {
    async getSubordinateRequests(subordinateIds: string[]): Promise<Request[]> {
        if (subordinateIds.length === 0) return [];
        return api.post<Request[]>('/api/requests/subordinates', { profile_ids: subordinateIds });
    },

    async getAllRequests(limit: number = 200): Promise<Request[]> {
        return api.get<Request[]>('/api/requests', { limit });
    },

    async submitRequest(requestData: Omit<Request, 'id' | 'created_at' | 'status'>): Promise<Request> {
        return api.post<Request>('/api/requests', { ...requestData, status: 'pending' });
    },

    async updateRequestStatus(requestId: string, newStatus: RequestStatus, approverId: string): Promise<Request> {
        return api.patch<Request>(`/api/requests/${requestId}/status`, {
            status: newStatus,
            approver_id: approverId,
        });
    },

    async getRequestsForUser(profileId: string, limit: number = 5): Promise<Request[]> {
        return api.get<Request[]>(`/api/requests/user/${profileId}`, { limit });
    },

    async getRequestPrerequisites(profileId: string, startDate: string, endDate: string): Promise<{ schedules: JadwalKerjaTim[], requests: Request[] }> {
        return api.get<{ schedules: JadwalKerjaTim[], requests: Request[] }>(
            '/api/requests/prerequisites',
            { profile_id: profileId, start_date: startDate, end_date: endDate }
        );
    },

    async getApprovedLeaves(profileId: string, date: string): Promise<Request[]> {
        return api.get<Request[]>('/api/requests/approved-leaves', {
            profile_id: profileId,
            date,
        });
    },

    async getRequestUpdatesForUser(profileId: string): Promise<Request[]> {
        return api.get<Request[]>(`/api/requests/user/${profileId}/updates`);
    },

    async reviseRequest(requestId: string, approverId: string, notes: string): Promise<Request> {
        return api.patch<Request>(`/api/requests/${requestId}/revise`, {
            approver_id: approverId,
            approver_notes: notes,
        });
    },

    /**
     * Assign a leave or overtime request for a subordinate (manager-initiated).
     */
    async assignRequestForSubordinate(params: {
        managerId: string;
        subordinateId: string;
        requestType: 'Cuti' | 'Lembur';
        startDate: string;
        endDate: string;
        reason: string;
        startTime?: string;
        endTime?: string;
        autoApprove?: boolean;
    }): Promise<Request> {
        return api.post<Request>('/api/requests/assign', params);
    },

    /**
     * Deduct leave balance for a subordinate based on working days in the date range.
     */
    async deductLeaveBalance(subordinateId: string, startDate: string, endDate: string): Promise<void> {
        console.log(`[deductLeaveBalance] Requesting deduction for ${subordinateId} (${startDate} to ${endDate})`);
        await api.post('/api/requests/deduct-leave', {
            profile_id: subordinateId,
            start_date: startDate,
            end_date: endDate,
        });
    },

    /**
     * Send notification to subordinate about manager-assigned request.
     */
    async notifySubordinateOfAssignment(
        subordinateId: string,
        managerId: string,
        requestType: string,
        startDate: string,
        endDate: string
    ): Promise<void> {
        try {
            await api.post('/api/notifications/assignment', {
                subordinate_id: subordinateId,
                manager_id: managerId,
                request_type: requestType,
                start_date: startDate,
                end_date: endDate,
            });
        } catch (err) {
            console.error('[notifySubordinateOfAssignment] Failed to send notification:', err);
        }
    },

    /**
     * Get subordinates who have no attendance record on a specific work date.
     */
    async getSubordinatesMissingAttendance(managerId: string, date?: string): Promise<{
        subordinate: { id: string; full_name: string; nik: string | null };
        scheduled_shift: string | null;
        missing_date: string;
    }[]> {
        const targetDate = date || new Date().toISOString().split('T')[0];
        return api.get('/api/manager/missing-attendance', {
            manager_id: managerId,
            date: targetDate,
        });
    },
};

// Export individual functions for granular imports
export const {
    getSubordinateRequests,
    getAllRequests,
    submitRequest,
    updateRequestStatus,
    getRequestsForUser,
    getRequestPrerequisites,
    getApprovedLeaves,
    getRequestUpdatesForUser,
    reviseRequest,
    assignRequestForSubordinate,
    deductLeaveBalance,
    notifySubordinateOfAssignment,
    getSubordinatesMissingAttendance,
} = requestsService;
