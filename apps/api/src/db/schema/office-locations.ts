import { pgTable, uuid, text, doublePrecision, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Workplaces (office locations)
export const workplaces = pgTable('workplaces', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    radius_meters: integer('radius_meters').default(350),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
