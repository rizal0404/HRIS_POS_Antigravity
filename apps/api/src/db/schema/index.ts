// Export all schema definitions
export * from './users.js';
export * from './employees.js';
export * from './departments.js';
export * from './office-locations.js';
export * from './shifts.js';
export * from './attendance.js';
export * from './requests.js';
export * from './notifications.js';
export * from './discipline.js';

// Work schedules and grace period config inline
import { pgTable, bigserial, uuid, date, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { profiles } from './employees.js';
import { shifts } from './shifts.js';

export const workSchedules = pgTable('work_schedules', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    profile_id: uuid('profile_id').notNull().references(() => profiles.id),
    date: date('date').notNull(),
    shift_code: varchar('shift_code').notNull().references(() => shifts.code),
});

export const gracePeriodConfig = pgTable('grace_period_config', {
    id: uuid('id').primaryKey().defaultRandom(),
    shift_code: text('shift_code').references(() => shifts.code),
    description: text('description'),
    grace_minutes_in: integer('grace_minutes_in').notNull().default(10),
    grace_minutes_out: integer('grace_minutes_out').notNull().default(10),
    is_default: boolean('is_default').default(false),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Backward compatibility aliases for incomplete migration in services
import { workplaces } from './office-locations.js';
import { requests } from './requests.js';
export { profiles as employees } from './employees.js';
export { workplaces as officeLocations };
export { workSchedules as employeeShifts };
export { shifts as shiftTemplates };
export { requests as requestApprovals }; // Dummy alias to prevent import crash
