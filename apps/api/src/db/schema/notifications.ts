import { pgTable, uuid, varchar, text, boolean, timestamp, integer, bigserial } from 'drizzle-orm/pg-core';
import { employees } from './employees.js';
import { requests } from './requests.js';

// UI Notifications (in-app)
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

// User Preferences for notifications
export const notificationPreferences = pgTable('notification_preferences', {
    employeeId: uuid('employee_id').primaryKey().references(() => employees.id, { onDelete: 'cascade' }),
    newRequest: boolean('new_request').notNull().default(true),
    requestApproved: boolean('request_approved').notNull().default(true),
    requestRejected: boolean('request_rejected').notNull().default(true),
    telegramChatId: text('telegram_chat_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Job queue for sending notifications (Telegram/Email)
export const notificationJobs = pgTable('notification_jobs', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').notNull().references(() => requests.id, { onDelete: 'cascade' }),
    event: varchar('event', { length: 50 }).notNull(), // created, approved, rejected
    createdAt: timestamp('created_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
});

// Logs for notifications sent
export const notificationLogs = pgTable('notification_logs', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id').references(() => requests.id, { onDelete: 'set null' }),
    event: varchar('event', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // sent, failed
    errorText: text('error_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
