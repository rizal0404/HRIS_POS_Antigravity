import { pgTable, uuid, integer, timestamp } from 'drizzle-orm/pg-core';
import { employees } from './employees';

export const disciplineScores = pgTable('discipline_scores', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    periodMonth: integer('period_month').notNull(),
    periodYear: integer('period_year').notNull(),
    
    lateCount: integer('late_count').default(0),
    earlyLeaveCount: integer('early_leave_count').default(0),
    wrongLocationCount: integer('wrong_location_count').default(0),
    correctionCount: integer('correction_count').default(0),
    sickLeaveCount: integer('sick_leave_count').default(0),
    
    baseScore: integer('base_score').default(100),
    finalScore: integer('final_score').default(100),
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
