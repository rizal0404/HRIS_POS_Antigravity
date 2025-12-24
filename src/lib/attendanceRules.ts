import { APP_TIME_OFFSET, APP_TIME_ZONE, formatDateKey } from './utils';
import { Attendance, AttendanceStatus, JadwalKerjaTim, Shift } from '../types';

type WindowPreset = {
    graceMinutes: number;
    clockInWindow: [number, number]; // minutes offset from shift start
    clockOutWindow: [number, number]; // minutes offset from shift end
};

type WindowResult = {
    workDate: string;
    shiftStart?: Date | null;
    shiftEnd?: Date | null;
    isCrossDay: boolean;
    graceMinutes: number;
    inStart?: Date | null;
    inEnd?: Date | null;
    outStart?: Date | null;
    outEnd?: Date | null;
};

const SHIFT_WINDOW_PRESETS: Record<string, WindowPreset> = {
    shift1: { graceMinutes: 10, clockInWindow: [-30, 90], clockOutWindow: [-30, 180] }, // 06:30-08:00 & 15:30-19:00 bila jadwal 07:00-16:00
    shift2: { graceMinutes: 10, clockInWindow: [-30, 90], clockOutWindow: [-30, 180] },
    shift3: { graceMinutes: 10, clockInWindow: [-60, 120], clockOutWindow: [-60, 180] }, // lebih longgar untuk shift malam lintas hari
    default: { graceMinutes: 10, clockInWindow: [-30, 90], clockOutWindow: [-30, 180] },
};

const addMinutes = (date: Date, minutes: number): Date => {
    const result = new Date(date);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
};

const parseTimeToMinutes = (time?: string | null): number | null => {
    if (!time) return null;
    const [hour, minute] = time.split(':').map((p) => Number(p));
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
};

const buildDateTimeFromWorkDate = (workDate: string, time: string, dayOffset: number = 0): Date => {
    const base = new Date(`${workDate}T${time}${APP_TIME_OFFSET}`);
    if (dayOffset !== 0) {
        base.setDate(base.getDate() + dayOffset);
    }
    return base;
};

const detectPresetKey = (shift?: JadwalKerjaTim | null, meta?: Shift | null): keyof typeof SHIFT_WINDOW_PRESETS => {
    const candidate = `${shift?.shift || ''} ${meta?.name || ''}`.toLowerCase();
    if (candidate.includes('3')) return 'shift3';
    if (candidate.includes('2')) return 'shift2';
    if (candidate.includes('1')) return 'shift1';
    return 'default';
};

export const buildAttendanceWindow = (
    schedule?: JadwalKerjaTim | null,
    shiftMeta?: Shift | null,
): WindowResult => {
    const workDate = schedule?.date || formatDateKey(new Date(), APP_TIME_ZONE);
    const startMinutes = parseTimeToMinutes(schedule?.start_time);
    const endMinutes = parseTimeToMinutes(schedule?.end_time);

    const preset = SHIFT_WINDOW_PRESETS[detectPresetKey(schedule, shiftMeta)];
    const crossesDay = !!startMinutes && !!endMinutes ? endMinutes <= startMinutes : false;

    const shiftStart = schedule?.start_time ? buildDateTimeFromWorkDate(workDate, schedule.start_time) : null;
    const shiftEnd = schedule?.end_time
        ? buildDateTimeFromWorkDate(workDate, schedule.end_time, crossesDay ? 1 : 0)
        : null;

    const inStart = shiftStart ? addMinutes(shiftStart, preset.clockInWindow[0]) : null;
    const inEnd = shiftStart ? addMinutes(shiftStart, preset.clockInWindow[1]) : null;
    const outStart = shiftEnd ? addMinutes(shiftEnd, preset.clockOutWindow[0]) : null;
    const outEnd = shiftEnd ? addMinutes(shiftEnd, preset.clockOutWindow[1]) : null;

    return {
        workDate,
        shiftStart,
        shiftEnd,
        isCrossDay: crossesDay,
        graceMinutes: preset.graceMinutes,
        inStart,
        inEnd,
        outStart,
        outEnd,
    };
};

const formatLocalTime = (date: Date) =>
    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: APP_TIME_ZONE });

export const validateClockWindow = (
    actionType: 'in' | 'out',
    now: Date,
    window: WindowResult,
): string | null => {
    // Normalize "now" to app timezone to avoid client local-tz drift
    const nowInAppTz = new Date(now.toLocaleString('en-US', { timeZone: APP_TIME_ZONE }));
    const rangeStart = actionType === 'in' ? window.inStart : window.outStart;
    const rangeEnd = actionType === 'in' ? window.inEnd : window.outEnd;

    if (!rangeStart || !rangeEnd) return null; // tidak ada jadwal, tidak perlu validasi window
    if (nowInAppTz < rangeStart) {
        return `Clock-${actionType} belum diperbolehkan. Window dibuka ${formatLocalTime(rangeStart)} WITA.`;
    }
    if (nowInAppTz > rangeEnd) {
        return `Clock-${actionType} sudah melewati window (tutup ${formatLocalTime(rangeEnd)} WITA). Ajukan koreksi.`;
    }
    return null;
};

const diffMinutes = (later: Date, earlier: Date): number =>
    Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 60000));

// Type for abnormal attendance log data
export interface AttendanceLogData {
    log_type: 'missing_schedule' | 'calculation_mismatch' | 'incomplete_data' | 'schedule_stale';
    log_data: {
        schedule_used: JadwalKerjaTim | null;
        clock_in_iso: string;
        clock_out_iso: string;
        calculated: {
            status: string;
            worked_minutes: number;
            late_minutes: number;
            early_leave_minutes: number;
        };
        debug_info: {
            shift_end?: string;
            shift_end_with_grace?: string;
            grace_minutes: number;
            is_schedule_complete: boolean;
        };
    };
}

// Helper to check if schedule has complete data
export const isScheduleComplete = (schedule?: JadwalKerjaTim | null): boolean => {
    return !!(schedule?.start_time && schedule?.end_time && schedule?.date);
};

export const computeAttendanceOutcome = (params: {
    clockInISO: string;
    clockOutISO: string;
    schedule?: JadwalKerjaTim | null;
    shiftMeta?: Shift | null;
    graceMinutesOverride?: number;
    onAbnormalLog?: (logData: AttendanceLogData) => void; // Callback for abnormal logging
}): { status: AttendanceStatus; workedMinutes: number; lateMinutes: number; earlyLeaveMinutes: number } => {
    const window = buildAttendanceWindow(params.schedule, params.shiftMeta);
    const graceMinutes = params.graceMinutesOverride ?? window.graceMinutes;

    const clockIn = new Date(params.clockInISO);
    const clockOut = new Date(params.clockOutISO);

    const shiftStartWithGrace = window.shiftStart ? addMinutes(window.shiftStart, graceMinutes) : null;
    const shiftEndWithGrace = window.shiftEnd ? addMinutes(window.shiftEnd, -graceMinutes) : null;

    const lateMinutes = shiftStartWithGrace ? diffMinutes(clockIn, shiftStartWithGrace) : 0;
    const earlyLeaveMinutes = shiftEndWithGrace ? diffMinutes(shiftEndWithGrace, clockOut) : 0;
    const workedMinutes = diffMinutes(clockOut, clockIn);

    let status = AttendanceStatus.PRESENT;
    if (earlyLeaveMinutes > 0) {
        status = AttendanceStatus.EARLY_LEAVE;
    } else if (lateMinutes > 0) {
        status = AttendanceStatus.LATE;
    }

    const scheduleComplete = isScheduleComplete(params.schedule);

    // Detect abnormal cases and log them
    if (params.onAbnormalLog) {
        let logType: AttendanceLogData['log_type'] | null = null;

        // Case 1: Schedule is missing or incomplete
        if (!params.schedule) {
            logType = 'missing_schedule';
        } else if (!scheduleComplete) {
            logType = 'incomplete_data';
        }
        // Case 2: Calculation seems suspicious (early leave but clock-out is after shift end)
        else if (earlyLeaveMinutes > 0 && window.shiftEnd && clockOut > window.shiftEnd) {
            logType = 'calculation_mismatch';
        }

        if (logType) {
            params.onAbnormalLog({
                log_type: logType,
                log_data: {
                    schedule_used: params.schedule || null,
                    clock_in_iso: params.clockInISO,
                    clock_out_iso: params.clockOutISO,
                    calculated: {
                        status,
                        worked_minutes: workedMinutes,
                        late_minutes: lateMinutes,
                        early_leave_minutes: earlyLeaveMinutes,
                    },
                    debug_info: {
                        shift_end: window.shiftEnd?.toISOString(),
                        shift_end_with_grace: shiftEndWithGrace?.toISOString(),
                        grace_minutes: graceMinutes,
                        is_schedule_complete: scheduleComplete,
                    },
                },
            });
        }
    }

    return { status, workedMinutes, lateMinutes, earlyLeaveMinutes };
};

export const deriveWorkDate = (
    attendance?: Attendance | null,
    schedule?: JadwalKerjaTim | null,
    fallbackDate?: Date,
): string => {
    if (attendance?.work_date) return attendance.work_date;
    if (schedule?.date) return schedule.date;
    if (attendance?.clock_in) return formatDateKey(new Date(attendance.clock_in), APP_TIME_ZONE);
    return formatDateKey(fallbackDate || new Date(), APP_TIME_ZONE);
};

export const CORRECTION_MAX_DAYS = 3;
