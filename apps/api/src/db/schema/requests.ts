import { pgTable, bigserial, uuid, date, time, text, boolean, timestamp, bigint, pgEnum } from 'drizzle-orm/pg-core';
import { profiles } from './employees.js';
import { attendance } from './attendance.js';

export const requestStatusEnum = pgEnum('request_status', [
    'pending', 'approved', 'rejected', 'revised', 'revision'
]);

export const requestTypeEnum = pgEnum('request_type', [
    'Cuti', 'Lembur', 'Izin', 'Sakit', 'Koreksi Absensi', 'Registrasi Pegawai', 'Substitusi'
]);

// Requests
export const requests = pgTable('requests', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    profile_id: uuid('profile_id').notNull().references(() => profiles.id),
    request_type: requestTypeEnum('request_type').notNull(),
    status: requestStatusEnum('status').notNull().default('pending'),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    reason: text('reason').notNull(),
    start_time: time('start_time'),
    end_time: time('end_time'),
    approver_id: uuid('approver_id').references(() => profiles.id),
    approver_notes: text('approver_notes'),
    day_shift_substitute_id: uuid('day_shift_substitute_id').references(() => profiles.id),
    night_shift_substitute_id: uuid('night_shift_substitute_id').references(() => profiles.id),
    attachment_url: text('attachment_url'),
    attendance_id_to_correct: bigint('attendance_id_to_correct', { mode: 'bigint' }).references(() => attendance.id),
    is_manager_assigned: boolean('is_manager_assigned').notNull().default(false),
    assigned_by_id: uuid('assigned_by_id').references(() => profiles.id),
    updated_at: timestamp('updated_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
