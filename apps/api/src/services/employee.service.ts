import { db } from '../config/database';
import { employees } from '../db/schema';
import { eq } from 'drizzle-orm';

export const employeeService = {
    async getByUserId(userId: string) {
        const result = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
        return result[0] || null;
    },

    async getById(id: string) {
        const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
        return result[0] || null;
    },

    async getAll() {
        return db.select().from(employees);
    },

    async updateByUserId(userId: string, data: Partial<typeof employees.$inferInsert>) {
        const result = await db
            .update(employees)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(employees.userId, userId))
            .returning();
        return result[0];
    },

    async create(data: typeof employees.$inferInsert) {
        const result = await db.insert(employees).values(data).returning();
        return result[0];
    },
};
