import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { employees } from './employees';

export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(), // request_approved, request_rejected, shift_assigned, etc.
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    metadata: text('metadata'), // JSON string for additional data
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
