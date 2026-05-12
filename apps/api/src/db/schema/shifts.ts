import { pgTable, varchar, text, time, pgEnum } from 'drizzle-orm/pg-core';

export const workDayTypeEnum = pgEnum('work_day_type', ['non-shift', 'shift']);

// Shifts master table
export const shifts = pgTable('shifts', {
    code: varchar('code').primaryKey(),
    name: text('name').notNull(),
    start_time: time('start_time'),
    end_time: time('end_time'),
    color: text('color'),
    work_day_type: workDayTypeEnum('work_day_type').notNull(),
});
