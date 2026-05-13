import { db } from '../config/database.js';
import { profiles } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export const employeeService = {
    async getByUserId(userId: string) {
        const result = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
        return result[0] || null;
    },

    async getById(id: string) {
        const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
        return result[0] || null;
    },

    async getAll() {
        return db.select().from(profiles);
    },

    async updateByUserId(userId: string, data: Partial<typeof profiles.$inferInsert>) {
        const result = await db
            .update(profiles)
            .set({ ...data })
            .where(eq(profiles.id, userId))
            .returning();
        return result[0];
    },

    async create(data: typeof profiles.$inferInsert) {
        const result = await db.insert(profiles).values(data).returning();
        return result[0];
    },
};
