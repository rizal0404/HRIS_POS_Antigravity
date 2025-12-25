import { supabase } from '../supabase';
import { APP_TIME_OFFSET, APP_TIME_ZONE, formatDateKey } from '../../lib/utils';
import {
    UserProfile,
    Attendance,
    JadwalKerjaTim,
    AttendanceStatus,
    Request,
    RequestType,
    RequestStatus,
} from '../../types';
import { buildAttendanceWindow, computeAttendanceOutcome, CORRECTION_MAX_DAYS, deriveWorkDate, AttendanceLogData, GracePeriodConfig } from '../../lib/attendanceRules';
import { handleSupabaseError, getAddressFromCoords } from '../helpers';
import { disciplineService } from '../discipline';

// ==== ATTENDANCE SERVICE ====

export const attendanceService = {
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
        const result = handleSupabaseError({ data, error }, 'submitClockIn');

        // Trigger discipline score refresh asynchronously (fire-and-forget)
        if (result.profile_id) {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            console.log('[Discipline] Triggering score refresh after clock-in:', { profile_id: result.profile_id, month, year });
            disciplineService.refreshDisciplineScore(result.profile_id, month, year)
                .then(score => console.log('[Discipline] Score refresh result:', score))
                .catch(err => console.error('[Discipline] Score refresh FAILED:', err));
        }

        return result;
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
            p_catatan: updateData.catatan ?? null,
            p_attendance_flags: updateData.attendance_flags ?? null,
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

    async submitClockOut(attendanceId: string, clockOutData: Partial<Attendance> & { clock_out: string }, profileId?: string): Promise<Attendance> {
        const { data, error } = await supabase
            .from('attendance')
            .update(clockOutData)
            .eq('id', attendanceId)
            .select()
            .single();
        const result = handleSupabaseError({ data, error }, 'submitClockOut');

        // Trigger discipline score refresh asynchronously (fire-and-forget)
        const pId = profileId || result.profile_id;
        if (pId) {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            console.log('[Discipline] Triggering score refresh after clock-out:', { profile_id: pId, month, year });
            disciplineService.refreshDisciplineScore(pId, month, year)
                .then(score => console.log('[Discipline] Score refresh result:', score))
                .catch(err => console.error('[Discipline] Score refresh FAILED:', err));
        }

        return result;
    },

    async submitClockEvent(user: UserProfile, actionType: 'in' | 'out', payload: any): Promise<Attendance> {
        const { position, workLocationType, workplace, targetSchedule, shiftMeta, activeAttendance, attendanceFlags, notes } = payload;

        if (!position) {
            throw new Error('Data lokasi tidak tersedia.');
        }

        const scheduleForAction: JadwalKerjaTim | undefined = targetSchedule || payload.todaySchedule || undefined;
        const now = new Date();
        const address = await getAddressFromCoords(position.coords.latitude, position.coords.longitude);

        // Prepare flags array for database storage
        const flags: string[] = attendanceFlags && attendanceFlags.length > 0 ? attendanceFlags : [];

        if (actionType === 'in') {
            const window = buildAttendanceWindow(scheduleForAction, shiftMeta || null);
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
                catatan: notes || undefined,
                // Store attendance flags in dedicated column
                attendance_flags: flags.length > 0 ? flags : undefined,
            };
            return this.submitClockIn(clockInData);
        } else { // 'out'
            const openAttendance = activeAttendance || await this.getActiveAttendance(user.id);
            if (!openAttendance) {
                throw new Error("Clock-out gagal: Tidak ada sesi absensi aktif. Mungkin Anda sudah clock-out atau sesi kerja dari hari sebelumnya telah berakhir.");
            }

            const window = buildAttendanceWindow(scheduleForAction, shiftMeta || null);
            if (new Date(openAttendance.clock_in) > now) {
                throw new Error('Clock-out tidak boleh lebih awal dari clock-in.');
            }

            const workDate = deriveWorkDate(openAttendance, scheduleForAction, now);

            // Fetch grace period config from database using shift_code
            let graceConfig: GracePeriodConfig | null = null;
            try {
                // Get shift_code from schedule (e.g., 'STNS', 'S1', 'S2', 'S3')
                const shiftCode = scheduleForAction?.shift || null;

                // First, try to get config for this specific shift
                if (shiftCode) {
                    const { data: configData } = await supabase
                        .from('grace_period_config')
                        .select('shift_code, grace_minutes_in, grace_minutes_out')
                        .eq('shift_code', shiftCode)
                        .single();

                    if (configData) {
                        graceConfig = {
                            config_key: configData.shift_code || 'default',
                            grace_minutes_in: configData.grace_minutes_in,
                            grace_minutes_out: configData.grace_minutes_out,
                        };
                    }
                }

                // If no specific config found, get default config
                if (!graceConfig) {
                    const { data: defaultConfig } = await supabase
                        .from('grace_period_config')
                        .select('shift_code, grace_minutes_in, grace_minutes_out')
                        .eq('is_default', true)
                        .single();

                    if (defaultConfig) {
                        graceConfig = {
                            config_key: 'default',
                            grace_minutes_in: defaultConfig.grace_minutes_in,
                            grace_minutes_out: defaultConfig.grace_minutes_out,
                        };
                    }
                }
            } catch (err) {
                console.warn('[Attendance] Failed to fetch grace config, using code defaults:', err);
            }

            // Callback to log abnormal attendance cases to Supabase
            const logAbnormalToSupabase = async (logData: AttendanceLogData) => {
                try {
                    console.warn('[Attendance] Abnormal case detected:', logData.log_type);
                    await supabase.from('attendance_logs').insert({
                        attendance_id: openAttendance.id,
                        profile_id: user.id,
                        log_type: logData.log_type,
                        log_data: logData.log_data,
                    });
                } catch (err) {
                    console.error('[Attendance] Failed to log abnormal case:', err);
                }
            };

            const outcome = computeAttendanceOutcome({
                clockInISO: openAttendance.clock_in,
                clockOutISO: now.toISOString(),
                schedule: scheduleForAction,
                shiftMeta: shiftMeta || null,
                graceConfig: graceConfig,
                onAbnormalLog: logAbnormalToSupabase,
            });

            // Merge existing flags with new clock-out flags
            const existingFlags: string[] = openAttendance.attendance_flags || [];
            const mergedFlags = [...new Set([...existingFlags, ...flags])]; // Deduplicate

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
                // Update attendance flags with merged values
                attendance_flags: mergedFlags.length > 0 ? mergedFlags : undefined,
                // Add clock-out notes if provided
                catatan: notes ? (openAttendance.catatan ? `${openAttendance.catatan} | ${notes}` : notes) : openAttendance.catatan,
            };
            return this.submitClockOut(openAttendance.id, clockOutData, user.id);
        }
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

    async addPembetulanPresensi(payload: {
        user: UserProfile;
        tanggalPembetulan: string;
        jamPembetulan: string;
        clockType: 'in' | 'out';
        alasan: string;
        todayAttendanceId?: string;
    }, submitRequest: (data: any) => Promise<Request>): Promise<Request> {
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

        return submitRequest(requestData);
    },
};

// Export individual functions for granular imports
export const {
    getActiveAttendance,
    getAttendanceById,
    submitClockIn,
    createAttendanceForSubordinate,
    updateAttendanceAsManager,
    submitClockOut,
    submitClockEvent,
    getHistory,
    updateAttendance,
    addPembetulanPresensi,
} = attendanceService;
