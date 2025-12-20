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
} = requestsService;
