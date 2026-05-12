import { db } from '../config/database';
import { shifts, workSchedules, profiles } from '../db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';

export const scheduleService = {
    async getEmployeeSchedule(profileId: string, weekOffset: number = 0) {
        // Calculate week dates
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const startDate = startOfWeek.toISOString().split('T')[0];
        const endDate = endOfWeek.toISOString().split('T')[0];

        return db.select()
            .from(workSchedules)
            .innerJoin(shifts, eq(workSchedules.shift_code, shifts.code))
            .where(and(
                eq(workSchedules.profile_id, profileId),
                sql`${workSchedules.date} >= ${startDate}`,
                sql`${workSchedules.date} <= ${endDate}`
            ))
            .orderBy(asc(workSchedules.date));
    },

    async getEmployeeMonthlySchedule(profileId: string, month?: number, year?: number) {
        const now = new Date();
        const targetMonth = month ?? now.getMonth() + 1;
        const targetYear = year ?? now.getFullYear();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

        return db.select()
            .from(workSchedules)
            .innerJoin(shifts, eq(workSchedules.shift_code, shifts.code))
            .where(and(
                eq(workSchedules.profile_id, profileId),
                sql`${workSchedules.date} >= ${startDate}`,
                sql`${workSchedules.date} <= ${endDate}`
            ))
            .orderBy(asc(workSchedules.date));
    },

    async getShiftTemplates() {
        return db.select().from(shifts);
    },

    async getTeamSchedule(startDate: string, endDate: string) {
        return db.select()
            .from(workSchedules)
            .innerJoin(shifts, eq(workSchedules.shift_code, shifts.code))
            .innerJoin(profiles, eq(workSchedules.profile_id, profiles.id))
            .where(and(
                sql`${workSchedules.date} >= ${startDate}`,
                sql`${workSchedules.date} <= ${endDate}`
            ))
            .orderBy(asc(workSchedules.date));
    },

    async assignShift(data: { profile_id: string; shift_code: string; date: string }) {
        const result = await db.insert(workSchedules).values({
            profile_id: data.profile_id,
            shift_code: data.shift_code,
            date: data.date,
        }).returning();
        return result[0];
    },

    async deleteSchedule(id: string) {
        await db.delete(workSchedules).where(eq(workSchedules.id, BigInt(id)));
    },
};
