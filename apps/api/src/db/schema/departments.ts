import { pgTable, serial, text, integer, uuid } from 'drizzle-orm/pg-core';

// Departments → Bureaus → Sections hierarchy
export const departments = pgTable('departments', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
});

export const bureaus = pgTable('bureaus', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    department_id: integer('department_id').notNull().references(() => departments.id),
});

export const sections = pgTable('sections', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    bureau_id: integer('bureau_id').notNull().references(() => bureaus.id),
});

// Leave Types
export const leaveTypes = pgTable('leave_types', {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    default_quota: integer('default_quota').notNull(),
});

// Holidays
export const holidays = pgTable('holidays', {
    id: serial('id').primaryKey(),
    date: text('date').notNull().unique(), // Using text for date as Drizzle date may not match
    name: text('name').notNull(),
});

// Overtime Configuration (singleton)
export const overtimeConfiguration = pgTable('overtime_configuration', {
    id: integer('id').primaryKey().default(1),
    hourly_wage_divider: integer('hourly_wage_divider').notNull(),
    max_hours_per_day: integer('max_hours_per_day').notNull(),
    max_hours_per_month_shift: integer('max_hours_per_month_shift').notNull(),
    max_hours_per_month_non_shift: integer('max_hours_per_month_non_shift').notNull(),
    normal_day_first_hour_multiplier: text('normal_day_first_hour_multiplier').notNull(),
    normal_day_subsequent_hours_multiplier: text('normal_day_subsequent_hours_multiplier').notNull(),
    non_shift_first_eight_hours_multiplier: text('non_shift_first_eight_hours_multiplier').notNull(),
    non_shift_ninth_hour_multiplier: text('non_shift_ninth_hour_multiplier').notNull(),
    non_shift_tenth_to_twelfth_hour_multiplier: text('non_shift_tenth_to_twelfth_hour_multiplier').notNull(),
    shift_first_seven_hours_multiplier: text('shift_first_seven_hours_multiplier').notNull(),
    shift_eighth_hour_multiplier: text('shift_eighth_hour_multiplier').notNull(),
    shift_ninth_to_eleventh_hour_multiplier: text('shift_ninth_to_eleventh_hour_multiplier').notNull(),
});
