import { pgTable, bigserial, uuid, text, boolean, integer, timestamp, bigint } from 'drizzle-orm/pg-core';
import { profiles } from './employees.js';
import { requests } from './requests.js';

// Notification Preferences
export const notificationPreferences = pgTable('notification_preferences', {
    profile_id: uuid('profile_id').primaryKey().references(() => profiles.id),
    telegram_chat_id: text('telegram_chat_id'),
    new_request: boolean('new_request').notNull().default(true),
    request_approved: boolean('request_approved').notNull().default(true),
    request_rejected: boolean('request_rejected').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Notification Jobs (queue)
export const notificationJobs = pgTable('notification_jobs', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    profile_id: uuid('profile_id').notNull().references(() => profiles.id),
    request_id: bigint('request_id', { mode: 'bigint' }).notNull().references(() => requests.id),
    event: text('event').notNull(), // 'created', 'approved', 'rejected'
    processed_at: timestamp('processed_at', { withTimezone: true }),
    last_error: text('last_error'),
    attempts: integer('attempts').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Notification Logs
export const notificationLogs = pgTable('notification_logs', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    profile_id: uuid('profile_id').notNull().references(() => profiles.id),
    request_id: bigint('request_id', { mode: 'bigint' }).references(() => requests.id),
    event: text('event').notNull(),
    status: text('status').notNull(), // 'queued', 'sent', 'failed'
    error_text: text('error_text'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
