import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    description: varchar('description', { length: 500 }),
    managerId: uuid('manager_id'), // References employees.id - set manually to avoid circular dependency
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
