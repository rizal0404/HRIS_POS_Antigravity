import { supabase } from '../supabase';
import {
    Request,
    RequestStatus,
    RequestType,
    JadwalKerjaTim,
} from '../../types';
import { handleSupabaseError } from '../helpers';

// ==== REQUESTS SERVICE ====

export const requestsService = {
    async getSubordinateRequests(subordinateIds: string[]): Promise<Request[]> {
        if (subordinateIds.length === 0) return [];
        const { data, error } = await supabase
            .from('requests')
            .select('*, profiles:profile_id!inner(full_name)')
            .in('profile_id', subordinateIds)
            .order('created_at', { ascending: false });
        return handleSupabaseError({ data, error }, 'getSubordinateRequests');
    },

    async getAllRequests(limit: number = 200): Promise<Request[]> {
        const { data, error } = await supabase
            .from('requests')
            .select('id, profile_id, request_type, status, start_date, end_date, created_at, approver_id')
            .order('created_at', { ascending: false })
            .limit(limit);
        return handleSupabaseError({ data, error }, 'getAllRequests');
    },

    async submitRequest(requestData: Omit<Request, 'id' | 'created_at' | 'status'>): Promise<Request> {
        const { data, error } = await supabase
            .from('requests')
            .insert([{ ...requestData, status: 'pending' }])
            .select()
            .single();

        // Handle duplicate constraint violation (PostgreSQL error code 23505)
        if (error?.code === '23505') {
            throw new Error('DUPLICATE_REQUEST');
        }

        return handleSupabaseError({ data, error }, 'submitRequest');
    },

    async updateRequestStatus(requestId: string, newStatus: RequestStatus, approverId: string): Promise<Request> {
        // First, fetch the request to check its type
        const { data: existingRequest, error: fetchError } = await supabase
            .from('requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (fetchError) throw new Error('Failed to fetch request: ' + fetchError.message);

        console.log('[updateRequestStatus] Existing request:', {
            id: existingRequest.id,
            request_type: existingRequest.request_type,
            newStatus,
            isSubstitusi: existingRequest.request_type === 'Substitusi',
            isApproved: newStatus === RequestStatus.APPROVED,
        });

        // Update the request status
        const { data, error } = await supabase
            .from('requests')
            .update({ status: newStatus, approver_id: approverId, updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single();

        const updatedRequest = handleSupabaseError({ data, error }, 'updateRequestStatus');

        // If this is a SUBSTITUSI request being APPROVED, update work_schedules
        // Using string comparison to avoid enum mismatch issues
        const isSubstitusi = existingRequest.request_type === 'Substitusi' ||
            existingRequest.request_type === RequestType.SUBSTITUSI;
        const isApproved = newStatus === RequestStatus.APPROVED || newStatus === 'approved';

        console.log('[updateRequestStatus] Check for work_schedules update:', { isSubstitusi, isApproved });

        if (isSubstitusi && isApproved) {
            try {
                // Parse the reason to get the new shift code
                console.log('[updateRequestStatus] Raw reason:', existingRequest.reason);
                const reasonData = JSON.parse(existingRequest.reason || '{}');
                console.log('[updateRequestStatus] Parsed reason:', reasonData);

                const newShiftCode = reasonData?.shift_baru?.code || reasonData?.shift_baru || '';
                console.log('[updateRequestStatus] New shift code:', newShiftCode);

                if (newShiftCode) {
                    // Update work_schedules for all dates in the range
                    // Use simple string dates to avoid timezone issues
                    const startDateStr = existingRequest.start_date.split('T')[0]; // Get just YYYY-MM-DD
                    const endDateStr = existingRequest.end_date.split('T')[0];

                    console.log(`[updateRequestStatus] Processing dates from ${startDateStr} to ${endDateStr}`);

                    const startDate = new Date(startDateStr + 'T12:00:00'); // Use noon to avoid timezone issues
                    const endDate = new Date(endDateStr + 'T12:00:00');

                    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                        console.log(`[updateRequestStatus] Upserting work_schedule for ${dateStr}`);

                        // Upsert the work_schedule (insert if not exists, update if exists)
                        const { error: upsertError } = await supabase
                            .from('work_schedules')
                            .upsert({
                                profile_id: existingRequest.profile_id,
                                date: dateStr,
                                shift_code: newShiftCode,
                            }, {
                                onConflict: 'profile_id,date'
                            });

                        if (upsertError) {
                            console.error(`[updateRequestStatus] Failed to upsert work_schedule for ${dateStr}:`, upsertError);
                        } else {
                            console.log(`[updateRequestStatus] Successfully upserted work_schedule for ${dateStr}`);
                        }
                    }
                    console.log(`[Substitusi Approved] Completed work_schedules update for ${existingRequest.profile_id}`);
                } else {
                    console.warn('[updateRequestStatus] No shift_baru found in reason, skipping work_schedules update');
                }
            } catch (e) {
                console.error('[updateRequestStatus] Failed to update work_schedules for approved substitution:', e);
                // Don't throw - the request status update was successful
            }
        }

        return updatedRequest;
    },

    async getRequestsForUser(profileId: string, limit: number = 5): Promise<Request[]> {
        const { data, error } = await supabase
            .from('requests')
            .select('*')
            .eq('profile_id', profileId)
            .order('created_at', { ascending: false })
            .limit(limit);
        return handleSupabaseError({ data, error }, 'getRequestsForUser');
    },

    async getRequestPrerequisites(profileId: string, startDate: string, endDate: string): Promise<{ schedules: JadwalKerjaTim[], requests: Request[] }> {
        const [schedulesRes, requestsRes] = await Promise.all([
            supabase.from('work_schedules').select('*').eq('profile_id', profileId).gte('date', startDate).lte('date', endDate),
            supabase.from('requests').select('*').eq('profile_id', profileId)
                .lte('start_date', endDate)
                .gte('end_date', startDate)
        ]);

        const schedules = handleSupabaseError(schedulesRes, 'getRequestPrerequisites schedules');
        const requests = handleSupabaseError(requestsRes, 'getRequestPrerequisites requests');

        const mappedSchedules = schedules.map((s: any) => ({
            profile_id: s.profile_id,
            date: s.date,
            shift: s.shift_code,
        }));

        return { schedules: mappedSchedules, requests };
    },

    async getApprovedLeaves(profileId: string, date: string): Promise<Request[]> {
        const { data, error } = await supabase
            .from('requests')
            .select('*')
            .eq('profile_id', profileId)
            .eq('request_type', RequestType.CUTI)
            .eq('status', RequestStatus.APPROVED)
            .lte('start_date', date)
            .gte('end_date', date);
        return handleSupabaseError({ data, error }, 'getApprovedLeaves');
    },

    async getRequestUpdatesForUser(profileId: string): Promise<Request[]> {
        const { data, error } = await supabase
            .from('requests')
            .select('*, approvers:approver_id(full_name)')
            .eq('profile_id', profileId)
            .in('status', [RequestStatus.APPROVED, RequestStatus.REJECTED])
            .order('created_at', { ascending: false })
            .limit(10);
        return handleSupabaseError({ data, error }, 'getRequestUpdatesForUser');
    },

    async reviseRequest(requestId: string, approverId: string, notes: string): Promise<Request> {
        // Update the request status to REVISION and add notes
        const { data, error } = await supabase
            .from('requests')
            .update({
                status: RequestStatus.REVISION,
                approver_id: approverId,
                approver_notes: notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId)
            .select()
            .single();

        return handleSupabaseError({ data, error }, 'reviseRequest');
    },

    /**
     * Assign a leave or overtime request for a subordinate (manager-initiated).
     * This creates a request on behalf of the subordinate and can auto-approve it.
     */
    async assignRequestForSubordinate(params: {
        managerId: string;
        subordinateId: string;
        requestType: 'Cuti' | 'Lembur';
        startDate: string;
        endDate: string;
        reason: string;
        // For overtime
        startTime?: string;
        endTime?: string;
        // Auto-approve settings
        autoApprove?: boolean;
    }): Promise<Request> {
        const {
            managerId,
            subordinateId,
            requestType,
            startDate,
            endDate,
            reason,
            startTime,
            endTime,
            autoApprove = true,
        } = params;

        // Create the request with manager assignment tracking
        const requestData: any = {
            profile_id: subordinateId,
            request_type: requestType,
            start_date: startDate,
            end_date: endDate,
            reason: reason,
            status: autoApprove ? 'approved' : 'pending',
            approver_id: autoApprove ? managerId : null,
            is_manager_assigned: true,
            assigned_by_id: managerId,
        };

        // Add overtime-specific fields
        if (requestType === 'Lembur' && startTime && endTime) {
            requestData.start_time = startTime;
            requestData.end_time = endTime;
        }

        const { data, error } = await supabase
            .from('requests')
            .insert([requestData])
            .select()
            .single();

        // Handle duplicate constraint violation
        if (error?.code === '23505') {
            throw new Error('DUPLICATE_REQUEST');
        }

        const createdRequest = handleSupabaseError({ data, error }, 'assignRequestForSubordinate');

        // If auto-approved and it's a leave request, deduct leave balance
        if (autoApprove && requestType === 'Cuti') {
            await this.deductLeaveBalance(subordinateId, startDate, endDate);
        }

        // Send notification to subordinate
        await this.notifySubordinateOfAssignment(subordinateId, managerId, requestType, startDate, endDate);

        return createdRequest;
    },

    /**
     * Deduct leave balance for a subordinate based on working days in the date range.
     * Note: Leave balance tracking is not yet implemented in profiles table.
     */
    async deductLeaveBalance(subordinateId: string, startDate: string, endDate: string): Promise<void> {
        // Get work schedules to calculate actual working days
        const { data: schedules, error: scheduleError } = await supabase
            .from('work_schedules')
            .select('date, shift_code')
            .eq('profile_id', subordinateId)
            .gte('date', startDate)
            .lte('date', endDate);

        if (scheduleError) {
            console.error('[deductLeaveBalance] Failed to fetch schedules:', scheduleError);
            return;
        }

        // Count working days (days with shift != 'OFF')
        const workingDays = (schedules || []).filter(s => s.shift_code && s.shift_code !== 'OFF').length;

        // Log the deduction (leave balance column not yet implemented in profiles)
        console.log(`[deductLeaveBalance] Would deduct ${workingDays} working days for ${subordinateId} (${startDate} to ${endDate})`);

        // TODO: Implement leave balance tracking when annual_leave_balance column is added to profiles
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
            // Get manager name
            const { data: manager } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', managerId)
                .single();

            const managerName = manager?.full_name || 'Atasan';
            const dateRange = startDate === endDate ? startDate : `${startDate} s/d ${endDate}`;

            // Insert notification
            await supabase.from('notifications').insert({
                profile_id: subordinateId,
                title: `${requestType} Ditetapkan oleh ${managerName}`,
                message: `Atasan Anda telah menetapkan ${requestType.toLowerCase()} untuk tanggal ${dateRange}.`,
                type: 'request_assigned',
                is_read: false,
            });
        } catch (err) {
            console.error('[notifySubordinateOfAssignment] Failed to send notification:', err);
            // Don't throw - notification failure shouldn't block the main operation
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

        // Get all subordinates of this manager
        const { data: subordinates, error: subError } = await supabase
            .from('profiles')
            .select('id, full_name, nik')
            .eq('manager_id', managerId);

        if (subError || !subordinates || subordinates.length === 0) {
            return [];
        }

        const subordinateIds = subordinates.map(s => s.id);

        // Get their schedules for the date
        const { data: schedules } = await supabase
            .from('work_schedules')
            .select('profile_id, shift_code')
            .in('profile_id', subordinateIds)
            .eq('date', targetDate);

        // Get their attendance for the date
        const { data: attendances } = await supabase
            .from('attendance')
            .select('profile_id')
            .in('profile_id', subordinateIds)
            .eq('work_date', targetDate);

        // Get approved leave requests for the date
        const { data: approvedLeaves } = await supabase
            .from('requests')
            .select('profile_id')
            .in('profile_id', subordinateIds)
            .in('request_type', [RequestType.CUTI, RequestType.SAKIT])
            .eq('status', RequestStatus.APPROVED)
            .lte('start_date', targetDate)
            .gte('end_date', targetDate);

        const scheduleMap = new Map((schedules || []).map(s => [s.profile_id, s.shift_code]));
        const attendedIds = new Set((attendances || []).map(a => a.profile_id));
        const onLeaveIds = new Set((approvedLeaves || []).map(l => l.profile_id));

        const missing: {
            subordinate: { id: string; full_name: string; nik: string | null };
            scheduled_shift: string | null;
            missing_date: string;
        }[] = [];

        for (const sub of subordinates) {
            const schedule = scheduleMap.get(sub.id);
            // Skip if: already attended, on approved leave, or not scheduled to work (OFF or no schedule)
            if (attendedIds.has(sub.id) || onLeaveIds.has(sub.id)) continue;
            if (!schedule || schedule === 'OFF') continue;

            missing.push({
                subordinate: { id: sub.id, full_name: sub.full_name, nik: sub.nik },
                scheduled_shift: schedule,
                missing_date: targetDate,
            });
        }

        return missing;
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

