import api from '../apiClient';
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
import { getAddressFromCoords } from '../helpers';
import { disciplineService } from '../discipline';

// ==== ATTENDANCE SERVICE ====

export const attendanceService = {
    async getActiveAttendance(profileId: string): Promise<Attendance | null> {
        try {
            const data = await api.get<Attendance | Attendance[]>(`/api/attendance/active/${profileId}`);
            if (Array.isArray(data)) return data[0] || null;
            return data || null;
        } catch {
            return null;
        }
    },

    async getAttendanceById(attendanceId: string): Promise<Attendance | null> {
        try {
            return await api.get<Attendance>(`/api/attendance/${attendanceId}`);
        } catch {
            return null;
        }
    },

    async submitClockIn(attendanceData: Partial<Attendance>): Promise<Attendance> {
        const payload: Partial<Attendance> = { ...attendanceData };
        if (!payload.work_date && payload.clock_in) {
            payload.work_date = formatDateKey(new Date(payload.clock_in), APP_TIME_ZONE);
        }

        const result = await api.post<Attendance>('/api/attendance/clock-in', payload);

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
        if (!attendanceData.profile_id || !attendanceData.clock_in) {
            throw new Error('Profile ID and Clock In time are required to create attendance for a subordinate.');
        }
        const workDate = attendanceData.work_date || formatDateKey(new Date(attendanceData.clock_in), APP_TIME_ZONE);

        const result = await api.post<Attendance | Attendance[]>('/api/attendance/manager/create', {
            profile_id: attendanceData.profile_id,
            clock_in: attendanceData.clock_in,
            work_date: workDate,
            status: attendanceData.status || AttendanceStatus.IN_PROGRESS,
            lokasi_kerja: attendanceData.lokasi_kerja || null,
            tempat_kerja: attendanceData.tempat_kerja || null,
            clock_in_coords: attendanceData.clock_in_coords || null,
            clock_in_address: attendanceData.clock_in_address || null,
        });

        return Array.isArray(result) ? result[0] : result;
    },

    async updateAttendanceAsManager(attendanceId: string, updateData: Partial<Attendance>): Promise<Attendance> {
        const result = await api.put<Attendance | Attendance[]>(`/api/attendance/manager/${attendanceId}`, updateData);
        return Array.isArray(result) ? result[0] : result;
    },

    async submitClockOut(attendanceId: string, clockOutData: Partial<Attendance> & { clock_out: string }, profileId?: string): Promise<Attendance> {
        const result = await api.put<Attendance>(`/api/attendance/clock-out/${attendanceId}`, clockOutData);

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

            // Fetch grace period config from API
            let graceConfig: GracePeriodConfig | null = null;
            try {
                const shiftCode = scheduleForAction?.shift || null;
                if (shiftCode) {
                    try {
                        const configData = await api.get<any>(`/api/schedules/grace-config/${shiftCode}`);
                        if (configData) {
                            graceConfig = {
                                config_key: configData.shift_code || 'default',
                                grace_minutes_in: configData.grace_minutes_in,
                                grace_minutes_out: configData.grace_minutes_out,
                            };
                        }
                    } catch { /* fall through to default */ }
                }

                if (!graceConfig) {
                    try {
                        const defaultConfig = await api.get<any>('/api/schedules/grace-config/default');
                        if (defaultConfig) {
                            graceConfig = {
                                config_key: 'default',
                                grace_minutes_in: defaultConfig.grace_minutes_in,
                                grace_minutes_out: defaultConfig.grace_minutes_out,
                            };
                        }
                    } catch { /* use code defaults */ }
                }
            } catch (err) {
                console.warn('[Attendance] Failed to fetch grace config, using code defaults:', err);
            }

            // Callback to log abnormal attendance cases
            const logAbnormal = async (logData: AttendanceLogData) => {
                try {
                    console.warn('[Attendance] Abnormal case detected:', logData.log_type);
                    await api.post('/api/attendance/logs', {
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
                onAbnormalLog: logAbnormal,
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
                attendance_flags: mergedFlags.length > 0 ? mergedFlags : undefined,
                catatan: notes ? (openAttendance.catatan ? `${openAttendance.catatan} | ${notes}` : notes) : openAttendance.catatan,
            };
            return this.submitClockOut(openAttendance.id, clockOutData, user.id);
        }
    },

    async getHistory(profileId: string): Promise<{ requests: Request[], attendance: Attendance[] }> {
        return api.get<{ requests: Request[], attendance: Attendance[] }>(`/api/attendance/history/${profileId}`);
    },

    async updateAttendance(attendanceId: string, updateData: Partial<Attendance>): Promise<Attendance> {
        return api.patch<Attendance>(`/api/attendance/${attendanceId}`, updateData);
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

        // Check for pending corrections via API
        const pendingCheck = await api.get<any[]>('/api/requests/check-pending-correction', {
            profile_id: user.id,
            date: tanggalPembetulan,
        });

        if (pendingCheck && pendingCheck.length > 0) {
            throw new Error('Sudah ada ajuan koreksi yang masih pending untuk tanggal tersebut.');
        }

        // Create a definitive UTC timestamp for the intended correction time using fixed WITA offset
        const intendedDateTime = new Date(`${tanggalPembetulan}T${jamPembetulan}${APP_TIME_OFFSET}`);

        const reasonPayload = JSON.stringify({
            type: clockType,
            reason: `Absen dari lokasi 'Lainnya': ${alasan}`,
            intended_iso: intendedDateTime.toISOString(),
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
