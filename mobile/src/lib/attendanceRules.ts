// Attendance Rules for Mobile App
// Ported from web: src/lib/attendanceRules.ts

import { JadwalKerjaTim, Shift, Attendance, AttendanceStatus } from '../types';

// App timezone configuration
export const APP_TIME_ZONE = 'Asia/Makassar'; // WITA
export const APP_TIME_OFFSET = '+08:00';
export const CORRECTION_MAX_DAYS = 3;

// Window preset configuration
type WindowPreset = {
    graceMinutes: number;
    clockInWindow: [number, number]; // minutes offset from shift start
    clockOutWindow: [number, number]; // minutes offset from shift end
};

export type WindowResult = {
    workDate: string;
    shiftStart: Date | null;
    shiftEnd: Date | null;
    isCrossDay: boolean;
    graceMinutes: number;
    inStart: Date | null;
    inEnd: Date | null;
    outStart: Date | null;
    outEnd: Date | null;
};

const SHIFT_WINDOW_PRESETS: Record<string, WindowPreset> = {
    shift1: { graceMinutes: 10, clockInWindow: [-30, 90], clockOutWindow: [-30, 180] },
    shift2: { graceMinutes: 10, clockInWindow: [-30, 90], clockOutWindow: [-30, 180] },
    shift3: { graceMinutes: 10, clockInWindow: [-60, 120], clockOutWindow: [-60, 180] },
    default: { graceMinutes: 10, clockInWindow: [-30, 90], clockOutWindow: [-30, 180] },
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export const formatDateKey = (date: Date): string => {
    // Format as YYYY-MM-DD in app timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

const detectPresetKey = (shift?: JadwalKerjaTim | null): keyof typeof SHIFT_WINDOW_PRESETS => {
    const candidate = `${shift?.shift || ''}`.toLowerCase();
    if (candidate.includes('3')) return 'shift3';
    if (candidate.includes('2')) return 'shift2';
    if (candidate.includes('1')) return 'shift1';
    return 'default';
};

// ==========================================
// MAIN FUNCTIONS
// ==========================================

/**
 * Build attendance window based on schedule
 */
export const buildAttendanceWindow = (schedule?: JadwalKerjaTim | null): WindowResult => {
    const workDate = schedule?.date || formatDateKey(new Date());
    const startMinutes = parseTimeToMinutes(schedule?.start_time);
    const endMinutes = parseTimeToMinutes(schedule?.end_time);

    const preset = SHIFT_WINDOW_PRESETS[detectPresetKey(schedule)];
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

/**
 * Validate if current time is within clock window
 * Returns error message if outside window, null if valid
 */
export const validateClockWindow = (
    actionType: 'in' | 'out',
    now: Date,
    window: WindowResult,
): { isValid: boolean; message: string | null; requiresNote: boolean } => {
    const rangeStart = actionType === 'in' ? window.inStart : window.outStart;
    const rangeEnd = actionType === 'in' ? window.inEnd : window.outEnd;

    // No schedule = allow but require note
    if (!rangeStart || !rangeEnd) {
        return {
            isValid: true,
            message: 'Tidak ada jadwal untuk hari ini',
            requiresNote: true,
        };
    }

    const formatTime = (d: Date) => d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (now < rangeStart) {
        return {
            isValid: true,
            message: `Di luar window (buka ${formatTime(rangeStart)})`,
            requiresNote: true,
        };
    }
    if (now > rangeEnd) {
        return {
            isValid: true,
            message: `Di luar window (tutup ${formatTime(rangeEnd)})`,
            requiresNote: true,
        };
    }

    return { isValid: true, message: null, requiresNote: false };
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

/**
 * Compute attendance outcome (late, early leave, worked minutes)
 */
export const computeAttendanceOutcome = (params: {
    clockInISO: string;
    clockOutISO: string;
    schedule?: JadwalKerjaTim | null;
    onAbnormalLog?: (logData: AttendanceLogData) => void; // Callback for abnormal logging
}): { status: AttendanceStatus; workedMinutes: number; lateMinutes: number; earlyLeaveMinutes: number } => {
    const window = buildAttendanceWindow(params.schedule);
    const graceMinutes = window.graceMinutes;

    const clockIn = new Date(params.clockInISO);
    const clockOut = new Date(params.clockOutISO);

    const shiftStartWithGrace = window.shiftStart ? addMinutes(window.shiftStart, graceMinutes) : null;
    const shiftEndWithGrace = window.shiftEnd ? addMinutes(window.shiftEnd, -graceMinutes) : null;

    const lateMinutes = shiftStartWithGrace ? diffMinutes(clockIn, shiftStartWithGrace) : 0;
    const earlyLeaveMinutes = shiftEndWithGrace ? diffMinutes(shiftEndWithGrace, clockOut) : 0;
    const workedMinutes = diffMinutes(clockOut, clockIn);

    let status: AttendanceStatus = 'hadir';
    if (earlyLeaveMinutes > 0) {
        status = 'pulang_cepat';
    } else if (lateMinutes > 0) {
        status = 'terlambat';
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
            console.warn(`[AttendanceRules] Abnormal case detected: ${logType}`, {
                schedule: params.schedule,
                clockIn: params.clockInISO,
                clockOut: params.clockOutISO,
                earlyLeaveMinutes,
                shiftEnd: window.shiftEnd?.toISOString(),
            });

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

/**
 * Derive work date from attendance record or schedule
 */
export const deriveWorkDate = (
    attendance?: Attendance | null,
    schedule?: JadwalKerjaTim | null,
    fallbackDate?: Date,
): string => {
    if (attendance?.work_date) return attendance.work_date;
    if (schedule?.date) return schedule.date;
    if (attendance?.clock_in) return formatDateKey(new Date(attendance.clock_in));
    return formatDateKey(fallbackDate || new Date());
};

// ==========================================
// CROSS-DAY SHIFT SUPPORT
// ==========================================

/**
 * Check if a schedule's shift is currently active (handles cross-day shifts)
 * For night shifts (e.g., 22:00 - 06:00), the schedule from yesterday might still be active
 */
export const isScheduleActive = (schedule: JadwalKerjaTim, now: Date = new Date()): boolean => {
    const window = buildAttendanceWindow(schedule);

    // Check if clock-in or clock-out window is active
    if (window.inStart && window.outEnd) {
        return now >= window.inStart && now <= window.outEnd;
    }

    return false;
};

/**
 * Get the active schedule for the current time
 * Checks both today's and yesterday's schedule for cross-day shifts
 */
export const getActiveScheduleFromList = (
    schedules: JadwalKerjaTim[],
    now: Date = new Date()
): { schedule: JadwalKerjaTim | null; workDate: string; isCrossDay: boolean } => {
    const today = formatDateKey(now);
    const yesterday = formatDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    // First, check today's schedule
    const todaySchedule = schedules.find(s => s.date === today);
    if (todaySchedule) {
        const window = buildAttendanceWindow(todaySchedule);
        // If today's schedule is currently in window
        if (window.inStart && now >= window.inStart) {
            return { schedule: todaySchedule, workDate: today, isCrossDay: false };
        }
    }

    // Check yesterday's schedule for cross-day shift
    const yesterdaySchedule = schedules.find(s => s.date === yesterday);
    if (yesterdaySchedule) {
        const window = buildAttendanceWindow(yesterdaySchedule);
        // Cross-day shift: if yesterday's clock-out window is still active
        if (window.isCrossDay && window.outEnd && now <= window.outEnd) {
            return { schedule: yesterdaySchedule, workDate: yesterday, isCrossDay: true };
        }
    }

    // Fall back to today's schedule or null
    return {
        schedule: todaySchedule || null,
        workDate: today,
        isCrossDay: false
    };
};

/**
 * Determine the work_date to use for clock-in/out
 * For cross-day shifts, uses the date when the shift started
 */
export const determineWorkDate = (
    schedule?: JadwalKerjaTim | null,
    activeAttendance?: Attendance | null,
    now: Date = new Date()
): string => {
    // If there's an active attendance, use its work_date
    if (activeAttendance?.work_date) {
        return activeAttendance.work_date;
    }

    // If there's a schedule, check if it's cross-day
    if (schedule) {
        const window = buildAttendanceWindow(schedule);
        if (window.isCrossDay) {
            // For cross-day shift, the work_date is the date when shift started
            return schedule.date;
        }
        return schedule.date;
    }

    // Default to today
    return formatDateKey(now);
};

/**
 * Get time-based greeting message
 */
export const getTimeGreeting = (now: Date = new Date()): string => {
    const hour = now.getHours();
    if (hour < 5) return 'Selamat malam';
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
};
