import { pgTable, uuid, date, timestamp, varchar, decimal, integer } from 'drizzle-orm/pg-core';
import { employees } from './employees.js';
import { officeLocations } from './office-locations.js';

export const attendance = pgTable('attendance', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    officeLocationId: uuid('office_location_id').references(() => officeLocations.id),
    attendanceDate: date('attendance_date').notNull(),

    // Clock in details
    clockIn: timestamp('clock_in'),
    clockInLatitude: decimal('clock_in_latitude', { precision: 10, scale: 8 }),
    clockInLongitude: decimal('clock_in_longitude', { precision: 11, scale: 8 }),

    // Clock out details
    clockOut: timestamp('clock_out'),
    clockOutLatitude: decimal('clock_out_latitude', { precision: 10, scale: 8 }),
    clockOutLongitude: decimal('clock_out_longitude', { precision: 11, scale: 8 }),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'), // on_time, late, absent, leave
    lateMinutes: integer('late_minutes').default(0),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
