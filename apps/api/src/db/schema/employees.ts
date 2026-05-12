import { pgTable, uuid, text, date, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './users.js';
import { workplaces } from './office-locations.js';

// Profiles table - matches Supabase public.profiles
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    full_name: text('full_name').notNull(),
    position: text('position'),
    role: userRoleEnum('role').notNull().default('user'),
    manager_id: uuid('manager_id').references((): any => profiles.id),
    avatar_url: text('avatar_url'),
    default_shift: text('default_shift'),
    salary: jsonb('salary'),
    phone_number: text('phone_number'),
    nik: text('nik').unique(),
    workplace_id: uuid('workplace_id').references(() => workplaces.id),
    place_of_birth: text('place_of_birth'),
    date_of_birth: date('date_of_birth'),
    education_level: text('education_level'),
    education_major: text('education_major'),
    employment_status: text('employment_status'),
    address: text('address'),
    approved: boolean('approved').notNull().default(false),
    telegram_chat_id: text('telegram_chat_id'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
