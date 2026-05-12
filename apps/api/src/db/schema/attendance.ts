import { pgTable, bigserial, uuid, timestamp, text, jsonb, integer, date, pgEnum } from 'drizzle-orm/pg-core';
import { profiles } from './employees.js';

export const attendanceStatusEnum = pgEnum('attendance_status', [
    'hadir', 'terlambat', 'pulang_cepat', 'absent', 'incomplete', 'in_progress'
]);

// Attendance records
export const attendance = pgTable('attendance', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    profile_id: uuid('profile_id').notNull().references(() => profiles.id),
    clock_in: timestamp('clock_in', { withTimezone: true }).notNull(),
    clock_out: timestamp('clock_out', { withTimezone: true }),
    status: attendanceStatusEnum('status').notNull(),
    work_date: date('work_date').notNull(),
    lokasi_kerja: text('lokasi_kerja'),
    tempat_kerja: text('tempat_kerja'),
    clock_in_coords: jsonb('clock_in_coords'),
    clock_out_coords: jsonb('clock_out_coords'),
    clock_in_address: text('clock_in_address'),
    clock_out_address: text('clock_out_address'),
    clock_in_selfie_url: text('clock_in_selfie_url'),
    clock_out_selfie_url: text('clock_out_selfie_url'),
    worked_minutes: integer('worked_minutes'),
    late_minutes: integer('late_minutes'),
    early_leave_minutes: integer('early_leave_minutes'),
    source: text('source'),
    catatan: text('catatan'),
    attendance_flags: text('attendance_flags').array(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Attendance logs (for debugging abnormal cases)
export const attendanceLogs = pgTable('attendance_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    attendance_id: bigserial('attendance_id', { mode: 'bigint' }).references(() => attendance.id),
    profile_id: uuid('profile_id').references(() => profiles.id),
    log_type: text('log_type').notNull(),
    log_data: jsonb('log_data').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
