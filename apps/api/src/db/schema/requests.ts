import { pgTable, uuid, varchar, date, time, integer, decimal, text, timestamp } from 'drizzle-orm/pg-core';
import { employees } from './employees';

// Request types: leave, overtime, sick, correction, shift_swap
export const requests = pgTable('requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // leave, overtime, sick, correction, shift_swap
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, approved, rejected

    // Date range for leave/sick/shift_swap
    startDate: date('start_date'),
    endDate: date('end_date'),
    durationDays: integer('duration_days'),

    // Time range for overtime
    startTime: time('start_time'),
    endTime: time('end_time'),
    durationHours: decimal('duration_hours', { precision: 4, scale: 2 }),

    // Request details
    reason: text('reason'),
    attachmentUrl: text('attachment_url'), // For sick leave (doctor's note)

    // For shift swap requests
    substituteEmployeeId: uuid('substitute_employee_id').references(() => employees.id),
    targetShiftId: uuid('target_shift_id'), // References employee_shifts.id

    // For correction requests
    correctionDate: date('correction_date'),
    correctionType: varchar('correction_type', { length: 50 }), // clock_in, clock_out
    correctedTime: time('corrected_time'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Request approvals
export const requestApprovals = pgTable('request_approvals', {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id').notNull().references(() => requests.id, { onDelete: 'cascade' }).unique(),
    approverId: uuid('approver_id').notNull(), // References employees.id (manager)
    decision: varchar('decision', { length: 50 }).notNull(), // approved, rejected
    notes: text('notes'),
    decidedAt: timestamp('decided_at').defaultNow().notNull(),
});
