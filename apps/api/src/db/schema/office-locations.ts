import { pgTable, uuid, varchar, decimal, integer, boolean, text, timestamp } from 'drizzle-orm/pg-core';

export const officeLocations = pgTable('office_locations', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    address: text('address'),
    latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
    longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
    radiusMeters: integer('radius_meters').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
