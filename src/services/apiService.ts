import { supabase } from './supabase';
import { APP_TIME_OFFSET, APP_TIME_ZONE, formatDateKey } from '../lib/utils';
import { 
    UserProfile, 
    Request, 
    Attendance, 
    RequestStatus, 
    JadwalKerjaTim,
    Shift,
    Department,
    Bureau,
    Section,
    LeaveType,
    Holiday,
    OvertimeConfiguration,
    RequestType,
    NotificationPreferences,
    AttendanceStatus,
} from '../types';
import { buildAttendanceWindow, computeAttendanceOutcome, CORRECTION_MAX_DAYS, deriveWorkDate, validateClockWindow } from '../lib/attendanceRules';

// Helper untuk penanganan error yang konsisten
const handleSupabaseError = ({ error, data }: { error: any, data: any }, context: string) => {
    if (error) {
        console.error(`Supabase error in ${context}:`, error);
        throw new Error(error.message || `An unknown database error occurred in ${context}.`);
    }
    return data;
};

// Helper for reverse geocoding using Nominatim
async function getAddressFromCoords(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            console.warn(`Reverse geocoding request failed with status ${response.status}`);
            return `Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        }
        const data = await response.json();
        return data.display_name || `Koordinat: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (error) {
        console.error('Reverse geocoding failed:', error);
        return 'Nama lokasi gagal dimuat. Periksa koneksi internet Anda.';
    }
}

export const apiService = {
    // ==== ATTENDANCE ====
    async getActiveAttendance(profileId: string): Promise<Attendance | null> {
        const { data, error } = await supabase
            .rpc('get_active_attendance_for_user', {
                p_profile_id: profileId
            });

        if (error) {
            console.error('Error fetching active attendance via RPC:', error);
            throw new Error(`RPC 'get_active_attendance_for_user' failed. Details: ${JSON.stringify(error)}`);
        }

        return data?.[0] || null;
    },

    async getAttendanceById(attendanceId: string): Promise<Attendance | null> {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('id', attendanceId)
            .single();

        if (error) {
            if ((error as any).code === 'PGRST116') {
                return null;
            }
            throw new Error(error.message || 'Gagal memuat data presensi.');
        }
        return data || null;
    },

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

    async submitClockIn(attendanceData: Partial<Attendance>): Promise<Attendance> {
        const payload: Partial<Attendance> = { ...attendanceData };
        if (!payload.work_date && payload.clock_in) {
            payload.work_date = formatDateKey(new Date(payload.clock_in), APP_TIME_ZONE);
        }

        const { data, error } = await supabase
            .from('attendance')
            .insert([payload])
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'submitClockIn');
    },
    
    async createAttendanceForSubordinate(attendanceData: Partial<Attendance>): Promise<Attendance> {
        // This function calls an RPC that bypasses RLS after checking for manager permissions.
        if (!attendanceData.profile_id || !attendanceData.clock_in) {
            throw new Error('Profile ID and Clock In time are required to create attendance for a subordinate.');
        }
        const workDate = attendanceData.work_date || formatDateKey(new Date(attendanceData.clock_in), APP_TIME_ZONE);
        const { data, error } = await supabase.rpc('create_attendance_as_manager', {
            p_profile_id: attendanceData.profile_id,
            p_clock_in: attendanceData.clock_in,
            p_work_date: workDate,
            p_status: attendanceData.status || AttendanceStatus.IN_PROGRESS,
            p_lokasi_kerja: attendanceData.lokasi_kerja || null,
            p_tempat_kerja: attendanceData.tempat_kerja || null,
            p_clock_in_coords: attendanceData.clock_in_coords || null,
            p_clock_in_address: attendanceData.clock_in_address || null
        });

        if (error) {
            console.error('Error in createAttendanceForSubordinate RPC:', error);
            throw new Error(error.message || 'Failed to create attendance record via RPC.');
        }
        if (!data || data.length === 0) {
            throw new Error('RPC create_attendance_as_manager did not return the new record.');
        }
        return data[0];
    },

    async updateAttendanceAsManager(attendanceId: string, updateData: Partial<Attendance>): Promise<Attendance> {
        // Manager-safe path via RPC to avoid RLS blocks when updating subordinate records.
        const idValue = typeof attendanceId === 'string' && attendanceId.includes('-')
            ? attendanceId // likely UUID
            : Number(attendanceId);
        if (Number.isNaN(idValue as number)) {
            throw new Error('ID absensi tidak valid untuk koreksi.');
        }
        const { data, error } = await supabase.rpc('update_attendance_as_manager', {
            p_attendance_id: idValue,
            p_clock_in: updateData.clock_in ?? null,
            p_clock_out: updateData.clock_out ?? null,
            p_status: updateData.status ?? null,
            p_work_date: updateData.work_date ?? null,
            p_lokasi_kerja: updateData.lokasi_kerja ?? null,
            p_tempat_kerja: updateData.tempat_kerja ?? null,
            p_clock_in_coords: updateData.clock_in_coords ?? null,
            p_clock_out_coords: updateData.clock_out_coords ?? null,
            p_clock_in_address: updateData.clock_in_address ?? null,
            p_clock_out_address: updateData.clock_out_address ?? null,
            p_worked_minutes: updateData.worked_minutes ?? null,
            p_late_minutes: updateData.late_minutes ?? null,
            p_early_leave_minutes: updateData.early_leave_minutes ?? null,
            p_source: updateData.source ?? null,
        });
        if (error) {
            console.error('Error in updateAttendanceAsManager RPC:', error);
            throw new Error(error.message || 'Failed to update attendance via RPC.');
        }
        if (!data || data.length === 0) {
            throw new Error('RPC update_attendance_as_manager did not return the updated record.');
        }
        // Some Supabase RPCs return array of rows; normalize to single record.
        return Array.isArray(data) ? data[0] : data;
    },

    async submitClockOut(attendanceId: string, clockOutData: Partial<Attendance> & { clock_out: string }): Promise<Attendance> {
        const { data, error } = await supabase
            .from('attendance')
            .update(clockOutData)
            .eq('id', attendanceId)
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'submitClockOut');
    },
    
    async submitClockEvent(user: UserProfile, actionType: 'in' | 'out', payload: any): Promise<Attendance> {
        const { position, workLocationType, workplace, targetSchedule, shiftMeta, activeAttendance } = payload;

        if (!position) {
            throw new Error('Data lokasi tidak tersedia.');
        }

        const scheduleForAction: JadwalKerjaTim | undefined = targetSchedule || payload.todaySchedule || undefined;
        const now = new Date();
        const address = await getAddressFromCoords(position.coords.latitude, position.coords.longitude);

        if (actionType === 'in') {
            const window = buildAttendanceWindow(scheduleForAction, shiftMeta || null);
            const windowError = validateClockWindow('in', now, window);
            if (windowError) {
                throw new Error(windowError);
            }

            const workDate = window.workDate || formatDateKey(now, APP_TIME_ZONE);
            const clockInData: Partial<Attendance> = {
                profile_id: user.id,
                clock_in: now.toISOString(),
                work_date: workDate,
                status: AttendanceStatus.IN_PROGRESS,
                lokasi_kerja: workLocationType,
                tempat_kerja: workplace,
                clock_in_coords: { lat: position.coords.latitude, lon: position.coords.longitude },
                clock_in_address: address,
                source: 'MANUAL',
            };
            return this.submitClockIn(clockInData);
        } else { // 'out'
            const openAttendance = activeAttendance || await this.getActiveAttendance(user.id);
            if (!openAttendance) {
                throw new Error("Clock-out gagal: Tidak ada sesi absensi aktif. Mungkin Anda sudah clock-out atau sesi kerja dari hari sebelumnya telah berakhir.");
            }

            const window = buildAttendanceWindow(scheduleForAction, shiftMeta || null);
            const windowError = validateClockWindow('out', now, window);
            if (windowError) {
                throw new Error(windowError);
            }

            if (new Date(openAttendance.clock_in) > now) {
                throw new Error('Clock-out tidak boleh lebih awal dari clock-in.');
            }

            const workDate = deriveWorkDate(openAttendance, scheduleForAction, now);
            const outcome = computeAttendanceOutcome({
                clockInISO: openAttendance.clock_in,
                clockOutISO: now.toISOString(),
                schedule: scheduleForAction,
                shiftMeta: shiftMeta || null,
            });

            const clockOutData: Partial<Attendance> & { clock_out: string } = {
                clock_out: now.toISOString(),
                work_date: workDate,
                status: outcome.status,
                worked_minutes: outcome.workedMinutes,
                late_minutes: outcome.lateMinutes,
                early_leave_minutes: outcome.earlyLeaveMinutes,
                clock_out_coords: { lat: position.coords.latitude, lon: position.coords.longitude },
                clock_out_address: address,
                source: openAttendance.source || 'MANUAL',
            };
            return this.submitClockOut(openAttendance.id, clockOutData);
        }
    },
    
    async addPembetulanPresensi(payload: {
        user: UserProfile;
        tanggalPembetulan: string;
        jamPembetulan: string;
        clockType: 'in' | 'out';
        alasan: string;
        todayAttendanceId?: string; // To link 'Lainnya' clock-out to existing record
    }): Promise<Request> {
        const { user, tanggalPembetulan, jamPembetulan, clockType, alasan, todayAttendanceId } = payload;

        const today = new Date();
        const targetDate = new Date(`${tanggalPembetulan}T00:00:00${APP_TIME_OFFSET}`);
        const todayStart = new Date(formatDateKey(today, APP_TIME_ZONE) + `T00:00:00${APP_TIME_OFFSET}`);
        const dayDiff = Math.floor((todayStart.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff > CORRECTION_MAX_DAYS) {
            throw new Error(`Koreksi hanya boleh diajukan maksimal ${CORRECTION_MAX_DAYS} hari ke belakang.`);
        }

        const { data: pendingExisting, error: pendingError } = await supabase
            .from('requests')
            .select('id')
            .eq('profile_id', user.id)
            .eq('request_type', RequestType.KOREKSI)
            .eq('status', RequestStatus.PENDING)
            .eq('start_date', tanggalPembetulan)
            .limit(1);

        if (pendingError) {
            handleSupabaseError({ data: pendingExisting, error: pendingError }, 'checkPendingCorrections');
        }

        if (pendingExisting && pendingExisting.length > 0) {
            throw new Error('Sudah ada ajuan koreksi yang masih pending untuk tanggal tersebut.');
        }
        
        // Create a definitive UTC timestamp for the intended correction time using fixed WITA offset
        const intendedDateTime = new Date(`${tanggalPembetulan}T${jamPembetulan}${APP_TIME_OFFSET}`);

        const reasonPayload = JSON.stringify({
            type: clockType,
            reason: `Absen dari lokasi 'Lainnya': ${alasan}`,
            intended_iso: intendedDateTime.toISOString(), // Store unambiguous UTC time
        });

        const requestData: Omit<Request, 'id' | 'created_at' | 'status'> = {
            profile_id: user.id,
            request_type: RequestType.KOREKSI,
            start_date: tanggalPembetulan,
            end_date: tanggalPembetulan,
            start_time: jamPembetulan,
            reason: reasonPayload,
            approver_id: user.manager_id || undefined,
            attendance_id_to_correct: todayAttendanceId || undefined,
        };
        
        return this.submitRequest(requestData);
    },

    async getHistory(profileId: string): Promise<{ requests: Request[], attendance: Attendance[] }> {
        const [requestsRes, attendanceRes] = await Promise.all([
             supabase.from('requests').select('*').eq('profile_id', profileId),
             supabase.from('attendance').select('*').eq('profile_id', profileId)
        ]);
        
        const requests = handleSupabaseError(requestsRes, 'getHistory requests');
        const attendance = handleSupabaseError(attendanceRes, 'getHistory attendance');
        
        return { requests, attendance };
    },

    async updateAttendance(attendanceId: string, updateData: Partial<Attendance>): Promise<Attendance> {
        const { data, error } = await supabase
            .from('attendance')
            .update(updateData)
            .eq('id', attendanceId)
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'updateAttendance');
    },

    // ==== REQUESTS ====
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
        const { data, error } = await supabase
            .from('requests')
            .update({ status: newStatus, approver_id: approverId, updated_at: new Date().toISOString() })
            .eq('id', requestId)
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'updateRequestStatus');
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
    
    // ==== PROFILES / USERS ====
    async getProfiles(): Promise<UserProfile[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*');
        return handleSupabaseError({ data, error }, 'getProfiles');
    },

    async saveProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        // Destructure id and isManager (which is not a DB column) to exclude them from the update payload.
        const { id, isManager, ...updateData } = profileData;
        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'saveProfile');
    },

    async createProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
        const { data, error } = await supabase
            .from('profiles')
            .insert([profileData])
            .select()
            .single();
        return handleSupabaseError({ data, error }, 'createProfile');
    },
    
    async deleteUser(userId: string): Promise<void> {
        const { error } = await supabase.rpc('delete_user', { p_user_id: userId });
        if (error) {
            handleSupabaseError({ data: null, error }, 'deleteUser');
        }
    },
    
    // ==== SCHEDULES ====
    async getTeamSchedules(profileIds: string[], startDate?: string, endDate?: string): Promise<JadwalKerjaTim[]> {
        if(profileIds.length === 0) return [];
        
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
    
    // ==== CONFIGURATION / MASTER DATA ====

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

    // ==== REPORTING-SPECIFIC FUNCTIONS ====
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
