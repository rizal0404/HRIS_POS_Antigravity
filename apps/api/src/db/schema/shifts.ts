import { pgTable, uuid, varchar, time, date, timestamp } from 'drizzle-orm/pg-core';
import { employees } from './employees';

// Shift templates (Pagi, Siang, Malam, OFF)
export const shiftTemplates = pgTable('shift_templates', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(), // Pagi, Siang, Malam, OFF
    startTime: time('start_time'), // null for OFF
    endTime: time('end_time'), // null for OFF
    color: varchar('color', { length: 50 }).notNull().default('#3b82f6'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Employee shift assignments
export const employeeShifts = pgTable('employee_shifts', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    shiftTemplateId: uuid('shift_template_id').notNull().references(() => shiftTemplates.id),
    shiftDate: date('shift_date').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
