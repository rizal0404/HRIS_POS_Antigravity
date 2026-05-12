import { pgTable, uuid, varchar, text, date, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { departments } from './departments.js';

export const employees = pgTable('employees', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
    employeeId: varchar('employee_id', { length: 50 }).notNull().unique(), // EMP-2024-001
    departmentId: uuid('department_id').references(() => departments.id),
    position: varchar('position', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    joinDate: date('join_date'),

    // Leave quotas
    annualLeaveBalance: integer('annual_leave_balance').notNull().default(12),
    annualLeaveTotal: integer('annual_leave_total').notNull().default(12),

    // Overtime tracking
    overtimeHoursUsed: integer('overtime_hours_used').notNull().default(0),
    overtimeHoursMax: integer('overtime_hours_max').notNull().default(40),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
