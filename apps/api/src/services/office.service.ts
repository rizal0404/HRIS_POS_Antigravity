import { db } from '../config/database.js';
import { officeLocations } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

interface OfficeLocationData {
    name: string;
    address?: string;
    latitude: string;
    longitude: string;
    radiusMeters?: number;
    isActive?: boolean;
}

export const officeService = {
    async getAll() {
        return db.select().from(officeLocations);
    },

    async getActive() {
        return db.select().from(officeLocations).where(eq(officeLocations.isActive, true));
    },

    async getById(id: string) {
        const result = await db.select().from(officeLocations).where(eq(officeLocations.id, id)).limit(1);
        return result[0] || null;
    },

    async create(data: OfficeLocationData) {
        const result = await db.insert(officeLocations).values({
            name: data.name,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            radiusMeters: data.radiusMeters || 100,
            isActive: data.isActive ?? true,
        }).returning();
        return result[0];
    },

    async update(id: string, data: Partial<OfficeLocationData>) {
        const result = await db.update(officeLocations)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(officeLocations.id, id))
            .returning();
        return result[0];
    },

    async delete(id: string) {
        await db.delete(officeLocations).where(eq(officeLocations.id, id));
    },
};
