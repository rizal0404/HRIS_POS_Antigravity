import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { profiles } from './employees.js';

// Discipline Configuration (singleton)
export const disciplineConfiguration = pgTable('discipline_configuration', {
    id: uuid('id').primaryKey().defaultRandom(),
    late_penalty: integer('late_penalty').notNull().default(2),
    early_leave_penalty: integer('early_leave_penalty').notNull().default(2),
    wrong_location_penalty: integer('wrong_location_penalty').notNull().default(5),
    correction_penalty: integer('correction_penalty').notNull().default(1),
    base_score: integer('base_score').notNull().default(100),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    updated_by: uuid('updated_by').references(() => profiles.id),
});

// Discipline Scores
export const disciplineScores = pgTable('discipline_scores', {
    id: uuid('id').primaryKey().defaultRandom(),
    profile_id: uuid('profile_id').notNull().references(() => profiles.id),
    period_month: integer('period_month').notNull(),
    period_year: integer('period_year').notNull(),
    late_count: integer('late_count').default(0),
    early_leave_count: integer('early_leave_count').default(0),
    wrong_location_count: integer('wrong_location_count').default(0),
    correction_count: integer('correction_count').default(0),
    sick_leave_count: integer('sick_leave_count').default(0),
    base_score: integer('base_score').default(100),
    final_score: integer('final_score').default(100),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
